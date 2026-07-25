import Header from '@/components/Header'
import Link from 'next/link'
import PlanEditor from './PlanEditor'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { verifyPlanAccess } from '@/utils/patient-access'

export const metadata = {
  title: 'Editar Plan | Reason',
}

export default async function PlanEditorPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: plan, error } = await supabase
    .from('exercise_plans')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !plan) {
    redirect('/dashboard/ejercicios/plan')
  }

  // Permite acceso si el usuario es dueño del plan O miembro de la org del paciente
  await verifyPlanAccess(plan.user_id, plan.patient_id ?? null, user.id)

  // El plan es de un paciente: al volver, ir a su perfil (no a "Mis Planes").
  let patientName: string | null = null
  let events: { id: string; event_date: string; type: string; title: string | null; note: string | null }[] = []
  if (plan.patient_id) {
    const [{ data: pt }, { data: evs }] = await Promise.all([
      supabase.from('patients').select('name').eq('id', plan.patient_id).single(),
      supabase.from('patient_events').select('id, event_date, type, title, note').eq('patient_id', plan.patient_id).order('event_date', { ascending: true }),
    ])
    patientName = pt?.name ?? null
    events = evs ?? []
  }
  const backHref = plan.patient_id ? `/dashboard/pacientes/${plan.patient_id}` : '/dashboard/pacientes'
  const backLabel = patientName ? `← Volver a ${patientName}` : '← Volver a Pacientes'

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Link href={backHref} className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2">
            {backLabel}
          </Link>
          
        </div>

        <PlanEditor initialPlan={plan} userId={user.id} initialEvents={events} />
      </main>
    </div>
  )
}
