import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import BloqueAtencion, { type Bloque, type BloquePaciente } from './BloqueAtencion'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Atención de hoy | Reason' }

const AR_TZ = 'America/Argentina/Buenos_Aires'

function todayAR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: AR_TZ })
}
function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: AR_TZ })
}
function longDay(dayStr: string): string {
  return new Date(dayStr + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function shiftDay(dayStr: string, delta: number): string {
  const d = new Date(dayStr + 'T12:00:00'); d.setDate(d.getDate() + delta)
  return d.toLocaleDateString('en-CA')
}

export default async function AtencionDelBloquePage({ searchParams }: { searchParams: { day?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const day = searchParams.day && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.day) ? searchParams.day : todayAR()

  // Turnos del día que el usuario puede ver (la RLS ya limita por org y por área).
  // Argentina es UTC-3 sin horario de verano.
  const from = `${day}T00:00:00-03:00`
  const to = `${day}T23:59:59-03:00`
  const { data: turnos } = await supabase
    .from('turnos')
    .select('id, patient_id, patient_name, start_time, area, status, professional_name')
    .gte('start_time', from)
    .lte('start_time', to)
    .not('patient_id', 'is', null)
    .order('start_time', { ascending: true })

  const patientIds = Array.from(new Set((turnos ?? []).map(t => t.patient_id).filter(Boolean) as string[]))

  // Solo pacientes en modo kine (la RLS de patients limita a los accesibles).
  const kineIds = new Set<string>()
  if (patientIds.length > 0) {
    const { data: kinePatients } = await supabase
      .from('patients')
      .select('id')
      .in('id', patientIds)
      .eq('kine_mode', true)
    for (const p of kinePatients ?? []) kineIds.add(p.id)
  }

  // ¿A quiénes ya se atendió hoy? (para marcar "ya atendido" en el bloque)
  const attendedToday = new Set<string>()
  if (kineIds.size > 0) {
    const { data: att } = await supabase
      .from('kine_attentions')
      .select('patient_id')
      .in('patient_id', Array.from(kineIds))
      .eq('attended_on', day)
    for (const a of att ?? []) attendedToday.add(a.patient_id)
  }

  // Agrupar por bloque horario (misma hora de inicio = en simultáneo).
  const byBlock = new Map<string, BloquePaciente[]>()
  for (const t of turnos ?? []) {
    if (!t.patient_id || !kineIds.has(t.patient_id)) continue
    const key = hhmm(t.start_time)
    const arr = byBlock.get(key) ?? []
    // Evitar duplicar el mismo paciente si tuviera dos turnos en el mismo bloque.
    if (!arr.some(p => p.patientId === t.patient_id)) {
      arr.push({
        patientId: t.patient_id,
        name: t.patient_name,
        area: t.area,
        status: t.status,
        professionalName: t.professional_name,
        attended: attendedToday.has(t.patient_id),
      })
    }
    byBlock.set(key, arr)
  }
  const bloques: Bloque[] = Array.from(byBlock.entries()).map(([time, pacientes]) => ({ time, pacientes }))

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[900px] mx-auto px-6 py-8">
        <Link href="/dashboard/agenda" className="text-[13px] text-text-secondary hover:text-text-primary no-underline flex items-center gap-2 mb-6">
          ← Volver a la agenda
        </Link>

        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="text-[26px] font-medium tracking-[-0.02em]">Atención de hoy</h1>
            <p className="text-text-secondary text-[14px] capitalize mt-0.5">{longDay(day)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/agenda/atencion?day=${shiftDay(day, -1)}`} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary no-underline">← Ayer</Link>
            <Link href="/dashboard/agenda/atencion" className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary no-underline">Hoy</Link>
            <Link href={`/dashboard/agenda/atencion?day=${shiftDay(day, 1)}`} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary no-underline">Mañana →</Link>
          </div>
        </div>

        <BloqueAtencion bloques={bloques} />
      </main>
    </div>
  )
}
