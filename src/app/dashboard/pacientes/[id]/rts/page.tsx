import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import RtsContainer from './RtsContainer'

export const metadata = { title: 'Retorno al Deporte | Reason' }

export default async function RtsPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase
    .from('patients')
    .select('id, name, age')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!patient) redirect('/dashboard/pacientes')

  // Traer última evaluación de dinamómetro del paciente
  const { data: lastDynamo } = await supabase
    .from('dynamometer_results')
    .select('muscle_results, unit, created_at')
    .eq('patient_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Traer últimos resultados de cuestionarios KOOS y ACL-RSI
  const { data: koos } = await supabase
    .from('questionnaire_results')
    .select('score, result_data, created_at')
    .eq('patient_id', params.id)
    .eq('questionnaire_type', 'koos')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: aclRsi } = await supabase
    .from('questionnaire_results')
    .select('score, created_at')
    .eq('patient_id', params.id)
    .eq('questionnaire_type', 'acl_rsi')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Traer evaluaciones RTS previas del paciente
  const { data: previousEvals } = await supabase
    .from('rts_evaluations')
    .select('*')
    .eq('patient_id', params.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[900px] mx-auto px-8 py-12">
        <Link href={`/dashboard/pacientes/${params.id}`} className="text-[13px] text-text-secondary hover:text-text-primary no-underline flex items-center gap-2 mb-6">
          ← Volver a {patient.name}
        </Link>
        <div className="mb-8">
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-1">Protocolo de Retorno al Deporte</h1>
          <p className="text-text-secondary text-[15px]">{patient.name}</p>
        </div>
        <RtsContainer
          patient={patient}
          userId={user.id}
          lastDynamo={lastDynamo ?? null}
          lastKoos={koos ?? null}
          lastAclRsi={aclRsi ?? null}
          previousEvals={previousEvals ?? []}
        />
      </main>
    </div>
  )
}
