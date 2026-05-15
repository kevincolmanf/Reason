import Header from '@/components/Header'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import FichaClient from './FichaClient'
import { verifyPatientAccess } from '@/utils/patient-access'

export const metadata = {
  title: 'Ficha Clínica | Reason',
}

export default async function FichaPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await verifyPatientAccess(params.id, user.id)

  const { data: patient } = await supabase
    .from('patients')
    .select('id, name, age, occupation')
    .eq('id', params.id)
    .single()

  if (!patient) redirect('/dashboard/pacientes')

  // Canonical ficha: most recent, or create one
  let { data: ficha } = await supabase
    .from('patient_fichas')
    .select('*')
    .eq('patient_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!ficha) {
    const { data: newFicha } = await supabase
      .from('patient_fichas')
      .insert({ patient_id: params.id, user_id: user.id, ficha_data: {} })
      .select()
      .single()
    ficha = newFicha
  }

  const [{ data: questionnaireResults }, { data: dynamoResults }] = await Promise.all([
    supabase
      .from('questionnaire_results')
      .select('id, questionnaire_type, score, interpretation, created_at, result_data')
      .eq('patient_id', params.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('dynamometer_results')
      .select('id, unit, muscle_results, notes, created_at')
      .eq('patient_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[860px] mx-auto px-8 py-10">
        <div className="flex items-center gap-2 text-[13px] text-text-secondary mb-8">
          <Link href="/dashboard/pacientes" className="hover:text-text-primary no-underline">Pacientes</Link>
          <span>/</span>
          <Link href={`/dashboard/pacientes/${patient.id}`} className="hover:text-text-primary no-underline">{patient.name}</Link>
          <span>/</span>
          <span className="text-text-primary">Ficha Clínica</span>
        </div>

        <FichaClient
          ficha={ficha!}
          patientId={patient.id}
          patientName={patient.name}
          questionnaireResults={questionnaireResults ?? []}
          dynamoResults={dynamoResults ?? []}
          userId={user.id}
        />
      </main>
    </div>
  )
}
