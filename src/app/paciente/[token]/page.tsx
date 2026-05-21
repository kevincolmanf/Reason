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
    for (const block of session.blocks ?? [] as any[]) {
      if (!block.exercises?.length) continue
      if (!blockMap.has(block.id)) {
        blockMap.set(block.id, { id: block.id, name: block.name, exercises: [] })
      }
      for (const ex of block.exercises) {
        const existing = blockMap.get(block.id)!
        if (!existing.exercises.find((e: { id: string }) => e.id === ex.id)) {
          existing.exercises.push(ex)
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

  const { data: patientPlans } = await supabase
    .from('exercise_plans')
    .select('id, share_token, plan_data')
    .eq('patient_id', patient.id)

  const planIds = patientPlans?.map(p => p.id) ?? []
  const planShareTokenMap: Record<string, string | null> = {}
  const planFallbackBlocksMap: Record<string, ReturnType<typeof extractFallbackBlocks>> = {}
  for (const p of patientPlans ?? []) {
    planShareTokenMap[p.id] = p.share_token
    planFallbackBlocksMap[p.id] = extractFallbackBlocks(p.plan_data)
  }

  let scheduledSessions = null
  if (planIds.length > 0) {
    const { data } = await supabase
      .from('scheduled_sessions')
      .select('id, plan_id, session_id, session_name, scheduled_date, week, completed, session_data')
      .in('plan_id', planIds)
      .not('session_data', 'is', null)
      .order('scheduled_date', { ascending: true })

    scheduledSessions = (data ?? []).map(s => {
      // Si session_data tiene ejercicios, usarlos; si no, usar plan_data como fallback
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
  }

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
          scheduledSessions={scheduledSessions ?? []}
        />
      </main>
    </div>
  )
}
