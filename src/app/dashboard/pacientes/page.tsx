import Header from '@/components/Header'
import Link from 'next/link'
import PacientesClient from './PacientesClient'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Mis Pacientes | Reason',
}

export default async function PacientesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role, trial_expires_at')
    .eq('id', user.id)
    .single()

  const role = userData?.role
  const trialExpiresAt = userData?.trial_expires_at
  const trialActive = trialExpiresAt ? new Date(trialExpiresAt) > new Date() : false
  const isActiveUser = role === 'subscriber' || role === 'admin' || trialActive

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-8 py-12">
        <div className="mb-8 border-b-[0.5px] border-border pb-8">
          <Link href="/dashboard" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">Mis Pacientes</h1>
          <p className="text-text-secondary text-[16px] max-w-[600px] leading-[1.5]">
            Gestioná tu listado de pacientes y asociá sus planes de ejercicio.
          </p>
        </div>

        <PacientesClient userId={user.id} isActiveUser={isActiveUser} />
      </main>
    </div>
  )
}
