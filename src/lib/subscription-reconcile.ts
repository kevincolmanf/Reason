import { createAdminClient } from '@/utils/supabase/admin'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'

export type Role = 'free' | 'subscriber' | 'pro' | 'admin'
export type SubStatus = 'active' | 'pending' | 'cancelled' | 'expired'

// Decisión de rol/estado a partir del estado real de Mercado Pago.
// `decisive === false` significa que MP no da evidencia clara (p. ej. 'pending'):
// en ese caso NO tocamos el rol, solo lo registramos para revisión manual.
export function resolveFromMp(params: {
  mpStatus: string
  planType: string
  effectiveExpiresAt: string | null // next_payment_date de MP, o el expires_at que ya teníamos
  now?: number
}): { targetRole: Exclude<Role, 'admin'>; targetStatus: SubStatus; decisive: boolean } {
  const { mpStatus, planType, effectiveExpiresAt } = params
  const now = params.now ?? Date.now()
  const isPro = (planType || '').startsWith('pro')
  const activeRole: Exclude<Role, 'admin'> = isPro ? 'pro' : 'subscriber'

  // Vencido si no tenemos fecha futura válida. Sin fecha => tratamos como vencido
  // (nunca extendemos acceso sobre una suscripción que ya no está autorizada).
  const expired =
    !effectiveExpiresAt || new Date(effectiveExpiresAt).getTime() < now

  if (mpStatus === 'authorized') {
    return { targetRole: activeRole, targetStatus: 'active', decisive: true }
  }
  if (mpStatus === 'cancelled') {
    return {
      targetRole: expired ? 'free' : activeRole,
      targetStatus: 'cancelled',
      decisive: true,
    }
  }
  if (mpStatus === 'paused') {
    // Pausada por problema de cobro: mantenemos acceso hasta que venza el período pago.
    return {
      targetRole: expired ? 'free' : activeRole,
      targetStatus: 'pending',
      decisive: true,
    }
  }
  // 'pending' u otros estados no concluyentes: no cambiamos el rol.
  return { targetRole: 'free', targetStatus: 'pending', decisive: false }
}

export type ReconcileChange = {
  userId: string
  email: string
  previousRole: string
  newRole: string
  mpSubscriptionId: string | null
  mpStatus: string
  subStatus: string
  reason: string
}

export type ReconcileResult = {
  dryRun: boolean
  scanned: number
  changes: ReconcileChange[]
  errors: { userId?: string; email?: string; message: string }[]
  runAt: string
}

// Recorre las suscripciones, verifica cada una en vivo contra Mercado Pago y
// corrige el rol del usuario cuando quedó desfasado. Nunca toca admins.
export async function runReconcile(opts: { dryRun: boolean }): Promise<ReconcileResult> {
  const admin = createAdminClient()
  const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' })
  const preApproval = new PreApproval(mpClient)

  const runAt = new Date().toISOString()
  const changes: ReconcileChange[] = []
  const errors: ReconcileResult['errors'] = []

  const { data: subs, error } = await admin
    .from('subscriptions')
    .select('user_id, mp_subscription_id, plan, status, expires_at')
  if (error) throw new Error(`No se pudieron leer las suscripciones: ${error.message}`)

  const userIds = (subs ?? []).map((s) => s.user_id)
  const { data: users } = await admin
    .from('users')
    .select('id, email, role')
    .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
  const userMap = new Map((users ?? []).map((u) => [u.id, u]))

  for (const sub of subs ?? []) {
    const u = userMap.get(sub.user_id)
    if (!u) continue
    if (u.role === 'admin') continue // nunca degradamos admins
    if (!sub.mp_subscription_id) {
      errors.push({ userId: u.id, email: u.email, message: 'Suscripción sin mp_subscription_id; se omite' })
      continue
    }

    let mpStatus: string
    let planType = sub.plan === 'annual' ? 'annual' : 'monthly'
    let mpNextPayment: string | null = null
    try {
      const full = await preApproval.get({ id: sub.mp_subscription_id })
      mpStatus = full.status ?? 'unknown'
      const externalRef = String(full.external_reference ?? '')
      if (externalRef.includes('|')) planType = externalRef.split('|')[1] || planType
      mpNextPayment = full.next_payment_date ? new Date(full.next_payment_date).toISOString() : null
    } catch (e) {
      // Si MP no responde o no encuentra la suscripción, NO tocamos el rol (evitamos
      // revocar acceso por un error transitorio). Se registra para revisión.
      errors.push({ userId: u.id, email: u.email, message: `MP no devolvió la suscripción ${sub.mp_subscription_id}: ${(e as Error).message}` })
      continue
    }

    const effectiveExpiresAt = mpNextPayment ?? (sub.expires_at ?? null)
    const { targetRole, targetStatus, decisive } = resolveFromMp({
      mpStatus,
      planType,
      effectiveExpiresAt,
    })

    if (!decisive) {
      errors.push({ userId: u.id, email: u.email, message: `Estado MP no concluyente (${mpStatus}); rol sin cambios` })
      continue
    }

    const roleChanged = u.role !== targetRole
    const statusChanged = sub.status !== targetStatus
    if (!roleChanged && !statusChanged) continue

    const reason = roleChanged
      ? `MP=${mpStatus}, vence ${effectiveExpiresAt ?? 's/f'} → rol ${u.role} → ${targetRole}`
      : `MP=${mpStatus} → estado de suscripción ${sub.status} → ${targetStatus}`

    if (roleChanged) {
      changes.push({
        userId: u.id,
        email: u.email,
        previousRole: u.role,
        newRole: targetRole,
        mpSubscriptionId: sub.mp_subscription_id,
        mpStatus,
        subStatus: targetStatus,
        reason,
      })
    }

    if (!opts.dryRun) {
      if (statusChanged || (effectiveExpiresAt && effectiveExpiresAt !== sub.expires_at)) {
        await admin
          .from('subscriptions')
          .update({ status: targetStatus, expires_at: effectiveExpiresAt })
          .eq('user_id', u.id)
      }
      if (roleChanged) {
        await admin.from('users').update({ role: targetRole }).eq('id', u.id)
      }
    }
  }

  // Registrar en la tabla de auditoría (solo los cambios de rol).
  if (changes.length > 0) {
    await admin.from('subscription_reconcile_log').insert(
      changes.map((c) => ({
        run_at: runAt,
        user_id: c.userId,
        email: c.email,
        previous_role: c.previousRole,
        new_role: c.newRole,
        mp_subscription_id: c.mpSubscriptionId,
        mp_status: c.mpStatus,
        sub_status: c.subStatus,
        applied: !opts.dryRun,
        reason: c.reason,
      }))
    )
  }

  return { dryRun: opts.dryRun, scanned: (subs ?? []).length, changes, errors, runAt }
}
