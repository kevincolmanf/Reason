import Header from '@/components/Header'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DinamometroClient from './DinamometroClient'

export const metadata = {
  title: 'Dinamómetro | Reason',
}

export default async function DinamometroPage({ searchParams }: { searchParams: { paciente?: string; date?: string; edit?: string; from?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Retorno seguro al calendario del plan (solo rutas internas conocidas).
  const returnTo = searchParams?.from && /^\/dashboard\/ejercicios\/plan\/[\w-]+$/.test(searchParams.from)
    ? searchParams.from
    : null

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-8 py-12">
        <div className="mb-6 border-b-[0.5px] border-border pb-6">
          <Link href="/recursos" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-4">
            ← Recursos Clínicos
          </Link>
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">Dinamómetro HHD</h1>
          <p className="text-text-secondary text-[15px] max-w-[620px] leading-[1.5]">
            Evaluación de fuerza muscular bilateral con cálculo automático de LSI (Limb Symmetry Index)
            y ratio H:Q. Los resultados se guardan en la ficha del paciente.
          </p>
        </div>
        <DinamometroClient
          userId={user.id}
          initialPatient={searchParams?.paciente ?? null}
          initialDate={searchParams?.date ?? null}
          editId={searchParams?.edit ?? null}
          returnTo={returnTo}
        />
      </main>
    </div>
  )
}
