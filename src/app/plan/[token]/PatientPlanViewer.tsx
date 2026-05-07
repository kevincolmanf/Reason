'use client'

import { useState, useEffect } from 'react'

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

export default function PatientPlanViewer({ planData, token }: { planData: { sessions: PlanSession[] }, token: string }) {
  const [activeSession, setActiveSession] = useState(0)
  const [activeWeek, setActiveWeek] = useState(1) // 1 to 4
  const [activeVideo, setActiveVideo] = useState<string | null>(null)
  
  // Estado para reporte
  const [reportingExId, setReportingExId] = useState<string | null>(null)
  const [rpe, setRpe] = useState<number>(5)
  const [eva, setEva] = useState<number>(0)
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reportedExercises, setReportedExercises] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Cargar historial de localStorage
    try {
      const saved = localStorage.getItem(`reason_reported_${token}`)
      if (saved) {
        setReportedExercises(JSON.parse(saved))
      }
    } catch (e) {}
  }, [token])

  const currentSession = planData.sessions[activeSession]
  // Solo mostrar bloques que tienen ejercicios en esta sesión
  const activeBlocks = currentSession?.blocks.filter(b => b.exercises.length > 0) || []

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  const handleOpenReport = (exId: string) => {
    setReportingExId(exId)
    setRpe(5)
    setEva(0)
    setNotes('')
  }

  const handleSubmitReport = async (ex: PlanExercise, sessionId: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/plan/${token}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_id: ex.id,
          exercise_name: ex.exercise_name,
          session_id: sessionId,
          week: activeWeek,
          rpe,
          eva,
          notes
        })
      })

      if (res.ok) {
        const newReported = { ...reportedExercises, [`${ex.id}_${activeWeek}`]: true }
        setReportedExercises(newReported)
        localStorage.setItem(`reason_reported_${token}`, JSON.stringify(newReported))
        setReportingExId(null)
      } else {
        alert('Hubo un error al guardar tu reporte. Intentá de nuevo.')
      }
    } catch (err) {
      alert('Error de conexión.')
    }
    setIsSubmitting(false)
  }

  const availableSessions = planData.sessions.filter(s => s.blocks.some(b => b.exercises.length > 0))

  if (availableSessions.length === 0) {
    return <div className="text-center py-12 text-text-secondary">Este plan aún no tiene ejercicios asignados.</div>
  }

  if (activeBlocks.length === 0) {
    const firstValidIdx = planData.sessions.findIndex(s => s.blocks.some(b => b.exercises.length > 0))
    if (firstValidIdx !== -1 && activeSession !== firstValidIdx) {
      setActiveSession(firstValidIdx)
    }
  }

  return (
    <div className="pb-12">
      {/* NAVEGACIÓN SEMANAS */}
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-2 flex justify-between gap-2 mb-8 sticky top-[65px] z-10 shadow-sm backdrop-blur-md">
        {[1, 2, 3, 4].map(w => (
          <button
            key={w}
            onClick={() => setActiveWeek(w)}
            className={`flex-1 py-2 text-[13px] font-medium rounded-lg transition-all ${activeWeek === w ? 'bg-accent text-bg-primary shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary/50'}`}
          >
            Semana {w}
          </button>
        ))}
      </div>

      {/* NAVEGACIÓN SESIONES */}
      <div className="flex gap-2 overflow-x-auto mb-6 pb-2 hide-scrollbar">
        {planData.sessions.map((session, idx) => {
          const hasExercises = session.blocks.some(b => b.exercises.length > 0)
          if (!hasExercises) return null

          return (
            <button
              key={session.id}
              onClick={() => setActiveSession(idx)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-medium transition-all border-[0.5px] ${activeSession === idx ? 'bg-bg-primary text-text-primary border-accent shadow-sm' : 'bg-transparent text-text-secondary border-border hover:border-text-secondary'}`}
            >
              {session.name}
            </button>
          )
        })}
      </div>

      {/* CONTENIDO SESION */}
      <div className="space-y-8">
        {activeBlocks.map(block => (
          <div key={block.id} className="bg-bg-primary border-[0.5px] border-border rounded-2xl overflow-hidden">
            <div className="bg-bg-secondary px-4 py-3 border-b-[0.5px] border-border">
              <h3 className="text-[14px] font-medium text-text-primary uppercase tracking-[0.05em]">{block.name}</h3>
            </div>
            
            <div className="divide-y-[0.5px] divide-border">
              {block.exercises.map(ex => {
                const weekData = ex.weeks.find(w => w.week === activeWeek)
                if (!weekData) return null

                const hasData = weekData.sets || weekData.reps || weekData.load || weekData.rest
                const isReported = reportedExercises[`${ex.id}_${activeWeek}`]
                const isReporting = reportingExId === ex.id

                return (
                  <div key={ex.id} className="flex flex-col">
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
                      
                      {/* VIDEO THUMBNAIL / BOTON */}
                      <div className="flex-shrink-0 w-full sm:w-[120px]">
                        {ex.youtube_url ? (
                          <button 
                            onClick={() => setActiveVideo(getYoutubeId(ex.youtube_url))}
                            className="w-full aspect-video bg-bg-secondary border-[0.5px] border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:border-accent hover:text-accent transition-all text-text-secondary group overflow-hidden relative"
                          >
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="opacity-80 group-hover:opacity-100 z-10">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>
                        ) : (
                          <div className="w-full aspect-video bg-bg-secondary border-[0.5px] border-border rounded-lg flex items-center justify-center text-[10px] text-text-secondary uppercase tracking-[0.05em]">
                            Sin video
                          </div>
                        )}
                        
                        {ex.youtube_url && (
                          <a 
                            href={ex.youtube_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="w-full text-center text-[11px] text-accent mt-2 block hover:underline"
                          >
                            Ver ejercicio en YouTube
                          </a>
                        )}
                      </div>

                      {/* DATOS EJERCICIO */}
                      <div className="flex-grow">
                        <h4 className="text-[16px] font-medium text-text-primary mb-3 leading-[1.3]">{ex.exercise_name}</h4>
                        
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 max-w-[400px]">
                          <div>
                            <div className="text-[11px] text-text-secondary uppercase tracking-[0.05em] mb-1">Series x Reps</div>
                            <div className="text-[14px] font-medium text-accent">
                              {weekData.sets || '-'} × {weekData.reps || '-'}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-[11px] text-text-secondary uppercase tracking-[0.05em] mb-1">Carga</div>
                            <div className="text-[14px] font-medium">{weekData.load || '-'}</div>
                          </div>
                          
                          <div>
                            <div className="text-[11px] text-text-secondary uppercase tracking-[0.05em] mb-1">Descanso</div>
                            <div className="text-[14px] font-medium">{weekData.rest || '-'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN REPORTE */}
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                      {!isReporting ? (
                        <button 
                          onClick={() => handleOpenReport(ex.id)}
                          className={`w-full py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors flex items-center justify-center gap-2 ${
                            isReported 
                              ? 'bg-[#24342A] border-[#34D399]/50 text-[#34D399]' 
                              : 'bg-bg-secondary border-border text-text-primary hover:border-accent'
                          }`}
                        >
                          {isReported ? (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              Registrado (Tocar para editar)
                            </>
                          ) : (
                            'Registrar cómo me fue'
                          )}
                        </button>
                      ) : (
                        <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4 mt-2 animate-in fade-in slide-in-from-top-2">
                          <div className="mb-6">
                            <div className="flex justify-between items-end mb-2">
                              <label className="text-[13px] font-medium text-text-primary">¿Cuánto te costó este ejercicio?</label>
                              <span className="text-[14px] font-bold text-accent">{rpe} / 10</span>
                            </div>
                            <input 
                              type="range" min="1" max="10" 
                              value={rpe} onChange={(e) => setRpe(parseInt(e.target.value))}
                              className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                            />
                            <div className="flex justify-between text-[11px] text-text-secondary mt-1">
                              <span>Muy fácil (1)</span>
                              <span>Moderado (5)</span>
                              <span>Máximo (10)</span>
                            </div>
                          </div>

                          <div className="mb-6">
                            <div className="flex justify-between items-end mb-2">
                              <label className="text-[13px] font-medium text-text-primary">¿Sentiste dolor?</label>
                              <span className="text-[14px] font-bold text-warning">{eva} / 10</span>
                            </div>
                            <input 
                              type="range" min="0" max="10" 
                              value={eva} onChange={(e) => setEva(parseInt(e.target.value))}
                              className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-warning"
                            />
                            <div className="flex justify-between text-[11px] text-text-secondary mt-1">
                              <span>Sin dolor (0)</span>
                              <span>Moderado (5)</span>
                              <span>Intenso (10)</span>
                            </div>
                          </div>

                          <div className="mb-6">
                            <label className="block text-[13px] font-medium text-text-primary mb-2">¿Querés agregar algo más? (opcional)</label>
                            <textarea 
                              value={notes} onChange={(e) => setNotes(e.target.value)}
                              placeholder="Ej: Me molestó un poco al bajar..."
                              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent min-h-[80px] resize-none"
                              maxLength={300}
                            />
                          </div>

                          <div className="flex gap-3">
                            <button 
                              onClick={() => setReportingExId(null)}
                              className="flex-1 py-2 rounded-lg text-[13px] font-medium border-[0.5px] border-border bg-transparent text-text-secondary hover:text-text-primary"
                              disabled={isSubmitting}
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => handleSubmitReport(ex, currentSession.id)}
                              className="flex-1 py-2 rounded-lg text-[13px] font-medium bg-accent text-bg-primary hover:opacity-90"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? 'Guardando...' : 'Guardar Reporte'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* VIDEO MODAL FULLSCREEN */}
      {activeVideo && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center">
          <div className="w-full flex justify-end p-4">
            <button onClick={() => setActiveVideo(null)} className="text-white p-2 bg-white/10 rounded-full hover:bg-white/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="w-full max-w-[800px] aspect-video">
            <iframe 
              width="100%" 
              height="100%" 
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&playsinline=1`}
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
          <div className="h-20"></div>
        </div>
      )}
    </div>
  )
}
