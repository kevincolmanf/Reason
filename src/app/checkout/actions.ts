'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { sendEmail } from '@/lib/notify-email'

type PlanType = 'monthly' | 'annual' | 'pro_monthly' | 'pro_annual'

const PLAN_CONFIG: Record<PlanType, { reason: string; frequency: number; amount: number }> = {
  monthly:     { reason: 'Suscripción Mensual Reason',     frequency: 1,  amount: 18000    },
  annual:      { reason: 'Suscripción Anual Reason',       frequency: 12, amount: 150000   },
  pro_monthly: { reason: 'Suscripción Pro Mensual Reason', frequency: 1,  amount: 150000   },
  pro_annual:  { reason: 'Suscripción Pro Anual Reason',   frequency: 12, amount: 1350000  },
}

// Descuento de campaña 50% x 3 meses, solo Suscriptor mensual, vigente del
// 15/11/2026 al 30/11/2026 (contenido promocional sale el 15/11). Ver doc
// "Primer uso y descuento de lanzamiento" (8/11/2026, ventana movida 9/11/2026).
// Único lugar donde vive esta fecha: no está duplicada en otro archivo de código.
const PROMO_CODE = 'KEVINCOLMAN'
const PROMO_WINDOW_START = new Date('2026-11-15T00:00:00-03:00') // inclusivo, hora Argentina
const PROMO_CUTOFF = new Date('2026-12-01T00:00:00-03:00') // exclusivo: válido hasta el 30/11 inclusive, hora Argentina
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
  if (Date.now() < PROMO_WINDOW_START.getTime()) {
    return { amount: PLAN_CONFIG[planType].amount, error: 'Esta promoción todavía no está disponible.', apply: false }
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

  const restoreAt = new Date()
  restoreAt.setMonth(restoreAt.getMonth() + PROMO_MONTHS)
  const restoreDateLabel = restoreAt.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

  // El payer ve este texto en la pantalla de autorización de MP y en su
  // resumen de cobros — es donde queda registrado que el precio es promocional.
  const reason = promo.apply
    ? `${config.reason} — promo: $${promo.amount.toLocaleString('es-AR')}/mes los primeros ${PROMO_MONTHS} meses, después $${config.amount.toLocaleString('es-AR')}/mes (desde el ${restoreDateLabel})`
    : config.reason

  try {
    const result = await preApproval.create({
      body: {
        reason,
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
        await admin.from('promo_redemptions').insert({
          user_id: user.id,
          code: PROMO_CODE,
          plan_type: planType,
          discounted_amount: promo.amount,
          full_amount: config.amount,
          mp_subscription_id: result.id,
          restore_at: restoreAt.toISOString(),
        })

        if (user.email) {
          await sendEmail({
            to: user.email,
            subject: 'Tu descuento Reason — $9.000/mes por 3 meses',
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#201c17">
                <p style="font-size:20px;font-weight:600">reason<span style="color:#c25a2c">.</span></p>
                <p>¡Listo! Tu suscripción quedó con el código <strong>${PROMO_CODE}</strong> aplicado:</p>
                <ul style="padding-left:20px">
                  <li>Pagás <strong>$${promo.amount.toLocaleString('es-AR')}/mes</strong> los primeros ${PROMO_MONTHS} meses.</li>
                  <li>Desde el <strong>${restoreDateLabel}</strong>, vuelve al precio normal: <strong>$${config.amount.toLocaleString('es-AR')}/mes</strong>.</li>
                  <li>Cancelás cuando quieras desde tu cuenta, sin compromiso.</li>
                </ul>
                <p style="font-size:12px;color:#a89f88;margin-top:28px">Reason — la plataforma clínica para kinesiólogos.</p>
              </div>`,
          })
        }
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
