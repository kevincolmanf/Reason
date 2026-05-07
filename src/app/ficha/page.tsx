import Header from '@/components/Header'
import FichaInteractive from './FichaInteractive'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Ficha Kinésica | Reason',
}

export default async function FichaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[800px] mx-auto px-8 py-12">
        <div className="mb-8 border-b-[0.5px] border-border pb-8">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-[32px] font-medium tracking-[-0.02em]">
              Ficha Kinésica
            </h1>
            <span className="bg-[#451A1A]/30 text-warning border-[0.5px] border-warning/50 text-[11px] py-1 px-3 rounded-full uppercase tracking-[0.05em] font-medium">
              No almacena datos
            </span>
          </div>
          <p className="text-text-secondary text-[16px] leading-[1.5]">
            Completá la historia clínica del paciente. El progreso se guarda temporalmente en tu navegador. Al finalizar, podés exportar el PDF o copiar el texto. Ningún dato clínico se envía o almacena en nuestros servidores.
          </p>
        </div>

        <FichaInteractive userId={user.id} />
      </main>
    </div>
  )
}
