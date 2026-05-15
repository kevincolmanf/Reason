import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import LoadMonitorClient from './LoadMonitorClient'
import { verifyPatientAccess } from '@/utils/patient-access'

export const metadata = {
  title: 'Monitoreo de Carga | Reason',
}

export default async function CargaPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await verifyPatientAccess(params.id, user.id)

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, name')
    .eq('id', params.id)
    .single()

  if (patientError || !patient) redirect('/dashboard/pacientes')

  const [{ data: sessions }, { data: plans }] = await Promise.all([
    supabase
      .from('load_sessions')
      .select('id, session_date, activity, duration_minutes, rpe, load_units, vas_pre, vas_during, vas_post, notes, source, sleep_quality, energy, stress')
      .eq('patient_id', patient.id)
      .order('session_date', { ascending: false })
      .limit(56),
    supabase
      .from('exercise_plans')
      .select('id')
      .eq('patient_id', patient.id),
  ])

  const planIds = plans?.map(p => p.id) ?? []
  const { data: activityLogs } = planIds.length > 0
    ? await supabase
        .from('plan_activity_logs')
        .select('id, exercise_name, rpe, eva, notes, logged_at')
        .in('plan_id', planIds)
        .order('logged_at', { ascending: false })
        .limit(300)
    : { data: [] }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-8 py-12">
        <div className="mb-8">
          <Link
            href={`/dashboard/pacientes/${patient.id}`}
            className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6"
          >
            ← Volver a {patient.name}
          </Link>
          <h1 className="text-[28px] font-medium tracking-[-0.01em]">
            Monitoreo de Carga — {patient.name}
          </h1>
        </div>

        <LoadMonitorClient
          patientId={patient.id}
          userId={user.id}
          initialSessions={sessions ?? []}
          initialActivityLogs={activityLogs ?? []}
        />
      </main>
    </div>
  )
}
