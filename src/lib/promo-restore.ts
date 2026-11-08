import { createAdminClient } from '@/utils/supabase/admin'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'

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
