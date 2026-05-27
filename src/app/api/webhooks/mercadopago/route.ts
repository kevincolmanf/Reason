import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MercadoPagoConfig, PreApproval, Payment, Invoice } from 'mercadopago'

const PLAN_ENUM_MAP: Record<string, 'monthly' | 'annual'> = {
  pro_annual: 'annual',
  annual: 'annual',
  pro_monthly: 'monthly',
  monthly: 'monthly',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncUserFromPreApproval(supabaseAdmin: any, mpClient: MercadoPagoConfig, preApprovalId: string) {
  const preApproval = new PreApproval(mpClient)
  const sub = await preApproval.get({ id: preApprovalId })
  const externalRef = sub.external_reference || ''

  const parts = externalRef.includes('|') ? externalRef.split('|') : [externalRef, 'monthly']
  const userId = parts[0]
  const planType = parts[1] ?? 'monthly'

  if (!userId) throw new Error(`PreApproval ${preApprovalId} sin external_reference`)

  const status = sub.status
  const isPro = planType === 'pro_monthly' || planType === 'pro_annual'

  const nextPaymentDate = sub.next_payment_date
    ? new Date(sub.next_payment_date).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  let newRole: 'free' | 'subscriber' | 'pro' = 'free'
  let dbStatus: 'active' | 'cancelled' | 'pending' | 'expired' = 'pending'

  if (status === 'authorized') {
    newRole = isPro ? 'pro' : 'subscriber'
    dbStatus = 'active'
  } else if (status === 'cancelled') {
    dbStatus = 'cancelled'
    newRole = new Date(nextPaymentDate).getTime() < Date.now()
      ? 'free'
      : (isPro ? 'pro' : 'subscriber')
  }

  const planEnum = PLAN_ENUM_MAP[planType] ?? 'monthly'

  const { error: subError } = await supabaseAdmin
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        mp_subscription_id: preApprovalId,
        plan: planEnum,
        status: dbStatus,
        started_at: new Date().toISOString(),
        expires_at: nextPaymentDate,
      },
      { onConflict: 'user_id' }
    )
  if (subError) throw subError

  const { error: userError } = await supabaseAdmin
    .from('users')
    .update({ role: newRole })
    .eq('id', userId)
  if (userError) throw userError

  // Para planes Pro: propagar rol a miembros de la organización
  if (isPro) {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('owner_id', userId)
      .single()

    if (org) {
      const { data: members } = await supabaseAdmin
        .from('organization_members')
        .select('user_id')
        .eq('org_id', org.id)
        .neq('user_id', userId)

      if (members?.length) {
        await supabaseAdmin
          .from('users')
          .update({ role: newRole })
          .in('id', members.map((m: { user_id: string }) => m.user_id))
      }
    }
  }
}

export async function POST(request: Request) {
  const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN || '',
  })
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let logId: string | null = null

  try {
    // Soportar formato Webhook (JSON body) y formato IPN (query params)
    const url = new URL(request.url)
    const ipnTopic = url.searchParams.get('topic')
    const ipnId = url.searchParams.get('id')

    let body: Record<string, unknown>

    if (ipnTopic && ipnId) {
      // Formato IPN: topic=preapproval&id=SUB_ID → normalizar a estructura Webhook
      const normalizedType = ipnTopic === 'preapproval' ? 'subscription_preapproval' : ipnTopic
      body = { type: normalizedType, data: { id: ipnId }, _source: 'ipn' }
    } else {
      body = await request.json()
    }

    const eventType: string = (body.type as string) || (body.topic as string) || 'unknown'

    const { data: logRow } = await supabaseAdmin
      .from('webhook_logs')
      .insert([{ event_type: eventType, payload: body, processed: false }])
      .select('id')
      .single()
    logId = (logRow as { id: string } | null)?.id ?? null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = body.data as any

    if (eventType === 'subscription_preapproval') {
      const preApprovalId: string | undefined = data?.id
      if (!preApprovalId) throw new Error('subscription_preapproval sin data.id')
      await syncUserFromPreApproval(supabaseAdmin, mpClient, preApprovalId)

    } else if (eventType === 'subscription_authorized_payment') {
      // Pago recurrente de una suscripción activa
      const authorizedPaymentId: string | undefined = data?.id
      if (authorizedPaymentId) {
        const invoice = new Invoice(mpClient)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoiceData = await invoice.get({ id: authorizedPaymentId }) as any
        const preApprovalId: string | undefined = invoiceData?.preapproval_id
        if (preApprovalId) {
          await syncUserFromPreApproval(supabaseAdmin, mpClient, preApprovalId)
        } else {
          console.warn('subscription_authorized_payment: invoice sin preapproval_id', invoiceData)
        }
      }

    } else if (eventType === 'payment') {
      // Pago individual — puede ser de una suscripción
      const paymentId: string | undefined = data?.id
      if (paymentId) {
        const payment = new Payment(mpClient)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const paymentData = await payment.get({ id: paymentId }) as any
        if (paymentData.status === 'approved') {
          const preApprovalId: string | undefined =
            paymentData.metadata?.preapproval_id ?? paymentData.preapproval_id
          if (preApprovalId) {
            await syncUserFromPreApproval(supabaseAdmin, mpClient, preApprovalId)
          }
          // Si no tiene preapproval_id no es un pago de suscripción, se ignora sin error
        }
      }
    }

    if (logId) {
      await supabaseAdmin.from('webhook_logs').update({ processed: true }).eq('id', logId)
    }

    return NextResponse.json({ status: 'ok' })

  } catch (error) {
    console.error('Webhook MP error:', error)
    if (logId) {
      await supabaseAdmin
        .from('webhook_logs')
        .update({ error_message: (error as Error).message })
        .eq('id', logId)
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
