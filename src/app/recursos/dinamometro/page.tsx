import Header from '@/components/Header'
import Link from 'next/link'
import DinamometroInteractive from './DinamometroInteractive'
import { createClient } from '@/utils/supabase/server'

export const metadata = { title: 'Dinamómetro HHD | Reason' }

export default async function DinamometroPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let patients: { id: string, name: string }[] = []
  if (user) {
    const { data } = await supabase
      .from('patients')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name', { ascending: true })
    if (data) patients = data
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[900px] mx-auto px-8 py-12">
        <Link href="/recursos" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">← Volver a Recursos</Link>
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">Evaluación con Dinamómetro (HHD)</h1>
        <p className="text-text-secondary text-[15px] mb-10 max-w-[680px]">Registrá la fuerza bilateral por grupo muscular, calculá el Índice de Simetría de Miembro (LSI) y guardá los resultados en el perfil del paciente.</p>
        <DinamometroInteractive patients={patients} userId={user?.id ?? null} />
      </main>
    </div>
  )
}
