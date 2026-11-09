import { NextResponse } from 'next/server'
import { runReconcile, type ReconcileResult } from '@/lib/subscription-reconcile'
import { runPromoRestore, runPromoReminders, type PromoRestoreResult, type PromoReminderResult } from '@/lib/promo-restore'
import { sendEmail } from '@/lib/notify-email'

// Cron diario de Vercel (ver vercel.json). Verifica cada suscripción en vivo
// contra Mercado Pago y baja a 'free' a quien canceló o venció, registrando cada
// cambio y avisando por email. Protegido con CRON_SECRET.
//
// Vercel Cron envía `Authorization: Bearer <CRON_SECRET>` automáticamente cuando
// la env var CRON_SECRET está definida. También se acepta `?secret=` para pruebas
// manuales, y `?dryRun=1` para simular sin aplicar cambios.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // sin secret configurado, no autorizamos nada
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true
  const url = new URL(request.url)
  return url.searchParams.get('secret') === secret
}

function buildPromoHtml(promo: PromoRestoreResult): string {
  if (promo.changes.length === 0 && promo.errors.length === 0) return ''
  const rows = promo.changes
    .map(
      (c) =>
        `<tr><td style="padding:4px 8px;border:1px solid #ddd">${c.userId}</td>` +
        `<td style="padding:4px 8px;border:1px solid #ddd">${c.mpSubscriptionId}</td>` +
        `<td style="padding:4px 8px;border:1px solid #ddd">$${c.fullAmount}</td></tr>`
    )
    .join('')
  const errorsHtml = promo.errors.length
    ? `<p style="color:#a00"><b>Revisar manualmente (${promo.errors.length}):</b></p><ul>` +
      promo.errors.map((e) => `<li>${e.userId ?? ''} (${e.mpSubscriptionId ?? ''}): ${e.message}</li>`).join('') +
      `</ul>`
    : ''
  return `
    <h2>Reason · Descuento de campaña vencido</h2>
    <p>Se volvieron a precio completo <b>${promo.changes.length}</b> suscripción(es) con el descuento de campaña cumplido.</p>
    ${rows ? `<table style="border-collapse:collapse"><thead><tr>
      <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Usuario</th>
      <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Suscripción MP</th>
      <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Precio restaurado</th>
    </tr></thead><tbody>${rows}</tbody></table>` : ''}
    ${errorsHtml}`
}

function buildPromoReminderHtml(reminders: PromoReminderResult): string {
  if (reminders.sent === 0 && reminders.errors.length === 0) return ''
  const errorsHtml = reminders.errors.length
    ? `<p style="color:#a00"><b>Revisar manualmente (${reminders.errors.length}):</b></p><ul>` +
      reminders.errors.map((e) => `<li>${e.userId ?? ''}: ${e.message}</li>`).join('') +
      `</ul>`
    : ''
  return `
    <h2>Reason · Avisos de descuento por vencer</h2>
    <p>Se avisó por mail a <b>${reminders.sent}</b> suscripción(es) con el descuento de campaña por vencer en los próximos 5 días.</p>
    ${errorsHtml}`
}

function buildEmailHtml(result: ReconcileResult, promo: PromoRestoreResult, reminders: PromoReminderResult): string {
  const rows = result.changes
    .map(
      (c) =>
        `<tr><td style="padding:4px 8px;border:1px solid #ddd">${c.email}</td>` +
        `<td style="padding:4px 8px;border:1px solid #ddd">${c.previousRole} → <b>${c.newRole}</b></td>` +
        `<td style="padding:4px 8px;border:1px solid #ddd">${c.mpStatus}</td>` +
        `<td style="padding:4px 8px;border:1px solid #ddd">${c.reason}</td></tr>`
    )
    .join('')
  const errorsHtml = result.errors.length
    ? `<p style="color:#a00"><b>Revisar manualmente (${result.errors.length}):</b></p><ul>` +
      result.errors.map((e) => `<li>${e.email ?? e.userId ?? ''}: ${e.message}</li>`).join('') +
      `</ul>`
    : ''
  return `
    <div style="font-family:system-ui,sans-serif;font-size:14px;color:#222">
      <h2>Reason · Reconciliación de suscripciones</h2>
      <p>Se revisaron <b>${result.scanned}</b> suscripciones. Se corrigieron <b>${result.changes.length}</b> rol(es).</p>
      ${result.changes.length
        ? `<table style="border-collapse:collapse"><thead><tr>
             <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Email</th>
             <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Cambio</th>
             <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">MP</th>
             <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Motivo</th>
           </tr></thead><tbody>${rows}</tbody></table>`
        : '<p>Sin cambios de rol.</p>'}
      ${errorsHtml}
      <p style="color:#888;font-size:12px">${result.runAt}${result.dryRun ? ' · (dry-run, sin aplicar)' : ''}</p>
      ${buildPromoHtml(promo)}
      ${buildPromoReminderHtml(reminders)}
    </div>`
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dryRun') === '1'

  try {
    const result = await runReconcile({ dryRun })
    const promo = await runPromoRestore({ dryRun })
    const reminders = await runPromoReminders({ dryRun })

    // Avisar por email solo si hubo cambios o algo para revisar.
    let email: Awaited<ReturnType<typeof sendEmail>> | { sent: false; skipped: string } = {
      sent: false,
      skipped: 'sin cambios',
    }
    if (
      result.changes.length > 0 || result.errors.length > 0 ||
      promo.changes.length > 0 || promo.errors.length > 0 ||
      reminders.sent > 0 || reminders.errors.length > 0
    ) {
      email = await sendEmail({
        subject: `Reason · ${result.changes.length} suscripción(es) corregida(s)${result.dryRun ? ' [dry-run]' : ''}`,
        html: buildEmailHtml(result, promo, reminders),
      })
    }

    return NextResponse.json({ ...result, promo, reminders, email })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
