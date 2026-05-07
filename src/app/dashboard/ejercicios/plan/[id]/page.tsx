import Header from '@/components/Header'
import Link from 'next/link'
import PlanEditor from './PlanEditor'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

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

  if (error || !plan || plan.user_id !== user.id) {
    redirect('/dashboard/ejercicios/plan')
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Link href="/dashboard/ejercicios/plan" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2">
            ← Volver a Mis Planes
          </Link>
          
        </div>

        <PlanEditor initialPlan={plan} userId={user.id} />
      </main>
    </div>
  )
}
