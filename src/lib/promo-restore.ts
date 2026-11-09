import { createAdminClient } from '@/utils/supabase/admin'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { sendEmail } from '@/lib/notify-email'

const REMINDER_DAYS_BEFORE = 5

export type PromoRestoreChange = {
  userId: string
  mpSubscriptionId: string
  fullAmount: number
}

export type PromoRestoreResult = {
  dryRun: boolean
  scanned: number
  changes: PromoRestoreChange[]
  errors: { userId?: string; mpSubscriptionId?: string; message: string }[]
}

// Pasa a precio completo las suscripciones con descuento de campaña (código,
// 50% x 3 meses) una vez vencido `restore_at`. Corre junto al reconcile diario.
export async function runPromoRestore(opts: { dryRun: boolean }): Promise<PromoRestoreResult> {
  const admin = createAdminClient()
  const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' })
  const preApproval = new PreApproval(mpClient)

  const changes: PromoRestoreChange[] = []
  const errors: PromoRestoreResult['errors'] = []

  const { data: rows, error } = await admin
    .from('promo_redemptions')
    .select('user_id, mp_subscription_id, full_amount, restore_at')
    .is('restored_at', null)
    .lte('restore_at', new Date().toISOString())
  if (error) throw new Error(`No se pudieron leer promo_redemptions: ${error.message}`)

  for (const row of rows ?? []) {
    try {
      if (!opts.dryRun) {
        await preApproval.update({
          id: row.mp_subscription_id,
          body: { auto_recurring: { transaction_amount: row.full_amount, currency_id: 'ARS' } },
        })
        await admin
          .from('promo_redemptions')
          .update({ restored_at: new Date().toISOString() })
          .eq('mp_subscription_id', row.mp_subscription_id)
      }
      changes.push({ userId: row.user_id, mpSubscriptionId: row.mp_subscription_id, fullAmount: row.full_amount })
    } catch (e) {
      errors.push({ userId: row.user_id, mpSubscriptionId: row.mp_subscription_id, message: (e as Error).message })
    }
  }

  return { dryRun: opts.dryRun, scanned: (rows ?? []).length, changes, errors }
}

export type PromoReminderResult = {
  dryRun: boolean
  scanned: number
  sent: number
  errors: { userId?: string; message: string }[]
}

// Avisa por mail unos días antes de que el descuento de campaña venza, para
// que a nadie le sorprenda el cobro a precio completo. Corre junto al cron.
export async function runPromoReminders(opts: { dryRun: boolean }): Promise<PromoReminderResult> {
  const admin = createAdminClient()
  const errors: PromoReminderResult['errors'] = []
  let sent = 0

  const windowEnd = new Date(Date.now() + REMINDER_DAYS_BEFORE * 24 * 60 * 60 * 1000)
  const { data: rows, error } = await admin
    .from('promo_redemptions')
    .select('user_id, discounted_amount, full_amount, restore_at')
    .is('restored_at', null)
    .is('reminder_sent_at', null)
    .lte('restore_at', windowEnd.toISOString())
  if (error) throw new Error(`No se pudieron leer promo_redemptions: ${error.message}`)

  const userIds = (rows ?? []).map((r) => r.user_id)
  const { data: users } = await admin
    .from('users')
    .select('id, email')
    .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
  const emailByUser = new Map((users ?? []).map((u) => [u.id, u.email]))

  for (const row of rows ?? []) {
    const email = emailByUser.get(row.user_id)
    if (!email) {
      errors.push({ userId: row.user_id, message: 'Sin email para avisar' })
      continue
    }
    const restoreDateLabel = new Date(row.restore_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    try {
      if (!opts.dryRun) {
        await sendEmail({
          to: email,
          subject: `Tu descuento Reason vence el ${restoreDateLabel}`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#201c17">
              <p style="font-size:20px;font-weight:600">reason<span style="color:#c25a2c">.</span></p>
              <p>Este es un aviso: tu descuento de campaña (venís pagando <strong>$${row.discounted_amount.toLocaleString('es-AR')}/mes</strong>) termina el <strong>${restoreDateLabel}</strong>.</p>
              <p>Desde esa fecha, tu suscripción pasa a cobrarse a precio normal: <strong>$${row.full_amount.toLocaleString('es-AR')}/mes</strong>.</p>
              <p>Si no querés continuar, podés cancelar antes desde tu cuenta — sin compromiso.</p>
              <p style="font-size:12px;color:#a89f88;margin-top:28px">Reason — la plataforma clínica para kinesiólogos.</p>
            </div>`,
        })
        await admin
          .from('promo_redemptions')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('user_id', row.user_id)
      }
      sent++
    } catch (e) {
      errors.push({ userId: row.user_id, message: (e as Error).message })
    }
  }

  return { dryRun: opts.dryRun, scanned: (rows ?? []).length, sent, errors }
}
