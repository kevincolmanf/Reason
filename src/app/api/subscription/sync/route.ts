import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: dbUser } = await admin.from('users').select('role').eq('id', user.id).single()

  // Si ya tiene un rol pago, no hay nada que hacer
  if (dbUser?.role && dbUser.role !== 'free') {
    return NextResponse.json({ role: dbUser.role, synced: false })
  }

  const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' })
  const preApproval = new PreApproval(mpClient)

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchResult = await preApproval.search({ options: { payer_email: user.email } as any })
    const results = searchResult.results ?? []

    const authorized = results.find(s => s.status === 'authorized')
    if (!authorized?.id) {
      return NextResponse.json({ role: 'free', synced: false })
    }

    const fullSub = await preApproval.get({ id: authorized.id })
    const externalRef = fullSub.external_reference || ''
    const parts = externalRef.includes('|') ? externalRef.split('|') : [externalRef, 'monthly']
    const refUserId = parts[0]
    const planType = parts[1] ?? 'monthly'

    // Verificar que la suscripción pertenece a este usuario
    // refUserId puede estar vacío si la external_reference no tiene el formato userId|plan
    if (refUserId && refUserId !== user.id) {
      return NextResponse.json({ role: 'free', synced: false })
    }

    const isPro = planType === 'pro_monthly' || planType === 'pro_annual'
    const newRole = isPro ? 'pro' : 'subscriber'
    const nextPaymentDate = fullSub.next_payment_date
      ? new Date(fullSub.next_payment_date).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const planEnum = (planType === 'pro_annual' || planType === 'annual') ? 'annual' : 'monthly'

    await admin.from('subscriptions').upsert(
      {
        user_id: user.id,
        mp_subscription_id: authorized.id,
        plan: planEnum,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: nextPaymentDate,
      },
      { onConflict: 'user_id' }
    )
    await admin.from('users').upsert({ id: user.id, email: user.email ?? '', role: newRole }, { onConflict: 'id' })

    return NextResponse.json({ role: newRole, synced: true })
  } catch (error) {
    console.error('Subscription sync error:', error)
    return NextResponse.json({ role: dbUser?.role ?? 'free', synced: false, error: (error as Error).message })
  }
}
