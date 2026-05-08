'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'

export async function createSubscriptionPreference(planType: 'monthly' | 'annual') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  console.log('MP Token disponible:', !!process.env.MP_ACCESS_TOKEN)
  const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || '' 
  })
  const preApproval = new PreApproval(client)

  let initPoint = ''

  try {
    const result = await preApproval.create({
      body: {
        reason: planType === 'annual' ? "Suscripción Anual Reason" : "Suscripción Mensual Reason",
        external_reference: user.id,
        payer_email: user.email || '',
        back_url: "https://www.reason.com.ar/dashboard",
        auto_recurring: {
          frequency: planType === 'annual' ? 12 : 1,
          frequency_type: "months",
          transaction_amount: planType === 'annual' ? 150000 : 18000,
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

  // El redirect de Next.js DEBE ir fuera del try/catch, porque lanza un error interno (NEXT_REDIRECT) para funcionar.
  if (initPoint) {
    redirect(initPoint)
  }
}
