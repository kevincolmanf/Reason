'use client'

import { useState, useRef, useEffect } from 'react'
import type { DaySession } from './page'

// ─── Legacy types ────────────────────────────────────────────────────────────

interface LegacyWeekData {
  week: number
  reps: string
  sets: string
  load: string
  eav: string
  rpe: string
  rest: string
}

interface LegacyExercise {
  id: string
  exercise_name: string
  youtube_url: string
  group?: string
  weeks: LegacyWeekData[]
}

interface LegacyBlock {
  id: string
  name: string
  exercises: LegacyExercise[]
}

interface LegacySession {
  id: string
  name: string
  blocks: LegacyBlock[]
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  daySessions: DaySession[]
  legacyPlanData: { sessions: LegacySession[] } | null
  legacyActiveWeek: number   // 0-based
  legacyStartDate: string | null
  token: string
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function getMondayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return monday.toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00')
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function formatDateES(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatShortDateES(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

// ─── Shared utility ───────────────────────────────────────────────────────────

function getYoutubeId(url: string): string | null {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

// ─── Exercise card (new system) ───────────────────────────────────────────────

interface NewExercise {
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
  recommendations?: string
}

function ExerciseCard({
  ex,
  onVideo,
  onLog,
}: {
  ex: NewExercise
  onVideo: (id: string) => void
  onLog: (ex: NewExercise) => void
}) {
  const ytId = getYoutubeId(ex.youtube_url)
  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {ex.group && (
            <span className="text-[11px] font-mono font-medium bg-accent/10 border-[0.5px] border-accent/40 text-accent rounded px-1.5 py-0.5 shrink-0">
              {ex.group}
            </span>
          )}
          <h4 className="text-[15px] font-medium text-text-primary leading-[1.3]">{ex.exercise_name}</h4>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {ytId && (
            <button
              onClick={() => onVideo(ytId)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-[0.5px] border-border bg-bg-secondary hover:border-accent hover:text-accent text-text-secondary transition-all text-[12px] font-medium"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Ver
            </button>
          )}
          <button
            onClick={() => onLog(ex)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-[0.5px] border-border bg-bg-secondary hover:border-accent hover:text-accent text-text-secondary transition-all text-[12px] font-medium"
          >
            Reportar
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-2">
        <div>
          <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-0.5">Series × Reps</div>
          <div className="text-[13px] font-medium text-accent">{ex.sets || '-'} × {ex.reps || '-'}</div>
        </div>
        <div>
          <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-0.5">Carga</div>
          <div className="text-[13px] font-medium">{ex.load || '-'}</div>
        </div>
        <div>
          <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-0.5">Descanso</div>
          <div className="text-[13px] font-medium">{ex.rest || '-'}</div>
        </div>
      </div>
      {ex.recommendations && (
        <div className="mt-3 px-3 py-2 bg-accent/5 border-[0.5px] border-accent/20 rounded-lg">
          <div className="text-[10px] text-accent uppercase tracking-[0.05em] mb-0.5">Recomendaciones</div>
          <div className="text-[13px] text-text-primary">{ex.recommendations}</div>
        </div>
      )}
    </div>
  )
}

// ─── Session blocks renderer (new system) ─────────────────────────────────────

function SessionBlocks({
  session,
  onVideo,
  onLog,
}: {
  session: DaySession
  onVideo: (id: string) => void
  onLog: (ex: NewExercise, session: DaySession) => void
}) {
  const blocks = session.session_data?.blocks ?? []
  const activeBlocks = blocks.filter(b => b.exercises.length > 0)
  if (activeBlocks.length === 0) {
    return <p className="text-[14px] text-text-secondary py-2">Esta sesión no tiene ejercicios asignados.</p>
  }
  return (
    <div className="space-y-4">
      {activeBlocks.map(block => (
        <div key={block.id} className="bg-bg-primary border-[0.5px] border-border rounded-2xl overflow-hidden">
          <div className="bg-bg-secondary px-4 py-3 border-b-[0.5px] border-border">
            <h3 className="text-[13px] font-medium text-text-primary uppercase tracking-[0.05em]">{block.name}</h3>
            {block.exercises.filter(ex => ex.group).length >= 2 && (
              <p className="text-[11px] text-text-secondary mt-0.5">
                Ejercicios con el mismo número van en superserie — realizalos alternados
              </p>
            )}
          </div>
          <div className="divide-y-[0.5px] divide-border">
            {block.exercises.map(ex => (
              <ExerciseCard
                key={ex.id}
                ex={ex}
                onVideo={onVideo}
                onLog={(e) => onLog(e, session)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Log modal ────────────────────────────────────────────────────────────────

interface LogState {
  ex: NewExercise
  session: DaySession
  rpe: string
  eva: string
  notes: string
  loading: boolean
  done: boolean
  error: string | null
}

function LogModal({
  state,
  onClose,
  onChange,
  onSubmit,
}: {
  state: LogState
  onClose: () => void
  onChange: (patch: Partial<LogState>) => void
  onSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl w-full max-w-[400px] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-medium text-text-primary">Reportar ejercicio</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <p className="text-[13px] text-text-secondary">{state.ex.exercise_name}</p>

        {state.done ? (
          <p className="text-[14px] text-accent text-center py-4">¡Registrado correctamente!</p>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] text-text-secondary uppercase tracking-[0.05em] block mb-1">
                  RPE (esfuerzo percibido, 1–10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={state.rpe}
                  onChange={e => onChange({ rpe: e.target.value })}
                  className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[14px] text-text-primary outline-none focus:border-accent"
                  placeholder="ej: 7"
                />
              </div>
              <div>
                <label className="text-[12px] text-text-secondary uppercase tracking-[0.05em] block mb-1">
                  Dolor (EVA, 0–10)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={state.eva}
                  onChange={e => onChange({ eva: e.target.value })}
                  className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[14px] text-text-primary outline-none focus:border-accent"
                  placeholder="ej: 2"
                />
              </div>
              <div>
                <label className="text-[12px] text-text-secondary uppercase tracking-[0.05em] block mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={state.notes}
                  onChange={e => onChange({ notes: e.target.value })}
                  rows={3}
                  className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[14px] text-text-primary outline-none focus:border-accent resize-none"
                  placeholder="Algún comentario..."
                />
              </div>
            </div>
            {state.error && <p className="text-[13px] text-warning">{state.error}</p>}
            <button
              onClick={onSubmit}
              disabled={state.loading}
              className="w-full bg-accent text-white rounded-lg py-2.5 text-[14px] font-medium disabled:opacity-50 transition-opacity"
            >
              {state.loading ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── NEW SYSTEM VIEWER ────────────────────────────────────────────────────────

function NewSystemViewer({ daySessions, token }: { daySessions: DaySession[]; token: string }) {
  const today = getTodayStr()
  const currentMonday = getMondayOfWeek(today)

  const [viewWeekStart, setViewWeekStart] = useState<string>(currentMonday)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [activeVideo, setActiveVideo] = useState<string | null>(null)
  const [logState, setLogState] = useState<LogState | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  // Build a map for fast date lookup
  const sessionByDate = new Map<string, DaySession>()
  for (const s of daySessions) {
    sessionByDate.set(s.scheduled_date, s)
  }

  // Today's session
  const todaySession = sessionByDate.get(today) ?? null

  // Next session after today
  const nextSession = daySessions.find(s => s.scheduled_date > today) ?? null

  // Week strip days (Mon–Sun of viewWeekStart)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(viewWeekStart, i))
  const viewWeekEnd = addDays(viewWeekStart, 6)

  // Weeks with sessions beyond current view week (for "Próximas semanas")
  const futureWeekStarts = (() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const s of daySessions) {
      if (s.scheduled_date > viewWeekEnd) {
        const mon = getMondayOfWeek(s.scheduled_date)
        if (!seen.has(mon)) {
          seen.add(mon)
          result.push(mon)
        }
      }
    }
    return result
  })()

  // Count sessions per week
  function countSessionsInWeek(mondayStr: string): number {
    const end = addDays(mondayStr, 6)
    return daySessions.filter(s => s.scheduled_date >= mondayStr && s.scheduled_date <= end).length
  }

  // Day names short
  const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  // Selected date session (only if different from today)
  const selectedSession =
    selectedDate && selectedDate !== today ? (sessionByDate.get(selectedDate) ?? null) : null

  // Log handler
  async function handleLogSubmit() {
    if (!logState) return
    setLogState(prev => prev ? { ...prev, loading: true, error: null } : null)
    try {
      const res = await fetch(`/api/plan/${token}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_id: logState.ex.exercise_id,
          exercise_name: logState.ex.exercise_name,
          session_id: logState.session.id,
          week: 1,
          rpe: logState.rpe ? Number(logState.rpe) : null,
          eva: logState.eva ? Number(logState.eva) : null,
          notes: logState.notes || null,
          scheduled_date: logState.session.scheduled_date,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setLogState(prev => prev ? { ...prev, loading: false, done: true } : null)
      setTimeout(() => setLogState(null), 1500)
    } catch {
      setLogState(prev => prev ? { ...prev, loading: false, error: 'No se pudo guardar. Intentá de nuevo.' } : null)
    }
  }

  function openLog(ex: NewExercise, session: DaySession) {
    setLogState({ ex, session, rpe: '', eva: '', notes: '', loading: false, done: false, error: null })
  }

  return (
    <div className="pb-8 space-y-8">

      {/* ─── HOY ─────────────────────────────────────────────────────────── */}
      <section ref={topRef}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-[0.06em]">
            Hoy · <span className="capitalize">{formatDateES(today)}</span>
          </h2>
        </div>

        {todaySession ? (
          <div>
            {todaySession.session_name && (
              <p className="text-[16px] font-medium text-text-primary mb-3">{todaySession.session_name}</p>
            )}
            <SessionBlocks session={todaySession} onVideo={setActiveVideo} onLog={openLog} />
          </div>
        ) : (
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 text-center space-y-2">
            <p className="text-[14px] text-text-secondary">No tenés sesión para hoy.</p>
            {nextSession && (
              <p className="text-[13px] text-text-secondary">
                Próxima sesión:{' '}
                <span className="text-text-primary font-medium capitalize">
                  {formatDateES(nextSession.scheduled_date)}
                </span>
                {nextSession.session_name && (
                  <span className="text-text-secondary"> · {nextSession.session_name}</span>
                )}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ─── STRIP DE LA SEMANA ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-[0.06em]">
            {viewWeekStart === currentMonday ? 'Esta semana' : `Semana del ${formatShortDateES(viewWeekStart)}`}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setViewWeekStart(prev => addDays(prev, -7))
                setSelectedDate(null)
              }}
              className="p-1.5 rounded-lg border-[0.5px] border-border text-text-secondary hover:border-accent hover:text-accent transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button
              onClick={() => {
                setViewWeekStart(prev => addDays(prev, 7))
                setSelectedDate(null)
              }}
              className="p-1.5 rounded-lg border-[0.5px] border-border text-text-secondary hover:border-accent hover:text-accent transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((dayStr, i) => {
            const hasSession = sessionByDate.has(dayStr)
            const isToday = dayStr === today
            const isSelected = dayStr === selectedDate
            const dayNum = new Date(dayStr + 'T00:00:00').getDate()

            return (
              <button
                key={dayStr}
                onClick={() => {
                  if (!hasSession) return
                  setSelectedDate(prev => (prev === dayStr ? null : dayStr))
                }}
                disabled={!hasSession}
                className={[
                  'flex flex-col items-center py-2.5 rounded-xl border-[0.5px] transition-all relative',
                  isToday && !isSelected
                    ? 'bg-accent/10 border-accent/40 text-accent'
                    : isSelected
                    ? 'bg-accent/20 border-accent text-accent'
                    : hasSession
                    ? 'bg-bg-secondary border-border hover:border-accent/50 text-text-primary cursor-pointer'
                    : 'bg-transparent border-transparent text-text-secondary opacity-40 cursor-default',
                ].join(' ')}
              >
                <span className="text-[10px] font-medium uppercase tracking-[0.04em] mb-1">{DAY_SHORT[i]}</span>
                <span className="text-[14px] font-medium">{dayNum}</span>
                {hasSession && (
                  <span className={`mt-1 w-1 h-1 rounded-full ${isToday || isSelected ? 'bg-accent' : 'bg-accent/60'}`} />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ─── SESIÓN DEL DÍA SELECCIONADO ─────────────────────────────────── */}
      {selectedSession && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-[0.06em]">
              <span className="capitalize">{formatDateES(selectedDate!)}</span>
            </h2>
          </div>
          {selectedSession.session_name && (
            <p className="text-[16px] font-medium text-text-primary mb-3">{selectedSession.session_name}</p>
          )}
          <SessionBlocks session={selectedSession} onVideo={setActiveVideo} onLog={openLog} />
        </section>
      )}

      {/* ─── PRÓXIMAS SEMANAS ─────────────────────────────────────────────── */}
      {futureWeekStarts.length > 0 && (
        <section>
          <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-[0.06em] mb-3">
            Próximas semanas
          </h2>
          <div className="space-y-2">
            {futureWeekStarts.map(mon => {
              const sun = addDays(mon, 6)
              const count = countSessionsInWeek(mon)
              return (
                <button
                  key={mon}
                  onClick={() => {
                    setViewWeekStart(mon)
                    setSelectedDate(null)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-bg-secondary border-[0.5px] border-border rounded-xl hover:border-accent/50 transition-all text-left"
                >
                  <span className="text-[14px] text-text-primary">
                    Semana del {formatShortDateES(mon)} – {formatShortDateES(sun)}
                  </span>
                  <span className="text-[12px] text-text-secondary">
                    {count} {count === 1 ? 'sesión' : 'sesiones'}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ─── VIDEO MODAL ─────────────────────────────────────────────────── */}
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
              title="Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          <div className="h-20"></div>
        </div>
      )}

      {/* ─── LOG MODAL ───────────────────────────────────────────────────── */}
      {logState && (
        <LogModal
          state={logState}
          onClose={() => setLogState(null)}
          onChange={patch => setLogState(prev => prev ? { ...prev, ...patch } : null)}
          onSubmit={handleLogSubmit}
        />
      )}

      {/* ─── BOTÓN VOLVER ARRIBA ─────────────────────────────────────────── */}
      <button
        onClick={() => {
          setViewWeekStart(currentMonday)
          setSelectedDate(null)
          topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
        className="fixed bottom-6 right-6 w-12 h-12 bg-accent text-white rounded-full shadow-lg flex items-center justify-center hover:bg-accent/90 active:scale-95 transition-all z-40"
        aria-label="Volver a Esta semana"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
    </div>
  )
}

// ─── LEGACY VIEWER ───────────────────────────────────────────────────────────

function LegacyViewer({
  planData,
  activeWeek,
  startDate,
  token,
}: {
  planData: { sessions: LegacySession[] }
  activeWeek: number
  startDate: string | null
  token: string
}) {
  const [activeSession, setActiveSession] = useState(() => {
    const firstValid = planData.sessions.findIndex(s => s.blocks.some(b => b.exercises.length > 0))
    return firstValid !== -1 ? firstValid : 0
  })
  const [activeVideo, setActiveVideo] = useState<string | null>(null)
  const [logState, setLogState] = useState<{
    ex: LegacyExercise
    weekData: LegacyWeekData
    rpe: string
    eva: string
    notes: string
    loading: boolean
    done: boolean
    error: string | null
  } | null>(null)

  const weekLabel = (() => {
    const weekNum = activeWeek + 1
    if (!startDate) return `Semana ${weekNum}`
    const start = new Date(startDate + 'T00:00:00')
    start.setDate(start.getDate() + activeWeek * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const fmt = (d: Date) => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    return `Semana ${weekNum} · ${fmt(start)} – ${fmt(end)}`
  })()

  const currentSession = planData.sessions[activeSession]
  const activeBlocks = currentSession?.blocks.filter(b => b.exercises.length > 0) || []

  const availableSessions = planData.sessions.filter(s => s.blocks.some(b => b.exercises.length > 0))
  if (availableSessions.length === 0) {
    return <div className="text-center py-12 text-text-secondary">Este plan aún no tiene ejercicios asignados.</div>
  }

  async function handleLegacyLogSubmit() {
    if (!logState) return
    setLogState(prev => prev ? { ...prev, loading: true, error: null } : null)
    try {
      const res = await fetch(`/api/plan/${token}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_id: logState.ex.id,
          exercise_name: logState.ex.exercise_name,
          week: activeWeek + 1,
          rpe: logState.rpe ? Number(logState.rpe) : null,
          eva: logState.eva ? Number(logState.eva) : null,
          notes: logState.notes || null,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setLogState(prev => prev ? { ...prev, loading: false, done: true } : null)
      setTimeout(() => setLogState(null), 1500)
    } catch {
      setLogState(prev => prev ? { ...prev, loading: false, error: 'No se pudo guardar. Intentá de nuevo.' } : null)
    }
  }

  return (
    <div className="pb-4">
      {/* INDICADOR DE SEMANA ACTIVA */}
      <div className="mb-5 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 bg-accent/10 border-[0.5px] border-accent/30 text-accent rounded-full px-3 py-1 text-[12px] font-medium">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          {weekLabel}
        </span>
      </div>

      {/* NAVEGACIÓN SESIONES */}
      <div className="flex gap-2 overflow-x-auto mb-5 pb-1 hide-scrollbar">
        {planData.sessions.map((session, idx) => {
          if (!session.blocks.some(b => b.exercises.length > 0)) return null
          return (
            <button
              key={session.id}
              onClick={() => setActiveSession(idx)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-medium transition-all border-[0.5px] ${
                activeSession === idx
                  ? 'bg-bg-primary text-text-primary border-accent shadow-sm'
                  : 'bg-transparent text-text-secondary border-border hover:border-text-secondary'
              }`}
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
              {block.exercises.filter(ex => ex.group).length >= 2 && (
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Ejercicios con el mismo número van en superserie — realizalos alternados
                </p>
              )}
            </div>
            <div className="divide-y-[0.5px] divide-border">
              {block.exercises.map(ex => {
                const weekData = ex.weeks[activeWeek] ?? ex.weeks[0]
                if (!weekData) return null
                const ytId = getYoutubeId(ex.youtube_url)
                return (
                  <div key={ex.id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {ex.group && (
                          <span className="text-[11px] font-mono font-medium bg-accent/10 border-[0.5px] border-accent/40 text-accent rounded px-1.5 py-0.5 shrink-0">
                            {ex.group}
                          </span>
                        )}
                        <h4 className="text-[15px] font-medium text-text-primary leading-[1.3]">{ex.exercise_name}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {ytId && (
                          <button
                            onClick={() => setActiveVideo(ytId)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-[0.5px] border-border bg-bg-secondary hover:border-accent hover:text-accent text-text-secondary transition-all text-[12px] font-medium"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            Ver
                          </button>
                        )}
                        <button
                          onClick={() => setLogState({ ex, weekData, rpe: '', eva: '', notes: '', loading: false, done: false, error: null })}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-[0.5px] border-border bg-bg-secondary hover:border-accent hover:text-accent text-text-secondary transition-all text-[12px] font-medium"
                        >
                          Reportar
                        </button>
                      </div>
                    </div>
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
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&playsinline=1`}
              title="Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          <div className="h-20"></div>
        </div>
      )}

      {/* LOG MODAL */}
      {logState && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl w-full max-w-[400px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-medium text-text-primary">Reportar ejercicio</h3>
              <button onClick={() => setLogState(null)} className="text-text-secondary hover:text-text-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <p className="text-[13px] text-text-secondary">{logState.ex.exercise_name}</p>
            {logState.done ? (
              <p className="text-[14px] text-accent text-center py-4">¡Registrado correctamente!</p>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-[12px] text-text-secondary uppercase tracking-[0.05em] block mb-1">RPE (esfuerzo percibido, 1–10)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={logState.rpe}
                      onChange={e => setLogState(prev => prev ? { ...prev, rpe: e.target.value } : null)}
                      className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[14px] text-text-primary outline-none focus:border-accent"
                      placeholder="ej: 7"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] text-text-secondary uppercase tracking-[0.05em] block mb-1">Dolor (EVA, 0–10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={logState.eva}
                      onChange={e => setLogState(prev => prev ? { ...prev, eva: e.target.value } : null)}
                      className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[14px] text-text-primary outline-none focus:border-accent"
                      placeholder="ej: 2"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] text-text-secondary uppercase tracking-[0.05em] block mb-1">Notas (opcional)</label>
                    <textarea
                      value={logState.notes}
                      onChange={e => setLogState(prev => prev ? { ...prev, notes: e.target.value } : null)}
                      rows={3}
                      className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[14px] text-text-primary outline-none focus:border-accent resize-none"
                      placeholder="Algún comentario..."
                    />
                  </div>
                </div>
                {logState.error && <p className="text-[13px] text-warning">{logState.error}</p>}
                <button
                  onClick={handleLegacyLogSubmit}
                  disabled={logState.loading}
                  className="w-full bg-accent text-white rounded-lg py-2.5 text-[14px] font-medium disabled:opacity-50 transition-opacity"
                >
                  {logState.loading ? 'Guardando...' : 'Guardar'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export default function PatientPlanViewer({
  daySessions,
  legacyPlanData,
  legacyActiveWeek,
  legacyStartDate,
  token,
}: Props) {
  // New system
  if (daySessions.length > 0) {
    return <NewSystemViewer daySessions={daySessions} token={token} />
  }

  // Legacy system
  if (legacyPlanData && legacyPlanData.sessions?.length > 0) {
    return (
      <LegacyViewer
        planData={legacyPlanData}
        activeWeek={legacyActiveWeek}
        startDate={legacyStartDate}
        token={token}
      />
    )
  }

  // Empty state
  return (
    <div className="text-center py-12 text-text-secondary">
      Este plan aún no tiene ejercicios asignados.
    </div>
  )
}
