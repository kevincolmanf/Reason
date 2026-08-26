import Header from '@/components/Header'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Ejercicios | Reason',
}

function SectionCard({ title, desc, href }: { title: string, desc: string, href: string }) {
  return (
    <Link href={href} className="block no-underline">
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full flex flex-col">
        <h3 className="text-[18px] font-medium mb-2 text-text-primary">{title}</h3>
        <p className="text-[13px] text-text-secondary leading-[1.5] mb-4">{desc}</p>
        <div className="mt-auto pt-4 flex items-center text-accent text-[13px] font-medium">
          Abrir →
        </div>
      </div>
    </Link>
  )
}

export default async function EjerciciosHubPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-4">
            Ejercicios
          </h1>
          <p className="text-text-secondary text-[18px] max-w-[720px] leading-[1.5]">
            Planificación de ejercicio y rehabilitación, impulsada por una base unificada de +1.700 ejercicios curados. Los planes se arman dentro de cada paciente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SectionCard 
            title="Biblioteca de Ejercicios" 
            desc="Explorá la base de datos completa de ejercicios clasificados por patrón, equipo y categoría."
            href="/dashboard/ejercicios/biblioteca"
          />
          <SectionCard
            title="Pacientes"
            desc="Los planes de entrenamiento y rehabilitación se arman y guardan desde la ficha de cada paciente."
            href="/dashboard/pacientes"
          />
        </div>
      </main>
    </div>
  )
}
