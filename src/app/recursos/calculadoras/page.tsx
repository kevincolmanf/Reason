import Header from '@/components/Header'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CalculadorasClient from './CalculadorasClient'

export const metadata = {
  title: 'Calculadoras Clínicas | Reason',
}

export default async function CalculadorasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-8 py-12">
        <div className="mb-6 border-b-[0.5px] border-border pb-6">
          <Link href="/recursos" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-4">
            ← Recursos Clínicos
          </Link>
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">Calculadoras Clínicas</h1>
          <p className="text-text-secondary text-[15px] max-w-[620px] leading-[1.5]">
            Herramientas de cálculo para uso clínico y entrenamiento: 1RM, IMC, zonas de frecuencia cardíaca,
            VO2max, índice tobillo-brazo y conversión RPE a % 1RM.
          </p>
        </div>
        <CalculadorasClient />
      </main>
    </div>
  )
}
