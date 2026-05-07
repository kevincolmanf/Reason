import Header from '@/components/Header'
import Link from 'next/link'
import PlanList from './PlanList'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Mis Planes de Ejercicio | Reason',
}

export default async function PlanListPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12">
        <div className="mb-8 border-b-[0.5px] border-border pb-8">
          <Link href="/dashboard/ejercicios" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">
            ← Volver al Movement Dashboard
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">
                Mis Planes
              </h1>
              <p className="text-text-secondary text-[16px] max-w-[720px] leading-[1.5]">
                Tus programas de entrenamiento y rehabilitación. Todo lo que construyas acá se guarda automáticamente.
              </p>
            </div>
          </div>
        </div>

        <PlanList userId={user.id} />
      </main>
    </div>
  )
}
