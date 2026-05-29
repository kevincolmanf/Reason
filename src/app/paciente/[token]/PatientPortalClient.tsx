'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface RecentSession {
  session_date: string; activity: string | null; rpe: number; load_units: number; vas_post: number | null; source: string
}
interface ExWeek { week: number; sets: string; reps: string; load: string; rest: string; rpe: string; eav: string }
interface SessionExercise {
  id: string; exercise_id: string; exercise_name: string; youtube_url: string; group?: string
  sets?: string; reps?: string; load?: string; rpe_obj?: string; eav_obj?: string; rest?: string
  // Formato alternativo: dosificación por semana
  weeks?: ExWeek[]
}
interface SessionBlock { id: string; name: string; exercises: SessionExercise[] }
interface SessionData { blocks: SessionBlock[] }

interface ScheduledItem {
  id: string; plan_id: string; session_id: string; session_name: string; scheduled_date: string
  week: number; completed: boolean
  session_data: SessionData | null
  exercise_plans: { share_token: string | null }[] | null
}

interface PlanSession {
  id: string; name: string; shareToken: string | null
  blocks: SessionBlock[]
}

interface Props {
  patient: { id: string; name: string; user_id: string }
  token: string; recentSessions: RecentSession[]; scheduledSessions: ScheduledItem[]
  planSessions: PlanSession[]
}
type ActivityType = 'rehab' | 'sport' | 'combined'

const ACTIVITY_TYPES: { value: ActivityType; label: string; desc: string }[] = [
  { value: 'rehab',    label: 'Rehabilitación', desc: 'Ejercicios del plan del kine' },
  { value: 'sport',   label: 'Deporte / Actividad', desc: 'Práctica, partido, salir a correr...' },
  { value: 'combined', label: 'Combinado',      desc: 'Rehab + deporte en el mismo día' },
]

const RPE_LABELS: Record<number, string> = {
  0: 'Reposo', 1: 'Muy suave', 2: 'Suave', 3: 'Moderado', 4: 'Algo intenso',
  5: 'Intenso', 6: 'Intenso+', 7: 'Muy intenso', 8: 'Muy intenso+', 9: 'Casi máximo', 10: 'Máximo',
}

function vasColor(v: number) {
  if (v <= 20) return 'text-green-500'
  if (v <= 40) return 'text-yellow-500'
  if (v <= 60) return 'text-orange-500'
  return 'text-red-500'
}

function VasSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-[12px] uppercase tracking-[0.05em] text-text-secondary">{label}</label>
        <span className={`text-[14px] font-medium ${vasColor(value)}`}>{value}</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-accent" />
      <div className="flex justify-between text-[10px] text-text-secondary mt-0.5">
        <span>Sin dolor</span><span>Máximo</span>
      </div>
    </div>
  )
}

function todayStr() { return new Date().toISOString().split('T')[0] }
function formatShortDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}


const DAY_NAMES_ES_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function addDaysToStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function fmtDayMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${DAY_NAMES_ES_LONG[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
}

interface WeekGroup {
  mondayStr: string
  isCurrentWeek: boolean
  label: string
  days: { dateStr: string; sessions: ScheduledItem[] }[]
}

function groupSessionsByWeek(sessions: ScheduledItem[], today: string): WeekGroup[] {
  const currentMonday = getMondayOf(today)
  const weekMap = new Map<string, WeekGroup>()

  for (const s of sessions) {
    const monday = getMondayOf(s.scheduled_date)
    if (!weekMap.has(monday)) {
      const sunday = addDaysToStr(monday, 6)
      const isCurrentWeek = monday === currentMonday
      weekMap.set(monday, {
        mondayStr: monday,
        isCurrentWeek,
        label: isCurrentWeek
          ? `Esta semana · ${fmtDayMonth(monday)} - ${fmtDayMonth(sunday)}`
          : `${fmtDayMonth(monday)} - ${fmtDayMonth(sunday)}`,
        days: [],
      })
    }
    const week = weekMap.get(monday)!
    const dayEntry = week.days.find(d => d.dateStr === s.scheduled_date)
    if (dayEntry) {
      dayEntry.sessions.push(s)
    } else {
      week.days.push({ dateStr: s.scheduled_date, sessions: [s] })
    }
  }

  const weeks = Array.from(weekMap.values()).sort((a, b) => a.mondayStr.localeCompare(b.mondayStr))
  for (const week of weeks) {
    week.days.sort((a, b) => a.dateStr.localeCompare(b.dateStr))
  }
  return weeks
}

export default function PatientPortalClient({ patient, token, recentSessions, scheduledSessions, planSessions }: Props) {
  const [showHelp, setShowHelp] = useState(false)

  // Próxima sesión incompleta (hoy o futura) — para highlight y auto-open
  const nextUpcomingId = useMemo(() => {
    const today = todayStr()
    return scheduledSessions
      .filter(s => !s.completed && s.scheduled_date >= today)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0]?.id ?? null
  }, [scheduledSessions])

  const nextUpcomingDate = useMemo(() => {
    return scheduledSessions.find(s => s.id === nextUpcomingId)?.scheduled_date ?? todayStr()
  }, [nextUpcomingId, scheduledSessions])

  const [selectedWeekMonday, setSelectedWeekMonday] = useState(() => getMondayOf(nextUpcomingDate))
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(nextUpcomingId)

  // Refs para poder leer el estado actual dentro del effect sin re-suscribir
  const expandedSessionIdRef = useRef(expandedSessionId)
  const selectedWeekMondayRef = useRef(selectedWeekMonday)
  useEffect(() => { expandedSessionIdRef.current = expandedSessionId }, [expandedSessionId])
  useEffect(() => { selectedWeekMondayRef.current = selectedWeekMonday }, [selectedWeekMonday])

  const router = useRouter()

  // Restaurar posición y estado desde localStorage (persiste a través de bloqueos y salidas de app)
  useEffect(() => {
    const savedSession = localStorage.getItem('portal_session')
    const savedWeek = localStorage.getItem('portal_week')
    const savedScroll = localStorage.getItem('portal_scroll')

    if (savedSession !== null) setExpandedSessionId(savedSession || null)
    if (savedWeek) setSelectedWeekMonday(savedWeek)
    if (savedScroll) {
      requestAnimationFrame(() => window.scrollTo({ top: Number(savedScroll), behavior: 'instant' as ScrollBehavior }))
    }
  }, [])

  // Persistir estado continuamente para sobrevivir bloqueos de pantalla y salidas de app
  useEffect(() => { localStorage.setItem('portal_week', selectedWeekMonday) }, [selectedWeekMonday])
  useEffect(() => { localStorage.setItem('portal_session', expandedSessionId ?? '') }, [expandedSessionId])
  useEffect(() => {
    const save = () => localStorage.setItem('portal_scroll', String(window.scrollY))
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [])

  // Visibilidad: recargar solo si estuvo oculto >= 5 min. Realtime para cambios del kine.
  useEffect(() => {
    let hiddenAt: number | null = null

    const saveAndReload = () => {
      localStorage.setItem('portal_scroll', String(window.scrollY))
      localStorage.setItem('portal_week', selectedWeekMondayRef.current)
      localStorage.setItem('portal_session', expandedSessionIdRef.current ?? '')
      window.location.reload()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
      } else if (document.visibilityState === 'visible' && hiddenAt !== null) {
        const ms = Date.now() - hiddenAt
        hiddenAt = null
        if (ms >= 5 * 60 * 1000) saveAndReload()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)

    const supabase = createClient()
    const channel = supabase
      .channel(`portal:${patient.id}`)
      .on('broadcast', { event: 'refresh' }, () => { saveAndReload() })
      .subscribe()

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      supabase.removeChannel(channel)
    }
  }, [router, patient.id])

  // Form
  const [activityType, setActivityType] = useState<ActivityType>('rehab')
  const [formDate, setFormDate] = useState(todayStr())
  const [formActivity, setFormActivity] = useState('')
  const [formDuration, setFormDuration] = useState('')
  const [formRpe, setFormRpe] = useState<number | null>(null)
  const [vasPre, setVasPre] = useState(0)
  const [vasDuring, setVasDuring] = useState(0)
  const [vasPost, setVasPost] = useState(0)

  // Bienestar pre-sesión
  const [sleepQuality, setSleepQuality] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [stress, setStress] = useState<number | null>(null)

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false)
  const [localSessions, setLocalSessions] = useState<RecentSession[]>(recentSessions)

  const calculatedLoad = formRpe !== null && formDuration ? formRpe * (parseInt(formDuration) || 0) : null

  const showSportSection = activityType === 'sport' || activityType === 'combined'

  const handleSubmit = async (skipEmptyCheck = false) => {
    if (!formDate) return

    const hasEmptyData = !formDuration || formRpe === null
    if (hasEmptyData && !skipEmptyCheck) {
      setShowConfirmEmpty(true)
      return
    }
    setShowConfirmEmpty(false)

    const duration = parseInt(formDuration) || 0
    const rpe = formRpe ?? 0

    setSubmitStatus('loading')
    try {
      const res = await fetch('/api/carga/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          session_date: formDate,
          activity: formActivity.trim() || null,
          activity_type: activityType,
          duration_minutes: duration,
          rpe: rpe,
          vas_pre: vasPre,
          vas_during: showSportSection ? vasDuring : null,
          vas_post: vasPost,
          sleep_quality: sleepQuality,
          energy,
          stress,
        }),
      })

      if (!res.ok) { setSubmitStatus('error'); setTimeout(() => setSubmitStatus('idle'), 3000); return }

      setLocalSessions(prev => [{
        session_date: formDate, activity: formActivity.trim() || null,
        rpe: rpe, load_units: rpe * duration, vas_post: vasPost, source: 'patient',
      }, ...prev].slice(0, 30))

      setSubmitStatus('success')
      setFormDate(todayStr()); setFormActivity(''); setFormDuration(''); setFormRpe(null)
      setSleepQuality(null); setEnergy(null); setStress(null)
      setVasPre(0); setVasDuring(0); setVasPost(0)
      setTimeout(() => setSubmitStatus('idle'), 3000)
    } catch {
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus('idle'), 3000)
    }
  }

  return (
    <div className="space-y-10 pb-12">

      {/* ── AYUDA ──────────────────────────────────────────── */}
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowHelp(v => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-primary transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[16px]">📱</span>
            <span className="text-[13px] font-medium text-text-primary">¿Cómo usar el portal?</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`shrink-0 text-text-secondary transition-transform ${showHelp ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showHelp && (
          <div className="border-t-[0.5px] border-border px-4 py-4 space-y-5 text-[13px] leading-[1.6]">

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-accent mb-2">Qué hay en el portal</p>
              <ul className="space-y-2 text-text-secondary">
                <li className="flex gap-2">
                  <span className="shrink-0 text-accent mt-0.5">→</span>
                  <span><span className="text-text-primary font-medium">Mi semana:</span> la sesión de hoy aparece abierta al entrar. Tocá cualquier otra para ver sus ejercicios.</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-accent mt-0.5">→</span>
                  <span><span className="text-text-primary font-medium">Mi semana:</span> todas tus sesiones organizadas por semana. Tocá cualquiera para ver los ejercicios. La semana actual aparece abierta.</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-accent mt-0.5">→</span>
                  <span><span className="text-text-primary font-medium">Mi plan:</span> todos los ejercicios del programa. Tocá <span className="text-text-primary">▶ Ver</span> para abrir el video de cada ejercicio.</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-accent mt-0.5">→</span>
                  <span><span className="text-text-primary font-medium">Registrar sesión:</span> completá después de cada entrenamiento. Tu kinesiólogo lo ve en tiempo real.</span>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-accent mb-2">Cómo registrar una sesión</p>
              <ul className="space-y-1.5 text-text-secondary">
                <li className="flex gap-2"><span className="shrink-0 text-accent mt-0.5">1.</span><span><span className="text-text-primary font-medium">Cómo llegás:</span> calificá tu sueño, energía y estrés antes de arrancar (opcional pero útil para tu kine).</span></li>
                <li className="flex gap-2"><span className="shrink-0 text-accent mt-0.5">2.</span><span><span className="text-text-primary font-medium">Tipo de sesión:</span> elegí si fue rehabilitación, deporte/actividad, o ambos.</span></li>
                <li className="flex gap-2"><span className="shrink-0 text-accent mt-0.5">3.</span><span><span className="text-text-primary font-medium">Duración y esfuerzo:</span> minutos que entrenaste y RPE del 0 al 10.</span></li>
                <li className="flex gap-2"><span className="shrink-0 text-accent mt-0.5">4.</span><span><span className="text-text-primary font-medium">Dolor:</span> indicá en la escala 0–100 cómo estuvo el dolor antes, durante y después.</span></li>
                <li className="flex gap-2"><span className="shrink-0 text-accent mt-0.5">5.</span><span><span className="text-text-primary font-medium">Comentar ejercicios</span> (opcional): podés dejar RPE y nota por ejercicio individual.</span></li>
              </ul>
              <p className="text-text-secondary mt-2">Si no tenés todos los datos, podés guardar igual — el sistema te avisa antes de confirmar.</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-accent mb-3">Instalá como app — Android</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center mt-0.5">1</span>
                  <span className="text-text-secondary">Abrí esta página en <span className="text-text-primary font-medium">Chrome</span> y tocá el menú <span className="text-text-primary">⋮</span> arriba a la derecha</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center mt-0.5">2</span>
                  <span className="text-text-secondary">Tocá <span className="text-text-primary font-medium">&ldquo;Agregar a pantalla de inicio&rdquo;</span> y confirmá</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-accent mb-3">Instalá como app — iPhone</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center mt-0.5">1</span>
                  <span className="text-text-secondary">Abrí esta página en <span className="text-text-primary font-medium">Safari</span> y tocá el ícono de compartir <span className="text-text-primary">⬆</span> abajo en el centro</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center mt-0.5">2</span>
                  <span className="text-text-secondary">Tocá <span className="text-text-primary font-medium">&ldquo;Añadir a pantalla de inicio&rdquo;</span> y confirmá</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── MI SEMANA ──────────────────────────────────────── */}
      {scheduledSessions.length > 0 && (() => {
        const weekGroups = groupSessionsByWeek(scheduledSessions, todayStr())
        const activeWeek = weekGroups.find(w => w.mondayStr === selectedWeekMonday) ?? weekGroups[0] ?? null
        return (
          <section>
            <h2 className="text-[20px] font-medium tracking-[-0.01em] mb-3">Mi semana</h2>

            {/* Chips de semana */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 mb-4">
              {weekGroups.map(week => (
                <button
                  key={week.mondayStr}
                  onClick={() => setSelectedWeekMonday(week.mondayStr)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium border-[0.5px] whitespace-nowrap transition-colors ${
                    selectedWeekMonday === week.mondayStr
                      ? 'bg-accent text-bg-primary border-accent'
                      : week.isCurrentWeek
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {week.isCurrentWeek ? 'Esta semana' : `${fmtDayMonth(week.mondayStr)} – ${fmtDayMonth(addDaysToStr(week.mondayStr, 6))}`}
                </button>
              ))}
            </div>

            {/* Días de la semana seleccionada */}
            {activeWeek && (
              <div className="space-y-3">
                {activeWeek.days.map(day => (
                  <div key={day.dateStr}>
                    <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1.5 px-1">
                      {getDayLabel(day.dateStr)}
                    </div>
                    <div className="space-y-1.5">
                      {day.sessions.map(s => (
                        <div key={s.id}>
                          <button
                            onClick={() => setExpandedSessionId(prev => prev === s.id ? null : s.id)}
                            className={`w-full text-left flex items-center gap-3 rounded-xl px-4 py-3 border-[0.5px] transition-colors ${
                              s.completed
                                ? 'border-border bg-bg-secondary opacity-50'
                                : s.id === nextUpcomingId
                                ? 'border-accent bg-accent/15 hover:bg-accent/20'
                                : 'border-border bg-bg-secondary hover:border-accent/40'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              s.completed ? 'bg-text-secondary'
                              : s.id === nextUpcomingId ? 'bg-accent'
                              : 'bg-border'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className={`text-[13px] font-medium ${s.completed ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                                {s.session_name}
                              </div>
                              {s.id === nextUpcomingId && (
                                <div className="text-[10px] font-medium text-accent mt-0.5 uppercase tracking-[0.06em]">Próxima</div>
                              )}
                            </div>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              className={`text-text-secondary shrink-0 transition-transform ${expandedSessionId === s.id ? 'rotate-180' : ''}`}>
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                          {expandedSessionId === s.id && (
                            <SessionExercisesInline session={s} portalToken={token} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })()}

      {/* ── MI PROGRAMA (fallback: si ninguna sesión de calendario tiene ejercicios) ─── */}
      {planSessions.length > 0 && !scheduledSessions.some(s => (s.session_data?.blocks?.length ?? 0) > 0) && (
        <section>
          <h2 className="text-[20px] font-medium tracking-[-0.01em] mb-4">Mi programa</h2>
          <div className="space-y-2">
            {planSessions.map(ps => (
              <div key={ps.id} className="bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedSessionId(prev => prev === ps.id ? null : ps.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bg-secondary transition-colors"
                >
                  <span className="text-[14px] font-medium text-text-primary">{ps.name}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`text-text-secondary shrink-0 transition-transform ${expandedSessionId === ps.id ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {expandedSessionId === ps.id && (
                  <div className="border-t-[0.5px] border-border">
                    <SessionExercisesInline
                      session={{ id: ps.id, scheduled_date: '', session_data: { blocks: ps.blocks }, exercise_plans: ps.shareToken ? [{ share_token: ps.shareToken }] : null } as ScheduledItem}
                      portalToken={token}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── REGISTRAR SESIÓN ───────────────────────────────── */}
      <section>
        <h2 className="text-[20px] font-medium tracking-[-0.01em] mb-1">Registrar sesión</h2>
        <p className="text-[13px] text-text-secondary mb-5">Completá después de cada entrenamiento.</p>

        <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5 space-y-6">

          {/* Bienestar */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Cómo llegás hoy</label>
            <div className="space-y-4">
              {([
                { label: 'Sueño', low: 'Dormí muy mal', high: 'Dormí muy bien', value: sleepQuality, set: setSleepQuality },
                { label: 'Energía', low: 'Sin energía', high: 'Muy energético', value: energy, set: setEnergy },
                { label: 'Estrés', low: 'Muy estresado', high: 'Sin estrés', value: stress, set: setStress },
              ] as const).map(({ label, low, high, value, set }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[13px] text-text-primary">{label}</span>
                    {value !== null && <span className="text-[13px] font-medium text-accent">{value}</span>}
                  </div>
                  <div className="flex gap-1">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button
                        key={n}
                        onClick={() => set(n === value ? null : n)}
                        className={`flex-1 py-1.5 rounded text-[12px] font-medium transition-all ${
                          value === n
                            ? 'bg-accent text-bg-primary'
                            : 'bg-bg-secondary text-text-secondary hover:text-text-primary border-[0.5px] border-border'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-text-secondary mt-1">
                    <span>{low}</span><span>{high}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tipo de sesión */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Tipo de sesión</label>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2">
              {ACTIVITY_TYPES.map(t => (
                <button key={t.value} onClick={() => setActivityType(t.value)}
                  className={`flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0 px-4 sm:px-3 py-3 rounded-xl border-[0.5px] text-left transition-all ${activityType === t.value ? 'bg-accent/10 border-accent text-text-primary' : 'bg-bg-secondary border-border text-text-secondary hover:border-text-secondary'}`}
                >
                  <span className={`text-[13px] font-medium sm:mb-0.5 whitespace-nowrap ${activityType === t.value ? 'text-accent' : ''}`}>{t.label}</span>
                  <span className="text-[11px] sm:text-[10px] leading-[1.3] opacity-70">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha</label>
            <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
              className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
            />
          </div>

          {/* Actividad */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">
              {activityType === 'rehab' ? 'Actividad (opcional)' : '¿Qué hiciste?'}
            </label>
            <input type="text" value={formActivity} onChange={e => setFormActivity(e.target.value)}
              placeholder={activityType === 'rehab' ? 'Ej: Rehabilitación LCA' : 'Ej: Fútbol, Entrenamiento físico, Carrera...'}
              className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
            />
          </div>

          {/* Duración */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Duración (minutos)</label>
            <input type="number" value={formDuration} onChange={e => setFormDuration(e.target.value)}
              min={1} placeholder="60"
              className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
            />
          </div>

          {/* Dolor PRE */}
          <VasSlider label="Dolor antes de empezar (0–100)" value={vasPre} onChange={setVasPre} />

          {/* Dolor DURANTE — solo para deporte/combinado */}
          {showSportSection && (
            <VasSlider label="Dolor durante la práctica (0–100)" value={vasDuring} onChange={setVasDuring} />
          )}

          {/* RPE */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">
              Esfuerzo general de la sesión (0–10)
            </label>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {[0, 1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => setFormRpe(n)}
                  className={`py-3 rounded-lg text-[15px] font-medium border-[0.5px] transition-colors ${formRpe === n ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-primary hover:border-accent'}`}
                >{n}</button>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {[5, 6, 7, 8, 9, 10].map(n => (
                <button key={n} onClick={() => setFormRpe(n)}
                  className={`py-3 rounded-lg text-[15px] font-medium border-[0.5px] transition-colors ${formRpe === n ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-primary hover:border-accent'}`}
                >{n}</button>
              ))}
            </div>
            {formRpe !== null && <p className="text-[12px] text-text-secondary mt-2">{formRpe} — {RPE_LABELS[formRpe]}</p>}
            {calculatedLoad !== null && calculatedLoad > 0 && <p className="text-[12px] text-accent mt-1">Carga calculada: {calculatedLoad} UA</p>}
          </div>

          {/* Dolor POST */}
          <VasSlider label="Dolor después de entrenar (0–100)" value={vasPost} onChange={setVasPost} />

          {/* Confirmación al guardar sin datos */}
          {showConfirmEmpty && (
            <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4">
              <p className="text-[13px] font-medium text-text-primary mb-1">¿Guardar sin completar los datos?</p>
              <p className="text-[12px] text-text-secondary mb-3">Tu entrenador no va a poder ver el esfuerzo ni la duración de esta sesión.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSubmit(true)}
                  className="flex-1 bg-accent text-bg-primary py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
                >
                  Sí, guardar igual
                </button>
                <button
                  onClick={() => setShowConfirmEmpty(false)}
                  className="flex-1 bg-bg-primary border-[0.5px] border-border py-2.5 rounded-lg text-[13px] text-text-secondary hover:text-text-primary transition-colors"
                >
                  Completar datos
                </button>
              </div>
            </div>
          )}

          {/* Submit */}
          <button onClick={() => handleSubmit()}
            disabled={submitStatus === 'loading' || !formDate}
            className="w-full bg-accent text-bg-primary py-3.5 rounded-xl text-[15px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {submitStatus === 'loading' ? 'Registrando...'
              : submitStatus === 'success' ? '✓ Sesión registrada'
              : submitStatus === 'error' ? 'Error. Intentá de nuevo.'
              : 'Registrar sesión'}
          </button>
        </div>
      </section>

      {/* ── ÚLTIMAS SESIONES ──────────────────────────────── */}
      {localSessions.length > 0 && (
        <section>
          <h2 className="text-[20px] font-medium tracking-[-0.01em] mb-3">Mis últimas sesiones</h2>
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl divide-y-[0.5px] divide-border overflow-hidden">
            {localSessions.slice(0, 5).map((s, idx) => (
              <div key={idx} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-[13px] text-text-primary truncate flex-1">{s.activity || '—'}</div>
                  <div className="text-[11px] text-text-secondary shrink-0">{formatShortDate(s.session_date)}</div>
                </div>
                <div className="flex gap-3 text-[12px] text-text-secondary">
                  <span>RPE <span className="text-text-primary font-medium">{s.rpe}</span></span>
                  <span><span className="text-text-primary font-medium">{s.load_units}</span> UA</span>
                  {s.vas_post !== null && <span>Dolor <span className={`font-medium ${vasColor(s.vas_post)}`}>{s.vas_post}</span></span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}

function SessionExercisesInline({ session, portalToken }: { session: ScheduledItem; portalToken: string }) {
  const blocks = (session.session_data?.blocks ?? []).filter(b => b.exercises.length > 0)
  const shareToken = session.exercise_plans?.[0]?.share_token ?? null

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [logRpe, setLogRpe] = useState('')
  const [logEva, setLogEva] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [logStatus, setLogStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [logRpeError, setLogRpeError] = useState(false)

  const openInlineLog = (exId: string) => {
    setExpandedLogId(exId)
    setLogRpe(''); setLogEva(''); setLogNotes(''); setLogStatus('idle'); setLogRpeError(false)
  }

  const submitInlineLog = async (ex: SessionExercise) => {
    const rpe = Number(logRpe)
    if (logRpe === '' || isNaN(rpe) || rpe < 0 || rpe > 10) {
      setLogRpeError(true)
      return
    }
    setLogRpeError(false)
    setLogStatus('loading')
    try {
      // Use plan share_token if available, otherwise fall back to patient portal token
      const url = shareToken
        ? `/api/plan/${shareToken}/log`
        : `/api/paciente/${portalToken}/log`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          session_id: session.id,
          week: 1,
          rpe,
          eva: logEva ? Number(logEva) : 0,
          notes: logNotes || null,
          scheduled_date: session.scheduled_date,
        }),
      })
      if (!res.ok) throw new Error()
      setLogStatus('done')
      setTimeout(() => { setExpandedLogId(null); setLogStatus('idle') }, 1800)
    } catch {
      setLogStatus('error')
    }
  }

  if (blocks.length === 0) {
    return <p className="text-[13px] text-text-secondary px-3 py-3">Esta sesión no tiene ejercicios asignados.</p>
  }

  return (
    <div className="mt-2 space-y-3">
      {blocks.map(block => (
        <div key={block.id} className="bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-bg-secondary border-b-[0.5px] border-border">
            <span className="text-[12px] font-medium text-text-primary uppercase tracking-[0.05em]">{block.name}</span>
          </div>
          <div className="divide-y-[0.5px] divide-border">
            {block.exercises.map(ex => (
              <div key={ex.id} className="p-4">
                {/* Nombre + grupo + video */}
                <div className="flex items-start gap-1.5 flex-wrap mb-2">
                  {ex.group && (
                    <span className="text-[11px] font-mono font-medium bg-accent/10 border-[0.5px] border-accent/40 text-accent rounded px-1.5 py-0.5">{ex.group}</span>
                  )}
                  <span className="text-[14px] font-medium text-text-primary">{ex.exercise_name}</span>
                </div>
                {ex.youtube_url && (
                  <a href={ex.youtube_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] text-accent hover:underline mb-2">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    Ver video
                  </a>
                )}

                {/* Dosificación — soporta tanto el formato plano como el de weeks[] */}
                {(() => {
                  const w0 = ex.weeks?.[0]
                  const sets  = ex.sets  || w0?.sets  || ''
                  const reps  = ex.reps  || w0?.reps  || ''
                  const load  = ex.load  || w0?.load  || ''
                  const rest  = ex.rest  || w0?.rest  || ''
                  const hasDose = sets || reps || load || rest
                  if (!hasDose) return null
                  return (
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
                      <div>
                        <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-0.5">Series × Reps</div>
                        <div className="text-[13px] font-medium text-accent">{sets || '–'} × {reps || '–'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-0.5">Carga</div>
                        <div className="text-[13px] font-medium">{load || '–'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-0.5">Descanso</div>
                        <div className="text-[13px] font-medium">{rest || '–'}</div>
                      </div>
                    </div>
                  )
                })()}

                {/* Log inline */}
                {expandedLogId !== ex.id && (
                  <button
                    onClick={() => openInlineLog(ex.id)}
                    className="mt-2.5 flex items-center gap-1 text-[11px] text-text-secondary hover:text-accent transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Reportar ejercicio
                  </button>
                )}

                {expandedLogId === ex.id && (
                  <div className="mt-3 pt-3 border-t-[0.5px] border-border/50 space-y-2">
                    {logStatus === 'done' ? (
                      <p className="text-[12px] text-accent py-1">✓ Registrado correctamente</p>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-text-secondary uppercase tracking-[0.05em]">RPE (1–10) *</label>
                            <input type="number" min="0" max="10" value={logRpe}
                              onChange={e => { setLogRpe(e.target.value); setLogRpeError(false) }} placeholder="ej: 7"
                              className={`w-full bg-bg-primary border-[0.5px] rounded-lg px-2 py-1.5 text-[13px] outline-none mt-0.5 ${logRpeError ? 'border-red-400 focus:border-red-400' : 'border-border focus:border-accent'}`} />
                          {logRpeError && <p className="text-[10px] text-red-400 mt-0.5">Ingresá un valor entre 0 y 10</p>}
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-text-secondary uppercase tracking-[0.05em]">Dolor EVA (0–10)</label>
                            <input type="number" min="0" max="10" value={logEva}
                              onChange={e => setLogEva(e.target.value)} placeholder="ej: 2"
                              className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-2 py-1.5 text-[13px] outline-none focus:border-accent mt-0.5" />
                          </div>
                        </div>
                        <input type="text" value={logNotes} onChange={e => setLogNotes(e.target.value)}
                          placeholder="Observaciones (opcional)"
                          className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-2 py-1.5 text-[13px] outline-none focus:border-accent" />
                        {logStatus === 'error' && (
                          <p className="text-[11px] text-warning">No se pudo guardar. Intentá de nuevo.</p>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => submitInlineLog(ex)}
                            disabled={!logRpe || logStatus === 'loading'}
                            className="flex-1 bg-accent text-bg-primary py-2 rounded-lg text-[12px] font-medium hover:opacity-90 disabled:opacity-40">
                            {logStatus === 'loading' ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button onClick={() => setExpandedLogId(null)}
                            className="px-4 py-2 border-[0.5px] border-border rounded-lg text-[12px] text-text-secondary hover:text-text-primary transition-colors">
                            Cancelar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
