import Header from '@/components/Header'
import Link from 'next/link'
import PapeleraClient from './PapeleraClient'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Papelera | Reason',
}

export default async function PapeleraPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[900px] mx-auto px-8 py-12">
        <div className="mb-8 border-b-[0.5px] border-border pb-8">
          <Link href="/dashboard" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">Papelera</h1>
          <p className="text-text-secondary text-[16px] max-w-[600px] leading-[1.5]">
            Evaluaciones y registros borrados en los últimos 30 días. Podés restaurarlos o eliminarlos definitivamente. Pasados los 30 días se eliminan solos.
          </p>
        </div>

        <PapeleraClient />
      </main>
    </div>
  )
}
