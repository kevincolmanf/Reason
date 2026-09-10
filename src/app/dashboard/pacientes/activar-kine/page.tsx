import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import ActivarKineClient, { type Candidate } from './ActivarKineClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Activar modo kine | Reason' }

export default async function ActivarKinePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Candidatos = pacientes con turnos (RPC con SECURITY INVOKER, ya scopeado por RLS).
  const { data, error } = await supabase.rpc('get_kine_candidates')
  const rows = (error ? [] : (data ?? [])) as { patient_id: string; name: string; kine_mode: boolean; turno_count: number }[]

  const candidates: Candidate[] = rows
    .filter(r => !r.kine_mode)
    .map(r => ({ id: r.patient_id, name: r.name, turnoCount: Number(r.turno_count) }))
  const alreadyCount = rows.filter(r => r.kine_mode).length

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[820px] mx-auto px-6 py-8">
        <Link href="/dashboard/pacientes" className="text-[13px] text-text-secondary hover:text-text-primary no-underline flex items-center gap-2 mb-6">
          ← Volver a Pacientes
        </Link>

        <h1 className="text-[26px] font-medium tracking-[-0.02em] mb-2">Activar modo kine en tanda</h1>
        <p className="text-text-secondary text-[14px] mb-6 max-w-[62ch]">
          Estos son tus pacientes que tienen turnos en la agenda — los candidatos a modo kinesiología.
          Los alumnos de entrenamiento no aparecen porque no tienen turnos. Revisá la lista y pasalos a modo
          kine juntos. Podés desmarcar los que no correspondan.
        </p>

        {error ? (
          <div className="bg-warning/10 border-[0.5px] border-warning/30 rounded-xl p-5 text-[13px] text-text-secondary">
            No se pudo cargar la lista. Puede que falte correr la migración <code className="text-accent">get_kine_candidates</code>.
          </div>
        ) : (
          <ActivarKineClient candidates={candidates} alreadyCount={alreadyCount} />
        )}
      </main>
    </div>
  )
}
