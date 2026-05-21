'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'

type PlanType = 'monthly' | 'annual' | 'pro_monthly' | 'pro_annual'

const PLAN_CONFIG: Record<PlanType, { reason: string; frequency: number; amount: number }> = {
  monthly:     { reason: 'Suscripción Mensual Reason',     frequency: 1,  amount: 18000    },
  annual:      { reason: 'Suscripción Anual Reason',       frequency: 12, amount: 150000   },
  pro_monthly: { reason: 'Suscripción Pro Mensual Reason', frequency: 1,  amount: 150000   },
  pro_annual:  { reason: 'Suscripción Pro Anual Reason',   frequency: 12, amount: 1350000  },
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
        back_url: "https://www.reason.com.ar/dashboard",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ notification_url: "https://www.reason.com.ar/api/webhooks/mercadopago" } as any),
        auto_recurring: {
          frequency: config.frequency,
          frequency_type: "months",
          transaction_amount: config.amount,
          currency_id: "ARS"
        }
      }
    })

    if (result.init_point) {
      initPoint = result.init_point
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
