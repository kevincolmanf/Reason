import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import CRMPageClient from './CRMPageClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Panel de gestión | Reason' }

type TurnoRow = { status: string; appointment_type: string | null; professional_name: string | null; start_time: string; end_time: string; area: string | null }
type PatientRow = { id: string; name: string | null; age: number | null; birth_date: string | null; dni: string | null; phone: string | null; email: string | null; obra_social: string | null; occupation: string | null; source: string | null; user_id: string }
type AllTurnoRow = { patient_id: string | null; start_time: string; professional_name: string | null; patient_phone: string | null; patient_email: string | null; patient_age: number | null; area: string | null }

// Supabase corta las respuestas en 1000 filas por defecto. Estas consultas
// (12 meses de turnos, o todos los turnos históricos) superan ese tope en
// organizaciones con volumen, y sin paginar se pierden filas en silencio —
// lo que hacía que las analíticas mostraran muchos menos turnos de los reales.
// Paginamos en bloques de 1000 con orden explícito para traer todo.
const PAGE_SIZE = 1000
type PagedQuery<T> = {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
}
async function fetchAllRows<T>(buildQuery: () => PagedQuery<T>): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...(data as T[]))
    if (data.length < PAGE_SIZE) break
  }
  return all
}

function calcAge(birth_date: string | null, fallback: number | null): number | null {
  if (birth_date) {
    const today = new Date(); const dob = new Date(birth_date)
    let a = today.getFullYear() - dob.getFullYear()
    if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) a--
    return a
  }
  return fallback
}

export default async function CRMPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orgRow } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!orgRow) redirect('/account')

  const admin = createAdminClient()
  const now = new Date()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const sixtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Ventana amplia para poder consultar analíticas de meses pasados
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [
    patientsRaw,
    turnosAll,
    { count: upcomingCount },
    allTurnos,
  ] = await Promise.all([
    fetchAllRows<PatientRow>(() =>
      admin.from('patients').select('*').eq('org_id', orgRow.id).order('name').order('id')),
    fetchAllRows<TurnoRow>(() =>
      admin.from('turnos')
        .select('professional_name, start_time, end_time, area, status, appointment_type')
        .eq('org_id', orgRow.id)
        .not('is_blocked', 'is', true)
        .gte('start_time', twelveMonthsAgo.toISOString())
        .lt('start_time', nextMonthStart.toISOString())
        .order('start_time', { ascending: true }).order('id')),
    admin.from('turnos')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgRow.id)
      .not('is_blocked', 'is', true)
      .gt('start_time', now.toISOString())
      .lt('start_time', nextMonthStart.toISOString()),
    fetchAllRows<AllTurnoRow>(() =>
      admin.from('turnos')
        .select('patient_id, start_time, professional_name, patient_phone, patient_email, patient_age, area')
        .eq('org_id', orgRow.id)
        .not('is_blocked', 'is', true)
        .order('start_time', { ascending: false }).order('id')),
  ])

  // Last turno per patient (already sorted desc, first match wins)
  const lastTurnoMap = new Map<string, { date: string; phone: string | null; email: string | null; age: number | null; professionalName: string | null; area: string | null }>()
  allTurnos.forEach((t) => {
    if (t.patient_id && !lastTurnoMap.has(t.patient_id)) {
      lastTurnoMap.set(t.patient_id, {
        date: t.start_time,
        phone: t.patient_phone ?? null,
        email: t.patient_email ?? null,
        age: t.patient_age ?? null,
        professionalName: t.professional_name ?? null,
        area: t.area ?? null,
      })
    }
  })

  const patients = patientsRaw.map((p) => {
    const lt = lastTurnoMap.get(p.id)
    const active = lt ? new Date(lt.date) > sixtyDaysAgo : false
    return {
      id: p.id as string,
      name: (p.name ?? '') as string,
      age: calcAge(p.birth_date, p.age ?? lt?.age ?? null),
      dni: (p.dni ?? null) as string | null,
      phone: (p.phone ?? lt?.phone ?? null) as string | null,
      email: (p.email ?? lt?.email ?? null) as string | null,
      obra_social: (p.obra_social ?? null) as string | null,
      occupation: (p.occupation ?? null) as string | null,
      source: (p.source ?? null) as string | null,
      area: (lt?.area ?? null) as string | null,
      professionalName: (lt?.professionalName ?? null) as string | null,
      lastTurnoDate: (lt?.date ?? null) as string | null,
      active,
    }
  })

  // Distribución de vías de llegada
  const sourceDistMap = new Map<string, number>()
  patients.forEach(p => {
    const key = p.source ?? 'Sin especificar'
    sourceDistMap.set(key, (sourceDistMap.get(key) ?? 0) + 1)
  })
  const sourceDist = Array.from(sourceDistMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const thisMonthLabel = cap(now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }))
  const lastMonthLabel = cap(new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }))

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12">
        <Link href="/account" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-8">
          ← Volver a mi cuenta
        </Link>
        <div className="mb-10">
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-1">Panel de gestión</h1>
          <p className="text-[14px] text-text-secondary">{orgRow.name}</p>
        </div>

        <CRMPageClient
          patients={patients}
          analytics={{
            thisMonthLabel,
            lastMonthLabel,
            thisMonthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
            lastMonthKey: `${lastMonthStart.getFullYear()}-${String(lastMonthStart.getMonth() + 1).padStart(2, '0')}`,
            rawTurnos: turnosAll,
            upcoming: upcomingCount ?? 0,
            totalPatients: patients.length,
            activePatients: patients.filter(p => p.active).length,
            sourceDist,
          }}
        />
      </main>
    </div>
  )
}
