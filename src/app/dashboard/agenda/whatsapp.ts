// Helpers compartidos para el recordatorio por WhatsApp.
// Fuente única de verdad del mensaje: lo usan tanto la agenda (AgendaClient)
// como la página de recordatorios (RecordatoriosClient), así el texto que le
// llega al paciente es idéntico desde ambos lados.

export function formatArgentinePhone(phone: string): string {
  let n = phone.replace(/\D/g, '')
  if (n.startsWith('549') || n.startsWith('5411')) return n
  if (n.startsWith('54')) return n
  if (n.startsWith('0')) n = n.slice(1)
  if (n.startsWith('15')) n = n.slice(2)
  return `54${n}`
}

// Link de confirmación del paciente: usa el dominio de producción configurado
// para que nunca le llegue una URL de preview (*.vercel.app). Si no está seteado,
// cae al origen actual.
export function buildConfirmUrl(token: string | null): string | null {
  if (!token) return null
  const base = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  return base ? `${base}/turno/${token}` : null
}

export function buildWhatsAppUrl(phone: string, name: string, start: Date, area: string, org: string | null, confirmUrl: string | null): string {
  const clean = formatArgentinePhone(phone)
  const fecha = start.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora  = start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const lugar = org ?? 'el centro'
  const cierre = confirmUrl
    ? `Avisanos si vas a asistir con un toque acá:\n${confirmUrl}\n\n¡Te esperamos!`
    : `Para confirmar o cancelar, respondé este mensaje. ¡Te esperamos!`
  const msg =
    `Hola ${name},\n\n` +
    `Te recordamos tu próximo turno en ${lugar}:\n\n` +
    `Fecha: ${fecha}\n` +
    `Hora: ${hora}\n` +
    `Área: ${area}\n\n` +
    cierre
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`
}
