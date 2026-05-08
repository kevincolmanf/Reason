import Header from '@/components/Header'
import Link from 'next/link'
import BibliotecaInteractive from './BibliotecaInteractive'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Biblioteca de Ejercicios | Reason',
}

export default async function BibliotecaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch unique equipment for the filters
  const { data: equipmentData } = await supabase
    .from('exercises')
    .select('equipment')
    .not('equipment', 'is', null)
  
  const uniqueEquipment = Array.from(new Set((equipmentData || []).map(e => e.equipment).filter(e => e && e !== 'nan'))).sort()

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-8 py-12">
        <div className="mb-8 border-b-[0.5px] border-border pb-8">
          <Link href="/dashboard/ejercicios" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">
            ← Volver al Movement Dashboard
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">
                Biblioteca de Ejercicios
              </h1>
              <p className="text-text-secondary text-[16px] max-w-[720px] leading-[1.5]">
                Explorá la base de datos de +1.700 ejercicios terapéuticos y de rendimiento.
              </p>
            </div>
          </div>
        </div>

        <BibliotecaInteractive equipments={uniqueEquipment as string[]} userId={user.id} />
      </main>
    </div>
  )
}
