import Header from '@/components/Header'
import Link from 'next/link'
import RmInteractive from './RmInteractive'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Calculadora 1RM | Reason',
}

export default async function RmCalculatorPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[720px] mx-auto px-8 py-12">
        <div className="mb-8">
          <Link href="/recursos/calculadoras" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">
            ← Volver a Calculadoras
          </Link>
          <div className="flex gap-2 mb-4">
            <span className="bg-bg-secondary text-text-secondary text-[11px] py-1 px-2 rounded-md uppercase tracking-[0.05em] border-[0.5px] border-border">
              Fuerza
            </span>
          </div>
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-4">
            Calculadora de 1RM (Fuerza Máxima)
          </h1>
          <p className="text-text-secondary text-[16px] leading-[1.5]">
            Estima el peso máximo que tu paciente puede levantar para una repetición (1RM) basado en fórmulas validadas (Brzycki y Epley), y genera una tabla de porcentajes de trabajo.
          </p>
        </div>

        <RmInteractive userId={user.id} />
      </main>
    </div>
  )
}
