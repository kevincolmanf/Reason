import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

function expectedRole(status: string, planId: string, expiresAt: string | null): 'subscriber' | 'pro' | 'free' {
  const isPro = planId === 'pro_monthly' || planId === 'pro_annual'
  if (status === 'active') return isPro ? 'pro' : 'subscriber'
  if (status === 'cancelled' || status === 'expired') {
    const expired = !expiresAt || new Date(expiresAt).getTime() < Date.now()
    if (expired) return 'free'
    return isPro ? 'pro' : 'subscriber'
  }
  return 'free'
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: adminUser } = await admin.from('users').select('role').eq('id', user.id).single()
  if (adminUser?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const dryRun: boolean = body.dryRun !== false

  // Fetch all subscriptions + matching user role
  const { data: subs, error } = await admin
    .from('subscriptions')
    .select('user_id, status, mp_plan_id, expires_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = (subs ?? []).map(s => s.user_id)
  const { data: users } = await admin
    .from('users')
    .select('id, email, role')
    .in('id', userIds)

  const userMap = new Map((users ?? []).map(u => [u.id, u]))

  const fixes: { userId: string; email: string; currentRole: string; correctRole: string; plan: string; status: string }[] = []

  for (const sub of subs ?? []) {
    const u = userMap.get(sub.user_id)
    if (!u) continue
    const correct = expectedRole(sub.status, sub.mp_plan_id ?? 'monthly', sub.expires_at)
    if (u.role !== correct && u.role !== 'admin') {
      fixes.push({ userId: u.id, email: u.email, currentRole: u.role, correctRole: correct, plan: sub.mp_plan_id ?? '?', status: sub.status })
    }
  }

  if (!dryRun && fixes.length > 0) {
    for (const fix of fixes) {
      await admin.from('users').update({ role: fix.correctRole }).eq('id', fix.userId)
    }
  }

  return NextResponse.json({ dryRun, fixes })
}
