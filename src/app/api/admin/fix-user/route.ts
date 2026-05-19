import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user: sessionUser } } = await supabase.auth.getUser()
  if (!sessionUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: adminUser } = await admin.from('users').select('role').eq('id', sessionUser.id).single()
  if (adminUser?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Falta el email' }, { status: 400 })

  // Find user in Supabase auth
  const { data: { users: authUsers }, error: authErr } = await admin.auth.admin.listUsers()
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

  const targetAuth = authUsers.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!targetAuth) return NextResponse.json({ error: `No se encontró ningún usuario con email ${email}` }, { status: 404 })

  const userId = targetAuth.id

  const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' })
  const preApproval = new PreApproval(mpClient)

  // Search MP subscriptions by payer_email
  let mpSubId: string | undefined
  try {
    const searchResult = await preApproval.search({ options: { payer_email: email } })
    const results = searchResult.results ?? []
    // Prefer authorized, otherwise take the most recent
    const authorized = results.find(s => s.status === 'authorized')
    const best = authorized ?? results[0]
    mpSubId = best?.id
  } catch {
    // Search failed — will fall back to DB
  }

  // If we found a subscription in MP, fetch full details and sync
  if (mpSubId) {
    const fullSub = await preApproval.get({ id: mpSubId })

    const externalRef = String(fullSub.external_reference ?? '')
    const [, planType] = externalRef.includes('|') ? externalRef.split('|') : [userId, 'monthly']
    const isPro = planType === 'pro_monthly' || planType === 'pro_annual'
    const status = fullSub.status ?? 'pending'

    const nextPaymentDate = fullSub.next_payment_date
      ? new Date(fullSub.next_payment_date).toISOString()
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

    // Map to the enum values the production schema accepts
    const planEnum = planType === 'pro_annual' || planType === 'annual' ? 'annual' : 'monthly'
    await admin.from('subscriptions').upsert({
      user_id: userId,
      mp_subscription_id: fullSub.id,
      plan: planEnum,
      status: dbStatus,
      started_at: new Date().toISOString(),
      expires_at: nextPaymentDate,
    }, { onConflict: 'user_id' })

    await admin.from('users').update({ role: newRole }).eq('id', userId)

    return NextResponse.json({
      ok: true,
      source: 'mercadopago',
      email: targetAuth.email,
      role: newRole,
      plan: planType,
      status: dbStatus,
      expires_at: nextPaymentDate,
      mp_subscription_id: fullSub.id,
    })
  }

  // Fallback: use DB subscription if active
  const { data: dbSub } = await admin
    .from('subscriptions')
    .select('mp_plan_id, status, expires_at')
    .eq('user_id', userId)
    .single()

  if (dbSub && dbSub.status === 'active') {
    const isPro = dbSub.mp_plan_id === 'pro_monthly' || dbSub.mp_plan_id === 'pro_annual'
    const newRole = isPro ? 'pro' : 'subscriber'
    await admin.from('users').update({ role: newRole }).eq('id', userId)
    return NextResponse.json({
      ok: true,
      source: 'db_only',
      email: targetAuth.email,
      role: newRole,
      plan: dbSub.mp_plan_id,
      status: dbSub.status,
      expires_at: dbSub.expires_at,
      warning: 'No se encontró la suscripción en Mercado Pago. Se usaron datos de la DB.',
    })
  }

  return NextResponse.json({
    ok: false,
    email: targetAuth.email,
    error: 'No se encontró ninguna suscripción activa en Mercado Pago ni en la DB para este usuario.',
  })
}
