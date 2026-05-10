import { createAdminClient } from '@/utils/supabase/admin'
import PatientPortalClient from './PatientPortalClient'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Portal del Paciente | Reason',
}

export default async function PatientPortalPage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient()

  // Buscar el paciente por load_share_token, ignorando RLS
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, name, user_id')
    .eq('load_share_token', params.token)
    .single()

  if (patientError || !patient) {
    notFound()
  }

  // Últimos 3 planes de ejercicio del paciente
  const { data: plans, error: plansError } = await supabase
    .from('exercise_plans')
    .select('id, name, plan_data, start_date, notes')
    .eq('patient_id', patient.id)
    .order('updated_at', { ascending: false })
    .limit(3)

  if (plansError) console.error('[PatientPortal] plans error:', plansError.message)

  // Últimas 30 sesiones de carga del paciente
  const { data: recentSessions } = await supabase
    .from('load_sessions')
    .select('session_date, activity, rpe, load_units, vas_post, source')
    .eq('patient_id', patient.id)
    .order('session_date', { ascending: false })
    .limit(30)

  // Sesiones programadas: próximos 14 días + las de hoy
  const today = new Date().toISOString().split('T')[0]
  const in14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: scheduledSessions } = await supabase
    .from('scheduled_sessions')
    .select('id, plan_id, session_id, session_name, plan_name, scheduled_date, week, completed')
    .eq('patient_id', patient.id)
    .gte('scheduled_date', today)
    .lte('scheduled_date', in14)
    .order('scheduled_date', { ascending: true })

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="py-4 border-b-[0.5px] border-border bg-bg-primary/80 backdrop-blur-md sticky top-0 z-10">
        <div className="w-full max-w-[800px] mx-auto px-4 flex justify-between items-center">
          <div className="text-[18px] font-medium tracking-[-0.01em] text-text-primary">
            Portal de {patient.name}
          </div>
          <div className="text-[12px] text-text-secondary opacity-50">
            Powered by Reason
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[800px] mx-auto px-4 py-8">
        <PatientPortalClient
          patient={patient}
          token={params.token}
          plans={plans ?? []}
          recentSessions={recentSessions ?? []}
          scheduledSessions={scheduledSessions ?? []}
        />
      </main>
    </div>
  )
}
