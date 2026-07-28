import Header from '@/components/Header'
import Link from 'next/link'
import PacienteDetail from './PacienteDetail'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { verifyPatientAccess } from '@/utils/patient-access'

export const metadata = {
  title: 'Paciente | Reason',
}

export default async function PacientePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await verifyPatientAccess(params.id, user.id)

  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !patient) redirect('/dashboard/pacientes')

  // Hitos del tratamiento (evaluación, RTP, alta, competencia, etc.)
  const { data: events } = await supabase
    .from('patient_events')
    .select('id, event_date, type, title, note')
    .eq('patient_id', params.id)
    .order('event_date', { ascending: true })

  // Inicio del tratamiento: el día en que se cargó el primer plan de entrenamiento.
  // Desde ahí se cuentan las semanas y meses de trabajo.
  const { data: firstPlan } = await supabase
    .from('exercise_plans')
    .select('created_at')
    .eq('patient_id', params.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // Profesionales del equipo, para elegir el profesional habitual del paciente.
  // Solo aplica a pacientes de una organización (equipos con varios profesionales).
  let professionals: { id: string; full_name: string | null }[] = []
  if (patient.org_id) {
    type MemberRow = { users: { id: string; full_name: string | null; email: string | null } | null }
    const [{ data: org }, { data: memberRows }] = await Promise.all([
      supabase.from('organizations').select('owner_id').eq('id', patient.org_id).single(),
      supabase.from('organization_members').select('users(id, full_name, email)').eq('org_id', patient.org_id),
    ])
    professionals = ((memberRows ?? []) as unknown as MemberRow[])
      .filter(m => m.users)
      .map(m => ({ id: m.users!.id, full_name: m.users!.full_name ?? m.users!.email }))
    // Incluir al dueño de la organización si no figura entre los integrantes.
    if (org?.owner_id && !professionals.some(p => p.id === org.owner_id)) {
      const { data: ownerUser } = await supabase
        .from('users').select('id, full_name, email').eq('id', org.owner_id).single()
      if (ownerUser) professionals.unshift({ id: ownerUser.id, full_name: ownerUser.full_name ?? ownerUser.email })
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-8 py-12">
        <div className="mb-8">
          <Link href="/dashboard/pacientes" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">
            ← Volver a Mis Pacientes
          </Link>
        </div>

        <PacienteDetail patient={patient} userId={user.id} initialEvents={events ?? []} treatmentStart={firstPlan?.created_at ?? null} professionals={professionals} />
      </main>
    </div>
  )
}
