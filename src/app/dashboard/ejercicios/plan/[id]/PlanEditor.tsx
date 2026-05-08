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
  exercise_name: string
  session_id: string
  week: number
  rpe: number
  eva: number
  notes: string | null
  logged_at: string
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

  // Search state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCategory, setSearchCategory] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Patients state
  const [patients, setPatients] = useState<{id: string, name: string}[]>([])

  // Logs state
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsGroupBy, setLogsGroupBy] = useState<'exercise' | 'date'>('date')
  
  const supabase = createClient()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cargar pacientes del usuario
  useEffect(() => {
    const fetchPatients = async () => {
      const { data } = await supabase.from('patients').select('id, name').order('name')
      if (data) setPatients(data)
    }
    fetchPatients()
  }, [supabase])

  // Autoguardado
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    setSaveStatus('saving')
    timeoutRef.current = setTimeout(async () => {
      const { error } = await supabase
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
  }, [plan, supabase])

  // Buscar ejercicios
  useEffect(() => {
    const searchExercises = async () => {
      if (!isSearchOpen) return
      setIsSearching(true)

      if (searchCategory === 'mis_ejercicios') {
        let query = supabase.from('user_exercises').select('id, name, youtube_url').eq('user_id', userId).limit(50)
        if (searchQuery) query = query.ilike('name', `%${searchQuery}%`)
        const { data } = await query
        if (data) setSearchResults(data.map(e => ({ ...e, category: 'mis_ejercicios', equipment: null })))
      } else {
        let query = supabase.from('exercises').select('id, name, category, equipment, youtube_url').limit(30)
        if (searchQuery) query = query.ilike('name', `%${searchQuery}%`)
        if (searchCategory) query = query.eq('category', searchCategory)
        const { data } = await query
        if (data) setSearchResults(data)
      }

      setIsSearching(false)
    }

    const debounce = setTimeout(searchExercises, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, searchCategory, isSearchOpen, supabase, userId])

  // Cargar logs
  useEffect(() => {
    if (activeSession === 'logs') {
      let cancelled = false
      const fetchLogs = async () => {
        setLogsLoading(true)
        const { data, error } = await supabase
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

  // Generar link modo paciente
  const generateShareLink = async () => {
    if (plan.share_token) {
      if (confirm('Este plan ya está compartido. ¿Querés copiar el link?')) {
        navigator.clipboard.writeText(`${window.location.origin}/plan/${plan.share_token}`)
        alert('Copiado al portapapeles')
      }
      return
    }

    const token = uuidv4()
    // Vence en 90 días
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    const { error } = await supabase
      .from('exercise_plans')
      .update({
        share_token: token,
        share_token_expires_at: expiresAt.toISOString()
      })
      .eq('id', plan.id)

    if (!error) {
      setPlan(prev => ({ ...prev, share_token: token }))
      navigator.clipboard.writeText(`${window.location.origin}/plan/${token}`)
      alert('Link generado y copiado al portapapeles. Vence en 90 días.')
    } else {
      alert('Error al generar el link')
    }
  }

  const revokeShareLink = async () => {
    if (!confirm('¿Revocar acceso? El paciente ya no podrá ver el plan.')) return

    const { error } = await supabase
      .from('exercise_plans')
      .update({
        share_token: null,
        share_token_expires_at: null
      })
      .eq('id', plan.id)

    if (!error) {
      setPlan(prev => ({ ...prev, share_token: null }))
      alert('Acceso revocado')
    }
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
            {plan.share_token ? (
              <div className="flex gap-2 w-full">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/plan/${plan.share_token}`)
                    alert('Link copiado')
                  }}
                  className="bg-[#24342A] border-[0.5px] border-[#34D399]/50 text-[#34D399] px-4 py-2 rounded-lg text-[13px] font-medium flex-grow truncate"
                  title="Copiar link"
                >
                  Link Activo
                </button>
                <button onClick={revokeShareLink} className="bg-bg-secondary border-[0.5px] border-border px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-warning" title="Revocar">
                  X
                </button>
              </div>
            ) : (
              <button 
                onClick={generateShareLink}
                className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 w-full"
              >
                Compartir Modo Paciente
              </button>
            )}
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
          <div className="mb-8">
            <input 
              type="text" 
              value={currentSession.name}
              onChange={(e) => updateSessionName(activeSession, e.target.value)}
              className="bg-transparent text-[20px] font-medium tracking-[-0.01em] text-accent focus:outline-none focus:border-b-[0.5px] border-accent"
            />
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
                      <div key={ex.id} className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-[15px] font-medium text-text-primary">{ex.exercise_name}</h4>
                            {ex.youtube_url && (
                              <a href={ex.youtube_url} target="_blank" rel="noreferrer" className="text-[12px] text-accent hover:underline mt-1 inline-block">
                                Ver video original
                              </a>
                            )}
                          </div>
                          <button 
                            onClick={() => removeExercise(activeSession, bIdx, exIdx)}
                            className="text-text-secondary hover:text-warning text-[18px] p-1"
                            title="Eliminar ejercicio"
                          >×</button>
                        </div>

                        {/* TABLA DE SEMANAS EN DESKTOP, STACK EN MOBILE */}
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[700px] text-left border-collapse">
                            <thead>
                              <tr className="text-[11px] uppercase tracking-[0.05em] text-text-secondary border-b-[0.5px] border-border">
                                <th className="pb-2 w-[80px]">Semana</th>
                                <th className="pb-2 w-[80px]">Series</th>
                                <th className="pb-2 w-[80px]">Reps</th>
                                <th className="pb-2 w-[120px]">Carga</th>
                                <th className="pb-2 w-[120px]">Pausa</th>
                                <th className="pb-2 w-[80px]" title="Rating of Perceived Exertion (1-10)">RPE</th>
                                <th className="pb-2 w-[80px]" title="Escala Visual Analógica de dolor (1-10)">EAV</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ex.weeks.map((w, wIdx) => (
                                <tr key={w.week} className="border-b-[0.5px] border-border/30 last:border-0">
                                  <td className="py-2 text-[13px] font-medium text-text-secondary">Sem {w.week}</td>
                                  <td className="py-2 pr-2">
                                    <input type="text" value={w.sets} onChange={e => updateWeekData(activeSession, bIdx, exIdx, wIdx, 'sets', e.target.value)} className="w-full bg-bg-primary border-[0.5px] border-border rounded p-1 text-[13px] focus:border-accent outline-none" />
                                  </td>
                                  <td className="py-2 pr-2">
                                    <input type="text" value={w.reps} onChange={e => updateWeekData(activeSession, bIdx, exIdx, wIdx, 'reps', e.target.value)} className="w-full bg-bg-primary border-[0.5px] border-border rounded p-1 text-[13px] focus:border-accent outline-none" />
                                  </td>
                                  <td className="py-2 pr-2">
                                    <input type="text" value={w.load} onChange={e => updateWeekData(activeSession, bIdx, exIdx, wIdx, 'load', e.target.value)} placeholder="ej: 20kg" className="w-full bg-bg-primary border-[0.5px] border-border rounded p-1 text-[13px] focus:border-accent outline-none" />
                                  </td>
                                  <td className="py-2 pr-2">
                                    <input type="text" value={w.rest} onChange={e => updateWeekData(activeSession, bIdx, exIdx, wIdx, 'rest', e.target.value)} placeholder="ej: 90s" className="w-full bg-bg-primary border-[0.5px] border-border rounded p-1 text-[13px] focus:border-accent outline-none" />
                                  </td>
                                  <td className="py-2 pr-2">
                                    <input type="text" value={w.rpe} onChange={e => updateWeekData(activeSession, bIdx, exIdx, wIdx, 'rpe', e.target.value)} className="w-full bg-bg-primary border-[0.5px] border-border rounded p-1 text-[13px] focus:border-accent outline-none" />
                                  </td>
                                  <td className="py-2">
                                    <input type="text" value={w.eav} onChange={e => updateWeekData(activeSession, bIdx, exIdx, wIdx, 'eav', e.target.value)} className="w-full bg-bg-primary border-[0.5px] border-border rounded p-1 text-[13px] focus:border-accent outline-none" />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

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
                    ? 'No tenés ejercicios propios aún. Podés agregarlos desde la Biblioteca.'
                    : 'No hay resultados. Buscá por nombre o cambiá la categoría.'}
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
          </div>
        </div>
      )}
    </div>
  )
}
