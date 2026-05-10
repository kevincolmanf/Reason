'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface PlanSession { id: string; name: string }
interface PlanData { sessions: PlanSession[] }
interface Plan { id: string; name: string; plan_data: unknown }

interface ScheduledSession {
  id: string
  plan_id: string
  session_id: string
  session_name: string
  plan_name: string
  scheduled_date: string
  completed: boolean
}

interface Props {
  patientId: string
  userId: string
  plans: Plan[]
  initialScheduled: ScheduledSession[]
}

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

function todayStr(): string {
  return toDateStr(new Date())
}

function formatDayLabel(date: Date): string {
  return `${date.getDate()} ${MONTHS_ES[date.getMonth()].slice(0, 3)}`
}

export default function CalendarioClient({ patientId, userId, plans, initialScheduled }: Props) {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()))
  const [scheduled, setScheduled] = useState<ScheduledSession[]>(initialScheduled)
  const [modalDate, setModalDate] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const prevWeek = () => setWeekStart(d => addDays(d, -7))
  const nextWeek = () => setWeekStart(d => addDays(d, 7))
  const goToday = () => setWeekStart(getMondayOf(new Date()))

  const weekLabel = (() => {
    const end = addDays(weekStart, 6)
    if (weekStart.getMonth() === end.getMonth()) {
      return `${weekStart.getDate()}–${end.getDate()} de ${MONTHS_ES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    }
    return `${weekStart.getDate()} ${MONTHS_ES[weekStart.getMonth()].slice(0,3)} – ${end.getDate()} ${MONTHS_ES[end.getMonth()].slice(0,3)} ${end.getFullYear()}`
  })()

  const sessionsForDay = (dateStr: string) =>
    scheduled.filter(s => s.scheduled_date === dateStr)

  const selectedPlan = plans.find(p => p.id === selectedPlanId)
  const planSessions: PlanSession[] = (() => {
    if (!selectedPlan?.plan_data) return []
    const d = selectedPlan.plan_data as Record<string, unknown>
    if (!Array.isArray(d.sessions)) return []
    return (d as unknown as PlanData).sessions
  })()

  const openModal = (dateStr: string) => {
    setModalDate(dateStr)
    setSelectedPlanId(plans[0]?.id ?? '')
    setSelectedSessionId('')
  }

  const handleSchedule = async () => {
    if (!modalDate || !selectedPlanId || !selectedSessionId) return
    const plan = plans.find(p => p.id === selectedPlanId)
    const session = planSessions.find(s => s.id === selectedSessionId)
    if (!plan || !session) return

    setSaving(true)
    const { data, error } = await supabase
      .from('scheduled_sessions')
      .insert({
        user_id: userId,
        patient_id: patientId,
        plan_id: selectedPlanId,
        session_id: selectedSessionId,
        session_name: session.name,
        plan_name: plan.name,
        scheduled_date: modalDate,
      })
      .select()
      .single()

    if (!error && data) {
      setScheduled(prev => [...prev, data].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)))
      setModalDate(null)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('scheduled_sessions').delete().eq('id', id)
    setScheduled(prev => prev.filter(s => s.id !== id))
  }

  const handleToggleComplete = async (s: ScheduledSession) => {
    const { data } = await supabase
      .from('scheduled_sessions')
      .update({ completed: !s.completed })
      .eq('id', s.id)
      .select()
      .single()
    if (data) setScheduled(prev => prev.map(x => x.id === s.id ? data : x))
  }

  const today = todayStr()

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={prevWeek} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">←</button>
        <button onClick={nextWeek} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">→</button>
        <span className="text-[14px] font-medium flex-1">{weekLabel}</span>
        <button onClick={goToday} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">Hoy</button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {weekDays.map((day, i) => {
          const dateStr = toDateStr(day)
          const isToday = dateStr === today
          const isPast = dateStr < today
          const daySessions = sessionsForDay(dateStr)

          return (
            <div
              key={dateStr}
              className={`rounded-xl border-[0.5px] p-3 min-h-[120px] flex flex-col ${
                isToday
                  ? 'border-accent bg-bg-secondary'
                  : 'border-border bg-bg-primary'
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className={`text-[11px] uppercase tracking-[0.05em] ${isToday ? 'text-accent' : 'text-text-secondary'}`}>
                    {DAYS_ES[i]}
                  </div>
                  <div className={`text-[14px] font-medium ${isToday ? 'text-accent' : isPast ? 'text-text-secondary' : 'text-text-primary'}`}>
                    {formatDayLabel(day)}
                  </div>
                </div>
                <button
                  onClick={() => openModal(dateStr)}
                  className="text-[18px] leading-none text-text-secondary hover:text-accent transition-colors"
                  title="Programar sesión"
                >
                  +
                </button>
              </div>

              {/* Sessions */}
              <div className="flex flex-col gap-1.5 flex-1">
                {daySessions.map(s => (
                  <div
                    key={s.id}
                    className={`rounded-lg px-2 py-1.5 border-[0.5px] group relative ${
                      s.completed
                        ? 'bg-bg-secondary border-border opacity-50'
                        : 'bg-accent/10 border-accent/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-[12px] font-medium leading-tight truncate cursor-pointer ${s.completed ? 'line-through text-text-secondary' : 'text-text-primary'}`}
                          onClick={() => handleToggleComplete(s)}
                          title={s.completed ? 'Marcar como pendiente' : 'Marcar como completado'}
                        >
                          {s.session_name}
                        </div>
                        <div className="text-[11px] text-text-secondary truncate">{s.plan_name}</div>
                      </div>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-[11px] text-text-secondary opacity-0 group-hover:opacity-100 hover:text-warning transition-all shrink-0 ml-1"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {plans.length === 0 && (
        <div className="mt-8 text-center py-10 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
          <p className="text-[14px] text-text-secondary">Este paciente no tiene planes de ejercicio asignados.</p>
        </div>
      )}

      {/* Modal */}
      {modalDate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setModalDate(null)}>
          <div className="bg-bg-primary border-[0.5px] border-border rounded-2xl p-6 w-full max-w-[380px]" onClick={e => e.stopPropagation()}>
            <h2 className="text-[16px] font-medium mb-1">Programar sesión</h2>
            <p className="text-[13px] text-text-secondary mb-5">
              {new Date(modalDate + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={e => { setSelectedPlanId(e.target.value); setSelectedSessionId('') }}
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Sesión</label>
                <select
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                >
                  <option value="">— Elegir sesión —</option>
                  {planSessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha</label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={e => setModalDate(e.target.value)}
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSchedule}
                disabled={saving || !selectedSessionId}
                className="bg-accent text-bg-primary px-5 py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 flex-1"
              >
                {saving ? 'Guardando...' : 'Programar'}
              </button>
              <button
                onClick={() => setModalDate(null)}
                className="text-text-secondary px-4 py-2.5 rounded-lg text-[13px] hover:text-text-primary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
