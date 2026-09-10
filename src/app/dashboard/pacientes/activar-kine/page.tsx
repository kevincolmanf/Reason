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

  // Candidatos = pacientes con turnos RECIENTES (últimos 30 días), para no traer
  // a los que ya terminaron la kine y se quedaron entrenando. RPC con SECURITY
  // INVOKER, ya scopeado por RLS.
  const { data, error } = await supabase.rpc('get_kine_candidates', { p_days: 30 })
  const rows = (error ? [] : (data ?? [])) as { patient_id: string; name: string; kine_mode: boolean; turno_count: number; last_turno: string | null }[]

  const candidates: Candidate[] = rows
    .filter(r => !r.kine_mode)
    .map(r => ({ id: r.patient_id, name: r.name, turnoCount: Number(r.turno_count), lastTurno: r.last_turno }))
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
          Estos son tus pacientes con turnos en los <b className="text-text-primary font-medium">últimos 30 días</b> — los que
          están actualmente en kinesiología. No aparecen los alumnos de entrenamiento ni los que ya terminaron
          la kine y se quedaron entrenando (no tienen turnos recientes). Mirá el último turno de cada uno,
          desmarcá los que no correspondan y pasalos a modo kine juntos.
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
