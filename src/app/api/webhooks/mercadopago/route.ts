import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'

// Iniciamos cliente de MP
const mpClient = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
})
const preApproval = new PreApproval(mpClient)

// Iniciamos cliente de Supabase (Service Role para poder escribir saltando el RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // 1. Loggear el webhook (para poder debuggear si falla)
    await supabaseAdmin.from('webhook_logs').insert([{
      event_type: body.type || body.topic || 'unknown',
      payload: body,
      processed: false
    }])

    // 2. Verificar si es un evento de suscripción
    if (body.type === 'subscription_preapproval' || body.topic === 'subscription_preapproval') {
      const preApprovalId = body.data?.id
      
      if (!preApprovalId) {
        return NextResponse.json({ error: 'No ID provided' }, { status: 400 })
      }

      // 3. Obtener la suscripción directamente de Mercado Pago (para evitar fraude)
      const subscriptionData = await preApproval.get({ id: preApprovalId })
      const userId = subscriptionData.external_reference
      const status = subscriptionData.status // 'authorized', 'pending', 'cancelled'
      const planId = 'custom'
      
      if (!userId) {
        console.error('Webhook: Suscripción no tiene external_reference (user.id)')
        return NextResponse.json({ status: 'ignored' })
      }

      // 4. Calcular expires_at basado en next_payment_date de MP
      // MP devuelve next_payment_date que es cuando se cobra el próximo ciclo
      const nextPaymentDate = subscriptionData.next_payment_date 
        ? new Date(subscriptionData.next_payment_date).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // fallback 30 días

      // 5. Mapear estado de MP a nuestro estado
      let newRole = 'free'
      let dbStatus = 'pending'

      if (status === 'authorized') {
        newRole = 'subscriber'
        dbStatus = 'active'
      } else if (status === 'cancelled') {
        // En cancelación, el rol SIGUE SIENDO subscriber hasta expires_at
        // Un cron job luego bajará el rol cuando expires_at sea menor a hoy.
        dbStatus = 'cancelled'
        
        // Verificamos si ya expiró hoy
        const isExpired = new Date(nextPaymentDate).getTime() < Date.now()
        newRole = isExpired ? 'free' : 'subscriber'
      }

      // 6. Upsert en tabla subscriptions
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          mp_subscription_id: preApprovalId,
          mp_plan_id: planId,
          status: dbStatus,
          expires_at: nextPaymentDate
        }, { onConflict: 'user_id' })

      if (subError) throw subError

      // 7. Actualizar el rol en la tabla users
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

      if (userError) throw userError

      // 8. Marcar webhook como procesado
      await supabaseAdmin.from('webhook_logs')
        .update({ processed: true })
        .eq('payload->>data->>id', preApprovalId)

      return NextResponse.json({ status: 'success' })
    }

    return NextResponse.json({ status: 'ignored' })

  } catch (error: any) {
    console.error('Error procesando webhook:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
