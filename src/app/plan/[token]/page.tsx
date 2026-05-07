import { createAdminClient } from '@/utils/supabase/admin'
import PatientPlanViewer from './PatientPlanViewer'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Tu Plan de Ejercicio | Reason',
}

export default async function PlanPacientePage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient()

  // Buscar el plan con el share_token, ignorando RLS
  const { data: plan, error } = await supabase
    .from('exercise_plans')
    .select('name, start_date, notes, plan_data, share_token_expires_at')
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

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="py-4 border-b-[0.5px] border-border bg-bg-primary/80 backdrop-blur-md sticky top-0 z-10">
        <div className="w-full max-w-[800px] mx-auto px-4 flex justify-between items-center">
          <div className="text-[18px] font-medium tracking-[-0.01em] text-text-primary">
            Tu plan de ejercicios
          </div>
          {/* Ocultamos el branding directo de Reason como suscripción, pero dejamos algo sutil */}
          <div className="text-[12px] text-text-secondary opacity-50">
            Powered by Reason
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[800px] mx-auto px-4 py-8">
        <div className="mb-8 border-b-[0.5px] border-border pb-6">
          <h1 className="text-[28px] font-medium tracking-[-0.02em] mb-2 text-accent">
            {plan.name}
          </h1>
          {plan.start_date && (
            <div className="text-[13px] text-text-secondary uppercase tracking-[0.05em] mb-4">
              Inicio: {new Date(plan.start_date).toLocaleDateString('es-AR')}
            </div>
          )}
          {plan.notes && (
            <div className="bg-[#451A1A]/20 border-[0.5px] border-accent/30 rounded-lg p-4 text-[14px] text-text-primary leading-[1.5]">
              <span className="font-medium text-accent block mb-1">Indicaciones:</span>
              {plan.notes}
            </div>
          )}
        </div>

        <PatientPlanViewer planData={plan.plan_data} token={params.token} />
      </main>
    </div>
  )
}
