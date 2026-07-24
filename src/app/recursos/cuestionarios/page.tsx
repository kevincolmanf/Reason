import Header from '@/components/Header'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import QuestionariosClient from './QuestionariosClient'

export const metadata = {
  title: 'Cuestionarios | Reason',
}

export default async function CuestionariosPage({
  searchParams,
}: {
  searchParams: { paciente?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Si venimos desde la ficha de un paciente (?paciente=<id>), lo dejamos fijado
  // para guardar el resultado ahí sin tener que volver a elegirlo. La RLS de
  // patients valida el acceso: si no devuelve fila, no se fija nada.
  let lockedPatient: { id: string; name: string } | null = null
  if (searchParams?.paciente) {
    const { data: p } = await supabase
      .from('patients')
      .select('id, name')
      .eq('id', searchParams.paciente)
      .single()
    if (p) lockedPatient = p
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-8 py-12">
        <div className="mb-6 border-b-[0.5px] border-border pb-6">
          <Link href="/recursos" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-4">
            ← Recursos Clínicos
          </Link>
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">Cuestionarios Clínicos</h1>
          <p className="text-text-secondary text-[15px] max-w-[620px] leading-[1.5]">
            Cuestionarios validados para evaluar dolor, discapacidad y factores psicosociales.
            Completá el formulario y guardá el resultado vinculado al paciente.
          </p>
        </div>
        <QuestionariosClient userId={user.id} lockedPatient={lockedPatient} />
      </main>
    </div>
  )
}
