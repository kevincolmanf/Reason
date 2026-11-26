import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ContentCard from '@/components/ContentCard'
import Header from '@/components/Header'
import PlanningReminderBanner from '@/components/PlanningReminderBanner'
import WeekMilestonesBanner, { type WeekMilestone } from '@/components/WeekMilestonesBanner'
import PendientesCumplimientoBanner, { type PendienteItem } from '@/components/PendientesCumplimientoBanner'
import OnboardingGuide from '@/components/OnboardingGuide'
import WhatsNewBanner from '@/components/WhatsNewBanner'
import { eventMeta } from '@/lib/patientEvents'
import { getActiveContext } from '@/lib/context'
import { getOrgFeatureSetting } from '@/lib/featureSettings'
import { FEATURE_KEY_ESTANDARES_CALIDAD, withEstandaresCalidadDefaults } from '@/lib/qualityStandards/defaults'

// Etiquetas y colores para los hitos de la semana
const RTS_LABELS: Record<string, string> = {
  lca: 'LCA', hamstring: 'Isquios', ankle: 'Tobillo', pfp: 'Femoropatelar',
  tendinopathy: 'Tendinopatía', groin: 'Inguinal', shoulder: 'Hombro',
}
const Q_LABELS: Record<string, string> = {
  spadi: 'SPADI', ndi: 'NDI', roland_morris: 'Roland-Morris', start_back: 'STarT Back',
  tampa: 'TAMPA', catastrofismo: 'PCS', oswestry: 'Oswestry', dash: 'DASH',
  lefs: 'LEFS', psfs: 'PSFS', fabq: 'FABQ', acl_rsi: 'ACL-RSI',
}
const RTS_COLOR = '#C27B54'
const DYN_COLOR = '#2563EB'
const Q_COLOR = '#059669'

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const SHORT_DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function dateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${SHORT_DAYS[d.getDay()]} ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`
}

function CategoryCard({ title, slug, desc }: { title: string, slug: string, desc: string }) {
  return (
    <Link href={`/library?category=${slug}`} className="block no-underline">
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-8 hover:border-accent hover:bg-bg-primary transition-colors h-full flex flex-col justify-center text-center">
        <h3 className="text-[18px] font-medium mb-2">{title}</h3>
        <p className="text-[13px] text-text-secondary">{desc}</p>
      </div>
    </Link>
  )
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const [{ data: latestContents }, { data: userData }, ctx] = await Promise.all([
    supabase
      .from('content')
      .select('id, title, subtitle, slug, category, tiempo_lectura_min, body_que_saber')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('users')
      .select('role, trial_expires_at')
      .eq('id', user.id)
      .single(),
    getActiveContext(user.id, supabase),
  ])

  const contextOrgId: string | null = ctx.type === 'org' ? ctx.orgId : null
  let contextOrgName: string | null = null

  let pendientesCumplimiento: PendienteItem[] = []

  if (contextOrgId) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', contextOrgId)
      .single()
    contextOrgName = orgData?.name ?? null

    // Vista B de "Estándares de calidad" (M5): solo si el centro prendió el
    // feature. mis_pendientes_cumplimiento ya filtra a auth.uid() sola — acá
    // solo resolvemos los umbrales configurados por el centro.
    const estandaresCalidad = await getOrgFeatureSetting(contextOrgId, FEATURE_KEY_ESTANDARES_CALIDAD, supabase)
    if (estandaresCalidad.enabled) {
      const cfg = withEstandaresCalidadDefaults(estandaresCalidad.config)
      const { data: pendientes } = await supabase.rpc('mis_pendientes_cumplimiento', {
        p_org_id: contextOrgId,
        p_dias_cuestionario: cfg.dias_max_cuestionario_ingreso,
        p_dias_abierto: cfg.dias_paciente_abierto,
        p_dias_plan: cfg.dias_max_plan_entrenamiento,
        p_campos_obligatorios: cfg.campos_obligatorios_evaluacion_ingreso,
      })
      type PendienteRow = { kind: string; patient_id: string; patient_name: string; dias: number | null }
      pendientesCumplimiento = ((pendientes ?? []) as PendienteRow[]).map(p => ({
        kind: p.kind as PendienteItem['kind'],
        patientId: p.patient_id,
        patientName: p.patient_name,
        dias: p.dias,
      }))
    }
  }

  // Todo lo que sigue está scopeado al workspace activo (equipo vs. personal):
  // un integrante invitado a un equipo no debe ver recordatorios/pacientes
  // propios mezclados con los del equipo (y viceversa), sin importar en qué
  // pestaña esté parado.
  const [{ data: upcomingSessions }, { data: recentData }, { data: ctxPatients }] = await Promise.all([
    contextOrgId
      ? supabase
          .from('scheduled_sessions')
          .select('patient_id, scheduled_date, patients!inner(org_id)')
          .eq('completed', false)
          .gte('scheduled_date', todayStr)
          .eq('patients.org_id', contextOrgId)
      : supabase
          .from('scheduled_sessions')
          .select('patient_id, scheduled_date, patients!inner(org_id, user_id)')
          .eq('completed', false)
          .gte('scheduled_date', todayStr)
          .eq('patients.user_id', user.id)
          .is('patients.org_id', null),
    contextOrgId
      ? supabase
          .from('patients')
          .select('id, name, age, occupation')
          .eq('org_id', contextOrgId)
          .order('created_at', { ascending: false })
          .limit(3)
      : supabase
          .from('patients')
          .select('id, name, age, occupation')
          .eq('user_id', user.id)
          .is('org_id', null)
          .order('created_at', { ascending: false })
          .limit(3),
    // Pacientes del workspace activo (para los hitos de la semana).
    contextOrgId
      ? supabase.from('patients').select('id, name').eq('org_id', contextOrgId)
      : supabase.from('patients').select('id, name').eq('user_id', user.id).is('org_id', null),
  ])
  const recentPatients = recentData ?? []

  // ── Hitos de la semana (hitos + RTS + dinamometría + cuestionarios) ──
  // Ventana: semana actual (lun–dom). Evaluaciones (RTS/dinamo/cuestionarios):
  // solo con fecha de hoy en adelante (recordatorio de lo que viene).
  const dow = today.getDay() // 0 = domingo
  const monday = new Date(today)
  monday.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const mondayStr = toDateStr(monday)
  const sundayStr = toDateStr(sunday)

  const patientNameById = new Map((ctxPatients ?? []).map(p => [p.id, p.name]))
  const patientIds = Array.from(patientNameById.keys())

  const milestones: WeekMilestone[] = []
  if (patientIds.length > 0) {
    // Filtramos por patients.org_id/user_id (join), no por `.in('patient_id',
    // patientIds)`: con equipos grandes (cientos de pacientes) esa lista pasa
    // el límite de la URL y Supabase devuelve "Bad Request" (mismo bug que ya
    // se resolvió en Estadísticas y en Pacientes). El join además scopea al
    // workspace activo, en vez de traer todo lo accesible por RLS.
    const [{ data: evs }, { data: sched }] = await Promise.all([
      // Hitos: toda la semana en curso (lun–dom)
      contextOrgId
        ? supabase.from('patient_events')
            .select('id, patient_id, event_date, type, title, patients!inner(org_id)')
            .gte('event_date', mondayStr).lte('event_date', sundayStr)
            .eq('patients.org_id', contextOrgId)
        : supabase.from('patient_events')
            .select('id, patient_id, event_date, type, title, patients!inner(org_id, user_id)')
            .gte('event_date', mondayStr).lte('event_date', sundayStr)
            .eq('patients.user_id', user.id)
            .is('patients.org_id', null),
      // Evaluaciones programadas pendientes: TODAS las no completadas (incluye
      // atrasadas de días pasados, que siguen recordándose hasta hacerlas o borrarlas).
      contextOrgId
        ? supabase.from('scheduled_evaluations')
            .select('id, patient_id, kind, protocol_type, scheduled_date, patients!inner(org_id)')
            .eq('completed', false)
            .order('scheduled_date')
            .eq('patients.org_id', contextOrgId)
        : supabase.from('scheduled_evaluations')
            .select('id, patient_id, kind, protocol_type, scheduled_date, patients!inner(org_id, user_id)')
            .eq('completed', false)
            .order('scheduled_date')
            .eq('patients.user_id', user.id)
            .is('patients.org_id', null),
    ])

    for (const e of evs ?? []) {
      const meta = eventMeta(e.type)
      milestones.push({
        key: `ev_${e.id}`, patientId: e.patient_id,
        patientName: patientNameById.get(e.patient_id) ?? 'Paciente',
        label: e.title?.trim() ? `${meta.label}: ${e.title.trim()}` : meta.label,
        date: e.event_date, dateLabel: dateLabel(e.event_date), color: meta.color,
      })
    }
    for (const s of sched ?? []) {
      const color = s.kind === 'rts' ? RTS_COLOR : s.kind === 'dyn' ? DYN_COLOR : Q_COLOR
      const label = s.kind === 'rts'
        ? `Evaluación RTS · ${RTS_LABELS[s.protocol_type as string] ?? s.protocol_type ?? ''}`
        : s.kind === 'dyn' ? 'Dinamometría'
        : s.protocol_type ? `Cuestionario · ${Q_LABELS[s.protocol_type] ?? s.protocol_type}` : 'Cuestionario'
      milestones.push({
        key: `sched_${s.id}`, patientId: s.patient_id,
        patientName: patientNameById.get(s.patient_id) ?? 'Paciente',
        label, date: s.scheduled_date, dateLabel: dateLabel(s.scheduled_date), color,
        overdue: s.scheduled_date < todayStr,
      })
    }
    // Atrasadas primero (más urgentes), luego por fecha
    milestones.sort((a, b) =>
      (a.overdue === b.overdue ? 0 : a.overdue ? -1 : 1)
      || a.date.localeCompare(b.date)
      || a.patientName.localeCompare(b.patientName)
    )
  }

  const role = userData?.role
  // Guía de arranque según el plan: los Pro/admin (centros) ven el camino de
  // equipo; el resto, el flujo del profesional individual.
  const onboardingVariant: 'solo' | 'centro' = (role === 'pro' || role === 'admin') ? 'centro' : 'solo'
  const trialExpiresAt = userData?.trial_expires_at
  const daysLeft = trialExpiresAt
    ? Math.ceil((new Date(trialExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0
  const inTrial = daysLeft > 0
  const showTrialBanner = role === 'free'

  // Find patients whose last scheduled session is today or tomorrow
  const patientLastDate = new Map<string, string>()
  for (const s of upcomingSessions || []) {
    const existing = patientLastDate.get(s.patient_id)
    if (!existing || s.scheduled_date > existing) {
      patientLastDate.set(s.patient_id, s.scheduled_date)
    }
  }
  const alertPatientIds = Array.from(patientLastDate.entries())
    .filter(([, lastDate]) => lastDate <= tomorrowStr)
    .map(([id]) => id)

  let planningAlerts: { id: string; name: string; lastDate: string }[] = []
  if (alertPatientIds.length > 0) {
    const { data: alertPatients } = await supabase
      .from('patients')
      .select('id, name')
      .in('id', alertPatientIds)
    planningAlerts = (alertPatients ?? []).map(p => ({
      id: p.id,
      name: p.name,
      lastDate: patientLastDate.get(p.id)!,
    }))
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* HEADER */}
      <Header />

      {/* MAIN CONTENT */}
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12">
        <div className="mb-12">
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">
            {(() => {
              const fullName = user.user_metadata?.full_name as string | undefined
              const firstName = fullName?.trim().split(/\s+/)[0]
              return firstName ? `Hola, ${firstName}` : 'Hola'
            })()}
          </h1>
          <p className="text-text-secondary text-[16px]">
            ¿Con qué paciente trabajás hoy?
          </p>
        </div>

        <OnboardingGuide variant={onboardingVariant} />
        <WhatsNewBanner />

        {showTrialBanner && (
          <div className={`flex items-center justify-between gap-4 rounded-xl border-[0.5px] px-5 py-4 mb-6 ${
            inTrial
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-bg-secondary border-border'
          }`}>
            <div>
              {inTrial ? (
                <>
                  <p className="text-[14px] font-medium text-text-primary mb-0.5">
                    Período de prueba — {daysLeft} día{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[13px] text-text-secondary">
                    Estás usando Reason con acceso completo. Suscribite antes de que termine para no perder el acceso.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-medium text-text-primary mb-0.5">
                    Tu período de prueba terminó
                  </p>
                  <p className="text-[13px] text-text-secondary">
                    Seguís con hasta 3 pacientes gratis. Suscribite para desbloquear todo.
                  </p>
                </>
              )}
            </div>
            <Link
              href="/paywall"
              className="shrink-0 bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-all active:scale-[0.97] no-underline"
            >
              Ver planes
            </Link>
          </div>
        )}

        <PendientesCumplimientoBanner items={pendientesCumplimiento} />

        <WeekMilestonesBanner milestones={milestones} />

        <PlanningReminderBanner patients={planningAlerts} />

        {/* PACIENTES — contexto activo */}
        <section data-tour="dash-pacientes" className="mb-16">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-[20px] font-medium">
                {contextOrgName ? `Pacientes — ${contextOrgName}` : 'Mis pacientes'}
              </h2>
              {contextOrgName && (
                <p className="text-[12px] text-text-secondary mt-0.5">Pacientes compartidos con tu equipo</p>
              )}
            </div>
            <Link href="/dashboard/pacientes" className="text-[13px] text-accent hover:underline">
              Ver todos →
            </Link>
          </div>

          {recentPatients && recentPatients.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link href="/dashboard/pacientes?new=1" className="block no-underline">
                <div className="bg-bg-secondary border-[0.5px] border-dashed border-border rounded-xl px-4 py-5 hover:border-accent hover:bg-bg-primary transition-colors h-full flex flex-col items-center justify-center gap-1.5 text-center min-h-[88px]">
                  <span className="text-[22px] leading-none text-text-secondary">+</span>
                  <span className="text-[12px] text-text-secondary">Nuevo paciente</span>
                </div>
              </Link>
              {recentPatients.map(p => (
                <Link key={p.id} href={`/dashboard/pacientes/${p.id}?from=dashboard`} className="block no-underline">
                  <div className="bg-bg-primary border-[0.5px] border-border rounded-xl px-4 py-5 hover:bg-bg-secondary transition-colors h-full">
                    <div className="text-[15px] font-medium mb-1 truncate">{p.name}</div>
                    <div className="text-[12px] text-text-secondary truncate">
                      {[p.age ? `${p.age} años` : null, p.occupation].filter(Boolean).join(' · ') || 'Sin datos'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-bg-secondary rounded-xl p-12 text-center border-[0.5px] border-dashed border-border">
              <p className="text-[16px] font-medium mb-2">Todavía no tenés pacientes</p>
              <p className="text-[13px] text-text-secondary mb-5">Creá tu primer paciente para empezar a trabajar clínicamente con Reason.</p>
              <Link href="/dashboard/pacientes?new=1" className="bg-accent text-bg-primary px-5 py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 active:scale-[0.97] inline-block no-underline">
                + Crear primer paciente
              </Link>
            </div>
          )}
        </section>

        {/* ÚLTIMOS CONTENIDOS */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-[20px] font-medium">Últimos contenidos</h2>
            <Link href="/library" className="text-[13px] text-accent hover:underline">
              Ver todos →
            </Link>
          </div>

          {latestContents && latestContents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestContents.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="bg-bg-secondary rounded-xl p-12 text-center border-[0.5px] border-border">
              <p className="text-text-secondary">Todavía no hay contenidos publicados.</p>
            </div>
          )}
        </section>

        {/* POR CATEGORÍA */}
        <section data-tour="dash-explorar" className="mb-16">
          <h2 className="text-[20px] font-medium mb-6">Explorar por categoría</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <CategoryCard
              title="Resúmenes Comentados"
              slug="resumen_comentado"
              desc="La literatura actual destilada"
            />
            <CategoryCard
              title="Aplicaciones Clínicas"
              slug="aplicacion_clinica"
              desc="De la teoría a la práctica"
            />
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-8 border-t-[0.5px] border-border mt-auto">
        <div className="w-full max-w-[1080px] mx-auto px-8 flex justify-between items-center text-[12px] text-text-tertiary">
          <span>© {new Date().getFullYear()} Reason. Todos los derechos reservados.</span>
          <div className="flex gap-4">
            <Link href="/sobre-tus-datos" className="hover:text-text-primary transition-colors">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
