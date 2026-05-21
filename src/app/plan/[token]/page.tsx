import { createAdminClient } from '@/utils/supabase/admin'
import PatientPlanViewer from './PatientPlanViewer'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tu Plan de Ejercicio | Reason',
}

export interface DaySession {
  id: string
  scheduled_date: string   // 'YYYY-MM-DD'
  session_name: string | null
  session_data: {
    blocks: {
      id: string
      name: string
      exercises: {
        id: string
        exercise_id: string
        exercise_name: string
        youtube_url: string
        group?: string
        sets: string
        reps: string
        load: string
        rpe_obj: string
        eav_obj: string
        rest: string
      }[]
    }[]
  }
  completed: boolean
}

export default async function PlanPacientePage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient()

  // Buscar el plan con el share_token
  const { data: plan, error } = await supabase
    .from('exercise_plans')
    .select('id, name, start_date, notes, plan_data, share_token_expires_at, active_week')
    .eq('share_token', params.token)
    .single()

  if (error || !plan) {
    notFound()
  }

  // Verificar expiración
  if (plan.share_token_expires_at && new Date(plan.share_token_expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
        <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-8 max-w-[400px] text-center shadow-lg">
          <div className="text-warning text-4xl mb-4">⚠️</div>
          <h1 className="text-[20px] font-medium mb-2 text-text-primary">Link Expirado</h1>
          <p className="text-[14px] text-text-secondary">
            Este link de ejercicios ya no está disponible. Consultá a tu kinesiólogo para obtener uno nuevo.
          </p>
        </div>
      </div>
    )
  }

  // Cargar sesiones con contenido (nuevo sistema)
  const { data: daySessions } = await supabase
    .from('scheduled_sessions')
    .select('id, scheduled_date, session_name, session_data, completed')
    .eq('plan_id', plan.id)
    .not('session_data', 'is', null)
    .order('scheduled_date')

  // Si tiene sesiones del nuevo sistema, usar esas
  // Si no, fallback al sistema legacy (plan_data)
  const hasNewSessions = daySessions && daySessions.length > 0

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="py-4 border-b-[0.5px] border-border bg-bg-primary/80 backdrop-blur-md sticky top-0 z-10">
        <div className="w-full max-w-[640px] mx-auto px-4 flex justify-between items-center">
          <div className="text-[18px] font-medium tracking-[-0.01em] text-text-primary">
            Tu plan de ejercicios
          </div>
          <div className="text-[12px] text-text-secondary opacity-50">
            Powered by Reason
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[640px] mx-auto px-4 py-6">
        {plan.notes && (
          <div className="bg-[#451A1A]/20 border-[0.5px] border-accent/30 rounded-lg p-4 text-[14px] text-text-primary leading-[1.5] mb-6">
            <span className="font-medium text-accent block mb-1">Indicaciones:</span>
            {plan.notes}
          </div>
        )}

        <PatientPlanViewer
          planName={plan.name}
          daySessions={hasNewSessions ? (daySessions as DaySession[]) : []}
          legacyPlanData={!hasNewSessions ? plan.plan_data : null}
          legacyActiveWeek={!hasNewSessions ? Math.max(0, Math.min(3, (plan.active_week ?? 1) - 1)) : 0}
          legacyStartDate={!hasNewSessions ? plan.start_date : null}
          token={params.token}
        />
      </main>
    </div>
  )
}
