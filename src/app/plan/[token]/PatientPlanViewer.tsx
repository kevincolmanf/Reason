'use client'

import { useState } from 'react'

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

export default function PatientPlanViewer({ planData, initialWeek, initialSessionIdx }: { planData: { sessions: PlanSession[] }, token: string, initialWeek?: number, initialSessionIdx?: number }) {
  const [activeSession, setActiveSession] = useState(() => {
    if (initialSessionIdx !== undefined) return initialSessionIdx
    const firstValid = planData.sessions.findIndex(s => s.blocks.some(b => b.exercises.length > 0))
    return firstValid !== -1 ? firstValid : 0
  })
  const [activeWeek, setActiveWeek] = useState(initialWeek ?? 1)
  const [activeVideo, setActiveVideo] = useState<string | null>(null)

  const currentSession = planData.sessions[activeSession]
  const activeBlocks = currentSession?.blocks.filter(b => b.exercises.length > 0) || []

  const getYoutubeId = (url: string) => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  const availableSessions = planData.sessions.filter(s => s.blocks.some(b => b.exercises.length > 0))
  if (availableSessions.length === 0) {
    return <div className="text-center py-12 text-text-secondary">Este plan aún no tiene ejercicios asignados.</div>
  }

  return (
    <div className="pb-4">
      {/* NAVEGACIÓN SEMANAS */}
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-2 flex justify-between gap-2 mb-6 sticky top-[65px] z-10 shadow-sm backdrop-blur-md">
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
      <div className="flex gap-2 overflow-x-auto mb-5 pb-1 hide-scrollbar">
        {planData.sessions.map((session, idx) => {
          if (!session.blocks.some(b => b.exercises.length > 0)) return null
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

      {/* EJERCICIOS */}
      <div className="space-y-6">
        {activeBlocks.map(block => (
          <div key={block.id} className="bg-bg-primary border-[0.5px] border-border rounded-2xl overflow-hidden">
            <div className="bg-bg-secondary px-4 py-3 border-b-[0.5px] border-border">
              <h3 className="text-[13px] font-medium text-text-primary uppercase tracking-[0.05em]">{block.name}</h3>
            </div>
            <div className="divide-y-[0.5px] divide-border">
              {block.exercises.map(ex => {
                const weekData = ex.weeks.find(w => w.week === activeWeek)
                if (!weekData) return null
                return (
                  <div key={ex.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
                    <div className="flex-shrink-0 w-full sm:w-[110px]">
                      {ex.youtube_url ? (
                        <button
                          onClick={() => setActiveVideo(getYoutubeId(ex.youtube_url))}
                          className="w-full aspect-video bg-bg-secondary border-[0.5px] border-border rounded-lg flex items-center justify-center hover:border-accent hover:text-accent transition-all text-text-secondary group overflow-hidden relative"
                        >
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="opacity-80 group-hover:opacity-100 z-10">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>
                      ) : (
                        <div className="w-full aspect-video bg-bg-secondary border-[0.5px] border-border rounded-lg flex items-center justify-center text-[10px] text-text-secondary uppercase tracking-[0.05em]">Sin video</div>
                      )}
                      {ex.youtube_url && (
                        <a href={ex.youtube_url} target="_blank" rel="noreferrer" className="text-center text-[11px] text-accent mt-1.5 block hover:underline">Ver en YouTube</a>
                      )}
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-[15px] font-medium text-text-primary mb-2 leading-[1.3]">{ex.exercise_name}</h4>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                        <div>
                          <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-0.5">Series × Reps</div>
                          <div className="text-[13px] font-medium text-accent">{weekData.sets || '-'} × {weekData.reps || '-'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-0.5">Carga</div>
                          <div className="text-[13px] font-medium">{weekData.load || '-'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-0.5">Descanso</div>
                          <div className="text-[13px] font-medium">{weekData.rest || '-'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* VIDEO MODAL */}
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
            <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&playsinline=1`} title="Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
          </div>
          <div className="h-20"></div>
        </div>
      )}
    </div>
  )
}
