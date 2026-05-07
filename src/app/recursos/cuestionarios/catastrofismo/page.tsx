import Header from '@/components/Header'
import Link from 'next/link'
import CatastrofismoInteractive from './CatastrofismoInteractive'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Pain Catastrophizing Scale | Reason',
}

export default async function CatastrofismoPage() {
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
          <Link href="/recursos/cuestionarios" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">
            ← Volver a Cuestionarios
          </Link>
          <div className="flex gap-2 mb-4">
            <span className="bg-bg-secondary text-text-secondary text-[11px] py-1 px-2 rounded-md uppercase tracking-[0.05em] border-[0.5px] border-border">
              General
            </span>
            <span className="bg-bg-secondary text-text-secondary text-[11px] py-1 px-2 rounded-md uppercase tracking-[0.05em] border-[0.5px] border-border">
              13 ítems
            </span>
          </div>
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-4">
            Pain Catastrophizing Scale (PCS)
          </h1>
          <p className="text-text-secondary text-[16px] leading-[1.5]">
            Mide el pensamiento catastrófico asociado al dolor. Se divide en tres subescalas: Rumiación, Magnificación y Desesperanza. Un score mayor a 30 indica un nivel clínicamente significativo.
          </p>
        </div>

        <CatastrofismoInteractive userId={user.id} />
      </main>
    </div>
  )
}
