'use client'

import { useState } from 'react'
import PatientPlanViewer from '@/app/plan/[token]/PatientPlanViewer'

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

interface PlanData {
  sessions: PlanSession[]
}

interface Plan {
  id: string
  name: string
  plan_data: unknown
  start_date: string | null
  notes: string | null
}

interface RecentSession {
  session_date: string
  activity: string | null
  rpe: number
  load_units: number
  vas_post: number | null
  source: string
}

interface Props {
  patient: { id: string; name: string; user_id: string }
  token: string
  plans: Plan[]
  recentSessions: RecentSession[]
}

interface ExerciseReport {
  rpe: number
  eva: number
  notes: string
}

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

function todayStr() { return new Date().toISOString().split('T')[0] }

function formatShortDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function PatientPortalClient({ token, plans, recentSessions }: Props) {
  const [activePlanIdx, setActivePlanIdx] = useState(0)

  // Session form
  const [formDate, setFormDate] = useState(todayStr())
  const [formActivity, setFormActivity] = useState('')
  const [formDuration, setFormDuration] = useState('')
  const [formRpe, setFormRpe] = useState<number | null>(null)
  const [formVasPost, setFormVasPost] = useState(0)

  // Per-exercise reports (optional)
  const [showExercises, setShowExercises] = useState(false)
  const [expandedEx, setExpandedEx] = useState<Set<string>>(new Set())
  const [exReports, setExReports] = useState<Record<string, ExerciseReport>>({})

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [localSessions, setLocalSessions] = useState<RecentSession[]>(recentSessions)

  const calculatedLoad = formRpe !== null && formDuration ? formRpe * (parseInt(formDuration) || 0) : null

  const activePlan = plans[activePlanIdx] ?? null
  const validPlanData: PlanData | null = (() => {
    if (!activePlan?.plan_data) return null
    const d = activePlan.plan_data as Record<string, unknown>
    if (typeof d !== 'object' || !Array.isArray(d.sessions)) return null
    return d as unknown as PlanData
  })()

  // All exercises from active plan (flattened)
  const allExercises: (PlanExercise & { sessionId: string; sessionName: string })[] = validPlanData
    ? validPlanData.sessions.flatMap(s =>
        s.blocks.flatMap(b =>
          b.exercises.map(ex => ({ ...ex, sessionId: s.id, sessionName: s.name }))
        )
      )
    : []

  function toggleEx(id: string) {
    setExpandedEx(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else {
        next.add(id)
        if (!exReports[id]) setExReports(r => ({ ...r, [id]: { rpe: 5, eva: 0, notes: '' } }))
      }
      return next
    })
  }

  function updateExReport(id: string, field: keyof ExerciseReport, value: number | string) {
    setExReports(r => ({ ...r, [id]: { ...r[id], [field]: value } }))
  }

  const handleSubmit = async () => {
    if (!formDate || !formDuration || formRpe === null) return
    const duration = parseInt(formDuration)
    if (isNaN(duration) || duration <= 0) return

    setSubmitStatus('loading')

    try {
      // 1. Register session
      const res = await fetch('/api/carga/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          session_date: formDate,
          activity: formActivity.trim() || null,
          duration_minutes: duration,
          rpe: formRpe,
          vas_post: formVasPost,
        }),
      })

      if (!res.ok) { setSubmitStatus('error'); setTimeout(() => setSubmitStatus('idle'), 3000); return }

      // 2. Submit per-exercise reports (fire-and-forget, don't block on failures)
      const exercisePromises = [...expandedEx].map(exId => {
        const report = exReports[exId]
        const ex = allExercises.find(e => e.id === exId)
        if (!report || !ex) return Promise.resolve()
        return fetch(`/api/paciente/${token}/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercise_id: ex.id,
            exercise_name: ex.exercise_name,
            session_id: ex.sessionId,
            week: 1,
            rpe: report.rpe,
            eva: report.eva,
            notes: report.notes || null,
          }),
        }).catch(() => {/* ignore individual failures */})
      })
      await Promise.all(exercisePromises)

      // Update local state
      setLocalSessions(prev => [{
        session_date: formDate,
        activity: formActivity.trim() || null,
        rpe: formRpe,
        load_units: formRpe * duration,
        vas_post: formVasPost,
        source: 'patient',
      }, ...prev].slice(0, 30))

      setSubmitStatus('success')
      setFormDate(todayStr())
      setFormActivity('')
      setFormDuration('')
      setFormRpe(null)
      setFormVasPost(0)
      setShowExercises(false)
      setExpandedEx(new Set())
      setExReports({})
      setTimeout(() => setSubmitStatus('idle'), 3000)
    } catch {
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus('idle'), 3000)
    }
  }

  return (
    <div className="space-y-10 pb-12">

      {/* ── PLAN DE EJERCICIOS ─────────────────────────────── */}
      <section>
        <h2 className="text-[20px] font-medium tracking-[-0.01em] mb-4">Mi Plan de Ejercicios</h2>

        {plans.length === 0 ? (
          <div className="text-center py-10 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
            <p className="text-[14px] text-text-secondary">Tu kinesiólogo aún no asoció un plan a tu perfil.</p>
          </div>
        ) : (
          <>
            {plans.length > 1 && (
              <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
                {plans.map((plan, idx) => (
                  <button
                    key={plan.id}
                    onClick={() => setActivePlanIdx(idx)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-medium transition-all border-[0.5px] ${activePlanIdx === idx ? 'bg-bg-primary text-text-primary border-accent shadow-sm' : 'bg-transparent text-text-secondary border-border hover:border-text-secondary'}`}
                  >
                    {plan.name}
                  </button>
                ))}
              </div>
            )}

            {activePlan && (
              <div>
                <div className="mb-4 pb-4 border-b-[0.5px] border-border">
                  <h3 className="text-[20px] font-medium tracking-[-0.01em] text-accent mb-1">{activePlan.name}</h3>
                  {activePlan.start_date && (
                    <p className="text-[12px] text-text-secondary uppercase tracking-[0.05em]">
                      Inicio: {new Date(activePlan.start_date + 'T00:00:00').toLocaleDateString('es-AR')}
                    </p>
                  )}
                  {activePlan.notes && (
                    <div className="mt-3 bg-[#451A1A]/20 border-[0.5px] border-accent/30 rounded-lg p-4 text-[14px] text-text-primary leading-[1.5]">
                      <span className="font-medium text-accent block mb-1">Indicaciones:</span>
                      {activePlan.notes}
                    </div>
                  )}
                </div>

                {validPlanData ? (
                  <PatientPlanViewer planData={validPlanData} token={token} />
                ) : (
                  <div className="text-center py-8 text-text-secondary text-[13px] border-[0.5px] border-dashed border-border rounded-xl">
                    Este plan aún no tiene ejercicios asignados.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── REGISTRAR SESIÓN ───────────────────────────────── */}
      <section>
        <h2 className="text-[20px] font-medium tracking-[-0.01em] mb-1">Registrar sesión</h2>
        <p className="text-[13px] text-text-secondary mb-4">Completá luego de cada entrenamiento.</p>

        <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 space-y-6">

          {/* Fecha */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha</label>
            <input
              type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
              className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
            />
          </div>

          {/* Actividad */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Actividad</label>
            <input
              type="text" value={formActivity} onChange={e => setFormActivity(e.target.value)}
              placeholder="Ej: Fútbol, Gimnasio, Caminata..."
              className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
            />
          </div>

          {/* Duración */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Duración (minutos)</label>
            <input
              type="number" value={formDuration} onChange={e => setFormDuration(e.target.value)}
              min={1} placeholder="60"
              className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
            />
          </div>

          {/* RPE global */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">
              ¿Cómo fue el esfuerzo de la sesión? (0–10)
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
            {formRpe !== null && (
              <p className="text-[13px] text-text-secondary mt-2">{formRpe} — {RPE_LABELS[formRpe]}</p>
            )}
            {calculatedLoad !== null && calculatedLoad > 0 && (
              <p className="text-[12px] text-accent mt-1">Carga: {calculatedLoad} UA</p>
            )}
          </div>

          {/* VAS post */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] uppercase tracking-[0.05em] text-text-secondary">
                ¿Tuviste dolor durante o después? (0–100)
              </label>
              <span className={`text-[14px] font-medium ${vasColor(formVasPost)}`}>{formVasPost}</span>
            </div>
            <input
              type="range" min={0} max={100} value={formVasPost}
              onChange={e => setFormVasPost(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[11px] text-text-secondary mt-0.5">
              <span>Sin dolor</span><span>Máximo dolor</span>
            </div>
          </div>

          {/* Ejercicio por ejercicio (opcional) */}
          {allExercises.length > 0 && (
            <div className="border-t-[0.5px] border-border pt-5">
              <button
                onClick={() => setShowExercises(v => !v)}
                className="w-full flex items-center justify-between text-[13px] text-text-secondary hover:text-text-primary transition-colors"
              >
                <span>Agregar notas por ejercicio <span className="text-text-secondary/60">(opcional)</span></span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform ${showExercises ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {showExercises && (
                <div className="mt-4 space-y-2">
                  {allExercises.map(ex => {
                    const isOpen = expandedEx.has(ex.id)
                    const report = exReports[ex.id]
                    return (
                      <div key={ex.id} className="border-[0.5px] border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggleEx(ex.id)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-bg-secondary transition-colors"
                        >
                          <div>
                            <span className="text-[13px] font-medium text-text-primary">{ex.exercise_name}</span>
                            {ex.sessionName && (
                              <span className="text-[11px] text-text-secondary ml-2">{ex.sessionName}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isOpen && report && (
                              <span className="text-[11px] text-accent">RPE {report.rpe} · EVA {report.eva}</span>
                            )}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              className={`transition-transform text-text-secondary ${isOpen ? 'rotate-180' : ''}`}>
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                        </button>

                        {isOpen && report && (
                          <div className="px-4 pb-4 pt-2 bg-bg-secondary space-y-4">
                            {/* RPE ejercicio */}
                            <div>
                              <div className="flex justify-between items-end mb-1.5">
                                <label className="text-[12px] text-text-secondary">Esfuerzo del ejercicio</label>
                                <span className="text-[13px] font-bold text-accent">{report.rpe} / 10</span>
                              </div>
                              <input type="range" min="1" max="10" value={report.rpe}
                                onChange={e => updateExReport(ex.id, 'rpe', parseInt(e.target.value))}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-accent"
                              />
                              <div className="flex justify-between text-[10px] text-text-secondary mt-0.5">
                                <span>Muy fácil</span><span>Máximo</span>
                              </div>
                            </div>

                            {/* EVA ejercicio */}
                            <div>
                              <div className="flex justify-between items-end mb-1.5">
                                <label className="text-[12px] text-text-secondary">Dolor durante el ejercicio</label>
                                <span className="text-[13px] font-bold text-warning">{report.eva} / 10</span>
                              </div>
                              <input type="range" min="0" max="10" value={report.eva}
                                onChange={e => updateExReport(ex.id, 'eva', parseInt(e.target.value))}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-warning"
                              />
                              <div className="flex justify-between text-[10px] text-text-secondary mt-0.5">
                                <span>Sin dolor</span><span>Intenso</span>
                              </div>
                            </div>

                            {/* Notas */}
                            <div>
                              <label className="block text-[12px] text-text-secondary mb-1.5">Nota (opcional)</label>
                              <textarea
                                value={report.notes}
                                onChange={e => updateExReport(ex.id, 'notes', e.target.value)}
                                placeholder="Ej: Me molestó al bajar..."
                                className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[13px] focus:outline-none focus:border-accent min-h-[60px] resize-none"
                                maxLength={300}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitStatus === 'loading' || !formDate || !formDuration || formRpe === null}
            className="w-full bg-accent text-bg-primary py-3.5 rounded-lg text-[14px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
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
          <h2 className="text-[20px] font-medium tracking-[-0.01em] mb-4">Mis últimas sesiones</h2>
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl divide-y-[0.5px] divide-border overflow-hidden">
            {localSessions.slice(0, 5).map((s, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="text-[12px] text-text-secondary min-w-[52px]">{formatShortDate(s.session_date)}</div>
                <div className="text-[13px] text-text-primary flex-1 truncate">{s.activity || '—'}</div>
                <div className="text-[12px] text-text-secondary whitespace-nowrap">
                  RPE <span className="text-text-primary font-medium">{s.rpe}</span>
                </div>
                <div className="text-[12px] text-text-secondary whitespace-nowrap">
                  <span className="text-text-primary font-medium">{s.load_units}</span> UA
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
