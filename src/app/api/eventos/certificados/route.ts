import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendEmail } from '@/lib/notify-email'

// Envía los certificados de un evento a los inscriptos con CHECK-IN (asistieron),
// por mail, con un link a su certificado. Solo el organizador del evento. Guarda
// los datos del certificado (entidad + firma) en el evento.
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: { eventId?: string; entity?: string; signer?: string; signerRole?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }
  const { eventId, entity, signer, signerRole } = body
  if (!eventId) return NextResponse.json({ error: 'Falta el evento' }, { status: 400 })

  const admin = createAdminClient()

  // El evento tiene que ser del organizador.
  const { data: event } = await admin.from('events').select('id, title, starts_at, creator_id').eq('id', eventId).maybeSingle()
  if (!event || event.creator_id !== user.id) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

  // Guardamos los datos del certificado en el evento.
  await admin.from('events').update({
    cert_entity: entity?.trim() || null,
    cert_signer: signer?.trim() || null,
    cert_signer_role: signerRole?.trim() || null,
  }).eq('id', eventId)

  // Inscriptos con check-in.
  const { data: regs } = await admin
    .from('event_registrations')
    .select('id, name, email, cert_token')
    .eq('event_id', eventId)
    .eq('checked_in', true)

  const list = (regs ?? []) as { id: string; name: string; email: string; cert_token: string }[]
  if (list.length === 0) return NextResponse.json({ error: 'No hay asistentes con check-in todavía.' }, { status: 409 })

  const base = process.env.NEXT_PUBLIC_SITE_URL || `https://${request.headers.get('host') ?? 'www.reason.com.ar'}`
  const fmtDate = new Date(event.starts_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

  let sent = 0
  let failed = 0
  let firstError = ''
  // En tandas para no saturar el proveedor de mail.
  const chunk = 8
  for (let i = 0; i < list.length; i += chunk) {
    const slice = list.slice(i, i + chunk)
    const results = await Promise.allSettled(slice.map(r => {
      const url = `${base}/certificado/${r.cert_token}`
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#201c17">
          <p style="font-size:20px;font-weight:600">reason<span style="color:#c25a2c">.</span></p>
          <p>Hola ${r.name},</p>
          <p>Gracias por participar en <strong>${event.title}</strong> (${fmtDate}). Ya podés ver y descargar tu <strong>certificado de participación</strong>:</p>
          <p style="margin:24px 0">
            <a href="${url}" style="background:#c25a2c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">Ver mi certificado</a>
          </p>
          <p style="font-size:13px;color:#8a8276">O copiá este link: ${url}</p>
          <p style="font-size:12px;color:#a89f88;margin-top:28px">Enviado a través de Reason — la plataforma clínica para kinesiólogos.</p>
        </div>`
      return sendEmail({
        to: r.email,
        from: process.env.RESEND_FROM || 'Reason <eventos@reason.com.ar>',
        subject: `Tu certificado de ${event.title}`,
        html,
      })
    }))
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value.sent) sent++
      else {
        failed++
        if (!firstError) firstError = res.status === 'fulfilled' ? (res.value.error || res.value.skipped || 'error desconocido') : String(res.reason)
      }
    }
    // Marcamos como enviados los de esta tanda (best-effort).
    await admin.from('event_registrations').update({ certificate_sent_at: new Date().toISOString() }).in('id', slice.map(s => s.id))
  }

  return NextResponse.json({ ok: true, sent, failed, total: list.length, error: firstError || undefined })
}
