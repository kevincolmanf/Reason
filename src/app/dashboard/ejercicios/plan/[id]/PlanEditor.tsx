'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { v4 as uuidv4 } from 'uuid'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

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

export default function PlanEditor({ initialPlan, userId }: { initialPlan: ExercisePlan, userId: string }) {
  const [plan, setPlan] = useState<ExercisePlan>(initialPlan)
  const [activeTab, setActiveTab] = useState<'calendar' | 'logs'>('calendar')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')

  // Calendar state
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewStart, setViewStart] = useState<Date>(() => getMondayOfWeek(new Date()))
  const [copiedSessionData, setCopiedSessionData] = useState<SessionData | null>(null)
  const [copiedFromDate, setCopiedFromDate] = useState<string | null>(null)
  const sessionSaveRef = useRef<NodeJS.Timeout | null>(null)

  // Search/modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [targetBlock, setTargetBlock] = useState<{ blockIdx: number } | null>(null)
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
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([])

  const supabaseRef = useRef(createClient())
  const planSaveRef = useRef<NodeJS.Timeout | null>(null)

  // ─── Derived ───────────────────────────────────────────────────────────────

  const selectedSession = selectedDate
    ? scheduledSessions.find(s => s.scheduled_date === selectedDate) ?? null
    : null

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Cargar pacientes
  useEffect(() => {
    const fetchPatients = async () => {
      const { data } = await supabaseRef.current.from('patients').select('id, name').order('name')
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
        .not('session_data', 'is', null)
        .order('scheduled_date')
      if (data) setScheduledSessions(data)
    }
    fetchSessions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id])

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

  // Autoguardado de session_data
  useEffect(() => {
    if (!selectedSession?.id || !selectedSession.session_data) return
    if (sessionSaveRef.current) clearTimeout(sessionSaveRef.current)
    sessionSaveRef.current = setTimeout(async () => {
      await supabaseRef.current
        .from('scheduled_sessions')
        .update({
          session_name: selectedSession.session_name,
          session_data: selectedSession.session_data,
        })
        .eq('id', selectedSession.id)
    }, 1500)
    return () => { if (sessionSaveRef.current) clearTimeout(sessionSaveRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession?.session_data, selectedSession?.session_name])

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
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data)
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

  const updatePlanInfo = (field: 'name' | 'notes' | 'start_date', value: string) => {
    setPlan(prev => ({ ...prev, [field]: value }))
  }

  // ─── Session mutations ─────────────────────────────────────────────────────

  const updateSelectedSession = (updater: (data: SessionData) => SessionData) => {
    if (!selectedDate || !selectedSession) return
    setScheduledSessions(prev => prev.map(s => {
      if (s.scheduled_date !== selectedDate) return s
      const newData = updater(s.session_data ?? { blocks: [] })
      return { ...s, session_data: newData }
    }))
  }

  const createSession = async (dateStr: string) => {
    const { data, error } = await supabaseRef.current
      .from('scheduled_sessions')
      .insert({
        user_id: userId,
        patient_id: plan.patient_id,
        plan_id: plan.id,
        plan_name: plan.name,
        scheduled_date: dateStr,
        session_name: 'Nueva sesión',
        session_data: { blocks: [] },
        week: 1,
      })
      .select('id, scheduled_date, session_name, session_data, completed')
      .single()
    if (!error && data) {
      setScheduledSessions(prev =>
        [...prev, data].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      )
      setSelectedDate(dateStr)
    }
  }

  const deleteSession = async () => {
    if (!selectedSession || !confirm('¿Eliminar la sesión del ' + selectedDate + '?')) return
    await supabaseRef.current.from('scheduled_sessions').delete().eq('id', selectedSession.id)
    setScheduledSessions(prev => prev.filter(s => s.scheduled_date !== selectedDate))
    setSelectedDate(null)
  }

  const updateSessionName = (name: string) => {
    if (!selectedDate || !selectedSession) return
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

  const removeBlock = (blockIdx: number) => {
    if (!confirm('¿Eliminar este bloque?')) return
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
    const { blockIdx } = targetBlock
    updateSelectedSession(data => ({
      ...data,
      blocks: data.blocks.map((b, i) => {
        if (i !== blockIdx) return b
        return {
          ...b,
          exercises: [...b.exercises, {
            id: uuidv4(),
            exercise_id: exercise.id,
            exercise_name: exercise.name,
            youtube_url: exercise.youtube_url || '',
            sets: '', reps: '', load: '', rpe_obj: '', eav_obj: '', rest: '',
          }],
        }
      }),
    }))
    setIsSearchOpen(false)
    setTargetBlock(null)
  }

  const removeExercise = (blockIdx: number, exIdx: number) => {
    if (!confirm('¿Quitar este ejercicio?')) return
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
    setCopiedSessionData(JSON.parse(JSON.stringify(selectedSession.session_data)))
    setCopiedFromDate(selectedDate)
  }

  const handlePasteSession = () => {
    if (!copiedSessionData) return
    if (!confirm('¿Reemplazar la sesión de este día con la copiada?')) return
    updateSelectedSession(() => ({
      blocks: copiedSessionData.blocks.map(b => ({
        ...b,
        id: uuidv4(),
        exercises: b.exercises.map(ex => ({ ...ex, id: uuidv4() })),
      })),
    }))
    setCopiedFromDate(null)
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
    doc.text(plan.name || 'Plan de Ejercicio', 20, 20)

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

    doc.save(`Plan_${plan.name.replace(/\s+/g, '_')}.pdf`)
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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="pb-24">

      {/* HEADER DEL PLAN */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 mb-8 flex flex-col md:flex-row gap-6">
        <div className="flex-grow space-y-4">
          <div>
            <input
              type="text"
              value={plan.name}
              onChange={(e) => updatePlanInfo('name', e.target.value)}
              placeholder="Nombre del Plan"
              className="w-full bg-transparent text-[24px] font-medium tracking-[-0.01em] focus:outline-none focus:border-b border-accent pb-1"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-[200px]">
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha de Inicio (Opcional)</label>
              <input
                type="date"
                value={plan.start_date || ''}
                onChange={(e) => updatePlanInfo('start_date', e.target.value)}
                className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-2 text-[13px] focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex-grow">
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Observaciones Generales</label>
              <input
                type="text"
                value={plan.notes || ''}
                onChange={(e) => updatePlanInfo('notes', e.target.value)}
                placeholder="Ej: Evitar impacto en semana 1..."
                className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-2 text-[13px] focus:outline-none focus:border-accent"
              />
            </div>
            <div className="w-full sm:w-[200px]">
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
                    {/* Copiar */}
                    <button
                      onClick={handleCopySession}
                      className={`bg-bg-secondary border-[0.5px] text-text-secondary px-3 py-1.5 rounded-lg text-[12px] hover:text-text-primary hover:border-accent transition-colors flex items-center gap-1.5 ${copiedFromDate === selectedDate ? 'border-accent text-accent' : 'border-border'}`}
                      title="Copiar sesión"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      {copiedFromDate === selectedDate ? 'Copiado' : 'Copiar'}
                    </button>

                    {/* Pegar (solo si hay algo copiado de otro día) */}
                    {copiedSessionData && copiedFromDate !== selectedDate && (
                      <button
                        onClick={handlePasteSession}
                        className="bg-accent/10 border-[0.5px] border-accent/40 text-accent px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-accent/20 transition-colors flex items-center gap-1.5"
                        title="Pegar sesión copiada"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                        Pegar
                      </button>
                    )}

                    {/* Eliminar */}
                    <button
                      onClick={deleteSession}
                      className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-3 py-1.5 rounded-lg text-[12px] hover:text-warning hover:border-warning/50 transition-colors"
                    >
                      Eliminar sesión
                    </button>
                  </div>
                ) : null}
              </div>

              {!selectedSession ? (
                /* Sin sesión: botón crear */
                <div className="text-center py-12 bg-bg-secondary border-[0.5px] border-dashed border-border rounded-xl">
                  <p className="text-[14px] text-text-secondary mb-4">No hay sesión para este día.</p>
                  <button
                    onClick={() => createSession(selectedDate)}
                    className="bg-accent text-bg-primary px-5 py-2.5 rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity"
                  >
                    Crear sesión para este día
                  </button>
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
                            {block.exercises.map((ex, exIdx) => (
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
                                        className={`shrink-0 text-[11px] font-mono font-medium rounded px-1.5 py-0.5 border-[0.5px] focus:outline-none cursor-pointer appearance-none transition-colors ${ex.group ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-bg-primary border-border text-text-secondary hover:border-accent/40'}`}
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
                                  <button
                                    onClick={() => removeExercise(bIdx, exIdx)}
                                    className="text-text-secondary hover:text-warning text-[18px] p-1 shrink-0"
                                    title="Eliminar ejercicio"
                                  >×</button>
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

                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Agregar bloque */}
                  <button
                    onClick={addBlock}
                    className="mt-8 w-full py-3 border-[0.5px] border-dashed border-border rounded-xl text-[13px] text-text-secondary hover:border-accent hover:text-accent transition-colors"
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
                placeholder="Buscar ejercicio para agregar..."
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
                    <div className="text-accent text-[20px] opacity-0 group-hover:opacity-100 transition-opacity">+</div>
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

    </div>
  )
}
