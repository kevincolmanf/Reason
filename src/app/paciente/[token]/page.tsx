import { createAdminClient } from '@/utils/supabase/admin'
import PatientPortalClient from './PatientPortalClient'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Portal del Paciente | Reason',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFallbackBlocks(planData: any) {
  if (!planData?.sessions) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blockMap = new Map<string, { id: string; name: string; exercises: any[] }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const session of planData.sessions as any[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const block of (session.blocks ?? []) as any[]) {
      if (!block.exercises?.length) continue
      if (!blockMap.has(block.id)) {
        blockMap.set(block.id, { id: block.id, name: block.name, exercises: [] })
      }
      const mapped = blockMap.get(block.id)!
      for (const ex of block.exercises) {
        if (!mapped.exercises.find((e: { id: string }) => e.id === ex.id)) {
          mapped.exercises.push(ex)
        }
      }
    }
  }
  return Array.from(blockMap.values()).filter(b => b.exercises.length > 0)
}

export default async function PatientPortalPage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient()

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, name, user_id')
    .eq('load_share_token', params.token)
    .single()

  if (patientError || !patient) {
    notFound()
  }

  const { data: recentSessions } = await supabase
    .from('load_sessions')
    .select('session_date, activity, rpe, load_units, vas_post, source')
    .eq('patient_id', patient.id)
    .order('session_date', { ascending: false })
    .limit(30)

  // ── Buscar sesiones por dos vías y mergear ─────────────────────────────────

  // Vía 1: planes donde patient_id está seteado
  const { data: plansByPatient } = await supabase
    .from('exercise_plans')
    .select('id, share_token, plan_data')
    .eq('patient_id', patient.id)

  // Vía 2: sesiones donde patient_id está seteado directamente
  const { data: sessionsByPatientId } = await supabase
    .from('scheduled_sessions')
    .select('id, plan_id, session_id, session_name, scheduled_date, week, completed, session_data')
    .eq('patient_id', patient.id)
    .not('session_data', 'is', null)
    .order('scheduled_date', { ascending: true })

  // Vía 3: plans del kine asignados a este paciente que no estén en vía 1
  //        (por si la sesión tiene plan_id correcto pero plan no tiene patient_id)
  const extraPlanIds = (sessionsByPatientId ?? [])
    .map(s => s.plan_id)
    .filter(pid => !(plansByPatient ?? []).find(p => p.id === pid))
  const uniqueExtraPlanIds = Array.from(new Set(extraPlanIds))

  let extraPlans: typeof plansByPatient = []
  if (uniqueExtraPlanIds.length > 0) {
    const { data } = await supabase
      .from('exercise_plans')
      .select('id, share_token, plan_data')
      .in('id', uniqueExtraPlanIds)
    extraPlans = data ?? []
  }

  // Merge plans
  const allPlans = [...(plansByPatient ?? []), ...(extraPlans ?? [])]
  const allPlanIds = allPlans.map(p => p.id)

  const planShareTokenMap: Record<string, string | null> = {}
  const planFallbackBlocksMap: Record<string, ReturnType<typeof extractFallbackBlocks>> = {}
  for (const p of allPlans) {
    planShareTokenMap[p.id] = p.share_token
    planFallbackBlocksMap[p.id] = extractFallbackBlocks(p.plan_data)
  }

  // Sesiones por plan_id (cubre planes con patient_id seteado)
  let sessionsByPlanId: typeof sessionsByPatientId = []
  if (allPlanIds.length > 0) {
    const { data } = await supabase
      .from('scheduled_sessions')
      .select('id, plan_id, session_id, session_name, scheduled_date, week, completed, session_data')
      .in('plan_id', allPlanIds)
      .not('session_data', 'is', null)
      .order('scheduled_date', { ascending: true })
    sessionsByPlanId = data ?? []
  }

  // Merge y dedup sesiones por id
  const seenIds = new Set<string>()
  const rawSessions = [...(sessionsByPlanId ?? []), ...(sessionsByPatientId ?? [])]
    .filter(s => { if (seenIds.has(s.id)) return false; seenIds.add(s.id); return true })
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

  // Inyectar ejercicios (session_data o fallback desde plan_data) y share_token
  const scheduledSessions = rawSessions.map(s => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasExercises = (s.session_data as any)?.blocks?.some((b: any) => b.exercises?.length > 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionBlocks = (s.session_data as any)?.blocks ?? []
    const blocks = hasExercises ? sessionBlocks : (planFallbackBlocksMap[s.plan_id] ?? [])
    return {
      ...s,
      session_data: { blocks },
      exercise_plans: [{ share_token: planShareTokenMap[s.plan_id] ?? null }],
    }
  })

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="pt-6 pb-4 border-b-[0.5px] border-border bg-bg-primary/80 backdrop-blur-md sticky top-0 z-10">
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
        {/* DEBUG TEMP — borrar después */}
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg text-[11px] text-yellow-300 font-mono space-y-1">
          <div>patient.id: {patient.id}</div>
          <div>plansByPatient: {plansByPatient?.length ?? 0} — ids: {(plansByPatient ?? []).map((p: {id:string}) => p.id.slice(0,8)).join(', ') || 'ninguno'}</div>
          <div>sessionsByPatientId: {sessionsByPatientId?.length ?? 0}</div>
          <div>sessionsByPlanId: {sessionsByPlanId?.length ?? 0}</div>
          <div>scheduledSessions final: {scheduledSessions.length}</div>
        </div>
        <PatientPortalClient
          patient={patient}
          token={params.token}
          recentSessions={recentSessions ?? []}
          scheduledSessions={scheduledSessions}
        />
      </main>
    </div>
  )
}
