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

// Extrae cada sesión de plan_data que tenga ejercicios
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPlanSessions(planData: any, shareToken: string | null) {
  if (!planData?.sessions) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (planData.sessions as any[])
    .map((s: { id: string; name: string; blocks: { id: string; name: string; exercises: { id: string; exercise_id: string; exercise_name: string; youtube_url: string; group?: string; sets: string; reps: string; load: string; rpe_obj: string; eav_obj: string; rest: string }[] }[] }) => ({
      id: s.id,
      name: s.name,
      shareToken,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blocks: (s.blocks ?? []).filter((b: any) => b.exercises?.length > 0),
    }))
    .filter(s => s.blocks.length > 0)
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

  // ── Planes del paciente ────────────────────────────────────────────────────
  const { data: plansByPatient } = await supabase
    .from('exercise_plans')
    .select('id, share_token, plan_data')
    .eq('patient_id', patient.id)

  // ── Sesiones por patient_id ────────────────────────────────────────────────
  const { data: sessionsByPatientId } = await supabase
    .from('scheduled_sessions')
    .select('id, plan_id, session_id, session_name, scheduled_date, week, completed, session_data')
    .eq('patient_id', patient.id)
    .order('scheduled_date', { ascending: true })

  // Planes adicionales referenciados por sesiones (por si plan no tiene patient_id)
  const extraPlanIds = Array.from(new Set(
    (sessionsByPatientId ?? [])
      .map(s => s.plan_id)
      .filter(pid => !(plansByPatient ?? []).find(p => p.id === pid))
  ))
  let extraPlans: typeof plansByPatient = []
  if (extraPlanIds.length > 0) {
    const { data } = await supabase
      .from('exercise_plans')
      .select('id, share_token, plan_data')
      .in('id', extraPlanIds)
    extraPlans = data ?? []
  }

  const allPlans = [...(plansByPatient ?? []), ...(extraPlans ?? [])]
  const allPlanIds = allPlans.map(p => p.id)

  const planShareTokenMap: Record<string, string | null> = {}
  const planFallbackBlocksMap: Record<string, ReturnType<typeof extractFallbackBlocks>> = {}
  for (const p of allPlans) {
    planShareTokenMap[p.id] = p.share_token
    planFallbackBlocksMap[p.id] = extractFallbackBlocks(p.plan_data)
  }

  // ── Sesiones por plan_id ───────────────────────────────────────────────────
  let sessionsByPlanId: typeof sessionsByPatientId = []
  if (allPlanIds.length > 0) {
    const { data } = await supabase
      .from('scheduled_sessions')
      .select('id, plan_id, session_id, session_name, scheduled_date, week, completed, session_data')
      .in('plan_id', allPlanIds)
      .order('scheduled_date', { ascending: true })
    sessionsByPlanId = data ?? []
  }

  // Merge y dedup
  const seenIds = new Set<string>()
  const rawSessions = [...(sessionsByPlanId ?? []), ...(sessionsByPatientId ?? [])]
    .filter(s => { if (seenIds.has(s.id)) return false; seenIds.add(s.id); return true })
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

  const scheduledSessions = rawSessions.map(s => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionData = s.session_data as any
    // Solo usar los bloques que tengan ejercicios (sin fallback a plan_data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blocks = (sessionData?.blocks ?? []).filter((b: any) => b.exercises?.length > 0)
    return {
      ...s,
      session_data: { blocks },
      exercise_plans: [{ share_token: planShareTokenMap[s.plan_id] ?? null }],
    }
  })

  // ── Mi programa: sesiones de plan_data (siempre que haya ejercicios) ────────
  // Se muestra como sección separada, sin mezclarse con scheduled_sessions
  const planSessions = allPlans.flatMap(p => extractPlanSessions(p.plan_data, p.share_token))

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
        <PatientPortalClient
          patient={patient}
          token={params.token}
          recentSessions={recentSessions ?? []}
          scheduledSessions={scheduledSessions}
          planSessions={planSessions}
        />
      </main>
    </div>
  )
}
