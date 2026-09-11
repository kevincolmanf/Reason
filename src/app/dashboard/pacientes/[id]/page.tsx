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

  // Todas estas consultas dependen solo de params.id (no del contenido de la fila
  // `patient`), así que van en paralelo para bajar el TTFB de la ficha —la página
  // central del kine en tablet—. El acceso ya quedó verificado arriba con
  // verifyPatientAccess, y la RLS protege cada tabla por su cuenta.
  //  - patient: la fila del paciente (para el guard y kine_mode / org_id).
  //  - events: hitos del tratamiento (evaluación, RTP, alta, competencia, etc.).
  //  - firstPlan: día en que se cargó el primer plan (inicio del tratamiento).
  //  - fichaRow: ¿la ficha tiene contenido? (al abrirla por primera vez se crea
  //    una fila vacía, así que "tiene ficha" = ficha_data no vacío).
  //  - turnosCount: ¿el paciente tiene turnos? Distingue paciente de alumno de
  //    entrenamiento; se usa para sugerir el Modo Kinesiología, nunca para activarlo.
  const [
    { data: patient, error },
    { data: events },
    { data: firstPlan },
    { data: fichaRow },
    { count: turnosCount },
  ] = await Promise.all([
    supabase.from('patients').select('*').eq('id', params.id).single(),
    supabase
      .from('patient_events')
      .select('id, event_date, type, title, note')
      .eq('patient_id', params.id)
      .order('event_date', { ascending: true }),
    supabase
      .from('exercise_plans')
      .select('created_at')
      .eq('patient_id', params.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('patient_fichas')
      .select('ficha_data')
      .eq('patient_id', params.id)
      .maybeSingle(),
    supabase
      .from('turnos')
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', params.id),
  ])

  if (error || !patient) redirect('/dashboard/pacientes')

  const hasFicha = !!fichaRow?.ficha_data && Object.keys(fichaRow.ficha_data as Record<string, unknown>).length > 0
  const patientHasTurnos = (turnosCount ?? 0) > 0

  // Bitácora de "Atención de hoy": solo se consulta si el paciente está en modo
  // kine (los alumnos/entrenamiento no tienen ni usan esta tabla).
  let initialAttentions: unknown[] = []
  let kineSession: unknown = null
  if (patient.kine_mode) {
    // La bitácora y el plan más reciente son independientes entre sí (ambos solo
    // dependen de params.id) → en paralelo. La cadena de sesiones que sigue sí es
    // condicional (hoy → próxima → última) y queda secuencial.
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
    const [{ data: att }, { data: kinePlan }] = await Promise.all([
      supabase
        .from('kine_attentions')
        .select('id, attended_on, professional_name, symptom, manage_symptoms, modalities, auto_summary, note, created_at')
        .eq('patient_id', params.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('exercise_plans')
        .select('id, name')
        .eq('patient_id', params.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    initialAttentions = att ?? []

    // Sesión del plan para hoy (precargada del calendario). Si no hay sesión hoy,
    // se busca la próxima (para "traer a hoy") o la última como plantilla.
    if (kinePlan) {
      const { data: todaySession } = await supabase
        .from('scheduled_sessions')
        .select('id, scheduled_date, session_name, session_data, completed')
        .eq('plan_id', kinePlan.id)
        .eq('scheduled_date', todayStr)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      let pending: { date: string; kind: 'upcoming' | 'last' } | null = null
      if (!todaySession) {
        const { data: upcoming } = await supabase
          .from('scheduled_sessions')
          .select('scheduled_date')
          .eq('plan_id', kinePlan.id)
          .gt('scheduled_date', todayStr)
          .order('scheduled_date', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (upcoming) pending = { date: upcoming.scheduled_date, kind: 'upcoming' }
        else {
          const { data: last } = await supabase
            .from('scheduled_sessions')
            .select('scheduled_date')
            .eq('plan_id', kinePlan.id)
            .lt('scheduled_date', todayStr)
            .order('scheduled_date', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (last) pending = { date: last.scheduled_date, kind: 'last' }
        }
      }
      kineSession = { planId: kinePlan.id, today: todayStr, todaySession: todaySession ?? null, pending }
    }
  }

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

        <PacienteDetail patient={patient} userId={user.id} initialEvents={events ?? []} treatmentStart={firstPlan?.created_at ?? null} professionals={professionals} hasFicha={hasFicha} patientHasTurnos={patientHasTurnos} initialAttentions={initialAttentions as never} kineSession={kineSession as never} />
      </main>
    </div>
  )
}
