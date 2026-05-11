import Header from '@/components/Header'
import Link from 'next/link'
import PlanList from './PlanList'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Mis Planes de Ejercicio | Reason',
}

export default async function PlanListPage({ searchParams }: { searchParams: { paciente?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const patientId = searchParams.paciente ?? null

  // Los planes son siempre por paciente — sin contexto de paciente, ir a la lista
  if (!patientId) redirect('/dashboard/pacientes')

  let patientName: string | null = null

  if (patientId) {
    const { data } = await supabase
      .from('patients')
      .select('name')
      .eq('id', patientId)
      .eq('user_id', user.id)
      .single()
    patientName = data?.name ?? null

    // Un plan por paciente: si ya existe, ir directo al editor
    const { data: existing } = await supabase
      .from('exercise_plans')
      .select('id')
      .eq('patient_id', patientId)
      .eq('user_id', user.id)
      .limit(1)
      .single()
    if (existing) redirect(`/dashboard/ejercicios/plan/${existing.id}`)
  }

  const backHref = patientId
    ? `/dashboard/pacientes/${patientId}`
    : '/dashboard'
  const backLabel = patientId && patientName
    ? `← ${patientName}`
    : '← Dashboard'

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12">
        <div className="mb-8 border-b-[0.5px] border-border pb-8">
          <Link href={backHref} className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">
            {backLabel}
          </Link>
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">
            {patientName ? `Planes de ${patientName}` : 'Mis Planes'}
          </h1>
          <p className="text-text-secondary text-[16px] max-w-[720px] leading-[1.5]">
            {patientName
              ? `Programas de entrenamiento y rehabilitación de ${patientName}.`
              : 'Tus programas de entrenamiento y rehabilitación. Todo lo que construyas acá se guarda automáticamente.'}
          </p>
        </div>

        <PlanList userId={user.id} patientId={patientId} />
      </main>
    </div>
  )
}
