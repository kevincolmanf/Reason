'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { v4 as uuidv4 } from 'uuid'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

interface WeekData {
  week: number
  reps: string
  sets: string
  load: string
  eav: string
  rpe: string
  rest: string
}

interface PlanExercise {
  id: string
  exercise_id: string
  exercise_name: string
  youtube_url: string
  group?: string
  weeks: WeekData[]
}

interface PlanBlock {
  id: string
  name: string
  exercises: PlanExercise[]
}

interface PlanSession {
  id: string
  name: string
  blocks: PlanBlock[]
}

interface PlanData {
  sessions: PlanSession[]
}

interface ExercisePlan {
  id: string
  name: string
  notes: string | null
  start_date: string | null
  plan_data: PlanData
  share_token: string | null
  patient_id: string | null
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
}

type TrafficLight = 'green' | 'yellow' | 'red'

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

export default function PlanEditor({ initialPlan, userId }: { initialPlan: ExercisePlan, userId: string }) {
  const [plan, setPlan] = useState<ExercisePlan>(initialPlan)
  const [activeSession, setActiveSession] = useState<number | 'logs'>(0)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [targetBlock, setTargetBlock] = useState<{sessionIdx: number, blockIdx: number} | null>(null)

  // Drag state
  const dragExRef = useRef<{sIdx: number, bIdx: number, exIdx: number} | null>(null)
  const [dragOverEx, setDragOverEx] = useState<{sIdx: number, bIdx: number, exIdx: number} | null>(null)

  // Copy/paste session state
  const [copiedBlocks, setCopiedBlocks] = useState<PlanBlock[] | null>(null)
  const [copiedFromSession, setCopiedFromSession] = useState<number | null>(null)
  const [pasteConfirm, setPasteConfirm] = useState(false)

  // Schedule modal state
  const [scheduleModal, setScheduleModal] = useState<{sessionId: string, sessionName: string} | null>(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState(false)

  // Search state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCategory, setSearchCategory] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Patients state
  const [patients, setPatients] = useState<{id: string, name: string}[]>([])

  // Create exercise state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createUrl, setCreateUrl] = useState('')
  const [creating, setCreating] = useState(false)

  // Logs state
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsGroupBy, setLogsGroupBy] = useState<'exercise' | 'date'>('date')

  // Semáforo: último log por exercise_id
  const [latestByExercise, setLatestByExercise] = useState<Record<string, ActivityLog>>({})
  const [hoveredExSignal, setHoveredExSignal] = useState<string | null>(null)
  
  const supabaseRef = useRef(createClient())
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cargar pacientes del usuario
  useEffect(() => {
    const fetchPatients = async () => {
      const { data } = await supabaseRef.current.from('patients').select('id, name').order('name')
      if (data) setPatients(data)
    }
    fetchPatients()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cargar últimos logs por ejercicio para semáforo
  useEffect(() => {
    const fetchLatestLogs = async () => {
      const { data } = await supabaseRef.current
        .from('plan_activity_logs')
        .select('id, exercise_id, exercise_name, session_id, week, rpe, eva, notes, logged_at')
        .eq('plan_id', plan.id)
        .order('logged_at', { ascending: false })
      if (data) {
        const latest: Record<string, ActivityLog> = {}
        for (const log of data) {
          if (log.exercise_id && !latest[log.exercise_id]) {
            latest[log.exercise_id] = log
          }
        }
        setLatestByExercise(latest)
      }
    }
    fetchLatestLogs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id])

  // Autoguardado
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    setSaveStatus('saving')
    timeoutRef.current = setTimeout(async () => {
      const { error } = await supabaseRef.current
        .from('exercise_plans')
        .update({
          name: plan.name,
          notes: plan.notes,
          start_date: plan.start_date,
          plan_data: plan.plan_data,
          patient_id: plan.patient_id
        })
        .eq('id', plan.id)
        
      if (error) {
        setSaveStatus('error')
        console.error(error)
      } else {
        setSaveStatus('saved')
      }
    }, 1500)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan])

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
        let query = supabaseRef.current.from('exercises').select('id, name, category, equipment, youtube_url').limit(1000)
        if (searchQuery) query = query.ilike('name', `%${searchQuery}%`)
        if (searchCategory) query = query.eq('category', searchCategory)
        const { data } = await query
        if (data) setSearchResults(data)
      }

      setIsSearching(false)
    }

    const debounce = setTimeout(searchExercises, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, searchCategory, isSearchOpen, userId])

  // Cargar logs
  useEffect(() => {
    if (activeSession === 'logs') {
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
  }, [activeSession, plan.id])

  // Modificadores de estado
  const updatePlanInfo = (field: 'name' | 'notes' | 'start_date', value: string) => {
    setPlan(prev => ({ ...prev, [field]: value }))
  }

  const updateSessionName = (sIdx: number, name: string) => {
    const newPlan = { ...plan }
    newPlan.plan_data.sessions[sIdx].name = name
    setPlan(newPlan)
  }

  const updateWeekData = (sIdx: number, bIdx: number, exIdx: number, wIdx: number, field: keyof WeekData, value: string) => {
    const newPlan = { ...plan }
    newPlan.plan_data.sessions[sIdx].blocks[bIdx].exercises[exIdx].weeks[wIdx][field] = value as never
    setPlan(newPlan)
  }

  const updateExerciseGroup = (sIdx: number, bIdx: number, exIdx: number, group: string) => {
    const newPlan = { ...plan }
    newPlan.plan_data.sessions[sIdx].blocks[bIdx].exercises[exIdx].group = group || undefined
    setPlan(newPlan)
  }

  const removeExercise = (sIdx: number, bIdx: number, exIdx: number) => {
    if (!confirm('¿Quitar este ejercicio?')) return
    const newPlan = { ...plan }
    newPlan.plan_data.sessions[sIdx].blocks[bIdx].exercises.splice(exIdx, 1)
    setPlan(newPlan)
  }

  const openSearch = (sIdx: number, bIdx: number) => {
    setTargetBlock({ sessionIdx: sIdx, blockIdx: bIdx })
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addExerciseToBlock = (exercise: any) => {
    if (!targetBlock) return
    
    const { sessionIdx, blockIdx } = targetBlock
    const newPlan = { ...plan }
    
    const newExercise: PlanExercise = {
      id: uuidv4(),
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      youtube_url: exercise.youtube_url || '',
      weeks: [1, 2, 3, 4].map(w => ({
        week: w,
        reps: '',
        sets: '',
        load: '',
        eav: '',
        rpe: '',
        rest: ''
      }))
    }
    
    newPlan.plan_data.sessions[sessionIdx].blocks[blockIdx].exercises.push(newExercise)
    setPlan(newPlan)
    setIsSearchOpen(false)
    setTargetBlock(null)
  }

  const moveExercise = (sIdx: number, bIdx: number, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return
    const newPlan = { ...plan }
    const exs = newPlan.plan_data.sessions[sIdx].blocks[bIdx].exercises
    const [moved] = exs.splice(fromIdx, 1)
    exs.splice(toIdx, 0, moved)
    setPlan(newPlan)
  }

  const handleCopySession = (sIdx: number) => {
    const blocks = plan.plan_data.sessions[sIdx].blocks
    setCopiedBlocks(JSON.parse(JSON.stringify(blocks)))
    setCopiedFromSession(sIdx)
    setPasteConfirm(false)
  }

  const handlePasteSession = (sIdx: number) => {
    if (!copiedBlocks) return
    const newPlan = { ...plan }
    newPlan.plan_data.sessions[sIdx].blocks = copiedBlocks.map(block => ({
      ...block,
      exercises: block.exercises.map(ex => ({ ...ex, id: uuidv4() }))
    }))
    setPlan(newPlan)
    setPasteConfirm(false)
  }

  const calcWeek = (scheduledDate: string): number => {
    if (!plan.start_date) return 1
    const start = new Date(plan.start_date + 'T00:00:00')
    const scheduled = new Date(scheduledDate + 'T00:00:00')
    const diffDays = Math.floor((scheduled.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return 1
    return Math.min(Math.floor(diffDays / 7) + 1, 4)
  }

  const handleScheduleSession = async () => {
    if (!scheduleModal || !scheduleDate || !plan.patient_id) return
    setScheduleSaving(true)
    const week = calcWeek(scheduleDate)
    await supabaseRef.current.from('scheduled_sessions').insert({
      user_id: userId,
      patient_id: plan.patient_id,
      plan_id: plan.id,
      session_id: scheduleModal.sessionId,
      session_name: scheduleModal.sessionName,
      plan_name: plan.name,
      scheduled_date: scheduleDate,
      week,
    })
    setScheduleSaving(false)
    setScheduleSuccess(true)
    setTimeout(() => { setScheduleModal(null); setScheduleSuccess(false) }, 1200)
  }

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

    for (const session of plan.plan_data.sessions) {
      // Solo imprimir sesiones que tienen al menos 1 ejercicio en algún bloque
      const hasExercises = session.blocks.some(b => b.exercises.length > 0)
      if (!hasExercises) continue

      if (y > pageHeight - 30) { doc.addPage(); y = 20; }
      
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(session.name, 20, y)
      y += 8

      for (const block of session.blocks) {
        if (block.exercises.length === 0) continue

        if (y > pageHeight - 20) { doc.addPage(); y = 20; }
        
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text(block.name, 20, y)
        y += 6

        for (const ex of block.exercises) {
          if (y > pageHeight - 35) { doc.addPage(); y = 20; }
          
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

          // Header de semanas
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.text('Semana 1', 50, y)
          doc.text('Semana 2', 80, y)
          doc.text('Semana 3', 110, y)
          doc.text('Semana 4', 140, y)
          y += 4
          
          // Series x Reps
          doc.text('Sets x Reps', 25, y)
          ex.weeks.forEach((w, i) => {
            const val = `${w.sets || '-'} x ${w.reps || '-'}`
            doc.text(val, 50 + (i * 30), y)
          })
          y += 4
          
          // Carga
          doc.text('Carga/Pausa', 25, y)
          ex.weeks.forEach((w, i) => {
            const val = `${w.load || '-'} / ${w.rest || '-'}`
            doc.text(val, 50 + (i * 30), y)
          })
          y += 10
        }
        y += 4
      }
      y += 10
    }

    if (y > pageHeight - 10) { doc.addPage(); y = 20; }
    doc.setFontSize(9)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    doc.save(`Plan_${plan.name.replace(/\s+/g, '_')}.pdf`)
  }

  const currentSession = typeof activeSession === 'number' ? plan.plan_data.sessions[activeSession] : null

  return (
    <div className="pb-24">
      {/* HEADER DE PLAN */}
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

      {/* TABS DE SESIONES Y LOGS */}
      <div className="flex gap-2 overflow-x-auto mb-6 pb-2 border-b-[0.5px] border-border hide-scrollbar">
        {plan.plan_data.sessions.map((session, idx) => (
          <button
            key={session.id}
            onClick={() => setActiveSession(idx)}
            className={`whitespace-nowrap px-6 py-3 rounded-t-xl text-[14px] font-medium transition-colors border-t-[0.5px] border-x-[0.5px] border-b-0 ${activeSession === idx ? 'bg-bg-primary text-text-primary border-border' : 'bg-transparent text-text-secondary border-transparent hover:text-text-primary'}`}
            style={{ marginBottom: '-1px' }}
          >
            {session.name}
          </button>
        ))}
        
        {/* Pestaña de Logs */}
        <button
          onClick={() => setActiveSession('logs')}
          className={`whitespace-nowrap px-6 py-3 rounded-t-xl text-[14px] font-medium transition-colors border-t-[0.5px] border-x-[0.5px] border-b-0 flex items-center gap-2 ${activeSession === 'logs' ? 'bg-bg-primary text-text-primary border-border' : 'bg-transparent text-text-secondary border-transparent hover:text-text-primary'}`}
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

      {/* CONTENIDO DE SESION */}
      {typeof activeSession === 'number' && currentSession && (
        <div className="bg-bg-primary border-[0.5px] border-border rounded-b-xl rounded-tl-xl p-6 min-h-[500px]">
          <div className="mb-8 flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={currentSession.name}
              onChange={(e) => updateSessionName(activeSession, e.target.value)}
              className="bg-transparent text-[20px] font-medium tracking-[-0.01em] text-accent focus:outline-none focus:border-b-[0.5px] border-accent flex-1 min-w-0"
            />
            <div className="flex items-center gap-2 shrink-0">
              {/* Copiar sesión */}
              <button
                onClick={() => handleCopySession(activeSession as number)}
                className={`bg-bg-secondary border-[0.5px] text-text-secondary px-3 py-1.5 rounded-lg text-[12px] hover:text-text-primary hover:border-accent transition-colors flex items-center gap-1.5 ${copiedFromSession === activeSession ? 'border-accent text-accent' : 'border-border'}`}
                title="Copiar todos los ejercicios de esta sesión"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                {copiedFromSession === activeSession ? 'Copiado' : 'Copiar sesión'}
              </button>

              {/* Pegar sesión (solo si hay algo copiado y es otra sesión) */}
              {copiedBlocks && copiedFromSession !== activeSession && (
                pasteConfirm ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-text-secondary">¿Reemplazar ejercicios?</span>
                    <button
                      onClick={() => handlePasteSession(activeSession as number)}
                      className="bg-accent text-bg-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity"
                    >
                      Sí, pegar
                    </button>
                    <button
                      onClick={() => setPasteConfirm(false)}
                      className="text-text-secondary text-[12px] px-2 py-1.5 hover:text-text-primary"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPasteConfirm(true)}
                    className="bg-accent/10 border-[0.5px] border-accent/40 text-accent px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-accent/20 transition-colors flex items-center gap-1.5"
                    title={`Pegar ejercicios copiados de ${plan.plan_data.sessions[copiedFromSession as number]?.name}`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                    Pegar sesión
                  </button>
                )
              )}

              {/* Programar */}
              {plan.patient_id && (
                <button
                  onClick={() => {
                    setScheduleDate(new Date().toISOString().split('T')[0])
                    setScheduleSuccess(false)
                    setScheduleModal({ sessionId: currentSession.id, sessionName: currentSession.name })
                  }}
                  className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-3 py-1.5 rounded-lg text-[12px] hover:text-accent hover:border-accent transition-colors flex items-center gap-1.5"
                  title="Programar esta sesión en el calendario"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Programar
                </button>
              )}
            </div>
          </div>

          <div className="space-y-12">
            {currentSession.blocks.map((block, bIdx) => (
              <div key={block.id}>
                <div className="flex justify-between items-center mb-4 border-b-[0.5px] border-border/50 pb-2">
                  <h3 className="text-[16px] font-medium text-text-primary uppercase tracking-[0.05em]">{block.name}</h3>
                  <button 
                    onClick={() => openSearch(activeSession, bIdx)}
                    className="text-[13px] text-accent font-medium hover:underline bg-transparent"
                  >
                    + Agregar Ejercicio
                  </button>
                </div>

                {block.exercises.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary text-[13px] border-[0.5px] border-dashed border-border rounded-xl">
                    Bloque vacío. Agregá ejercicios usando el botón superior.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {block.exercises.map((ex, exIdx) => (
                      <div
                        key={ex.id}
                        draggable
                        onDragStart={() => { dragExRef.current = { sIdx: activeSession as number, bIdx, exIdx } }}
                        onDragOver={e => { e.preventDefault(); setDragOverEx({ sIdx: activeSession as number, bIdx, exIdx }) }}
                        onDragLeave={() => setDragOverEx(null)}
                        onDrop={() => {
                          if (dragExRef.current) {
                            moveExercise(activeSession as number, bIdx, dragExRef.current.exIdx, exIdx)
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
                                onChange={e => updateExerciseGroup(activeSession as number, bIdx, exIdx, e.target.value)}
                                className={`shrink-0 text-[11px] font-mono font-medium rounded px-1.5 py-0.5 border-[0.5px] focus:outline-none cursor-pointer appearance-none transition-colors ${ex.group ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-bg-primary border-border text-text-secondary hover:border-accent/40'}`}
                                title="Grupo / superserie"
                              >
                                <option value="">—</option>
                                {['A','A1','A2','A3','B','B1','B2','B3','C','C1','C2','C3','D','D1','D2'].map(g => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                              <h4 className="text-[15px] font-medium text-text-primary">{ex.exercise_name}</h4>
                              {latestByExercise[ex.id] && (() => {
                                const log = latestByExercise[ex.id]
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
                            onClick={() => removeExercise(activeSession, bIdx, exIdx)}
                            className="text-text-secondary hover:text-warning text-[18px] p-1 shrink-0"
                            title="Eliminar ejercicio"
                          >×</button>
                        </div>

                        {/* PRESCRIPCIÓN */}
                        {ex.weeks[0] && (
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {[
                              { field: 'sets' as const, label: 'Series' },
                              { field: 'reps' as const, label: 'Reps' },
                              { field: 'load' as const, label: 'Carga', placeholder: 'ej: 20kg' },
                              { field: 'rest' as const, label: 'Pausa', placeholder: 'ej: 90s' },
                              { field: 'rpe'  as const, label: 'RPE obj.' },
                              { field: 'eav'  as const, label: 'EAV obj.' },
                            ].map(({ field, label, placeholder }) => (
                              <div key={field}>
                                <label className="block text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">{label}</label>
                                <input
                                  type="text"
                                  value={ex.weeks[0][field]}
                                  onChange={e => updateWeekData(activeSession, bIdx, exIdx, 0, field, e.target.value)}
                                  placeholder={placeholder ?? ''}
                                  className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-2 py-1.5 text-[13px] focus:border-accent outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTENIDO LOGS */}
      {activeSession === 'logs' && (
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
                // Group by date (DD/MM/YYYY)
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
                // Group by exercise
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
                            <div className="text-[13px] font-medium mb-1">{new Date(log.logged_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}</div>
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
                    <div className="text-accent text-[20px] opacity-0 group-hover:opacity-100 transition-opacity">
                      +
                    </div>
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

      {/* MODAL PROGRAMAR SESIÓN */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setScheduleModal(null)}>
          <div className="bg-bg-primary border-[0.5px] border-border rounded-2xl p-6 w-full max-w-[340px]" onClick={e => e.stopPropagation()}>
            <h2 className="text-[16px] font-medium mb-1">Programar sesión</h2>
            <p className="text-[13px] text-text-secondary mb-5">{scheduleModal.sessionName}</p>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
              />
            </div>

            {scheduleDate && (
              <div className={`mt-4 rounded-lg px-4 py-2.5 ${plan.start_date ? 'bg-accent/10 border-[0.5px] border-accent/30' : 'bg-bg-secondary border-[0.5px] border-border'}`}>
                {plan.start_date ? (
                  <p className="text-[13px] text-accent font-medium">Semana {calcWeek(scheduleDate)} del plan</p>
                ) : (
                  <p className="text-[12px] text-text-secondary">Sin fecha de inicio en el plan → se asigna semana 1. Podés editarla arriba.</p>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleScheduleSession}
                disabled={scheduleSaving || !scheduleDate || scheduleSuccess}
                className="bg-accent text-bg-primary px-5 py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 flex-1"
              >
                {scheduleSuccess ? '✓ Guardado' : scheduleSaving ? 'Guardando...' : 'Programar'}
              </button>
              <button onClick={() => setScheduleModal(null)} className="text-text-secondary px-4 py-2.5 rounded-lg text-[13px] hover:text-text-primary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
