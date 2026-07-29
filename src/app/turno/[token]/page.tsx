import { createAdminClient } from '@/utils/supabase/admin'
import { notFound } from 'next/navigation'
import ConfirmTurnoClient from './ConfirmTurnoClient'

export const dynamic = 'force-dynamic'

// Normaliza un teléfono argentino al formato que espera wa.me (sin +, con 54).
function formatArgentinePhone(phone: string): string {
  let n = phone.replace(/\D/g, '')
  if (n.startsWith('549') || n.startsWith('5411')) return n
  if (n.startsWith('54')) return n
  if (n.startsWith('0')) n = n.slice(1)
  if (n.startsWith('15')) n = n.slice(2)
  return `54${n}`
}

// Arma el link de WhatsApp hacia el profesional con un mensaje pre-armado que
// incluye los datos del turno. El paciente solo completa el motivo.
function buildWhatsAppUrl(phone: string, patientName: string, start: string): string {
  const clean = formatArgentinePhone(phone)
  const fecha = new Date(start).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = new Date(start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const msg =
    `Hola, soy ${patientName}. ` +
    `Tengo turno el ${fecha} a las ${hora} y no voy a poder asistir. ` +
    `El motivo es:`
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`
}

export default async function ConfirmarTurnoPage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient()

  const { data: turno } = await supabase
    .from('turnos')
    .select('id, patient_name, start_time, end_time, area, status, org_id, is_blocked, confirm_token, professional_id, created_by')
    .eq('confirm_token', params.token)
    .single()

  if (!turno || turno.is_blocked) notFound()

  // WhatsApp destino y nombre de la clínica. Para turnos de una organización el
  // número es el de la clínica (un solo número, cargado por el dueño). Para
  // agendas personales (sin org) se usa el número del profesional del turno, o
  // el de quien lo creó. Si no hay número (o la columna aún no existe), queda
  // null y el botón "No voy a poder ir" no se muestra (cae al texto de fallback).
  let orgName: string | null = null
  let phone: string | null = null

  if (turno.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name, whatsapp')
      .eq('id', turno.org_id)
      .single()
    orgName = org?.name ?? null
    phone = (org?.whatsapp as string | null) ?? null
  } else {
    const candidateIds = [turno.professional_id, turno.created_by].filter(Boolean) as string[]
    if (candidateIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, whatsapp')
        .in('id', candidateIds)
      const byId = new Map((usersData ?? []).map(u => [u.id, u.whatsapp as string | null]))
      phone =
        (turno.professional_id && byId.get(turno.professional_id)) ||
        (turno.created_by && byId.get(turno.created_by)) ||
        null
    }
  }

  const whatsappUrl = phone ? buildWhatsAppUrl(phone, turno.patient_name, turno.start_time) : null

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="py-6 border-b-[0.5px] border-border bg-bg-primary/80 backdrop-blur-md">
        <div className="w-full max-w-[560px] mx-auto px-4 sm:px-6 flex justify-between items-center">
          <span className="text-[20px] font-medium tracking-[-0.01em] text-text-primary">
            reason<span className="text-accent">.</span>
          </span>
          {orgName && <span className="text-[13px] text-text-secondary">{orgName}</span>}
        </div>
      </header>
      <main className="flex-grow w-full max-w-[560px] mx-auto px-4 sm:px-6 py-10">
        <ConfirmTurnoClient
          token={params.token}
          patientName={turno.patient_name}
          startTime={turno.start_time}
          endTime={turno.end_time}
          area={turno.area}
          orgName={orgName}
          initialStatus={turno.status}
          whatsappUrl={whatsappUrl}
        />
      </main>
    </div>
  )
}
