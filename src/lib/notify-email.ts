// Envío de email best-effort vía Resend (API REST, sin dependencias extra).
// Si no hay RESEND_API_KEY configurada, no falla: simplemente no envía y avisa
// en el resultado. Así el resto del flujo (reconciliación + auditoría) funciona
// aunque todavía no se haya configurado el proveedor de email.

export async function sendEmail(params: {
  subject: string
  html: string
  to?: string
}): Promise<{ sent: boolean; skipped?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { sent: false, skipped: 'RESEND_API_KEY no configurada' }

  const to = params.to || process.env.RECONCILE_ALERT_EMAIL || 'kevincolmanf@gmail.com'
  const from = process.env.RESEND_FROM || 'Reason <onboarding@resend.dev>'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject: params.subject, html: params.html }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { sent: false, error: `Resend ${res.status}: ${body.slice(0, 300)}` }
    }
    return { sent: true }
  } catch (e) {
    return { sent: false, error: (e as Error).message }
  }
}
