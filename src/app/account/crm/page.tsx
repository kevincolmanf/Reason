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

  // ── Equipo: métricas por profesional (funciones SQL agregadas) ──
  // Se llaman con el cliente del usuario (no admin): son SECURITY INVOKER y la
  // RLS ya scopea a la organización. Los terciarizados son workspace aparte, así
  // que no aparecen.
  const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthTo = nextMonthStart.toISOString()
  type OpRow = { professional_id: string; professional_name: string; turnos: number; presentes: number; ausentes: number; cancelados: number; nuevos: number; horas: number; dias: number; pacientes: number }
  type RetRow = { professional_id: string; activos: number; altas: number; abandonos: number; oportunidad: number; completan: number; duracion_dias: number | null; en_riesgo: number }
  type CliRow = { professional_id: string; fichas_mes: number; planes_mes: number; evals_mes: number; planes_desactualizados: number }
  type MemberRow = { user_id: string; profession: string | null; specialty: string | null; vinculo: string | null; users: { id: string; full_name: string | null; email: string | null } | null }

  const [opRes, retRes, cliRes, membersRes] = await Promise.all([
    supabase.rpc('panel_pro_operativo', { p_from: monthFrom, p_to: monthTo }),
    supabase.rpc('panel_pro_retencion'),
    supabase.rpc('panel_pro_clinico', { p_from: monthFrom, p_to: monthTo }),
    admin.from('organization_members').select('user_id, profession, specialty, vinculo, users(id, full_name, email)').eq('org_id', orgRow.id),
  ])

  const opById = new Map<string, OpRow>((opRes.data ?? []).map((r: OpRow) => [r.professional_id, r]))
  const retById = new Map<string, RetRow>((retRes.data ?? []).map((r: RetRow) => [r.professional_id, r]))
  const cliById = new Map<string, CliRow>((cliRes.data ?? []).map((r: CliRow) => [r.professional_id, r]))
  const members = (membersRes.data ?? []) as unknown as MemberRow[]

  // Nombre por id: del miembro o, si falta, del denormalizado de los turnos.
  const nameById = new Map<string, string>()
  const catById = new Map<string, { profession: string | null; specialty: string | null; vinculo: string }>()
  members.forEach(m => {
    const id = m.users?.id ?? m.user_id
    if (m.users) nameById.set(id, m.users.full_name ?? m.users.email ?? 'Sin nombre')
    catById.set(id, { profession: m.profession ?? null, specialty: m.specialty ?? null, vinculo: m.vinculo ?? 'propio' })
  })
  opById.forEach((r, id) => { if (!nameById.has(id) && r.professional_name) nameById.set(id, r.professional_name) })

  // Universo de profesionales = miembros de la org + cualquiera con actividad.
  const proIds = new Set<string>()
  nameById.forEach((_v, id) => proIds.add(id))
  opById.forEach((_v, id) => proIds.add(id))
  retById.forEach((_v, id) => proIds.add(id))
  cliById.forEach((_v, id) => proIds.add(id))

  const team = Array.from(proIds).map(id => {
    const o = opById.get(id); const r = retById.get(id); const c = cliById.get(id)
    const cat = catById.get(id)
    const turnos = o?.turnos ?? 0
    const resueltos = (o?.presentes ?? 0) + (o?.ausentes ?? 0)
    return {
      id,
      name: nameById.get(id) ?? 'Sin nombre',
      profession: cat?.profession ?? null,
      specialty: cat?.specialty ?? null,
      vinculo: cat?.vinculo ?? 'propio',
      // operativo (mes en curso)
      turnos,
      nuevos: o?.nuevos ?? 0,
      horas: o?.horas ?? 0,
      pacDia: o && o.dias > 0 ? +(turnos / o.dias).toFixed(1) : 0,
      pacHora: o && o.horas > 0 ? +(turnos / o.horas).toFixed(1) : 0,
      ausenciaPct: resueltos > 0 ? Math.round(((o?.ausentes ?? 0) / resueltos) * 100) : null,
      pacientesMes: o?.pacientes ?? 0,
      // retención (histórico)
      activos: r?.activos ?? 0,
      altas: r?.altas ?? 0,
      abandonos: r?.abandonos ?? 0,
      abandonoPct: r && (r.altas + r.abandonos) > 0 ? Math.round((r.abandonos / (r.altas + r.abandonos)) * 100) : null,
      completanPct: r && r.oportunidad > 0 ? Math.round((r.completan / r.oportunidad) * 100) : null,
      duracionSem: r && r.duracion_dias != null ? +(r.duracion_dias / 7).toFixed(1) : null,
      enRiesgo: r?.en_riesgo ?? 0,
      // clínico (mes)
      fichasMes: c?.fichas_mes ?? 0,
      planesMes: c?.planes_mes ?? 0,
      evalsMes: c?.evals_mes ?? 0,
      planesDesact: c?.planes_desactualizados ?? 0,
    }
  }).sort((a, b) => b.activos - a.activos)

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
          team={team}
          monthLabel={thisMonthLabel}
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
