import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CalendarioClient from './CalendarioClient'
import { verifyPatientAccess } from '@/utils/patient-access'

export default async function CalendarioPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await verifyPatientAccess(params.id, user.id)

  const { data: patient } = await supabase
    .from('patients')
    .select('id, name')
    .eq('id', params.id)
    .single()

  if (!patient) redirect('/dashboard/pacientes')

  // Un plan por paciente: buscar el plan asignado a este paciente
  const { data: plans } = await supabase
    .from('exercise_plans')
    .select('id, name, start_date, plan_data')
    .eq('patient_id', params.id)
    .order('updated_at', { ascending: false })
    .limit(1)

  // Si no hay plan asignado, cargar los planes disponibles del kine para vincular
  let unassignedPlans: { id: string; name: string }[] = []
  if (!plans || plans.length === 0) {
    const { data } = await supabase
      .from('exercise_plans')
      .select('id, name')
      .eq('user_id', user.id)
      .is('patient_id', null)
      .order('updated_at', { ascending: false })
      .limit(10)
    unassignedPlans = data ?? []
  }

  const [{ data: scheduled }, { data: turnosByPatientId }, { data: turnosByName }] = await Promise.all([
    supabase
      .from('scheduled_sessions')
      .select('*')
      .eq('patient_id', params.id)
      .order('scheduled_date', { ascending: true }),
    // Turnos vinculados por patient_id
    supabase
      .from('turnos')
      .select('start_time')
      .eq('patient_id', params.id)
      .not('is_blocked', 'is', true),
    // Turnos vinculados solo por nombre (sin patient_id)
    supabase
      .from('turnos')
      .select('start_time')
      .is('patient_id', null)
      .ilike('patient_name', patient.name)
      .not('is_blocked', 'is', true),
  ])

  // Fechas únicas de ambas búsquedas
  const turnoDates = Array.from(new Set([
    ...(turnosByPatientId ?? []).map(t => t.start_time.slice(0, 10)),
    ...(turnosByName ?? []).map(t => t.start_time.slice(0, 10)),
  ]))

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href={`/dashboard/pacientes/${params.id}`} className="text-[13px] text-text-secondary hover:text-text-primary transition-colors">
          ← {patient.name}
        </Link>
      </div>
      <h1 className="text-[24px] font-medium tracking-[-0.01em] mb-6">Calendario</h1>
      <CalendarioClient
        patientId={params.id}
        userId={user.id}
        patientName={patient.name}
        plans={plans ?? []}
        unassignedPlans={unassignedPlans}
        initialScheduled={scheduled ?? []}
        turnoDates={turnoDates}
      />
    </div>
  )
}
