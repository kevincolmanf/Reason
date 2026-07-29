import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import RtsContainer from './RtsContainer'
import { verifyPatientAccess } from '@/utils/patient-access'

export const metadata = { title: 'Retorno al Deporte | Reason' }

export default async function RtsPage({ params, searchParams }: { params: { id: string }; searchParams: { eval?: string; protocol?: string; date?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await verifyPatientAccess(params.id, user.id)

  const { data: patient } = await supabase
    .from('patients')
    .select('id, name, age')
    .eq('id', params.id)
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

  // Traer todos los cuestionarios cargados en Recursos para este paciente y
  // quedarnos con el más reciente de cada tipo. Con ese mapa cada protocolo RTS
  // puede autocompletar los campos que se solapan (SPADI, DASH, ACL-RSI, KOOS…).
  const { data: allQuestionnaires } = await supabase
    .from('questionnaire_results')
    .select('questionnaire_type, score, result_data, created_at')
    .eq('patient_id', params.id)
    .order('created_at', { ascending: false })

  const latestQuestionnaires: Record<string, { score: number | null; result_data: unknown; created_at: string }> = {}
  for (const q of allQuestionnaires ?? []) {
    // Como vienen ordenados por fecha desc, el primero de cada tipo es el más reciente.
    if (!latestQuestionnaires[q.questionnaire_type]) {
      latestQuestionnaires[q.questionnaire_type] = { score: q.score, result_data: q.result_data, created_at: q.created_at }
    }
  }

  const koos = latestQuestionnaires['koos'] ?? null
  const aclRsi = latestQuestionnaires['acl_rsi'] ?? null

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
          latestQuestionnaires={latestQuestionnaires}
          previousEvals={previousEvals ?? []}
          initialEvalId={searchParams?.eval ?? null}
          initialProtocol={searchParams?.protocol ?? null}
          initialDate={searchParams?.date ?? null}
        />
      </main>
    </div>
  )
}
