'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

interface PlanSession { id: string; name: string }
interface PlanData { sessions: PlanSession[] }
interface Plan { id: string; name: string; start_date: string | null; plan_data: unknown }

interface ScheduledSession {
  id: string
  plan_id: string
  session_id: string
  session_name: string
  plan_name: string
  scheduled_date: string
  week: number
  completed: boolean
}

interface Props {
  patientId: string
  userId: string
  patientName: string
  plans: Plan[]
  unassignedPlans: { id: string; name: string }[]
  initialScheduled: ScheduledSession[]
}

const DAYS_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MONTHS_ES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay()
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toDateStr(d: Date): string { return d.toISOString().split('T')[0] }
function todayStr(): string { return toDateStr(new Date()) }
function padNum(n: number): string { return String(n).padStart(2, '0') }
function makeDateStr(year: number, month: number, day: number): string {
  return `${year}-${padNum(month + 1)}-${padNum(day)}`
}

function getMonthInfo(year: number, month: number) {
  return {
    daysInMonth: new Date(year, month + 1, 0).getDate(),
    firstDayOfWeek: (new Date(year, month, 1).getDay() + 6) % 7, // Mon=0
  }
}

function calcWeek(scheduledDate: string, planStartDate: string | null): number {
  if (!planStartDate) return 1
  const diffDays = Math.floor(
    (new Date(scheduledDate + 'T00:00:00').getTime() - new Date(planStartDate + 'T00:00:00').getTime())
    / 86400000
  )
  return diffDays < 0 ? 1 : Math.min(Math.floor(diffDays / 7) + 1, 4)
}

function formatDay(date: Date): string {
  return `${date.getDate()} ${MONTHS_ES[date.getMonth()].slice(0, 3)}`
}

export default function CalendarioClient({ patientId, userId, patientName, plans, unassignedPlans, initialScheduled }: Props) {
  const supabaseRef = useRef(createClient())

  // ── Week view ──────────────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()))
  const [scheduled, setScheduled] = useState<ScheduledSession[]>(initialScheduled)
  const today = todayStr()
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd = addDays(weekStart, 6)
  const weekLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.getDate()}–${weekEnd.getDate()} de ${MONTHS_ES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
      : `${weekStart.getDate()} ${MONTHS_ES_SHORT[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTHS_ES_SHORT[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`

  const sessionsForDay = (d: string) => scheduled.filter(s => s.scheduled_date === d)

  // ── Bulk scheduling ────────────────────────────────────────────────────────
  const plan = plans[0] ?? null
  const planSessions: PlanSession[] = (() => {
    if (!plan?.plan_data) return []
    const d = plan.plan_data as Record<string, unknown>
    if (!Array.isArray(d.sessions)) return []
    return (d as unknown as PlanData).sessions.filter(s => s.name?.trim())
  })()

  const [bulkSessionId, setBulkSessionId] = useState('')
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [calView, setCalView] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  })
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkSuccess, setBulkSuccess] = useState(false)

  // ── Linking unassigned plan ────────────────────────────────────────────────
  const [linkingPlanId, setLinkingPlanId] = useState<string | null>(null)

  const handleLinkPlan = async (planId: string) => {
    setLinkingPlanId(planId)
    await supabaseRef.current.from('exercise_plans').update({ patient_id: patientId }).eq('id', planId)
    window.location.reload()
  }

  const { daysInMonth, firstDayOfWeek } = getMonthInfo(calView.year, calView.month)

  const prevMonth = () => setCalView(v =>
    v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })
  const nextMonth = () => setCalView(v =>
    v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })

  const toggleDate = (d: string) => {
    setSelectedDates(prev => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d); else next.add(d)
      return next
    })
  }

  const isAlreadyScheduled = (d: string) =>
    bulkSessionId ? scheduled.some(s => s.scheduled_date === d && s.session_id === bulkSessionId) : false

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    await supabaseRef.current.from('scheduled_sessions').delete().eq('id', id)
    setScheduled(prev => prev.filter(s => s.id !== id))
  }

  const handleToggleComplete = async (s: ScheduledSession) => {
    const { data } = await supabaseRef.current
      .from('scheduled_sessions')
      .update({ completed: !s.completed })
      .eq('id', s.id)
      .select()
      .single()
    if (data) setScheduled(prev => prev.map(x => x.id === s.id ? data : x))
  }

  const handleBulkSchedule = async () => {
    if (!plan || !bulkSessionId || selectedDates.size === 0) return
    const session = planSessions.find(s => s.id === bulkSessionId)
    if (!session) return

    setBulkSaving(true)
    const inserts = Array.from(selectedDates).sort().map(d => ({
      user_id: userId,
      patient_id: patientId,
      plan_id: plan.id,
      session_id: session.id,
      session_name: session.name,
      plan_name: plan.name,
      scheduled_date: d,
      week: calcWeek(d, plan.start_date),
    }))

    const { data, error } = await supabaseRef.current
      .from('scheduled_sessions')
      .insert(inserts)
      .select()

    if (!error && data) {
      setScheduled(prev =>
        [...prev, ...data].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      )
      setSelectedDates(new Set())
      setBulkSuccess(true)
      setTimeout(() => setBulkSuccess(false), 2500)
    }
    setBulkSaving(false)
  }

  const sortedSelected = Array.from(selectedDates).sort()

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── SEMANA ACTUAL ──────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setWeekStart(d => addDays(d, -7))} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">←</button>
          <button onClick={() => setWeekStart(d => addDays(d, 7))} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">→</button>
          <span className="text-[14px] font-medium flex-1 px-1">{weekLabel}</span>
          <button onClick={() => setWeekStart(getMondayOf(new Date()))} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">Hoy</button>
        </div>

        {/* Desktop */}
        <div className="hidden sm:grid sm:grid-cols-7 gap-2">
          {weekDays.map((day, i) => {
            const d = toDateStr(day)
            const isToday = d === today
            const isPast = d < today
            const ds = sessionsForDay(d)
            return (
              <div key={d} className={`rounded-xl border-[0.5px] p-3 min-h-[100px] flex flex-col ${isToday ? 'border-accent bg-bg-secondary' : 'border-border bg-bg-primary'}`}>
                <div className="mb-2">
                  <div className={`text-[11px] uppercase tracking-[0.05em] ${isToday ? 'text-accent' : 'text-text-secondary'}`}>{DAYS_WEEK[i]}</div>
                  <div className={`text-[14px] font-medium ${isToday ? 'text-accent' : isPast ? 'text-text-secondary' : 'text-text-primary'}`}>{formatDay(day)}</div>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  {ds.map(s => (
                    <div key={s.id} className={`rounded-lg px-2 py-1 border-[0.5px] group ${s.completed ? 'bg-bg-secondary border-border opacity-50' : 'bg-accent/10 border-accent/30'}`}>
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className={`text-[11px] font-medium leading-tight truncate cursor-pointer ${s.completed ? 'line-through text-text-secondary' : 'text-text-primary'}`} onClick={() => handleToggleComplete(s)}>{s.session_name}</div>
                          <div className="text-[10px] text-text-secondary">S{s.week}</div>
                        </div>
                        <button onClick={() => handleDelete(s.id)} className="text-[10px] text-text-secondary opacity-0 group-hover:opacity-100 hover:text-warning shrink-0 ml-1">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Mobile */}
        <div className="sm:hidden divide-y-[0.5px] divide-border border-[0.5px] border-border rounded-xl overflow-hidden">
          {weekDays.map((day, i) => {
            const d = toDateStr(day)
            const isToday = d === today
            const isPast = d < today
            const ds = sessionsForDay(d)
            return (
              <div key={d} className={isToday ? 'bg-bg-secondary' : 'bg-bg-primary'}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-7 text-[13px] font-medium shrink-0 ${isToday ? 'text-accent' : isPast ? 'text-text-secondary' : 'text-text-primary'}`}>{DAYS_WEEK[i]}</div>
                  <div className={`text-[13px] shrink-0 ${isToday ? 'text-accent font-medium' : isPast ? 'text-text-secondary' : 'text-text-primary'}`}>{formatDay(day)}</div>
                  <div className="flex-1 flex flex-wrap gap-1 min-w-0">
                    {ds.map(s => (
                      <button key={s.id} onClick={() => handleToggleComplete(s)} className={`text-[11px] px-2 py-0.5 rounded-full border-[0.5px] ${s.completed ? 'border-border text-text-secondary line-through opacity-50' : 'bg-accent/10 border-accent/30 text-accent'}`}>{s.session_name}</button>
                    ))}
                  </div>
                  {ds.length > 0 && (
                    <button onClick={() => ds.forEach(s => handleDelete(s.id))} className="text-[11px] text-text-secondary hover:text-warning shrink-0">✕</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── PROGRAMAR SESIONES ─────────────────────────────── */}
      {plan && planSessions.length > 0 ? (
        <section className="bg-bg-secondary border-[0.5px] border-border rounded-2xl p-5 sm:p-6">
          <h2 className="text-[18px] font-medium mb-1">Programar sesiones</h2>
          <p className="text-[13px] text-text-secondary mb-5">Elegí la sesión y marcá los días en el calendario.</p>

          {/* Session chips */}
          <div className="mb-5">
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Sesión a programar</label>
            <div className="flex flex-wrap gap-2">
              {planSessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setBulkSessionId(s.id); setSelectedDates(new Set()) }}
                  className={`px-3 py-1.5 rounded-full border-[0.5px] text-[13px] font-medium transition-all ${bulkSessionId === s.id ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border text-text-secondary hover:border-accent hover:text-text-primary'}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {bulkSessionId && (
            <>
              {/* Month calendar */}
              <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors">←</button>
                  <span className="text-[15px] font-medium">{MONTHS_ES[calView.month]} {calView.year}</span>
                  <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors">→</button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DAYS_WEEK.map(d => (
                    <div key={d} className="h-8 flex items-center justify-center text-[11px] text-text-secondary font-medium">{d.slice(0, 1)}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1
                    const d = makeDateStr(calView.year, calView.month, day)
                    const isSelected = selectedDates.has(d)
                    const alreadyScheduled = isAlreadyScheduled(d)
                    const isPast = d < today
                    return (
                      <button
                        key={day}
                        onClick={() => { if (!isPast && !alreadyScheduled) toggleDate(d) }}
                        disabled={isPast}
                        className={`h-9 rounded-lg text-[13px] font-medium transition-colors ${
                          alreadyScheduled ? 'bg-accent/20 text-accent cursor-default' :
                          isSelected ? 'bg-accent text-bg-primary' :
                          isPast ? 'text-text-secondary/30 cursor-default' :
                          'hover:bg-bg-secondary text-text-primary'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Action row */}
              {selectedDates.size > 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-text-primary">
                      {selectedDates.size} día{selectedDates.size !== 1 ? 's' : ''} seleccionado{selectedDates.size !== 1 ? 's' : ''}
                    </p>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      {sortedSelected.slice(0, 5).map(d =>
                        new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                      ).join(', ')}
                      {sortedSelected.length > 5 && ` +${sortedSelected.length - 5} más`}
                    </p>
                  </div>
                  <button
                    onClick={handleBulkSchedule}
                    disabled={bulkSaving}
                    className="shrink-0 bg-accent text-bg-primary px-5 py-2.5 rounded-xl text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    {bulkSaving ? 'Guardando...' : bulkSuccess ? '✓ Guardado' : `Programar ${selectedDates.size} sesión${selectedDates.size !== 1 ? 'es' : ''}`}
                  </button>
                </div>
              ) : (
                <p className="text-[12px] text-text-secondary">Tocá los días en los que querés programar esta sesión.</p>
              )}
            </>
          )}
        </section>
      ) : unassignedPlans.length > 0 ? (
        <section className="bg-bg-secondary border-[0.5px] border-border rounded-2xl p-5 sm:p-6">
          <h2 className="text-[18px] font-medium mb-1">Vincular plan existente</h2>
          <p className="text-[13px] text-text-secondary mb-5">Tenés planes sin paciente asignado. Vinculá uno a {patientName}.</p>
          <div className="space-y-2">
            {unassignedPlans.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-4 bg-bg-primary border-[0.5px] border-border rounded-xl px-4 py-3">
                <span className="text-[14px] text-text-primary">{p.name}</span>
                <button
                  onClick={() => handleLinkPlan(p.id)}
                  disabled={linkingPlanId !== null}
                  className="shrink-0 bg-accent text-bg-primary px-4 py-1.5 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {linkingPlanId === p.id ? 'Vinculando...' : 'Vincular'}
                </button>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-text-secondary mt-4">
            O{' '}
            <a href={`/dashboard/ejercicios/plan?paciente=${patientId}`} className="underline hover:text-text-primary">
              creá un plan nuevo para {patientName}
            </a>
            .
          </p>
        </section>
      ) : (
        <div className="text-center py-12 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
          <p className="text-[15px] font-medium text-text-primary mb-1">Sin plan asignado</p>
          <p className="text-[13px] text-text-secondary mb-4">Creá primero un plan de ejercicios para este paciente.</p>
          <a href={`/dashboard/ejercicios/plan?paciente=${patientId}`} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 inline-block no-underline">
            Crear plan para {patientName}
          </a>
        </div>
      )}

    </div>
  )
}
