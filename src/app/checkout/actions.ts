'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'

type PlanType = 'monthly' | 'annual' | 'pro_monthly' | 'pro_annual'

const PLAN_CONFIG: Record<PlanType, { reason: string; frequency: number; amount: number }> = {
  monthly:     { reason: 'Suscripción Mensual Reason',     frequency: 1,  amount: 18000    },
  annual:      { reason: 'Suscripción Anual Reason',       frequency: 12, amount: 150000   },
  pro_monthly: { reason: 'Suscripción Pro Mensual Reason', frequency: 1,  amount: 150000   },
  pro_annual:  { reason: 'Suscripción Pro Anual Reason',   frequency: 12, amount: 1350000  },
}

// Descuento de campaña 50% x 3 meses, solo Suscriptor mensual, altas hasta el
// 14/11/2026. Ver doc "Primer uso y descuento de lanzamiento" (8/11/2026).
const PROMO_CODE = 'KEVINCOLMAN'
const PROMO_CUTOFF = new Date('2026-11-15T00:00:00-03:00') // exclusivo: válido hasta el 14/11 inclusive, hora Argentina
const PROMO_MONTHS = 3

async function resolvePromo(
  userId: string,
  planType: PlanType,
  rawCode: string
): Promise<{ amount: number; error: string | null; apply: boolean }> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return { amount: PLAN_CONFIG[planType].amount, error: null, apply: false }

  if (planType !== 'monthly') {
    return { amount: PLAN_CONFIG[planType].amount, error: 'El código de descuento solo aplica al plan Suscriptor mensual.', apply: false }
  }
  if (code !== PROMO_CODE) {
    return { amount: PLAN_CONFIG[planType].amount, error: 'Código inválido.', apply: false }
  }
  if (Date.now() >= PROMO_CUTOFF.getTime()) {
    return { amount: PLAN_CONFIG[planType].amount, error: 'La promoción ya venció.', apply: false }
  }

  const admin = createAdminClient()
  const { data: priorSub } = await admin.from('subscriptions').select('id').eq('user_id', userId).limit(1)
  if (priorSub && priorSub.length > 0) {
    return { amount: PLAN_CONFIG[planType].amount, error: 'Este descuento es solo para cuentas nuevas.', apply: false }
  }
  const { data: priorPromo } = await admin.from('promo_redemptions').select('id').eq('user_id', userId).limit(1)
  if (priorPromo && priorPromo.length > 0) {
    return { amount: PLAN_CONFIG[planType].amount, error: 'Ya usaste este descuento antes.', apply: false }
  }

  return { amount: Math.round(PLAN_CONFIG[planType].amount / 2), error: null, apply: true }
}

export async function createSubscriptionPreference(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const rawPlan = formData.get('planType') as string
  const planType: PlanType = (rawPlan in PLAN_CONFIG) ? rawPlan as PlanType : 'monthly'
  const config = PLAN_CONFIG[planType]
  const rawCode = (formData.get('promoCode') as string) || ''

  const promo = await resolvePromo(user.id, planType, rawCode)
  if (rawCode.trim() && promo.error) {
    redirect(`/checkout?plan=${planType}&promoError=${encodeURIComponent(promo.error)}`)
  }

  const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN || ''
  })
  const preApproval = new PreApproval(client)

  let initPoint = ''

  try {
    const result = await preApproval.create({
      body: {
        reason: config.reason,
        // Codificamos userId|planType para que el webhook pueda asignar el rol correcto
        external_reference: `${user.id}|${planType}`,
        payer_email: user.email || '',
        back_url: "https://www.reason.com.ar/checkout/success",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ notification_url: "https://www.reason.com.ar/api/webhooks/mercadopago" } as any),
        auto_recurring: {
          frequency: config.frequency,
          frequency_type: "months",
          transaction_amount: promo.amount,
          currency_id: "ARS"
        }
      }
    })

    if (result.init_point) {
      initPoint = result.init_point
      if (promo.apply && result.id) {
        const admin = createAdminClient()
        const restoreAt = new Date()
        restoreAt.setMonth(restoreAt.getMonth() + PROMO_MONTHS)
        await admin.from('promo_redemptions').insert({
          user_id: user.id,
          code: PROMO_CODE,
          plan_type: planType,
          discounted_amount: promo.amount,
          full_amount: config.amount,
          mp_subscription_id: result.id,
          restore_at: restoreAt.toISOString(),
        })
      }
    } else {
      throw new Error('Mercado Pago no devolvió un link de pago válido')
    }
  } catch (error) {
    console.error('Error detallado de MP:', error)
    throw new Error('No se pudo iniciar el proceso de pago. Intenta nuevamente.')
  }

  if (initPoint) {
    redirect(initPoint)
  }
}
