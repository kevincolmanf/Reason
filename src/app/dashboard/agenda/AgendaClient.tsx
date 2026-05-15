'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import TurnoModal from './TurnoModal'

interface Turno {
  id: string
  patient_name: string
  patient_id: string | null
  professional_id: string | null
  professional_name: string | null
  start_time: string
  end_time: string
  area: string
  status: string
  notes: string | null
}

interface Professional {
  id: string
  full_name: string | null
}

interface Props {
  userId: string
  orgId: string | null
  orgName: string | null
  professionals: Professional[]
}

const STATUS_COLORS: Record<string, string> = {
  programado:  'bg-bg-secondary border-border text-text-secondary',
  confirmado:  'bg-[#1a2e22] border-[#34D399]/40 text-[#34D399]',
  presente:    'bg-[#1a2530] border-[#60A5FA]/40 text-[#60A5FA]',
  ausente:     'bg-[#2e1a1a] border-[#F87171]/40 text-[#F87171]',
  cancelado:   'bg-bg-secondary border-border text-text-tertiary line-through',
  sobreturno:  'bg-[#2a1e30] border-[#C084FC]/40 text-[#C084FC]',
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7:00 – 20:00
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = 0
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

const GRID_START = 7 * 60   // 07:00
const GRID_END   = 21 * 60  // 21:00
const GRID_TOTAL = GRID_END - GRID_START  // 840 minutes

export default function AgendaClient({ userId, orgId, orgName, professionals }: Props) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const [turnos, setTurnos]       = useState<Turno[]>([])
  const [loading, setLoading]     = useState(true)
  const [filterProf, setFilterProf] = useState<string>('all')
  const [modal, setModal] = useState<{
    open: boolean
    turno?: Turno
    defaultStart?: Date
    defaultDay?: Date
  }>({ open: false })

  const supabaseRef = useRef(createClient())

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd  = addDays(weekStart, 6)

  const fetchTurnos = useCallback(async () => {
    setLoading(true)
    const from = weekStart.toISOString()
    const to   = addDays(weekEnd, 1).toISOString()

    let query = supabaseRef.current
      .from('turnos')
      .select('*')
      .gte('start_time', from)
      .lt('start_time', to)
      .order('start_time')

    if (orgId) query = query.eq('org_id', orgId)
    else       query = query.eq('created_by', userId)

    if (filterProf !== 'all') query = query.eq('professional_id', filterProf)

    const { data } = await query
    setTurnos(data ?? [])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, orgId, userId, filterProf])

  useEffect(() => { fetchTurnos() }, [fetchTurnos])

  const prevWeek = () => setWeekStart(d => addDays(d, -7))
  const nextWeek = () => setWeekStart(d => addDays(d, 7))
  const goToday  = () => setWeekStart(startOfWeek(new Date()))

  const openNew = (day?: Date, hour?: number) => {
    const defaultDay = day ?? new Date()
    const defaultStart = new Date(defaultDay)
    defaultStart.setHours(hour ?? 9, 0, 0, 0)
    setModal({ open: true, defaultStart, defaultDay })
  }

  const openEdit = (t: Turno) => setModal({ open: true, turno: t })
  const closeModal = () => setModal({ open: false })

  const handleSaved = () => { closeModal(); fetchTurnos() }

  // ── render appointment block ──────────────────────────────────
  const renderTurno = (t: Turno) => {
    const start = new Date(t.start_time)
    const end   = new Date(t.end_time)
    const top    = ((minutesFromMidnight(start) - GRID_START) / GRID_TOTAL) * 100
    const height = ((minutesFromMidnight(end) - minutesFromMidnight(start)) / GRID_TOTAL) * 100
    const colorClass = STATUS_COLORS[t.status] ?? STATUS_COLORS.programado

    return (
      <button
        key={t.id}
        onClick={() => openEdit(t)}
        className={`absolute left-1 right-1 rounded-lg border-[0.5px] px-2 py-1 text-left overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${colorClass}`}
        style={{ top: `${top}%`, height: `${height}%`, minHeight: '28px' }}
      >
        <p className="text-[11px] font-medium leading-tight truncate">{t.patient_name}</p>
        {height > 5 && (
          <p className="text-[10px] opacity-70 leading-tight truncate">{t.area}</p>
        )}
      </button>
    )
  }

  // ── week range label ──────────────────────────────────────────
  const weekLabel = `${formatDateHeader(weekStart)} – ${formatDateHeader(weekEnd)}`
  const today = new Date()

  return (
    <div>
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[24px] font-medium tracking-[-0.01em]">
            {orgName ? `Agenda — ${orgName}` : 'Agenda'}
          </h1>
          <p className="text-[13px] text-text-secondary mt-0.5">{weekLabel}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Professional filter */}
          {professionals.length > 1 && (
            <select
              value={filterProf}
              onChange={e => setFilterProf(e.target.value)}
              className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary focus:outline-none focus:border-accent"
            >
              <option value="all">Todos los profesionales</option>
              {professionals.map(p => (
                <option key={p.id} value={p.id}>{p.full_name ?? p.id.slice(0, 8)}</option>
              ))}
            </select>
          )}

          {/* Week navigation */}
          <button onClick={prevWeek} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">←</button>
          <button onClick={goToday}  className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">Hoy</button>
          <button onClick={nextWeek} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">→</button>

          <button
            onClick={() => openNew()}
            className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            + Nuevo turno
          </button>
        </div>
      </div>

      {/* CALENDAR GRID */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid border-b-[0.5px] border-border" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
          <div className="border-r-[0.5px] border-border" /> {/* hour gutter */}
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today)
            return (
              <div
                key={i}
                className={`py-3 px-2 text-center border-r-[0.5px] border-border last:border-r-0 ${isToday ? 'bg-accent/5' : ''}`}
              >
                <p className={`text-[11px] uppercase tracking-[0.06em] ${isToday ? 'text-accent' : 'text-text-secondary'}`}>{DAYS[i]}</p>
                <p className={`text-[15px] font-medium mt-0.5 ${isToday ? 'text-accent' : 'text-text-primary'}`}>
                  {day.getDate()}
                </p>
              </div>
            )
          })}
        </div>

        {/* Time grid */}
        <div className="relative overflow-y-auto" style={{ maxHeight: '640px' }}>
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-primary/60">
              <span className="text-[13px] text-text-secondary">Cargando...</span>
            </div>
          )}

          <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
            {/* Hour labels + horizontal rules */}
            <div className="col-span-8 relative" style={{ height: `${HOURS.length * 56}px` }}>
              {/* Horizontal hour lines */}
              {HOURS.map((h, i) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t-[0.5px] border-border flex"
                  style={{ top: `${i * 56}px`, height: '56px' }}
                >
                  <div className="w-[48px] shrink-0 pr-2 flex items-start justify-end pt-1">
                    <span className="text-[10px] text-text-tertiary tabular-nums">{String(h).padStart(2, '0')}:00</span>
                  </div>
                </div>
              ))}

              {/* Day columns with click targets + appointments */}
              <div className="absolute inset-0 left-[48px] grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {weekDays.map((day, dayIdx) => {
                  const isToday = isSameDay(day, today)
                  const dayTurnos = turnos.filter(t => isSameDay(new Date(t.start_time), day))

                  return (
                    <div
                      key={dayIdx}
                      className={`relative border-r-[0.5px] border-border last:border-r-0 ${isToday ? 'bg-accent/[0.02]' : ''}`}
                      style={{ height: `${HOURS.length * 56}px` }}
                    >
                      {/* Click-to-create targets per hour slot */}
                      {HOURS.map((h, hi) => (
                        <div
                          key={h}
                          className="absolute left-0 right-0 cursor-pointer hover:bg-accent/5 transition-colors"
                          style={{ top: `${hi * 56}px`, height: '56px' }}
                          onClick={() => openNew(day, h)}
                        />
                      ))}

                      {/* Appointment blocks */}
                      <div className="absolute inset-0 pointer-events-none">
                        {dayTurnos.map(t => (
                          <div key={t.id} className="pointer-events-auto absolute inset-x-0" style={{ top: 0, bottom: 0 }}>
                            {renderTurno(t)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATUS LEGEND */}
      <div className="flex flex-wrap gap-3 mt-4">
        {Object.entries(STATUS_COLORS).map(([status, cls]) => (
          <span key={status} className={`text-[11px] px-2 py-1 rounded-md border-[0.5px] capitalize ${cls}`}>
            {status}
          </span>
        ))}
      </div>

      {/* TURNO MODAL */}
      {modal.open && (
        <TurnoModal
          userId={userId}
          orgId={orgId}
          professionals={professionals}
          turno={modal.turno}
          defaultStart={modal.defaultStart}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
