'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'

export async function cancelSubscription() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No autorizado')
  }

  // Obtenemos la suscripción activa del usuario
  const { data: subscription, error: dbError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (dbError || !subscription || !subscription.mp_subscription_id) {
    throw new Error('No se encontró una suscripción activa')
  }

  // Cancelar en Mercado Pago
  try {
    const client = new MercadoPagoConfig({ 
      accessToken: process.env.MP_ACCESS_TOKEN || '' 
    })
    const preApproval = new PreApproval(client)

    await preApproval.update({
      id: subscription.mp_subscription_id,
      body: { status: 'cancelled' }
    })
    
    // Aunque el webhook actualizará la DB, hacemos una actualización optimista local
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscription.id)

    revalidatePath('/account/subscription')
    
    return { success: true }
  } catch (error) {
    console.error('Error al cancelar suscripción en MP:', error)
    throw new Error('No se pudo cancelar la suscripción en Mercado Pago')
  }
}
