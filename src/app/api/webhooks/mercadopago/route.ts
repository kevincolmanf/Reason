import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { createHmac } from 'crypto'

function verifyMpSignature(request: Request, dataId: string, rawSignature: string, requestId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    console.warn('MP_WEBHOOK_SECRET no configurado — verificación de firma omitida')
    return true
  }

  // Extraer ts y v1 del header x-signature
  const parts = Object.fromEntries(rawSignature.split(',').map(p => p.split('=')))
  const ts = parts['ts']
  const v1 = parts['v1']

  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')

  return expected === v1
}

export async function POST(request: Request) {
  const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN || ''
  })
  const preApproval = new PreApproval(mpClient)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()

    // Verificar firma antes de procesar nada
    if (body.type === 'subscription_preapproval' || body.topic === 'subscription_preapproval') {
      const rawSignature = request.headers.get('x-signature') || ''
      const requestId = request.headers.get('x-request-id') || ''
      const dataId = body.data?.id || ''

      if (rawSignature && !verifyMpSignature(request, dataId, rawSignature, requestId)) {
        console.error('Webhook: firma inválida', { rawSignature, requestId, dataId })
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    await supabaseAdmin.from('webhook_logs').insert([{
      event_type: body.type || body.topic || 'unknown',
      payload: body,
      processed: false
    }])

    if (body.type === 'subscription_preapproval' || body.topic === 'subscription_preapproval') {
      const preApprovalId = body.data?.id

      if (!preApprovalId) {
        return NextResponse.json({ error: 'No ID provided' }, { status: 400 })
      }

      const subscriptionData = await preApproval.get({ id: preApprovalId })
      const externalRef = subscriptionData.external_reference || ''

      // external_reference tiene formato "userId|planType" (nuevo) o solo "userId" (legacy)
      const [userId, planType] = externalRef.includes('|')
        ? externalRef.split('|')
        : [externalRef, 'monthly']

      if (!userId) {
        console.error('Webhook: Suscripción no tiene external_reference (user.id)')
        return NextResponse.json({ status: 'ignored' })
      }

      const status = subscriptionData.status
      const isPro = planType === 'pro_monthly' || planType === 'pro_annual'

      const nextPaymentDate = subscriptionData.next_payment_date
        ? new Date(subscriptionData.next_payment_date).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      let newRole = 'free'
      let dbStatus = 'pending'

      if (status === 'authorized') {
        newRole = isPro ? 'pro' : 'subscriber'
        dbStatus = 'active'
      } else if (status === 'cancelled') {
        dbStatus = 'cancelled'
        const isExpired = new Date(nextPaymentDate).getTime() < Date.now()
        newRole = isExpired ? 'free' : (isPro ? 'pro' : 'subscriber')
      }

      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          mp_subscription_id: preApprovalId,
          mp_plan_id: planType,
          status: dbStatus,
          expires_at: nextPaymentDate
        }, { onConflict: 'user_id' })

      if (subError) throw subError

      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

      if (userError) throw userError

      await supabaseAdmin.from('webhook_logs')
        .update({ processed: true })
        .eq('payload->>data->>id', preApprovalId)

      return NextResponse.json({ status: 'success' })
    }

    return NextResponse.json({ status: 'ignored' })

  } catch (error) {
    console.error('Error procesando webhook:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
