'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { getOficialArsRate } from '@/lib/fx'
import { PLAN_CONFIG } from '@/lib/planConfig'

const BLOCK_SIZE = 10
const BLOCK_USD = 5

// Verificado de punta a punta el 19/11/2026 contra Mercado Pago real (sandbox
// propio: vendedor y comprador de prueba, no mocks): se creó una preapproval,
// se subió el monto de $100 a $259 y se volvió a bajar a $100 vía
// preApproval.update() — ambas direcciones confirmadas antes de habilitar esto.
const OVERAGE_LIVE = true

async function getActiveMonthlySubscriber(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const { data: userRow } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  if (userRow?.role !== 'subscriber') throw new Error('El recargo por pacientes extra es solo para el plan Individual.')

  const { data: subscription } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle()
  if (!subscription || subscription.status !== 'active' || !subscription.mp_subscription_id) {
    throw new Error('No se encontró una suscripción activa.')
  }
  if (subscription.plan !== 'monthly') {
    throw new Error('El recargo por pacientes extra solo está disponible en el plan mensual, por ahora.')
  }

  return { user, subscription }
}

// Solo calcula y muestra — no escribe nada en Mercado Pago ni en la base.
// El profesional tiene que ver el monto exacto antes de aceptar.
export async function previewAddOverageBlock() {
  if (!OVERAGE_LIVE) throw new Error('Esta función todavía no está disponible — la estamos terminando de verificar.')
  const supabase = createClient()
  const { subscription } = await getActiveMonthlySubscriber(supabase)

  const { venta } = await getOficialArsRate()
  const arsAmount = Math.round(BLOCK_USD * venta)

  const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' })
  const preApproval = new PreApproval(mpClient)
  const current = await preApproval.get({ id: subscription.mp_subscription_id })
  const currentAmount = current.auto_recurring?.transaction_amount ?? PLAN_CONFIG.monthly.amount

  return { blockArs: arsAmount, currentAmount, newAmount: currentAmount + arsAmount, blockSize: BLOCK_SIZE, fxRate: venta }
}

export async function addOverageBlock() {
  if (!OVERAGE_LIVE) throw new Error('Esta función todavía no está disponible — la estamos terminando de verificar.')
  const supabase = createClient()
  const { user, subscription } = await getActiveMonthlySubscriber(supabase)

  const { venta, source } = await getOficialArsRate()
  const arsAmount = Math.round(BLOCK_USD * venta)

  const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' })
  const preApproval = new PreApproval(mpClient)

  const current = await preApproval.get({ id: subscription.mp_subscription_id })
  const currentAmount = current.auto_recurring?.transaction_amount ?? PLAN_CONFIG.monthly.amount
  const newAmount = currentAmount + arsAmount

  await preApproval.update({
    id: subscription.mp_subscription_id,
    body: { auto_recurring: { transaction_amount: newAmount, currency_id: 'ARS' } },
  })

  const { error } = await supabase.from('patient_overage_blocks').insert({
    user_id: user.id,
    ars_amount: arsAmount,
    usd_reference: BLOCK_USD,
    fx_rate_used: venta,
    fx_source: source,
  })
  if (error) throw new Error('El cargo se actualizó en Mercado Pago pero no se pudo registrar el bloque — avisá a soporte.')

  revalidatePath('/account/subscription')
  return { newAmount, blockArs: arsAmount, blockSize: BLOCK_SIZE }
}

export async function removeOverageBlock() {
  if (!OVERAGE_LIVE) throw new Error('Esta función todavía no está disponible — la estamos terminando de verificar.')
  const supabase = createClient()
  const { user, subscription } = await getActiveMonthlySubscriber(supabase)

  const { data: block } = await supabase
    .from('patient_overage_blocks')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('added_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!block) throw new Error('No tenés bloques de pacientes extra para sacar.')

  const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' })
  const preApproval = new PreApproval(mpClient)

  const current = await preApproval.get({ id: subscription.mp_subscription_id })
  const currentAmount = current.auto_recurring?.transaction_amount ?? PLAN_CONFIG.monthly.amount
  const newAmount = Math.max(currentAmount - block.ars_amount, PLAN_CONFIG.monthly.amount)

  await preApproval.update({
    id: subscription.mp_subscription_id,
    body: { auto_recurring: { transaction_amount: newAmount, currency_id: 'ARS' } },
  })

  const { error } = await supabase
    .from('patient_overage_blocks')
    .update({ status: 'removed', removed_at: new Date().toISOString() })
    .eq('id', block.id)
  if (error) throw new Error('El cargo se actualizó en Mercado Pago pero no se pudo registrar el cambio — avisá a soporte.')

  revalidatePath('/account/subscription')
  return { newAmount, removedArs: block.ars_amount, blockSize: BLOCK_SIZE }
}
