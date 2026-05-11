import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import CalendarioClient from './CalendarioClient'

export default async function CalendarioPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase
    .from('patients')
    .select('id, name')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!patient) notFound()

  const { data: plans } = await supabase
    .from('exercise_plans')
    .select('id, name, start_date, plan_data')
    .eq('patient_id', params.id)
    .order('updated_at', { ascending: false })

  const { data: scheduled } = await supabase
    .from('scheduled_sessions')
    .select('*')
    .eq('patient_id', params.id)
    .order('scheduled_date', { ascending: true })

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
        plans={plans ?? []}
        initialScheduled={scheduled ?? []}
      />
    </div>
  )
}
