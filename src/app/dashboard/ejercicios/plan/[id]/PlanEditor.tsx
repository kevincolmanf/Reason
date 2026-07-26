'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { v4 as uuidv4 } from 'uuid'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { EVENT_TYPES, eventMeta, type PatientEvent } from '@/lib/patientEvents'
import { groupColor } from '@/lib/exerciseGroups'
import { useConfirm, useToast } from '@/components/Dialogs'

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface SessionExercise {
  id: string
  exercise_id: string
  exercise_name: string
  youtube_url: string
  group?: string
  sets: string
  reps: string
  load: string
  rpe_obj: string
  eav_obj: string
  rest: string
  recommendations: string
}

interface SessionBlock {
  id: string
  name: string
  exercises: SessionExercise[]
}

interface SessionData {
  blocks: SessionBlock[]
}

interface ScheduledSession {
  id: string
  scheduled_date: string
  session_name: string | null
  session_data: SessionData | null
  completed: boolean
}

interface PlanDataSession {
  id: string
  name: string
  blocks: Array<{
    id: string
    name: string
    exercises: SessionExercise[]
  }>
}

interface ExercisePlan {
  id: string
  name: string
  notes: string | null
  start_date: string | null
  plan_data: { sessions: unknown[] }
  share_token: string | null
  patient_id: string | null
  active_week: number | null
}

interface ActivityLog {
  id: string
  exercise_id: string
  exercise_name: string
  session_id: string
  week: number
  rpe: number
  eva: number
  notes: string | null
  logged_at: string
  scheduled_date: string | null
}

type TrafficLight = 'green' | 'yellow' | 'red'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getTrafficLight(rpe: number, eva: number): TrafficLight {
  if (rpe >= 8 || eva >= 7) return 'red'
  if (rpe >= 6 || eva >= 4) return 'yellow'
  return 'green'
}

const TRAFFIC_COLORS: Record<TrafficLight, string> = {
  green:  'bg-green-500',
  yellow: 'bg-yellow-400',
  red:    'bg-red-500',
}

const TRAFFIC_LABELS: Record<TrafficLight, string> = {
  green:  'Bien tolerado',
  yellow: 'Esfuerzo moderado-alto',
  red:    'Esfuerzo muy alto o dolor',
}

const CATEGORIES = [
  { value: 'lower_body', label: 'Lower Body' },
  { value: 'upper_body', label: 'Upper Body' },
  { value: 'trunk_core', label: 'Trunk & Core' },
  { value: 'jump', label: 'Jump' },
  { value: 'speed', label: 'Speed' },
  { value: 'mobility_stretch', label: 'Mobility & Stretch' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'testing', label: 'Testing' },
  { value: 'adjuntos', label: 'Adjuntos (Build)' },
  { value: 'mis_ejercicios', label: 'Mis Ejercicios' },
]

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

const DAY_NAMES_FULL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function formatDateHeader(d: Date): string {
  const dayOfWeek = DAY_NAMES_FULL[(d.getDay() + 6) % 7]
  return `${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface RtsEval { id: string; protocol_type: string; created_at: string; evaluation_date?: string | null; affected_side: string | null }
const RTS_LABELS: Record<string, string> = {
  lca: 'LCA', hamstring: 'Isquios', ankle: 'Tobillo', pfp: 'Femoropatelar',
  tendinopathy: 'Tendinopatía', groin: 'Inguinal', shoulder: 'Hombro',
}
const RTS_PROTOCOLS: { value: string; label: string }[] = [
  { value: 'lca', label: 'LCA' },
  { value: 'hamstring', label: 'Isquiotibiales' },
  { value: 'ankle', label: 'Tobillo' },
  { value: 'pfp', label: 'Femoropatelar' },
  { value: 'tendinopathy', label: 'Tendinopatía' },
  { value: 'groin', label: 'Inguinal' },
  { value: 'shoulder', label: 'Hombro' },
]
const RTS_COLOR = '#C27B54' // terracota — coincide con el hito "RTP"

interface DynEval { id: string; created_at: string; evaluation_date?: string | null }
const DYN_COLOR = '#2563EB' // azul — dinamometría
// (confirmaciones y avisos estilizados vía useConfirm/useToast)

interface QEval { id: string; questionnaire_type: string; created_at: string; evaluation_date?: string | null }
const Q_COLOR = '#059669' // verde — cuestionarios
const Q_LABELS: Record<string, string> = {
  spadi: 'SPADI', ndi: 'NDI', roland_morris: 'Roland-Morris', start_back: 'STarT Back',
  tampa: 'TAMPA', catastrofismo: 'PCS', oswestry: 'Oswestry', dash: 'DASH',
  lefs: 'LEFS', psfs: 'PSFS', fabq: 'FABQ', koos: 'KOOS', acl_rsi: 'ACL-RSI',
}

// Evaluaciones programadas (agendadas a futuro sin completar en el momento)
type EvalKind = 'rts' | 'dyn' | 'quest'
interface SchedEval { id: string; kind: EvalKind; protocol_type: string | null; scheduled_date: string; completed: boolean }
const EVAL_META: Record<EvalKind, { label: string; color: string }> = {
  rts:   { label: 'RTS',           color: RTS_COLOR },
  dyn:   { label: 'Dinamometría',  color: DYN_COLOR },
  quest: { label: 'Cuestionario',  color: Q_COLOR },
}
// Tipos de cuestionario elegibles al programar. Solo los que la herramienta
// (/recursos/cuestionarios) sabe completar, para que la preselección funcione.
const QUEST_TYPES = ['spadi', 'ndi', 'roland_morris', 'start_back', 'tampa', 'catastrofismo', 'oswestry', 'dash', 'lefs', 'psfs', 'fabq']
const QUEST_OPTIONS = QUEST_TYPES.map(value => ({ value, label: Q_LABELS[value] ?? value }))
function schedLabel(s: SchedEval): string {
  if (s.kind === 'rts') return `RTS · ${RTS_LABELS[s.protocol_type ?? ''] ?? s.protocol_type ?? ''}`
  if (s.kind === 'quest') return s.protocol_type ? `Cuestionario · ${Q_LABELS[s.protocol_type] ?? s.protocol_type}` : 'Cuestionario'
  return EVAL_META[s.kind].label
}

export default function PlanEditor({ initialPlan, userId, initialEvents = [], rtsEvals = [], dynEvals = [], qEvals = [] }: { initialPlan: ExercisePlan, userId: string, initialEvents?: PatientEvent[], rtsEvals?: RtsEval[], dynEvals?: DynEval[], qEvals?: QEval[] }) {
  const router = useRouter()
  const { confirm, confirmDialog } = useConfirm()
  const { notify, toast } = useToast()
  const [plan, setPlan] = useState<ExercisePlan>(initialPlan)
  // Ubicación en el calendario: por la fecha elegida (evaluation_date) o, si no
  // tiene, por la fecha de creación. En estado para reflejar el borrado al instante.
  const [rtsList, setRtsList] = useState<RtsEval[]>(rtsEvals)
  const rtsForDay = (d: string) => rtsList.filter(r => ((r.evaluation_date ?? r.created_at ?? '').slice(0, 10)) === d)

  // Modal unificado para agregar/programar una evaluación (RTS/dinamo/cuestionario)
  // desde un día del calendario. Ofrece "Completar ahora" o "Programar".
  const [evalModal, setEvalModal] = useState<null | { kind: EvalKind }>(null)
  const [evalDate, setEvalDate] = useState('')
  const [evalProtocol, setEvalProtocol] = useState('lca')
  const openEvalModal = (kind: EvalKind, d: string) => {
    // RTS arranca en 'lca'; cuestionario obliga a elegir tipo (arranca vacío)
    setEvalProtocol(kind === 'rts' ? 'lca' : ''); setEvalDate(d); setEvalModal({ kind })
  }

  // Evaluaciones programadas a futuro: marcador en el calendario + recordatorio.
  const [schedList, setSchedList] = useState<SchedEval[]>([])
  const schedForDay = (d: string) => schedList.filter(s => s.scheduled_date === d && !s.completed)
  const [schedAction, setSchedAction] = useState<SchedEval | null>(null)

  // Modal de acciones al tocar un RTS guardado en el calendario (como los hitos:
  // abrir/editar la evaluación o borrarla).
  const [rtsAction, setRtsAction] = useState<RtsEval | null>(null)
  const [rtsDeleting, setRtsDeleting] = useState(false)
  const deleteRtsEval = async () => {
    if (!rtsAction) return
    setRtsDeleting(true)
    const id = rtsAction.id
    await supabaseRef.current.from('rts_evaluations').delete().eq('id', id)
    setRtsList(prev => prev.filter(r => r.id !== id))
    setRtsDeleting(false)
    setRtsAction(null)
  }

  // Dinamometría sobre el calendario (como el RTS: crear desde un día, marcador,
  // click para abrir/editar o borrar). Se ubica por evaluation_date o created_at.
  const [dynList, setDynList] = useState<DynEval[]>(dynEvals)
  const dynForDay = (d: string) => dynList.filter(r => ((r.evaluation_date ?? r.created_at ?? '').slice(0, 10)) === d)
  const [dynAction, setDynAction] = useState<DynEval | null>(null)
  const [dynDeleting, setDynDeleting] = useState(false)
  const planReturn = `/dashboard/ejercicios/plan/${initialPlan.id}`
  const openDynFor = (d: string) => router.push(`/recursos/dinamometro?paciente=${plan.patient_id}&date=${d}&from=${planReturn}`)
  const deleteDynEval = async () => {
    if (!dynAction) return
    setDynDeleting(true)
    const id = dynAction.id
    await supabaseRef.current.from('dynamometer_results').delete().eq('id', id)
    setDynList(prev => prev.filter(r => r.id !== id))
    setDynDeleting(false)
    setDynAction(null)
  }

  // Cuestionarios sobre el calendario. Como no se editan (son solo-creación en
  // toda la app), el marcador ofrece verlos en la ficha o borrarlos; se crean
  // desde el día eligiendo el tipo en el propio tool de cuestionarios.
  const [qList, setQList] = useState<QEval[]>(qEvals)
  const qForDay = (d: string) => qList.filter(r => ((r.evaluation_date ?? r.created_at ?? '').slice(0, 10)) === d)
  const [qAction, setQAction] = useState<QEval | null>(null)
  const [qDeleting, setQDeleting] = useState(false)
  const openQuestFor = (d: string, type?: string) => router.push(`/recursos/cuestionarios?paciente=${plan.patient_id}&date=${d}${type ? `&type=${type}` : ''}&from=${planReturn}`)
  const deleteQEval = async () => {
    if (!qAction) return
    setQDeleting(true)
    const id = qAction.id
    await supabaseRef.current.from('questionnaire_results').delete().eq('id', id)
    setQList(prev => prev.filter(r => r.id !== id))
    setQDeleting(false)
    setQAction(null)
  }

  // ─── Evaluaciones: completar ahora / programar a futuro ──────────────────────
  const evalCompleteNow = (kind: EvalKind, protocol: string, d: string) => {
    if (kind === 'rts') router.push(`/dashboard/pacientes/${plan.patient_id}/rts?protocol=${protocol}&date=${d}`)
    else if (kind === 'dyn') openDynFor(d)
    else openQuestFor(d, protocol || undefined)
  }
  const scheduleEval = async () => {
    if (!evalModal || !plan.patient_id) { setEvalModal(null); return }
    const kind = evalModal.kind
    const { data, error } = await supabaseRef.current
      .from('scheduled_evaluations')
      .insert({
        patient_id: plan.patient_id,
        user_id: userId,
        kind,
        // RTS guarda el protocolo; cuestionario guarda el tipo elegido; dinamo no usa
        protocol_type: kind === 'dyn' ? null : (evalProtocol || null),
        scheduled_date: evalDate,
      })
      .select('id, kind, protocol_type, scheduled_date, completed')
      .single()
    if (error || !data) {
      notify('No se pudo programar la evaluación: ' + (error?.message ?? 'error'), 'error')
      return
    }
    setSchedList(prev => [...prev, data as SchedEval])
    setEvalModal(null)
  }
  // Al completar una evaluación programada, se abre la herramienta ya con
  // protocolo y fecha, y se elimina el marcador (deja de nagear en el recordatorio).
  const completeSched = async (s: SchedEval) => {
    await supabaseRef.current.from('scheduled_evaluations').delete().eq('id', s.id)
    setSchedList(prev => prev.filter(x => x.id !== s.id))
    setSchedAction(null)
    evalCompleteNow(s.kind, s.protocol_type ?? (s.kind === 'rts' ? 'lca' : ''), s.scheduled_date)
  }
  const deleteSched = async (s: SchedEval) => {
    await supabaseRef.current.from('scheduled_evaluations').delete().eq('id', s.id)
    setSchedList(prev => prev.filter(x => x.id !== s.id))
    setSchedAction(null)
  }

  // Hitos del tratamiento sobre el calendario, editables (click en la banderita).
  const [events, setEvents] = useState<PatientEvent[]>(initialEvents)
  const eventsForDay = (d: string) => events.filter(e => e.event_date === d)
  const [editEvent, setEditEvent] = useState<PatientEvent | null>(null)
  const [addingEvent, setAddingEvent] = useState(false)
  const [edType, setEdType] = useState('evaluacion')
  const [edDate, setEdDate] = useState('')
  const [edTitle, setEdTitle] = useState('')
  const [edNote, setEdNote] = useState('')
  const [edSaving, setEdSaving] = useState(false)

  const openEditEvent = (ev: PatientEvent) => {
    setAddingEvent(false); setEditEvent(ev); setEdType(ev.type); setEdDate(ev.event_date); setEdTitle(ev.title ?? ''); setEdNote(ev.note ?? '')
  }
  const openAddEvent = () => {
    setEditEvent(null); setAddingEvent(true); setEdType('evaluacion')
    setEdDate(selectedDate ?? toDateStr(new Date())); setEdTitle(''); setEdNote('')
  }
  const saveEvent = async () => {
    if (!edDate) return
    setEdSaving(true)
    if (editEvent) {
      const { data, error } = await supabaseRef.current
        .from('patient_events')
        .update({ type: edType, event_date: edDate, title: edTitle.trim() || null, note: edNote.trim() || null })
        .eq('id', editEvent.id)
        .select('id, event_date, type, title, note')
        .single()
      if (!error && data) setEvents(prev => prev.map(e => e.id === editEvent.id ? (data as PatientEvent) : e))
    } else if (plan.patient_id) {
      const { data, error } = await supabaseRef.current
        .from('patient_events')
        .insert({ patient_id: plan.patient_id, user_id: userId, event_date: edDate, type: edType, title: edTitle.trim() || null, note: edNote.trim() || null })
        .select('id, event_date, type, title, note')
        .single()
      if (!error && data) setEvents(prev => [...prev, data as PatientEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)))
    }
    setEditEvent(null); setAddingEvent(false); setEdSaving(false)
  }
  const deleteEditEvent = async () => {
    if (!editEvent) return
    setEvents(prev => prev.filter(e => e.id !== editEvent.id))
    await supabaseRef.current.from('patient_events').delete().eq('id', editEvent.id)
    setEditEvent(null)
  }
  const [activeTab, setActiveTab] = useState<'calendar' | 'logs'>('calendar')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')

  // Calendar state
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewStart, setViewStart] = useState<Date>(() => getMondayOfWeek(new Date()))
  const [copiedSessionData, setCopiedSessionData] = useState<SessionData | null>(null)
  const [copiedFromDate, setCopiedFromDate] = useState<string | null>(null)
  const [copiedFromPlanId, setCopiedFromPlanId] = useState<string | null>(null)
  const [sessionSaveStatus, setSessionSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showBulkLoadModal, setShowBulkLoadModal] = useState(false)
  const [bulkLoadState, setBulkLoadState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [bulkLoadDone, setBulkLoadDone] = useState(0)
  const [bulkLoadError, setBulkLoadError] = useState<string | null>(null)
  const [showDupWeek, setShowDupWeek] = useState(false)
  const [dupWeeks, setDupWeeks] = useState(3)
  const [dupState, setDupState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  // Search/modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  // exIdx presente => modo "reelegir" (reemplaza ese ejercicio en vez de agregar uno nuevo)
  const [targetBlock, setTargetBlock] = useState<{ blockIdx: number; exIdx?: number } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCategory, setSearchCategory] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Create exercise state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createUrl, setCreateUrl] = useState('')
  const [creating, setCreating] = useState(false)

  // Drag state
  const dragExRef = useRef<{ bIdx: number; exIdx: number } | null>(null)
  const [dragOverEx, setDragOverEx] = useState<{ bIdx: number; exIdx: number } | null>(null)

  // Logs state
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsGroupBy, setLogsGroupBy] = useState<'exercise' | 'date'>('date')

  // Semáforo
  const [latestByExercise, setLatestByExercise] = useState<Record<string, ActivityLog>>({})
  const [hoveredExSignal, setHoveredExSignal] = useState<string | null>(null)
  // Fechas con actividad registrada por el paciente
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set())

  // Patients state
  const [patients, setPatients] = useState<{ id: string; name: string; load_share_token: string | null }[]>([])

  const supabaseRef = useRef(createClient())
  const planSaveRef = useRef<NodeJS.Timeout | null>(null)
  const sessionSaveRef = useRef<NodeJS.Timeout | null>(null)

  // ─── Derived ───────────────────────────────────────────────────────────────

  const selectedSession = selectedDate
    ? scheduledSessions.find(s => s.scheduled_date === selectedDate) ?? null
    : null

  const importablePlanSessions = ((plan.plan_data?.sessions ?? []) as PlanDataSession[])
    .filter(s => (s.blocks ?? []).some(b => b.exercises?.length > 0))

  const emptySessions = scheduledSessions.filter(
    s => !(s.session_data?.blocks ?? []).some(b => b.exercises.length > 0)
  )
  const canBulkLoad = emptySessions.length > 0 && importablePlanSessions.length > 0

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Cargar clipboard de sesión (cross-plan).
  // Se re-lee al cambiar de plan, ante cambios de localStorage en otras
  // pestañas y al recuperar el foco de la ventana, para que "Pegar de otro
  // paciente" siempre use la última copia y no una vieja "colgada".
  useEffect(() => {
    const loadClipboard = () => {
      try {
        const raw = localStorage.getItem('reason_session_clipboard')
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (parsed?.sessionData && parsed?.date) {
          setCopiedSessionData(parsed.sessionData)
          setCopiedFromDate(parsed.date)
          setCopiedFromPlanId(parsed.planId ?? null)
        }
      } catch { /* ignorar */ }
    }

    loadClipboard()

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'reason_session_clipboard') loadClipboard()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', loadClipboard)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', loadClipboard)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id])

  // Cargar pacientes
  useEffect(() => {
    const fetchPatients = async () => {
      const { data } = await supabaseRef.current.from('patients').select('id, name, load_share_token').order('name')
      if (data) setPatients(data)
    }
    fetchPatients()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cargar sesiones del calendario
  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabaseRef.current
        .from('scheduled_sessions')
        .select('id, scheduled_date, session_name, session_data, completed')
        .eq('plan_id', plan.id)
        .order('scheduled_date')
      if (data) setScheduledSessions(data)
    }
    fetchSessions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id])

  // Cargar evaluaciones programadas (pendientes) del paciente
  useEffect(() => {
    if (!plan.patient_id) { setSchedList([]); return }
    let cancelled = false
    const fetchSched = async () => {
      const { data } = await supabaseRef.current
        .from('scheduled_evaluations')
        .select('id, kind, protocol_type, scheduled_date, completed')
        .eq('patient_id', plan.patient_id)
        .eq('completed', false)
        .order('scheduled_date')
      if (!cancelled && data) setSchedList(data as SchedEval[])
    }
    fetchSched()
    return () => { cancelled = true }
  }, [plan.patient_id])

  // Cargar últimos logs para semáforo y fechas completadas
  useEffect(() => {
    const fetchLatestLogs = async () => {
      const { data } = await supabaseRef.current
        .from('plan_activity_logs')
        .select('id, exercise_id, exercise_name, session_id, week, rpe, eva, notes, logged_at, scheduled_date')
        .eq('plan_id', plan.id)
        .order('logged_at', { ascending: false })
      if (data) {
        const latest: Record<string, ActivityLog> = {}
        const dates = new Set<string>()
        for (const log of data) {
          if (log.exercise_id && !latest[log.exercise_id]) {
            latest[log.exercise_id] = log
          }
          // scheduled_date para logs nuevos; fallback a la fecha del logged_at
          const dateKey = log.scheduled_date ?? log.logged_at.split('T')[0]
          dates.add(dateKey)
        }
        setLatestByExercise(latest)
        setLoggedDates(dates)
      }
    }
    fetchLatestLogs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id])

  // Autoguardado del plan (metadata)
  useEffect(() => {
    if (planSaveRef.current) clearTimeout(planSaveRef.current)
    setSaveStatus('saving')
    planSaveRef.current = setTimeout(async () => {
      const { error } = await supabaseRef.current
        .from('exercise_plans')
        .update({
          name: plan.name,
          notes: plan.notes,
          start_date: plan.start_date,
          plan_data: plan.plan_data,
          patient_id: plan.patient_id,
        })
        .eq('id', plan.id)
      if (error) {
        setSaveStatus('error')
        console.error(error)
      } else {
        setSaveStatus('saved')
      }
    }, 1500)
    return () => { if (planSaveRef.current) clearTimeout(planSaveRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan])

  // Autoguardado de sesión
  useEffect(() => {
    if (!selectedSession) return
    if (sessionSaveRef.current) clearTimeout(sessionSaveRef.current)
    setSessionSaveStatus('saving')
    sessionSaveRef.current = setTimeout(async () => {
      const res = await fetch('/api/sessions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSession.id,
          session_name: selectedSession.session_name,
          session_data: selectedSession.session_data,
        }),
      })
      setSessionSaveStatus(res.ok ? 'saved' : 'error')
    }, 1500)
    return () => { if (sessionSaveRef.current) clearTimeout(sessionSaveRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession])

  // Reset session save status al cambiar de día
  useEffect(() => {
    setSessionSaveStatus('idle')
  }, [selectedDate])

  // Buscar ejercicios
  useEffect(() => {
    const searchExercises = async () => {
      if (!isSearchOpen) return
      setIsSearching(true)
      if (searchCategory === 'mis_ejercicios') {
        let query = supabaseRef.current.from('user_exercises').select('id, name, youtube_url').eq('user_id', userId).limit(50)
        if (searchQuery) query = query.ilike('name', `%${searchQuery}%`)
        const { data } = await query
        if (data) setSearchResults(data.map(e => ({ ...e, category: 'mis_ejercicios', equipment: null })))
      } else {
        const params = new URLSearchParams()
        if (searchQuery) params.set('q', searchQuery)
        if (searchCategory) params.set('category', searchCategory)
        const res = await fetch(`/api/exercises?${params.toString()}`)
        const curated = res.ok ? await res.json() : []
        // En "Todas" (sin categoría) también incluimos los ejercicios propios que
        // matchean, arriba de los curados. Con una categoría curada específica no,
        // porque los propios no tienen categoría.
        if (searchCategory === '') {
          let mineQuery = supabaseRef.current.from('user_exercises').select('id, name, youtube_url').eq('user_id', userId).limit(50)
          if (searchQuery) mineQuery = mineQuery.ilike('name', `%${searchQuery}%`)
          const { data: mineData } = await mineQuery
          const mine = (mineData ?? []).map(e => ({ ...e, category: 'mis_ejercicios', equipment: null }))
          setSearchResults([...mine, ...curated])
        } else {
          setSearchResults(curated)
        }
      }
      setIsSearching(false)
    }
    const debounce = setTimeout(searchExercises, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, searchCategory, isSearchOpen, userId])

  // Cargar logs
  useEffect(() => {
    if (activeTab === 'logs') {
      let cancelled = false
      const fetchLogs = async () => {
        setLogsLoading(true)
        const { data, error } = await supabaseRef.current
          .from('plan_activity_logs')
          .select('*')
          .eq('plan_id', plan.id)
          .order('logged_at', { ascending: false })
        if (!cancelled) {
          if (data && !error) setLogs(data)
          setLogsLoading(false)
        }
      }
      fetchLogs()
      return () => { cancelled = true }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, plan.id])

  // ─── Plan info ─────────────────────────────────────────────────────────────

  const updatePlanInfo = (field: 'notes' | 'start_date', value: string) => {
    setPlan(prev => ({ ...prev, [field]: value }))
  }

  // ─── Session mutations ─────────────────────────────────────────────────────

  const updateSelectedSession = (updater: (data: SessionData) => SessionData) => {
    if (!selectedDate || !selectedSession) return
    setSessionSaveStatus('idle')
    setScheduledSessions(prev => prev.map(s => {
      if (s.scheduled_date !== selectedDate) return s
      const newData = updater(s.session_data ?? { blocks: [] })
      return { ...s, session_data: newData }
    }))
  }

  const createSession = async (dateStr: string) => {
    if (!plan.patient_id) {
      notify('Asigná un paciente al plan antes de crear sesiones.', 'error')
      return
    }
    const res = await fetch('/api/sessions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: plan.id, scheduled_date: dateStr }),
    })
    const json = await res.json()
    if (!res.ok) {
      notify('Error al crear sesión: ' + (json.error ?? res.status), 'error')
      return
    }
    setScheduledSessions(prev =>
      [...prev, json.session].sort((a: ScheduledSession, b: ScheduledSession) =>
        a.scheduled_date.localeCompare(b.scheduled_date)
      )
    )
    setSelectedDate(dateStr)
  }

  const deleteSession = async () => {
    if (!selectedDate) return
    if (!(await confirm({ title: 'Eliminar sesión', message: '¿Eliminar la sesión del ' + selectedDate + '?', danger: true, confirmLabel: 'Eliminar' }))) return
    const sessionsForDate = scheduledSessions.filter(s => s.scheduled_date === selectedDate)
    for (const session of sessionsForDate) {
      const res = await fetch('/api/sessions/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        notify('Error al eliminar la sesión: ' + (json.error ?? res.status), 'error')
        return
      }
    }
    setScheduledSessions(prev => prev.filter(s => s.scheduled_date !== selectedDate))
    setSelectedDate(null)
  }

  const saveSession = async () => {
    if (!selectedSession) return
    setSessionSaveStatus('saving')
    const blocksToSave = selectedSession.session_data?.blocks ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exToSave = blocksToSave.reduce((n: number, b: any) => n + (b.exercises?.length ?? 0), 0)
    console.log('[saveSession] Enviando:', { id: selectedSession.id, blocks: blocksToSave.length, exercises: exToSave })
    const res = await fetch('/api/sessions/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: selectedSession.id,
        session_name: selectedSession.session_name,
        session_data: selectedSession.session_data,
      }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      console.error('[saveSession] Error:', json.error)
      notify(`Error al guardar: ${json.error ?? res.status}`, 'error')
      setSessionSaveStatus('error')
    } else {
      const json = await res.json().catch(() => ({}))
      console.log('[saveSession] Guardado OK:', { blocks: json.blocks, exercises: json.exercises })
      if (json.blocks === 0) {
        console.warn('[saveSession] ATENCIÓN: se guardaron 0 bloques. session_data enviada:', JSON.stringify(selectedSession.session_data).slice(0, 200))
      }
      setSessionSaveStatus('saved')
    }
  }

  const updateSessionName = (name: string) => {
    if (!selectedDate || !selectedSession) return
    setSessionSaveStatus('idle')
    setScheduledSessions(prev => prev.map(s =>
      s.scheduled_date !== selectedDate ? s : { ...s, session_name: name }
    ))
  }

  const addBlock = () => {
    updateSelectedSession(data => ({
      ...data,
      blocks: [...data.blocks, { id: uuidv4(), name: 'Nuevo bloque', exercises: [] }],
    }))
  }

  const removeBlock = async (blockIdx: number) => {
    if (!(await confirm({ message: '¿Eliminar este bloque?', danger: true, confirmLabel: 'Eliminar' }))) return
    updateSelectedSession(data => ({
      ...data,
      blocks: data.blocks.filter((_, i) => i !== blockIdx),
    }))
  }

  const updateBlockName = (blockIdx: number, name: string) => {
    updateSelectedSession(data => ({
      ...data,
      blocks: data.blocks.map((b, i) => i === blockIdx ? { ...b, name } : b),
    }))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addExerciseToBlock = (exercise: any) => {
    if (!targetBlock) return
    const { blockIdx, exIdx } = targetBlock
    updateSelectedSession(data => ({
      ...data,
      blocks: data.blocks.map((b, i) => {
        if (i !== blockIdx) return b
        // Modo reelegir: reemplaza el ejercicio conservando la dosificación,
        // la superserie y las recomendaciones ya cargadas.
        if (exIdx != null) {
          return {
            ...b,
            exercises: b.exercises.map((ex, ei) =>
              ei !== exIdx ? ex : {
                ...ex,
                exercise_id: exercise.id,
                exercise_name: exercise.name,
                youtube_url: exercise.youtube_url || '',
              }
            ),
          }
        }
        return {
          ...b,
          exercises: [...b.exercises, {
            id: uuidv4(),
            exercise_id: exercise.id,
            exercise_name: exercise.name,
            youtube_url: exercise.youtube_url || '',
            sets: '', reps: '', load: '', rpe_obj: '', eav_obj: '', rest: '', recommendations: '',
          }],
        }
      }),
    }))
    setIsSearchOpen(false)
    setTargetBlock(null)
  }

  const removeExercise = async (blockIdx: number, exIdx: number) => {
    if (!(await confirm({ message: '¿Quitar este ejercicio?', danger: true, confirmLabel: 'Quitar' }))) return
    updateSelectedSession(data => ({
      ...data,
      blocks: data.blocks.map((b, bi) => {
        if (bi !== blockIdx) return b
        return { ...b, exercises: b.exercises.filter((_, ei) => ei !== exIdx) }
      }),
    }))
  }

  const updateExerciseField = (blockIdx: number, exIdx: number, field: keyof SessionExercise, value: string) => {
    updateSelectedSession(data => ({
      ...data,
      blocks: data.blocks.map((b, bi) => {
        if (bi !== blockIdx) return b
        return {
          ...b,
          exercises: b.exercises.map((ex, ei) =>
            ei !== exIdx ? ex : { ...ex, [field]: value }
          ),
        }
      }),
    }))
  }

  const updateExerciseGroup = (blockIdx: number, exIdx: number, group: string) => {
    updateSelectedSession(data => ({
      ...data,
      blocks: data.blocks.map((b, bi) => {
        if (bi !== blockIdx) return b
        return {
          ...b,
          exercises: b.exercises.map((ex, ei) =>
            ei !== exIdx ? ex : { ...ex, group: group || undefined }
          ),
        }
      }),
    }))
  }

  const moveExercise = (fromBIdx: number, fromExIdx: number, toBIdx: number, toExIdx: number) => {
    if (fromBIdx === toBIdx && fromExIdx === toExIdx) return
    updateSelectedSession(data => {
      const newData: SessionData = JSON.parse(JSON.stringify(data))
      const srcExs = newData.blocks[fromBIdx].exercises
      const dstExs = newData.blocks[toBIdx].exercises
      const [moved] = srcExs.splice(fromExIdx, 1)
      if (!moved) return data
      dstExs.splice(toExIdx, 0, moved)
      return newData
    })
  }

  // ─── Copy / Paste ──────────────────────────────────────────────────────────

  const handleCopySession = () => {
    if (!selectedSession?.session_data) return
    const copy = JSON.parse(JSON.stringify(selectedSession.session_data))
    setCopiedSessionData(copy)
    setCopiedFromDate(selectedDate)
    setCopiedFromPlanId(plan.id)
    try {
      localStorage.setItem('reason_session_clipboard', JSON.stringify({
        planId: plan.id,
        date: selectedDate,
        sessionData: copy,
        sessionName: selectedSession.session_name ?? null,
      }))
    } catch { /* ignorar */ }
  }

  const handlePasteSession = async () => {
    if (!copiedSessionData) return
    if (!(await confirm({ message: '¿Reemplazar la sesión de este día con la copiada?', confirmLabel: 'Reemplazar' }))) return
    updateSelectedSession(() => ({
      blocks: copiedSessionData.blocks.map(b => ({
        ...b,
        id: uuidv4(),
        exercises: b.exercises.map(ex => ({ ...ex, id: uuidv4() })),
      })),
    }))
    setCopiedFromDate(null)
  }

  const closeBulkModal = () => {
    setShowBulkLoadModal(false)
    setBulkLoadState('idle')
    setBulkLoadDone(0)
    setBulkLoadError(null)
  }

  const handleBulkLoad = async () => {
    if (!canBulkLoad) return
    setBulkLoadState('loading')
    setBulkLoadDone(0)

    for (let i = 0; i < emptySessions.length; i++) {
      const session = emptySessions[i]
      const planSession = importablePlanSessions[i % importablePlanSessions.length]
      const newBlocks = (planSession.blocks ?? [])
        .filter(b => b.exercises?.length > 0)
        .map(b => ({
          ...b,
          id: uuidv4(),
          exercises: b.exercises.map(ex => ({ ...ex, id: uuidv4() })),
        }))

      const res = await fetch('/api/sessions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          session_name: session.session_name,
          session_data: { blocks: newBlocks },
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        console.error('[bulkLoad] Error en sesión', session.id, ':', errJson.error)
        setBulkLoadState('error')
        setBulkLoadError(`Error en la sesión ${i + 1}: ${errJson.error ?? res.status}. Las anteriores sí quedaron guardadas.`)
        return
      }

      const okJson = await res.json().catch(() => ({}))
      console.log('[bulkLoad] Sesión', session.id, 'guardada:', { blocks: okJson.blocks, exercises: okJson.exercises })
      setScheduledSessions(prev =>
        prev.map(s => s.id !== session.id ? s : { ...s, session_data: { blocks: newBlocks } })
      )
      setBulkLoadDone(i + 1)
    }

    setBulkLoadState('done')
  }

  const handleImportFromPlan = async (planSession: PlanDataSession) => {
    const currentBlocks = selectedSession?.session_data?.blocks ?? []
    const hasExisting = currentBlocks.some(b => b.exercises.length > 0)
    if (hasExisting && !(await confirm({ message: `¿Reemplazar los ejercicios actuales con los de "${planSession.name}"?`, confirmLabel: 'Reemplazar' }))) return
    updateSelectedSession(() => ({
      blocks: (planSession.blocks ?? [])
        .filter(b => b.exercises?.length > 0)
        .map(b => ({
          ...b,
          id: uuidv4(),
          exercises: b.exercises.map(ex => ({ ...ex, id: uuidv4() })),
        })),
    }))
    setShowImportModal(false)
  }

  // ─── Search modal helpers ──────────────────────────────────────────────────

  const openSearch = (blockIdx: number) => {
    setTargetBlock({ blockIdx })
    setIsSearchOpen(true)
    setSearchQuery('')
    setSearchCategory('')
    setShowCreateForm(false)
    setCreateName('')
    setCreateUrl('')
  }

  // Reelegir: abre el buscador para reemplazar un ejercicio ya cargado.
  const openReplace = (blockIdx: number, exIdx: number) => {
    setTargetBlock({ blockIdx, exIdx })
    setIsSearchOpen(true)
    setSearchQuery('')
    setSearchCategory('')
    setShowCreateForm(false)
    setCreateName('')
    setCreateUrl('')
  }

  const handleCreateExercise = async () => {
    if (!createName.trim()) return
    setCreating(true)
    const { data, error } = await supabaseRef.current
      .from('user_exercises')
      .insert({ user_id: userId, name: createName.trim(), youtube_url: createUrl.trim() || null })
      .select()
      .single()
    if (!error && data) {
      addExerciseToBlock({ id: data.id, name: data.name, youtube_url: data.youtube_url, category: 'mis_ejercicios' })
    }
    setCreating(false)
  }

  // ─── Export PDF ────────────────────────────────────────────────────────────

  const handleExportPDF = async () => {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    const patientName = patients.find(p => p.id === plan.patient_id)?.name ?? 'Plan de Ejercicio'
    doc.text(patientName, 20, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    if (plan.start_date) {
      doc.text(`Fecha de inicio: ${new Date(plan.start_date).toLocaleDateString('es-AR')}`, 20, 28)
    }
    if (plan.notes) {
      doc.text(`Observaciones: ${plan.notes}`, 20, 34)
    }

    let y = plan.notes ? 45 : 35
    const pageHeight = 280

    for (const session of scheduledSessions) {
      if (!session.session_data?.blocks?.length) continue
      const hasExercises = session.session_data.blocks.some(b => b.exercises.length > 0)
      if (!hasExercises) continue

      if (y > pageHeight - 30) { doc.addPage(); y = 20 }

      // Fecha de la sesión
      const dateObj = new Date(session.scheduled_date + 'T00:00:00')
      const dateLabel = dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(`${dateLabel}${session.session_name ? ' — ' + session.session_name : ''}`, 20, y)
      y += 8

      for (const block of session.session_data.blocks) {
        if (block.exercises.length === 0) continue
        if (y > pageHeight - 20) { doc.addPage(); y = 20 }

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text(block.name, 20, y)
        y += 6

        for (const ex of block.exercises) {
          if (y > pageHeight - 25) { doc.addPage(); y = 20 }

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.text(`- ${ex.exercise_name}`, 20, y)

          if (ex.youtube_url) {
            try {
              const qrDataUrl = await QRCode.toDataURL(ex.youtube_url, { margin: 1, width: 64 })
              doc.addImage(qrDataUrl, 'PNG', 170, y - 5, 20, 20)
            } catch (err) {
              console.error('QR Error', err)
            }
          }
          y += 6

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          const doseStr = [
            ex.sets ? `${ex.sets} series` : '',
            ex.reps ? `${ex.reps} reps` : '',
            ex.load ? `Carga: ${ex.load}` : '',
            ex.rest ? `Pausa: ${ex.rest}` : '',
          ].filter(Boolean).join(' · ')
          if (doseStr) {
            doc.text(doseStr, 25, y)
            y += 5
          }
          y += 3
        }
        y += 4
      }
      y += 8
    }

    if (y > pageHeight - 10) { doc.addPage(); y = 20 }
    doc.setFontSize(9)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    const pdfPatientName = patients.find(p => p.id === plan.patient_id)?.name ?? 'Plan'
    doc.save(`Plan_${pdfPatientName.replace(/\s+/g, '_')}.pdf`)
  }

  // ─── Calendar helpers ──────────────────────────────────────────────────────

  const calendarDays: Date[] = []
  for (let i = 0; i < 28; i++) {
    calendarDays.push(addDays(viewStart, i))
  }

  const todayStr = toDateStr(new Date())
  const viewEnd = addDays(viewStart, 27)
  const rangeLabel = (() => {
    const s = viewStart
    const e = viewEnd
    const sm = MONTH_NAMES[s.getMonth()].slice(0, 3)
    const em = MONTH_NAMES[e.getMonth()].slice(0, 3)
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `${DAY_NAMES[0]} ${s.getDate()} – ${DAY_NAMES[6]} ${e.getDate()} de ${sm}`
    }
    return `${DAY_NAMES[0]} ${s.getDate()} ${sm} – ${DAY_NAMES[6]} ${e.getDate()} ${em}`
  })()

  // ─── Duplicar semana ─────────────────────────────────────────────────────────
  // Semana origen: la del día seleccionado, o la primera semana visible.
  const sourceMondayDate = selectedDate ? getMondayOfWeek(new Date(selectedDate + 'T00:00:00')) : viewStart
  const sourceWeekMonday = toDateStr(sourceMondayDate)
  const sourceWeekSessions = scheduledSessions.filter(
    s => s.scheduled_date >= sourceWeekMonday && s.scheduled_date <= toDateStr(addDays(sourceMondayDate, 6))
  )
  const sourceWeekLabel = `${sourceMondayDate.getDate()} ${MONTH_NAMES[sourceMondayDate.getMonth()].slice(0, 3)} – ${addDays(sourceMondayDate, 6).getDate()} ${MONTH_NAMES[addDays(sourceMondayDate, 6).getMonth()].slice(0, 3)}`

  const handleDuplicateWeek = async () => {
    setDupState('loading')
    try {
      const res = await fetch('/api/sessions/duplicate-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id, source_week_start: sourceWeekMonday, weeks: dupWeeks }),
      })
      const json = await res.json()
      if (!res.ok) { setDupState('error'); return }
      if (json.created?.length) {
        setScheduledSessions(prev =>
          [...prev, ...(json.created as ScheduledSession[])].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
        )
      }
      setDupState('done')
      setTimeout(() => { setShowDupWeek(false); setDupState('idle') }, 1200)
    } catch {
      setDupState('error')
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="pb-24">
      {confirmDialog}
      {toast}

      {/* HEADER DEL PLAN */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 mb-8 flex flex-col md:flex-row gap-6">
        <div className="flex-grow space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-[24px] font-medium tracking-[-0.01em] text-text-primary">
              {patients.find(p => p.id === plan.patient_id)?.name ?? 'Sin paciente asignado'}
            </p>
            {plan.patient_id && (() => {
              const pt = patients.find(p => p.id === plan.patient_id)
              return pt?.load_share_token ? (
                <a
                  href={`/paciente/${pt.load_share_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-accent border-[0.5px] border-accent/40 rounded-full px-2.5 py-0.5 hover:bg-accent/10 transition-colors"
                >
                  Ver portal →
                </a>
              ) : (
                <span className="text-[11px] text-text-secondary border-[0.5px] border-border rounded-full px-2.5 py-0.5">
                  Sin portal generado
                </span>
              )
            })()}
          </div>
          {/* Se apilan hasta lg: en tablet (768–1023px) el bloque queda angosto
              porque el header exterior ya es horizontal (md), y meter aquí 3
              columnas hacía que "Observaciones" se desbordara sobre "Paciente". */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-[200px]">
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha de Inicio (Opcional)</label>
              <input
                type="date"
                value={plan.start_date || ''}
                onChange={(e) => updatePlanInfo('start_date', e.target.value)}
                className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-2 text-[13px] focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex-grow min-w-0">
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Observaciones Generales</label>
              <input
                type="text"
                value={plan.notes || ''}
                onChange={(e) => updatePlanInfo('notes', e.target.value)}
                placeholder="Ej: Evitar impacto en semana 1..."
                className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-2 text-[13px] focus:outline-none focus:border-accent"
              />
            </div>
            <div className="w-full lg:w-[200px]">
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Paciente</label>
              <select
                value={plan.patient_id || ''}
                onChange={e => setPlan(prev => ({ ...prev, patient_id: e.target.value || null }))}
                className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-2 text-[13px] focus:outline-none focus:border-accent appearance-none"
              >
                <option value="">Sin paciente</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between items-end min-w-[200px]">
          <div className="text-[12px] flex items-center gap-2">
            {saveStatus === 'saving' && <span className="text-text-secondary">Guardando...</span>}
            {saveStatus === 'saved' && <span className="text-[#3b82f6]">✓ Guardado</span>}
            {saveStatus === 'error' && <span className="text-warning">Error al guardar</span>}
          </div>
          <div className="flex flex-col gap-2 mt-4 w-full">
            {canBulkLoad && (
              <button
                onClick={() => setShowBulkLoadModal(true)}
                className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 w-full"
              >
                Cargar plan al calendario
              </button>
            )}
            <button
              onClick={handleExportPDF}
              className="bg-bg-primary border-[0.5px] border-border-strong text-text-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-bg-secondary w-full"
            >
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 overflow-x-auto mb-6 pb-2 border-b-[0.5px] border-border hide-scrollbar">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`whitespace-nowrap px-6 py-3 rounded-t-xl text-[14px] font-medium transition-colors border-t-[0.5px] border-x-[0.5px] border-b-0 ${activeTab === 'calendar' ? 'bg-bg-primary text-text-primary border-border' : 'bg-transparent text-text-secondary border-transparent hover:text-text-primary'}`}
          style={{ marginBottom: '-1px' }}
        >
          Calendario
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`whitespace-nowrap px-6 py-3 rounded-t-xl text-[14px] font-medium transition-colors border-t-[0.5px] border-x-[0.5px] border-b-0 flex items-center gap-2 ${activeTab === 'logs' ? 'bg-bg-primary text-text-primary border-border' : 'bg-transparent text-text-secondary border-transparent hover:text-text-primary'}`}
          style={{ marginBottom: '-1px', marginLeft: 'auto' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Actividad del Paciente
        </button>
      </div>

      {/* TAB: CALENDARIO */}
      {activeTab === 'calendar' && (
        <div className="bg-bg-primary border-[0.5px] border-border rounded-b-xl rounded-tr-xl p-6 min-h-[500px]">

          {/* Navegación */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setViewStart(d => addDays(d, -7))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border-[0.5px] border-border bg-bg-secondary hover:border-accent text-text-secondary hover:text-accent transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="text-[13px] text-text-secondary">{rangeLabel}</span>
            <button
              onClick={() => setViewStart(d => addDays(d, 7))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border-[0.5px] border-border bg-bg-secondary hover:border-accent text-text-secondary hover:text-accent transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* Acción de semana (las de día —sesión/hito/RTS— viven en el panel del día) */}
          <div className="flex justify-center mb-4">
            <button
              onClick={() => { setDupState('idle'); setShowDupWeek(true) }}
              disabled={sourceWeekSessions.length === 0}
              title={sourceWeekSessions.length === 0 ? 'La semana seleccionada no tiene sesiones' : 'Copiar esta semana a las próximas'}
              className="inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-lg border-[0.5px] border-border bg-bg-secondary text-text-secondary hover:text-text-primary hover:border-accent disabled:opacity-40 disabled:hover:text-text-secondary disabled:hover:border-border transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Duplicar semana
            </button>
          </div>

          {/* Grilla */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[11px] uppercase tracking-[0.05em] text-text-secondary py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const dateStr = toDateStr(day)
              const session = scheduledSessions.find(s => s.scheduled_date === dateStr)
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const hasSession = !!session
              const isLogged = loggedDates.has(dateStr)

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(prev => prev === dateStr ? null : dateStr)}
                  className={`
                    relative min-h-[64px] rounded-lg border-[0.5px] p-2 text-left transition-colors flex flex-col
                    ${isSelected
                      ? 'bg-accent/20 border-accent'
                      : isLogged
                        ? 'bg-green-500/10 border-green-500/50 hover:border-green-500/70'
                        : isToday
                          ? 'bg-accent/10 border-accent/40 ring-1 ring-accent/40'
                          : hasSession
                            ? 'bg-bg-secondary border-accent/50 hover:border-accent/70'
                            : 'bg-bg-secondary border-border hover:border-accent/30'
                    }
                  `}
                >
                  <span className={`text-[13px] font-medium leading-none mb-1 ${isLogged && !isSelected ? 'text-green-500' : isToday ? 'text-accent' : 'text-text-primary'}`}>
                    {day.getDate()}
                  </span>
                  {/* Hitos del tratamiento en ese día — click para editar/borrar */}
                  {eventsForDay(dateStr).map(ev => {
                    const meta = eventMeta(ev.type)
                    return (
                      <span
                        key={ev.id}
                        onClick={e => { e.stopPropagation(); openEditEvent(ev) }}
                        className="flex items-center gap-1 rounded px-1 py-0.5 mb-0.5 cursor-pointer hover:brightness-125 transition-all"
                        style={{ backgroundColor: meta.color + '26' }}
                        title={`${ev.title || meta.label} — tocar para editar`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                        <span className="text-[9px] font-medium truncate leading-tight" style={{ color: meta.color }}>{ev.title || meta.label}</span>
                      </span>
                    )
                  })}
                  {/* Evaluaciones RTS de ese día — hito extendido: click abre opciones (editar/borrar) */}
                  {rtsForDay(dateStr).map(r => (
                    <span
                      key={r.id}
                      onClick={e => { e.stopPropagation(); setRtsAction(r) }}
                      className="flex items-center gap-1 rounded px-1 py-0.5 mb-0.5 cursor-pointer hover:brightness-125 transition-all"
                      style={{ backgroundColor: RTS_COLOR + '26' }}
                      title={`RTS · ${RTS_LABELS[r.protocol_type] ?? r.protocol_type} — tocar para editar o borrar`}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={RTS_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      <span className="text-[9px] font-medium truncate leading-tight" style={{ color: RTS_COLOR }}>RTS · {RTS_LABELS[r.protocol_type] ?? r.protocol_type}</span>
                    </span>
                  ))}
                  {/* Dinamometría de ese día — click abre opciones (editar/borrar) */}
                  {dynForDay(dateStr).map(d => (
                    <span
                      key={d.id}
                      onClick={e => { e.stopPropagation(); setDynAction(d) }}
                      className="flex items-center gap-1 rounded px-1 py-0.5 mb-0.5 cursor-pointer hover:brightness-125 transition-all"
                      style={{ backgroundColor: DYN_COLOR + '26' }}
                      title="Dinamometría — tocar para editar o borrar"
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={DYN_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M6.5 6.5 17.5 17.5"/><path d="M21 21l-1-1"/><path d="M3 3l1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>
                      <span className="text-[9px] font-medium truncate leading-tight" style={{ color: DYN_COLOR }}>Dinamometría</span>
                    </span>
                  ))}
                  {/* Cuestionarios de ese día — click abre opciones (ver en ficha / borrar) */}
                  {qForDay(dateStr).map(q => (
                    <span
                      key={q.id}
                      onClick={e => { e.stopPropagation(); setQAction(q) }}
                      className="flex items-center gap-1 rounded px-1 py-0.5 mb-0.5 cursor-pointer hover:brightness-125 transition-all"
                      style={{ backgroundColor: Q_COLOR + '26' }}
                      title={`Cuestionario ${Q_LABELS[q.questionnaire_type] ?? q.questionnaire_type} — tocar para ver o borrar`}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={Q_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      <span className="text-[9px] font-medium truncate leading-tight" style={{ color: Q_COLOR }}>{Q_LABELS[q.questionnaire_type] ?? 'Cuestionario'}</span>
                    </span>
                  ))}
                  {/* Evaluaciones programadas de ese día — marcador punteado; click para completar o eliminar */}
                  {schedForDay(dateStr).map(s => {
                    const color = EVAL_META[s.kind].color
                    return (
                      <span
                        key={s.id}
                        onClick={e => { e.stopPropagation(); setSchedAction(s) }}
                        className="flex items-center gap-1 rounded px-1 py-0.5 mb-0.5 cursor-pointer hover:brightness-125 transition-all border-[0.5px] border-dashed"
                        style={{ borderColor: color + '88' }}
                        title={`${schedLabel(s)} — programada · tocar para completar o eliminar`}
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
                        <span className="text-[9px] font-medium truncate leading-tight" style={{ color }}>{schedLabel(s)}</span>
                      </span>
                    )
                  })}
                  {session && (
                    <span className="flex items-center gap-1 mt-auto">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLogged ? 'bg-green-500' : 'bg-accent'}`} />
                      <span className="text-[10px] text-text-secondary truncate leading-tight">{session.session_name || 'Sesión'}</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Editor de sesión del día seleccionado */}
          {selectedDate && (
            <div className="mt-8 border-t-[0.5px] border-border pt-6">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <h2 className="text-[18px] font-medium tracking-[-0.01em] flex-1 min-w-0">
                  {formatDateHeader(new Date(selectedDate + 'T00:00:00'))}
                </h2>

                {selectedSession ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Guardar */}
                    <button
                      onClick={saveSession}
                      disabled={sessionSaveStatus === 'saving'}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border-[0.5px] transition-colors flex items-center gap-1.5 ${
                        sessionSaveStatus === 'saved'
                          ? 'bg-green-500/10 border-green-500/40 text-green-500'
                          : sessionSaveStatus === 'error'
                          ? 'bg-warning/10 border-warning/40 text-warning'
                          : sessionSaveStatus === 'saving'
                          ? 'bg-bg-secondary border-border text-text-secondary opacity-60'
                          : 'bg-accent text-bg-primary border-accent hover:opacity-90'
                      }`}
                    >
                      {sessionSaveStatus === 'saving' && 'Guardando...'}
                      {sessionSaveStatus === 'saved' && '✓ Guardado'}
                      {sessionSaveStatus === 'error' && 'Error al guardar'}
                      {sessionSaveStatus === 'idle' && 'Guardar sesión'}
                    </button>

                    {/* Copiar */}
                    <button
                      onClick={handleCopySession}
                      className={`bg-bg-secondary border-[0.5px] text-text-secondary px-3 py-1.5 rounded-lg text-[12px] hover:text-text-primary hover:border-accent transition-colors flex items-center gap-1.5 ${copiedFromDate === selectedDate ? 'border-accent text-accent' : 'border-border'}`}
                      title="Copiar sesión"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      {copiedFromDate === selectedDate ? 'Copiado' : 'Copiar'}
                    </button>

                    {/* Pegar (mismo plan, otro día) */}
                    {copiedSessionData && copiedFromPlanId === plan.id && copiedFromDate !== selectedDate && (
                      <button
                        onClick={handlePasteSession}
                        className="bg-accent/10 border-[0.5px] border-accent/40 text-accent px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-accent/20 transition-colors flex items-center gap-1.5"
                        title="Pegar sesión copiada"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                        Pegar
                      </button>
                    )}
                    {/* Pegar (de otro paciente) */}
                    {copiedSessionData && copiedFromPlanId !== plan.id && (
                      <button
                        onClick={handlePasteSession}
                        className="bg-accent/10 border-[0.5px] border-accent/40 text-accent px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-accent/20 transition-colors flex items-center gap-1.5"
                        title="Pegar sesión copiada de otro paciente"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                        Pegar (de otro paciente)
                      </button>
                    )}

                    {/* Eliminar */}
                    <button
                      onClick={deleteSession}
                      className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-3 py-1.5 rounded-lg text-[12px] hover:text-warning hover:border-warning/50 transition-colors"
                    >
                      Eliminar sesión
                    </button>

                    {/* Hito / RTS también en un día que ya tiene sesión */}
                    <span className="w-px h-4 bg-border mx-0.5" />
                    <button onClick={openAddEvent} className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-3 py-1.5 rounded-lg text-[12px] hover:text-text-primary hover:border-accent transition-colors">+ Hito</button>
                    <button onClick={() => openEvalModal('rts', selectedDate ?? todayStr)} className="bg-bg-secondary border-[0.5px] px-3 py-1.5 rounded-lg text-[12px] transition-colors" style={{ borderColor: RTS_COLOR + '66', color: RTS_COLOR }}>+ RTS</button>
                    {plan.patient_id && <button onClick={() => openEvalModal('dyn', selectedDate ?? todayStr)} className="bg-bg-secondary border-[0.5px] px-3 py-1.5 rounded-lg text-[12px] transition-colors" style={{ borderColor: DYN_COLOR + '66', color: DYN_COLOR }}>+ Dinamo</button>}
                    {plan.patient_id && <button onClick={() => openEvalModal('quest', selectedDate ?? todayStr)} className="bg-bg-secondary border-[0.5px] px-3 py-1.5 rounded-lg text-[12px] transition-colors" style={{ borderColor: Q_COLOR + '66', color: Q_COLOR }}>+ Cuest</button>}
                  </div>
                ) : null}
              </div>

              {!selectedSession ? (
                /* Sin sesión: opciones para este día — sesión, hito o evaluación RTS */
                <div className="py-10 px-6 bg-bg-secondary border-[0.5px] border-dashed border-border rounded-xl">
                  <p className="text-[13px] text-text-secondary mb-4 text-center">¿Qué querés cargar en este día?</p>
                  <div className="flex flex-wrap justify-center gap-2.5">
                    <button
                      onClick={() => createSession(selectedDate)}
                      className="inline-flex items-center gap-2 bg-accent text-bg-primary px-4 py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Crear sesión
                    </button>
                    <button
                      onClick={openAddEvent}
                      className="inline-flex items-center gap-2 bg-bg-primary border-[0.5px] border-border text-text-primary px-4 py-2.5 rounded-lg text-[13px] font-medium hover:border-accent transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                      Agregar hito
                    </button>
                    <button
                      onClick={() => openEvalModal('rts', selectedDate ?? todayStr)}
                      className="inline-flex items-center gap-2 bg-bg-primary border-[0.5px] px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors"
                      style={{ borderColor: RTS_COLOR + '66', color: RTS_COLOR }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      Agregar RTS
                    </button>
                    {plan.patient_id && (
                      <button
                        onClick={() => openEvalModal('dyn', selectedDate ?? todayStr)}
                        className="inline-flex items-center gap-2 bg-bg-primary border-[0.5px] px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors"
                        style={{ borderColor: DYN_COLOR + '66', color: DYN_COLOR }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5 17.5 17.5"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>
                        Agregar dinamometría
                      </button>
                    )}
                    {plan.patient_id && (
                      <button
                        onClick={() => openEvalModal('quest', selectedDate ?? todayStr)}
                        className="inline-flex items-center gap-2 bg-bg-primary border-[0.5px] px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors"
                        style={{ borderColor: Q_COLOR + '66', color: Q_COLOR }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        Agregar cuestionario
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Con sesión: editor */
                <div>
                  {/* Nombre de la sesión */}
                  <div className="mb-6">
                    <input
                      type="text"
                      value={selectedSession.session_name || ''}
                      onChange={e => updateSessionName(e.target.value)}
                      placeholder="Nombre de la sesión"
                      className="bg-transparent text-[16px] font-medium text-accent tracking-[-0.01em] focus:outline-none focus:border-b-[0.5px] border-accent w-full"
                    />
                  </div>

                  {/* Bloques */}
                  <div className="space-y-10">
                    {(selectedSession.session_data?.blocks ?? []).map((block, bIdx) => (
                      <div key={block.id}>
                        <div className="flex justify-between items-center mb-4 border-b-[0.5px] border-border/50 pb-2">
                          <input
                            type="text"
                            value={block.name}
                            onChange={e => updateBlockName(bIdx, e.target.value)}
                            className="bg-transparent text-[15px] font-medium text-text-primary uppercase tracking-[0.05em] focus:outline-none focus:border-b-[0.5px] border-accent flex-1 min-w-0"
                          />
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <button
                              onClick={() => openSearch(bIdx)}
                              className="text-[13px] text-accent font-medium hover:underline bg-transparent"
                            >
                              + Agregar Ejercicio
                            </button>
                            <button
                              onClick={() => removeBlock(bIdx)}
                              className="text-text-secondary hover:text-warning text-[18px] p-1"
                              title="Eliminar bloque"
                            >×</button>
                          </div>
                        </div>

                        {block.exercises.length === 0 ? (
                          <div
                            className={`text-center py-8 text-text-secondary text-[13px] border-[0.5px] border-dashed rounded-xl transition-colors ${dragOverEx?.bIdx === bIdx ? 'border-accent bg-accent/5' : 'border-border'}`}
                            onDragOver={e => { e.preventDefault(); setDragOverEx({ bIdx, exIdx: 0 }) }}
                            onDragLeave={() => setDragOverEx(null)}
                            onDrop={() => {
                              if (dragExRef.current) {
                                moveExercise(dragExRef.current.bIdx, dragExRef.current.exIdx, bIdx, 0)
                                dragExRef.current = null
                              }
                              setDragOverEx(null)
                            }}
                          >
                            {dragOverEx?.bIdx === bIdx ? 'Soltar aquí' : 'Bloque vacío. Agregá ejercicios usando el botón superior.'}
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {block.exercises.map((ex, exIdx) => {
                              const gColor = groupColor(ex.group)
                              return (
                              <div
                                key={ex.id}
                                draggable
                                onDragStart={() => { dragExRef.current = { bIdx, exIdx } }}
                                onDragOver={e => { e.preventDefault(); setDragOverEx({ bIdx, exIdx }) }}
                                onDragLeave={() => setDragOverEx(null)}
                                onDrop={() => {
                                  if (dragExRef.current) {
                                    moveExercise(dragExRef.current.bIdx, dragExRef.current.exIdx, bIdx, exIdx)
                                    dragExRef.current = null
                                  }
                                  setDragOverEx(null)
                                }}
                                onDragEnd={() => { dragExRef.current = null; setDragOverEx(null) }}
                                className={`bg-bg-secondary border-[0.5px] rounded-xl p-4 transition-colors ${dragOverEx?.bIdx === bIdx && dragOverEx?.exIdx === exIdx ? 'border-accent bg-accent/5' : 'border-border'}`}
                                style={gColor ? { borderLeftWidth: '3px', borderLeftColor: gColor } : undefined}
                              >
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary transition-colors shrink-0 select-none" title="Arrastrar para reordenar">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
                                      </span>
                                      <select
                                        value={ex.group || ''}
                                        onChange={e => updateExerciseGroup(bIdx, exIdx, e.target.value)}
                                        className={`shrink-0 text-[11px] font-mono font-medium rounded px-1.5 py-0.5 border-[0.5px] focus:outline-none cursor-pointer appearance-none transition-colors ${ex.group ? '' : 'bg-bg-primary border-border text-text-secondary hover:border-accent/40'}`}
                                        style={gColor ? { backgroundColor: `${gColor}1a`, borderColor: `${gColor}66`, color: gColor } : undefined}
                                        title="Superserie: ejercicios con el mismo número van alternados (ej: 1A y 1B)"
                                      >
                                        <option value="">—</option>
                                        {['1','1A','1B','1C','2','2A','2B','2C','3','3A','3B','3C','4','4A','4B'].map(g => (
                                          <option key={g} value={g}>{g}</option>
                                        ))}
                                      </select>
                                      <h4 className="text-[15px] font-medium text-text-primary">{ex.exercise_name}</h4>
                                      {latestByExercise[ex.exercise_id] && (() => {
                                        const log = latestByExercise[ex.exercise_id]
                                        const signal = getTrafficLight(log.rpe, log.eva)
                                        const isHovered = hoveredExSignal === ex.id
                                        return (
                                          <div className="relative">
                                            <button
                                              onMouseEnter={() => setHoveredExSignal(ex.id)}
                                              onMouseLeave={() => setHoveredExSignal(null)}
                                              onClick={() => setHoveredExSignal(isHovered ? null : ex.id)}
                                              className="flex items-center gap-1.5 focus:outline-none"
                                            >
                                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${TRAFFIC_COLORS[signal]}`} />
                                            </button>
                                            {isHovered && (
                                              <div className="absolute left-0 top-5 z-20 bg-bg-primary border-[0.5px] border-border rounded-xl shadow-lg p-3 w-[200px]">
                                                <div className="text-[12px] font-medium text-text-primary mb-1">{TRAFFIC_LABELS[signal]}</div>
                                                <div className="text-[11px] text-text-secondary space-y-0.5">
                                                  <div>RPE <span className="font-medium text-text-primary">{log.rpe}</span> · EVA <span className="font-medium text-text-primary">{log.eva}</span></div>
                                                  <div>{new Date(log.logged_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                    {ex.youtube_url && (
                                      <a href={ex.youtube_url} target="_blank" rel="noreferrer" className="text-[12px] text-accent hover:underline mt-1 inline-block">
                                        Ver video original
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => openReplace(bIdx, exIdx)}
                                      className="text-text-secondary hover:text-accent p-1"
                                      title="Reelegir: cambiar por otro ejercicio (conserva la dosificación)"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                                    </button>
                                    <button
                                      onClick={() => removeExercise(bIdx, exIdx)}
                                      className="text-text-secondary hover:text-warning text-[18px] p-1"
                                      title="Eliminar ejercicio"
                                    >×</button>
                                  </div>
                                </div>

                                {/* Dosificación plana (sin S1-S4) */}
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                  {[
                                    { field: 'sets' as const, label: 'Series' },
                                    { field: 'reps' as const, label: 'Reps' },
                                    { field: 'load' as const, label: 'Carga', placeholder: 'ej: 20kg' },
                                    { field: 'rest' as const, label: 'Pausa', placeholder: 'ej: 90s' },
                                    { field: 'rpe_obj' as const, label: 'RPE obj.' },
                                    { field: 'eav_obj' as const, label: 'EAV obj.' },
                                  ].map(({ field, label, placeholder }) => (
                                    <div key={field}>
                                      <label className="block text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">{label}</label>
                                      <input
                                        type="text"
                                        value={ex[field] as string}
                                        onChange={e => updateExerciseField(bIdx, exIdx, field, e.target.value)}
                                        placeholder={placeholder ?? ''}
                                        className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-2 py-1.5 text-[13px] focus:border-accent outline-none"
                                      />
                                    </div>
                                  ))}
                                </div>

                                {/* Recomendaciones */}
                                <div className="mt-2">
                                  <label className="block text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">Recomendaciones</label>
                                  <textarea
                                    value={ex.recommendations ?? ''}
                                    onChange={e => updateExerciseField(bIdx, exIdx, 'recommendations', e.target.value)}
                                    placeholder="ej: realces en los talones para hacer sentadillas"
                                    rows={2}
                                    className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-2 py-1.5 text-[13px] focus:border-accent outline-none resize-none"
                                  />
                                </div>

                              </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Importar del plan (solo si hay sesiones con ejercicios en plan_data) */}
                  {importablePlanSessions.length > 0 && (
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="mt-6 w-full py-2.5 border-[0.5px] border-dashed border-accent/50 rounded-xl text-[13px] text-accent hover:border-accent hover:bg-accent/5 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Importar ejercicios del plan
                    </button>
                  )}

                  {/* Agregar bloque */}
                  <button
                    onClick={addBlock}
                    className="mt-4 w-full py-3 border-[0.5px] border-dashed border-border rounded-xl text-[13px] text-text-secondary hover:border-accent hover:text-accent transition-colors"
                  >
                    + Agregar bloque
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: ACTIVIDAD DEL PACIENTE */}
      {activeTab === 'logs' && (
        <div className="bg-bg-primary border-[0.5px] border-border rounded-b-xl rounded-tl-xl p-6 min-h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[20px] font-medium tracking-[-0.01em]">Reportes del Paciente</h2>
            <div className="flex bg-bg-secondary rounded-lg p-1 border-[0.5px] border-border">
              <button
                onClick={() => setLogsGroupBy('date')}
                className={`px-3 py-1 text-[12px] rounded-md transition-colors ${logsGroupBy === 'date' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Por Fecha
              </button>
              <button
                onClick={() => setLogsGroupBy('exercise')}
                className={`px-3 py-1 text-[12px] rounded-md transition-colors ${logsGroupBy === 'exercise' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Por Ejercicio
              </button>
            </div>
          </div>

          {logsLoading ? (
            <div className="text-center py-12 text-text-secondary">Cargando actividad...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 bg-bg-secondary border-[0.5px] border-dashed border-border rounded-xl">
              <p className="text-[15px] font-medium text-text-primary mb-2">Todavía no hay actividad registrada</p>
              <p className="text-[13px] text-text-secondary max-w-[400px] mx-auto">
                Cuando tu paciente complete ejercicios y los reporte usando el Modo Paciente, los resultados aparecerán acá.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {logsGroupBy === 'date' ? (
                Object.entries(logs.reduce((acc, log) => {
                  const dateStr = new Date(log.logged_at).toLocaleDateString('es-AR')
                  if (!acc[dateStr]) acc[dateStr] = []
                  acc[dateStr].push(log)
                  return acc
                }, {} as Record<string, ActivityLog[]>)).map(([date, dayLogs]) => (
                  <div key={date} className="mb-8 border-[0.5px] border-border rounded-xl overflow-hidden">
                    <div className="bg-bg-secondary px-4 py-3 border-b-[0.5px] border-border flex justify-between items-center">
                      <h3 className="text-[14px] font-medium text-text-primary">{date}</h3>
                      <span className="text-[12px] text-text-secondary">{dayLogs.length} ejercicios</span>
                    </div>
                    <div className="divide-y-[0.5px] divide-border bg-bg-primary">
                      {dayLogs.map(log => (
                        <div key={log.id} className="p-4 flex flex-col sm:flex-row justify-between gap-4">
                          <div>
                            <div className="text-[14px] font-medium mb-1">{log.exercise_name}</div>
                            <div className="text-[12px] text-text-secondary">Sesión {log.session_id.replace('session_', '')} • Semana {log.week}</div>
                            {log.notes && (
                              <div className="mt-2 text-[13px] text-text-secondary italic">&ldquo;{log.notes}&rdquo;</div>
                            )}
                          </div>
                          <div className="flex gap-4 items-start sm:items-center">
                            <div className="text-center">
                              <div className="text-[10px] uppercase text-text-secondary mb-1">RPE</div>
                              <div className={`text-[15px] font-medium ${log.rpe >= 8 ? 'text-warning' : 'text-text-primary'}`}>{log.rpe}/10</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] uppercase text-text-secondary mb-1">EVA</div>
                              <div className={`text-[15px] font-medium ${log.eva >= 5 ? 'text-warning' : 'text-text-primary'}`}>{log.eva}/10</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                Object.entries(logs.reduce((acc, log) => {
                  if (!acc[log.exercise_name]) acc[log.exercise_name] = []
                  acc[log.exercise_name].push(log)
                  return acc
                }, {} as Record<string, ActivityLog[]>)).map(([exerciseName, exLogs]) => (
                  <div key={exerciseName} className="mb-8 border-[0.5px] border-border rounded-xl overflow-hidden">
                    <div className="bg-bg-secondary px-4 py-3 border-b-[0.5px] border-border">
                      <h3 className="text-[14px] font-medium text-text-primary">{exerciseName}</h3>
                    </div>
                    <div className="divide-y-[0.5px] divide-border bg-bg-primary">
                      {exLogs.map(log => (
                        <div key={log.id} className="p-4 flex flex-col sm:flex-row justify-between gap-4">
                          <div>
                            <div className="text-[13px] font-medium mb-1">{new Date(log.logged_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="text-[12px] text-text-secondary">Sesión {log.session_id.replace('session_', '')} • Semana {log.week}</div>
                            {log.notes && (
                              <div className="mt-2 text-[13px] text-text-secondary italic">&ldquo;{log.notes}&rdquo;</div>
                            )}
                          </div>
                          <div className="flex gap-4 items-start sm:items-center">
                            <div className="text-center">
                              <div className="text-[10px] uppercase text-text-secondary mb-1">RPE</div>
                              <div className={`text-[15px] font-medium ${log.rpe >= 8 ? 'text-warning' : 'text-text-primary'}`}>{log.rpe}/10</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] uppercase text-text-secondary mb-1">EVA</div>
                              <div className={`text-[15px] font-medium ${log.eva >= 5 ? 'text-warning' : 'text-text-primary'}`}>{log.eva}/10</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL BUSCADOR DE EJERCICIOS */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-bg-primary/90 backdrop-blur-sm z-50 flex items-start justify-center p-4 sm:p-8 pt-16" onClick={() => setIsSearchOpen(false)}>
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden w-full max-w-[640px] shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            {/* Header: buscador */}
            <div className="p-4 border-b-[0.5px] border-border flex gap-4 items-center bg-bg-secondary">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={targetBlock?.exIdx != null ? 'Buscar ejercicio para reemplazar...' : 'Buscar ejercicio para agregar...'}
                className="flex-grow bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
              />
              <button onClick={() => setIsSearchOpen(false)} className="text-text-secondary hover:text-text-primary p-2 text-[13px] whitespace-nowrap">
                Cerrar
              </button>
            </div>

            {/* Filtro de categorías */}
            <div className="px-4 py-3 border-b-[0.5px] border-border bg-bg-secondary flex flex-wrap gap-2">
              <button
                onClick={() => setSearchCategory('')}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border-[0.5px] ${searchCategory === '' ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'}`}
              >
                Todas
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setSearchCategory(c.value)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border-[0.5px] ${searchCategory === c.value ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto flex-grow p-4 space-y-2">
              {isSearching ? (
                <div className="text-center py-8 text-text-secondary text-[13px]">Buscando...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-text-secondary text-[13px]">
                  {searchCategory === 'mis_ejercicios'
                    ? 'No tenés ejercicios propios aún. Creá uno abajo.'
                    : 'No hay resultados. Buscá por nombre, cambiá la categoría o creá un ejercicio nuevo abajo.'}
                </div>
              ) : (
                searchResults.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => addExerciseToBlock(ex)}
                    className="w-full text-left bg-bg-secondary border-[0.5px] border-border rounded-lg p-4 hover:border-accent transition-colors flex justify-between items-center group"
                  >
                    <div>
                      <div className="text-[14px] font-medium text-text-primary">{ex.name}</div>
                      <div className="text-[11px] text-text-secondary mt-1">
                        {ex.category === 'mis_ejercicios'
                          ? 'MIS EJERCICIOS'
                          : `${ex.category.replace(/_/g, ' ').toUpperCase()} • ${ex.equipment || 'Sin equipo'}`}
                      </div>
                    </div>
                    <div className="text-accent text-[20px] opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">{targetBlock?.exIdx != null ? '↔' : '+'}</div>
                  </button>
                ))
              )}
            </div>

            {/* CREAR EJERCICIO NUEVO */}
            <div className="border-t-[0.5px] border-border bg-bg-secondary">
              <button
                onClick={() => setShowCreateForm(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-[13px] text-text-secondary hover:text-text-primary transition-colors"
              >
                <span>Crear ejercicio nuevo</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform ${showCreateForm ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {showCreateForm && (
                <div className="px-4 pb-4 space-y-3">
                  <input
                    type="text"
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    placeholder="Nombre del ejercicio *"
                    className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-accent"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={createUrl}
                    onChange={e => setCreateUrl(e.target.value)}
                    placeholder="URL de YouTube (opcional)"
                    className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={handleCreateExercise}
                    disabled={creating || !createName.trim()}
                    className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    {creating ? 'Creando...' : 'Crear y agregar al bloque'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVA EVALUACIÓN (RTS / DINAMO / CUESTIONARIO) — completar ahora o programar */}
      {evalModal && (
        <div className="fixed inset-0 bg-bg-primary/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setEvalModal(null) }}>
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl w-full max-w-[420px] shadow-xl p-6">
            <h3 className="text-[16px] font-medium mb-1">Evaluación de {EVAL_META[evalModal.kind].label}</h3>
            <p className="text-[13px] text-text-secondary mb-4">
              Completala ahora, o dejala <span className="font-medium">programada</span> para ese día: queda como
              recordatorio en el calendario y en el inicio, y la completás cuando llegue la fecha.
            </p>
            {evalModal.kind === 'rts' && (
              <>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Protocolo</label>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {RTS_PROTOCOLS.map(p => (
                    <button key={p.value} onClick={() => setEvalProtocol(p.value)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium border-[0.5px] transition-colors ${evalProtocol === p.value ? 'text-white' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'}`}
                      style={evalProtocol === p.value ? { backgroundColor: RTS_COLOR, borderColor: RTS_COLOR } : {}}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            {evalModal.kind === 'quest' && (
              <>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Cuestionario</label>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {QUEST_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setEvalProtocol(o.value)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium border-[0.5px] transition-colors ${evalProtocol === o.value ? 'text-white' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'}`}
                      style={evalProtocol === o.value ? { backgroundColor: Q_COLOR, borderColor: Q_COLOR } : {}}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Día</label>
            <input type="date" value={evalDate} onChange={e => setEvalDate(e.target.value)}
              className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent mb-5" />
            {evalModal.kind === 'quest' && !evalProtocol && (
              <p className="text-[12px] text-text-secondary mb-3 -mt-2">Elegí qué cuestionario para continuar.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { const d = evalDate || todayStr; const k = evalModal.kind; const p = evalProtocol; setEvalModal(null); evalCompleteNow(k, p, d) }}
                disabled={evalModal.kind === 'quest' && !evalProtocol}
                className="flex-1 min-w-[130px] bg-accent text-bg-primary py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
                Completar ahora
              </button>
              <button
                onClick={scheduleEval}
                disabled={!evalDate || (evalModal.kind === 'quest' && !evalProtocol)}
                className="flex-1 min-w-[130px] bg-bg-primary border-[0.5px] border-border py-2.5 rounded-lg text-[13px] font-medium hover:border-accent disabled:opacity-40 transition-colors">
                Programar
              </button>
              <button onClick={() => setEvalModal(null)} className="px-4 py-2.5 text-[13px] text-text-secondary hover:text-text-primary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ACCIÓN EVALUACIÓN PROGRAMADA — completar o eliminar */}
      {schedAction && (
        <div className="fixed inset-0 bg-bg-primary/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setSchedAction(null) }}>
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl w-full max-w-[400px] shadow-xl p-6">
            <h3 className="text-[16px] font-medium mb-1">{schedLabel(schedAction)}</h3>
            <p className="text-[13px] text-text-secondary mb-5">
              Evaluación programada para el {formatDateHeader(new Date(schedAction.scheduled_date + 'T00:00:00')).toLowerCase()}.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => completeSched(schedAction)}
                className="flex-1 min-w-[130px] bg-accent text-bg-primary py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">
                Completar ahora
              </button>
              <button
                onClick={() => deleteSched(schedAction)}
                className="flex-1 min-w-[130px] bg-bg-primary border-[0.5px] border-border py-2.5 rounded-lg text-[13px] font-medium text-warning hover:border-warning transition-colors">
                Eliminar
              </button>
              <button onClick={() => setSchedAction(null)} className="px-4 py-2.5 text-[13px] text-text-secondary hover:text-text-primary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR / EDITAR HITO */}
      {(editEvent || addingEvent) && (
        <div className="fixed inset-0 bg-bg-primary/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setEditEvent(null); setAddingEvent(false) } }}>
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl w-full max-w-[420px] shadow-xl p-6">
            <h3 className="text-[16px] font-medium mb-4">{editEvent ? 'Editar hito' : 'Agregar hito'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Tipo</label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_TYPES.map(t => (
                    <button key={t.value} onClick={() => setEdType(t.value)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium border-[0.5px] transition-colors ${edType === t.value ? 'text-white' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'}`}
                      style={edType === t.value ? { backgroundColor: t.color, borderColor: t.color } : {}}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: edType === t.value ? '#fff' : t.color }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha</label>
                  <input type="date" value={edDate} onChange={e => setEdDate(e.target.value)} className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Título (opcional)</label>
                  <input type="text" value={edTitle} onChange={e => setEdTitle(e.target.value)} className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nota (opcional)</label>
                <input type="text" value={edNote} onChange={e => setEdNote(e.target.value)} className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button onClick={saveEvent} disabled={edSaving || !edDate}
                className="flex-1 bg-accent text-bg-primary py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
                {edSaving ? 'Guardando…' : (editEvent ? 'Guardar' : 'Agregar')}
              </button>
              {editEvent && <button onClick={deleteEditEvent} className="px-4 py-2.5 text-[13px] text-warning hover:opacity-80 transition-opacity">Borrar</button>}
              <button onClick={() => { setEditEvent(null); setAddingEvent(false) }} className="px-3 py-2.5 text-[13px] text-text-secondary hover:text-text-primary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ACCIONES DE UN RTS GUARDADO (editar / borrar), como los hitos */}
      {rtsAction && (
        <div className="fixed inset-0 bg-bg-primary/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setRtsAction(null) }}>
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl w-full max-w-[380px] shadow-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={RTS_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <h3 className="text-[16px] font-medium">RTS · {RTS_LABELS[rtsAction.protocol_type] ?? rtsAction.protocol_type}</h3>
            </div>
            <p className="text-[13px] text-text-secondary mb-5">
              {(rtsAction.evaluation_date ?? rtsAction.created_at ?? '').slice(0, 10)}
              {rtsAction.affected_side ? ` · ${rtsAction.affected_side === 'left' ? 'Izquierdo' : rtsAction.affected_side === 'right' ? 'Derecho' : rtsAction.affected_side}` : ''}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push(`/dashboard/pacientes/${plan.patient_id}/rts?eval=${rtsAction.id}`)}
                className="w-full text-white py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: RTS_COLOR }}>
                Abrir / editar evaluación
              </button>
              <div className="flex items-center gap-2">
                <button onClick={deleteRtsEval} disabled={rtsDeleting}
                  className="flex-1 py-2.5 rounded-lg text-[13px] text-warning border-[0.5px] border-border hover:border-warning disabled:opacity-40 transition-colors">
                  {rtsDeleting ? 'Borrando…' : 'Borrar evaluación'}
                </button>
                <button onClick={() => setRtsAction(null)} className="px-3 py-2.5 text-[13px] text-text-secondary hover:text-text-primary">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ACCIONES DE UNA DINAMOMETRÍA GUARDADA (editar / borrar) */}
      {dynAction && (
        <div className="fixed inset-0 bg-bg-primary/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setDynAction(null) }}>
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl w-full max-w-[380px] shadow-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={DYN_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M6.5 6.5 17.5 17.5"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>
              <h3 className="text-[16px] font-medium">Dinamometría</h3>
            </div>
            <p className="text-[13px] text-text-secondary mb-5">
              {(dynAction.evaluation_date ?? dynAction.created_at ?? '').slice(0, 10)}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push(`/recursos/dinamometro?edit=${dynAction.id}&from=${planReturn}`)}
                className="w-full text-white py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: DYN_COLOR }}>
                Abrir / editar evaluación
              </button>
              <div className="flex items-center gap-2">
                <button onClick={deleteDynEval} disabled={dynDeleting}
                  className="flex-1 py-2.5 rounded-lg text-[13px] text-warning border-[0.5px] border-border hover:border-warning disabled:opacity-40 transition-colors">
                  {dynDeleting ? 'Borrando…' : 'Borrar evaluación'}
                </button>
                <button onClick={() => setDynAction(null)} className="px-3 py-2.5 text-[13px] text-text-secondary hover:text-text-primary">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ACCIONES DE UN CUESTIONARIO GUARDADO (ver en ficha / borrar) */}
      {qAction && (
        <div className="fixed inset-0 bg-bg-primary/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setQAction(null) }}>
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl w-full max-w-[380px] shadow-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={Q_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <h3 className="text-[16px] font-medium">Cuestionario · {Q_LABELS[qAction.questionnaire_type] ?? qAction.questionnaire_type}</h3>
            </div>
            <p className="text-[13px] text-text-secondary mb-5">
              {(qAction.evaluation_date ?? qAction.created_at ?? '').slice(0, 10)}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push(`/dashboard/pacientes/${plan.patient_id}/ficha`)}
                className="w-full text-white py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: Q_COLOR }}>
                Ver en la ficha
              </button>
              <div className="flex items-center gap-2">
                <button onClick={deleteQEval} disabled={qDeleting}
                  className="flex-1 py-2.5 rounded-lg text-[13px] text-warning border-[0.5px] border-border hover:border-warning disabled:opacity-40 transition-colors">
                  {qDeleting ? 'Borrando…' : 'Borrar cuestionario'}
                </button>
                <button onClick={() => setQAction(null)} className="px-3 py-2.5 text-[13px] text-text-secondary hover:text-text-primary">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DUPLICAR SEMANA */}
      {showDupWeek && (
        <div className="fixed inset-0 bg-bg-primary/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowDupWeek(false) }}>
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl w-full max-w-[420px] shadow-xl p-6">
            <h3 className="text-[16px] font-medium mb-1">Duplicar semana</h3>
            <p className="text-[13px] text-text-secondary mb-4">
              Copio la semana <strong className="text-text-primary">{sourceWeekLabel}</strong> ({sourceWeekSessions.length} {sourceWeekSessions.length === 1 ? 'sesión' : 'sesiones'}) a las próximas semanas, en los mismos días. No piso días que ya tengan sesión.
            </p>

            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">¿A cuántas semanas?</label>
            <div className="flex gap-1.5 flex-wrap mb-5">
              {[1, 2, 3, 4, 6, 8].map(n => (
                <button key={n} onClick={() => setDupWeeks(n)}
                  className={`px-3.5 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${dupWeeks === n ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'}`}>
                  {n}
                </button>
              ))}
            </div>

            {dupState === 'error' && <p className="text-[13px] text-warning mb-3">No se pudo duplicar. Intentá de nuevo.</p>}
            {dupState === 'done' && <p className="text-[13px] text-[#4ade80] mb-3">✓ Semana duplicada</p>}

            <div className="flex gap-2">
              <button onClick={handleDuplicateWeek} disabled={dupState === 'loading' || dupState === 'done'}
                className="flex-1 bg-accent text-bg-primary py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
                {dupState === 'loading' ? 'Duplicando…' : `Duplicar a ${dupWeeks} ${dupWeeks === 1 ? 'semana' : 'semanas'}`}
              </button>
              <button onClick={() => setShowDupWeek(false)} className="px-4 py-2.5 text-[13px] text-text-secondary hover:text-text-primary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CARGAR PLAN AL CALENDARIO */}
      {showBulkLoadModal && (
        <div className="fixed inset-0 bg-bg-primary/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl w-full max-w-[420px] shadow-2xl p-6">

            {bulkLoadState === 'idle' && (
              <>
                <h3 className="text-[16px] font-medium text-text-primary mb-2">Cargar plan al calendario</h3>
                <p className="text-[13px] text-text-secondary mb-1">
                  Hay <span className="font-medium text-text-primary">{emptySessions.length}</span> día{emptySessions.length !== 1 ? 's' : ''} sin ejercicios.
                </p>
                <p className="text-[13px] text-text-secondary mb-5">
                  {importablePlanSessions.length === 1
                    ? <>Se usará <span className="font-medium text-text-primary">{importablePlanSessions[0].name}</span> para todos los días.</>
                    : <>Se rotarán las <span className="font-medium text-text-primary">{importablePlanSessions.length} sesiones</span> del plan en orden.</>
                  }
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkLoad}
                    className="flex-1 bg-accent text-bg-primary py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90"
                  >
                    Cargar todo
                  </button>
                  <button
                    onClick={closeBulkModal}
                    className="flex-1 border-[0.5px] border-border py-2.5 rounded-lg text-[13px] text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {bulkLoadState === 'loading' && (
              <>
                <h3 className="text-[16px] font-medium text-text-primary mb-3">Cargando ejercicios...</h3>
                <p className="text-[13px] text-text-secondary mb-3">
                  {bulkLoadDone} de {emptySessions.length} días guardados
                </p>
                <div className="w-full bg-bg-secondary rounded-full h-1.5">
                  <div
                    className="bg-accent h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((bulkLoadDone / emptySessions.length) * 100)}%` }}
                  />
                </div>
              </>
            )}

            {bulkLoadState === 'done' && (
              <>
                <div className="text-center py-2">
                  <div className="text-[32px] mb-2">✓</div>
                  <h3 className="text-[16px] font-medium text-text-primary mb-1">Listo</h3>
                  <p className="text-[13px] text-text-secondary mb-5">
                    {emptySessions.length} día{emptySessions.length !== 1 ? 's' : ''} cargado{emptySessions.length !== 1 ? 's' : ''} con ejercicios y dosificación.
                  </p>
                  <button
                    onClick={closeBulkModal}
                    className="bg-accent text-bg-primary px-6 py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}

            {bulkLoadState === 'error' && (
              <>
                <h3 className="text-[16px] font-medium text-text-primary mb-2">Error parcial</h3>
                <p className="text-[13px] text-text-secondary mb-4">{bulkLoadError}</p>
                <button
                  onClick={closeBulkModal}
                  className="w-full border-[0.5px] border-border py-2.5 rounded-lg text-[13px] text-text-secondary hover:text-text-primary"
                >
                  Cerrar
                </button>
              </>
            )}

          </div>
        </div>
      )}

      {/* MODAL IMPORTAR DEL PLAN */}
      {showImportModal && (
        <div className="fixed inset-0 bg-bg-primary/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-8" onClick={() => setShowImportModal(false)}>
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl w-full max-w-[480px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b-[0.5px] border-border bg-bg-secondary">
              <div>
                <h3 className="text-[15px] font-medium text-text-primary">Importar ejercicios del plan</h3>
                <p className="text-[12px] text-text-secondary mt-0.5">Elegí una sesión para copiar sus ejercicios a este día</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-text-secondary hover:text-text-primary p-1 text-[18px]">✕</button>
            </div>
            <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
              {importablePlanSessions.map(s => {
                const exerciseCount = (s.blocks ?? []).reduce((acc, b) => acc + (b.exercises?.length ?? 0), 0)
                return (
                  <button
                    key={s.id}
                    onClick={() => handleImportFromPlan(s)}
                    className="w-full text-left bg-bg-secondary border-[0.5px] border-border rounded-xl p-4 hover:border-accent transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[14px] font-medium text-text-primary mb-0.5">{s.name}</div>
                        <div className="text-[12px] text-text-secondary">{exerciseCount} ejercicio{exerciseCount !== 1 ? 's' : ''}</div>
                      </div>
                      <span className="text-accent text-[20px] opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity shrink-0 ml-3">→</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
