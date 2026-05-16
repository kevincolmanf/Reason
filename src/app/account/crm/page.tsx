import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import CRMPageClient from './CRMPageClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Panel de gestión | Reason' }

type TurnoRow = { status: string; appointment_type: string | null; professional_name: string | null; start_time: string; end_time: string; area: string | null }
type PatientRow = { id: string; name: string | null; age: number | null; dni: string | null; phone: string | null; email: string | null; user_id: string }
type AllTurnoRow = TurnoRow & { patient_phone: string | null; patient_email: string | null; patient_age: number | null }

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
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const sixtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const fiveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 4, 1)

  const [
    { data: patientsRaw },
    { data: turnosAll },
    { data: turnosUpcoming },
    { data: allTurnos },
  ] = await Promise.all([
    admin.from('patients').select('*').eq('org_id', orgRow.id).order('name'),
    admin.from('turnos')
      .select('professional_name, start_time, end_time, area, status, appointment_type')
      .eq('org_id', orgRow.id)
      .not('is_blocked', 'is', true)
      .gte('start_time', fiveMonthsAgo.toISOString())
      .lt('start_time', nextMonthStart.toISOString()),
    admin.from('turnos')
      .select('id')
      .eq('org_id', orgRow.id)
      .not('is_blocked', 'is', true)
      .gt('start_time', now.toISOString())
      .lt('start_time', nextMonthStart.toISOString()),
    admin.from('turnos')
      .select('patient_id, start_time, professional_name, patient_phone, patient_email, patient_age')
      .eq('org_id', orgRow.id)
      .not('is_blocked', 'is', true)
      .order('start_time', { ascending: false }),
  ])

  // Last turno per patient (already sorted desc, first match wins)
  const lastTurnoMap = new Map<string, { date: string; phone: string | null; email: string | null; age: number | null; professionalName: string | null }>()
  ;(allTurnos as AllTurnoRow[] ?? []).forEach((t) => {
    if (t.patient_id && !lastTurnoMap.has(t.patient_id)) {
      lastTurnoMap.set(t.patient_id, {
        date: t.start_time,
        phone: t.patient_phone ?? null,
        email: t.patient_email ?? null,
        age: t.patient_age ?? null,
        professionalName: t.professional_name ?? null,
      })
    }
  })

  const patients = (patientsRaw as PatientRow[] ?? []).map((p) => {
    const lt = lastTurnoMap.get(p.id)
    const active = lt ? new Date(lt.date) > sixtyDaysAgo : false
    return {
      id: p.id as string,
      name: (p.name ?? '') as string,
      age: (p.age ?? lt?.age ?? null) as number | null,
      dni: (p.dni ?? null) as string | null,
      phone: (p.phone ?? lt?.phone ?? null) as string | null,
      email: (p.email ?? lt?.email ?? null) as string | null,
      professionalName: (lt?.professionalName ?? null) as string | null,
      lastTurnoDate: (lt?.date ?? null) as string | null,
      active,
    }
  })

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
            rawTurnos: (turnosAll ?? []) as TurnoRow[],
            upcoming: turnosUpcoming?.length ?? 0,
            totalPatients: patients.length,
            activePatients: patients.filter(p => p.active).length,
          }}
        />
      </main>
    </div>
  )
}
