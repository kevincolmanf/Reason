'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import TurnoModal from './TurnoModal'
import CloneTurnoModal from './CloneTurnoModal'
import AgendaSettings from './AgendaSettings'

interface Turno {
  id: string
  patient_name: string
  patient_id: string | null
  patient_phone: string | null
  patient_email: string | null
  patient_age: number | null
  patient_obra_social: string | null
  professional_id: string | null
  professional_name: string | null
  start_time: string
  end_time: string
  area: string
  status: string
  notes: string | null
  appointment_type: string | null
  is_blocked: boolean | null
}

interface Professional {
  id: string
  full_name: string | null
}

interface Member {
  id: string
  full_name: string | null
  agendaAccess: boolean
}

interface Props {
  userId: string
  orgId: string | null
  orgName: string | null
  professionals: Professional[]
  members: Member[]
  areas: string[]
  isOwner: boolean
  shareToken: string | null
  shareEnabled: boolean
  slotInterval: number
}

// Status-based colors (lighter palette for readability)
const STATUS_COLORS: Record<string, string> = {
  programado: 'bg-bg-secondary border-border text-text-secondary',
  confirmado: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
  presente:   'bg-blue-500/10 border-blue-500/25 text-blue-300',
  ausente:    'bg-red-500/10 border-red-500/25 text-red-300',
  cancelado:  'bg-bg-secondary border-border text-text-tertiary line-through',
  sobreturno: 'bg-purple-500/10 border-purple-500/25 text-purple-300',
}

// Appointment-type colors (primary visual identifier)
const TYPE_COLORS: Record<string, string> = {
  turno_comun:   'bg-slate-500/10 border-slate-500/25 text-slate-300',
  primera_vez:   'bg-sky-500/10 border-sky-500/25 text-sky-300',
  ingreso:       'bg-amber-500/10 border-amber-500/25 text-amber-300',
  consulta:      'bg-teal-500/10 border-teal-500/25 text-teal-300',
  antropometria: 'bg-orange-500/10 border-orange-500/25 text-orange-300',
  controles:     'bg-indigo-500/10 border-indigo-500/25 text-indigo-300',
}

const TYPE_LABELS: Record<string, string> = {
  turno_comun:   'Turno común',
  primera_vez:   'Primera vez',
  ingreso:       'Ingreso',
  consulta:      'Consulta',
  antropometria: 'Antropometría',
  controles:     'Controles',
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7:00 – 20:00
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function startOfWeek(date: Date): Date {
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

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function buildWhatsAppUrl(phone: string, name: string, start: Date, end: Date, area: string, org: string | null): string {
  const clean = phone.replace(/\D/g, '')
  const day = start.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  const t1  = start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const t2  = end.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const lugar = org ?? 'el centro'
  const msg = `Hola ${name}! Te recordamos tu turno en ${lugar}:\n📅 ${day}\n⏰ ${t1} – ${t2}\n🏥 ${area}\n\n¡Te esperamos!`
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`
}

const GRID_START = 7 * 60
const GRID_END   = 21 * 60
const GRID_TOTAL = GRID_END - GRID_START

function assignColumns(turnos: Turno[]): Map<string, { col: number; totalCols: number }> {
  const result = new Map<string, { col: number; totalCols: number }>()
  if (turnos.length === 0) return result

  const sorted = [...turnos].sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )

  const groups: Turno[][] = []
  let current: Turno[] = []

  for (const t of sorted) {
    if (current.length === 0) {
      current.push(t)
    } else {
      const maxEnd = Math.max(...current.map(c => new Date(c.end_time).getTime()))
      if (new Date(t.start_time).getTime() < maxEnd) {
        current.push(t)
      } else {
        groups.push(current)
        current = [t]
      }
    }
  }
  if (current.length > 0) groups.push(current)

  for (const group of groups) {
    const cols: Turno[][] = []
    for (const t of group) {
      let placed = false
      for (let ci = 0; ci < cols.length; ci++) {
        const lastInCol = cols[ci][cols[ci].length - 1]
        if (new Date(lastInCol.end_time).getTime() <= new Date(t.start_time).getTime()) {
          cols[ci].push(t)
          placed = true
          break
        }
      }
      if (!placed) cols.push([t])
    }
    const totalCols = cols.length
    cols.forEach((col, ci) => col.forEach(t => result.set(t.id, { col: ci, totalCols })))
  }

  return result
}

function blockColorClass(t: Turno): string {
  if (t.is_blocked) return 'bg-bg-secondary border-border text-text-tertiary opacity-70'
  if (t.status === 'ausente')   return STATUS_COLORS.ausente
  if (t.status === 'cancelado') return STATUS_COLORS.cancelado
  if (t.status === 'sobreturno') return STATUS_COLORS.sobreturno
  return TYPE_COLORS[t.appointment_type ?? 'turno_comun'] ?? STATUS_COLORS.programado
}

function exportDay(turnos: Turno[], date: Date) {
  const sorted = [...turnos].filter(t => !t.is_blocked).sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )
  const dateStr = formatDateLong(date)
  const lines = [
    `AGENDA DEL DÍA — ${dateStr.toUpperCase()}`,
    '='.repeat(60),
    '',
    ...sorted.map(t => {
      const start = formatTime(new Date(t.start_time))
      const end   = formatTime(new Date(t.end_time))
      const parts = [
        `${start} – ${end}  ${t.patient_name}`,
        t.area ? `  Área: ${t.area}` : '',
        t.patient_phone ? `  Tel: ${t.patient_phone}` : '',
        t.patient_email ? `  Email: ${t.patient_email}` : '',
        t.patient_age ? `  Edad: ${t.patient_age} años` : '',
        t.patient_obra_social ? `  Obra social: ${t.patient_obra_social}` : '',
        t.professional_name ? `  Profesional: ${t.professional_name}` : '',
        t.status !== 'programado' ? `  Estado: ${t.status}` : '',
        t.notes ? `  Notas: ${t.notes}` : '',
        '',
      ]
      return parts.filter(Boolean).join('\n')
    }),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `agenda-${date.toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AgendaClient({ userId, orgId, orgName, professionals, members, areas: initialAreas, isOwner, shareToken, shareEnabled, slotInterval: initialSlotInterval }: Props) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())
  const [view, setView] = useState<'week' | 'day'>('day')
  const [turnos, setTurnos]       = useState<Turno[]>([])
  const [loading, setLoading]     = useState(true)
  const [filterProf, setFilterProf] = useState<string>('all')
  const [areas, setAreas] = useState<string[]>(initialAreas)
  const [slotInterval, setSlotInterval] = useState(initialSlotInterval)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modal, setModal] = useState<{
    open: boolean
    turno?: Turno
    defaultStart?: Date
    defaultDay?: Date
  }>({ open: false })
  const [cloneModal, setCloneModal] = useState<Turno | null>(null)

  const supabaseRef = useRef(createClient())

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd  = addDays(weekStart, 6)

  const fetchTurnos = useCallback(async () => {
    setLoading(true)
    let from: string, to: string
    if (view === 'day') {
      from = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate()).toISOString()
      to   = addDays(selectedDay, 1).toISOString()
    } else {
      from = weekStart.toISOString()
      to   = addDays(weekEnd, 1).toISOString()
    }

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
  }, [weekStart, selectedDay, view, orgId, userId, filterProf])

  useEffect(() => { fetchTurnos() }, [fetchTurnos])

  const prevPeriod = () => {
    if (view === 'day') setSelectedDay(d => addDays(d, -1))
    else setWeekStart(d => addDays(d, -7))
  }
  const nextPeriod = () => {
    if (view === 'day') setSelectedDay(d => addDays(d, 1))
    else setWeekStart(d => addDays(d, 7))
  }
  const goToday = () => {
    setSelectedDay(new Date())
    setWeekStart(startOfWeek(new Date()))
  }

  const openNew = (day?: Date, hour?: number, minute?: number) => {
    const defaultDay = day ?? (view === 'day' ? selectedDay : new Date())
    const defaultStart = new Date(defaultDay)
    defaultStart.setHours(hour ?? 9, minute ?? 0, 0, 0)
    setModal({ open: true, defaultStart, defaultDay })
  }

  const openEdit = (t: Turno) => setModal({ open: true, turno: t })
  const closeModal = () => setModal({ open: false })
  const handleSaved = () => { closeModal(); fetchTurnos() }

  const handleClone = (turno: Turno) => {
    closeModal()
    setCloneModal(turno)
  }

  const GRID_HEIGHT = HOURS.length * 56

  const renderDayColumn = (day: Date, dayTurnos: Turno[], colLayout: Map<string, { col: number; totalCols: number }>) => {
    const today = new Date()
    const isToday = isSameDay(day, today)
    return (
      <div
        className={`relative border-r-[0.5px] border-border last:border-r-0 ${isToday ? 'bg-accent/[0.02]' : ''}`}
        style={{ height: `${GRID_HEIGHT}px` }}
      >
        {Array.from({ length: Math.ceil(GRID_TOTAL / slotInterval) }, (_, i) => {
          const minuteOffset = i * slotInterval
          const absMin = GRID_START + minuteOffset
          if (absMin >= GRID_END) return null
          const topPx = (minuteOffset / GRID_TOTAL) * GRID_HEIGHT
          const heightPx = Math.min((slotInterval / GRID_TOTAL) * GRID_HEIGHT, GRID_HEIGHT - topPx)
          const h = Math.floor(absMin / 60)
          const m = absMin % 60
          return (
            <div
              key={i}
              className="absolute left-0 right-0 cursor-pointer hover:bg-accent/5 transition-colors"
              style={{ top: `${topPx}px`, height: `${heightPx}px` }}
              onClick={() => openNew(day, h, m)}
            />
          )
        })}
        <div className="absolute inset-0 pointer-events-none">
          {dayTurnos.map(t => {
            const start = new Date(t.start_time)
            const end   = new Date(t.end_time)
            const top    = ((minutesFromMidnight(start) - GRID_START) / GRID_TOTAL) * 100
            const height = ((minutesFromMidnight(end) - minutesFromMidnight(start)) / GRID_TOTAL) * 100
            const colorClass = blockColorClass(t)
            const layout = colLayout.get(t.id) ?? { col: 0, totalCols: 1 }
            const widthPct = 100 / layout.totalCols
            const leftPct  = layout.col * widthPct

            const waUrl = !t.is_blocked && t.patient_phone
              ? buildWhatsAppUrl(t.patient_phone, t.patient_name, start, end, t.area, orgName)
              : null

            return (
              <div
                key={t.id}
                className={`absolute group rounded-lg border-[0.5px] text-left overflow-hidden pointer-events-auto ${colorClass}`}
                style={{ top: `${top}%`, height: `${height}%`, minHeight: '22px', left: `${leftPct}%`, width: `${widthPct}%` }}
              >
                <button
                  onClick={() => openEdit(t)}
                  className="absolute inset-0 px-1.5 py-1 w-full text-left cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {t.is_blocked ? (
                    <p className="text-[10px] leading-tight truncate opacity-70">{t.notes || 'Bloqueado'}</p>
                  ) : (
                    <>
                      <p className="text-[10px] font-medium leading-tight truncate">{formatTime(start)} {t.patient_name}</p>
                      {height > 4 && <p className="text-[9px] opacity-70 leading-tight truncate">{t.area}</p>}
                      {height > 6 && t.notes && <p className="text-[8px] opacity-50 leading-tight">◆ nota</p>}
                    </>
                  )}
                </button>
                {waUrl && height > 5 && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    title="Enviar recordatorio por WhatsApp"
                    className="absolute bottom-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] leading-none bg-green-500/20 hover:bg-green-500/40 border-[0.5px] border-green-500/40 rounded px-1 py-0.5 text-green-400"
                  >
                    WA
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const today = new Date()
  const periodLabel = view === 'day'
    ? formatDateLong(selectedDay)
    : `${formatDateHeader(weekStart)} – ${formatDateHeader(weekEnd)}`

  const MIN_COL_WIDTH = 130

  const dayTurnos = turnos.filter(t => isSameDay(new Date(t.start_time), selectedDay))
  const dayColLayout = assignColumns(dayTurnos)
  const maxSimultaneousCols = dayTurnos.length > 0
    ? Math.max(...Array.from(dayColLayout.values()).map(v => v.totalCols))
    : 1

  const dayOccupancy = dayTurnos.filter(t => !t.is_blocked).length

  return (
    <div>
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[24px] font-medium tracking-[-0.01em]">
            {orgName ? `Agenda — ${orgName}` : 'Agenda'}
          </h1>
          <p className="text-[13px] text-text-secondary mt-0.5 capitalize">
            {periodLabel}
            {view === 'day' && dayOccupancy > 0 && (
              <span className="ml-2 text-text-tertiary">· {dayOccupancy} turno{dayOccupancy !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-bg-secondary border-[0.5px] border-border rounded-lg overflow-hidden">
            <button onClick={() => setView('day')} className={`px-3 py-2 text-[13px] transition-colors ${view === 'day' ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}>Día</button>
            <button onClick={() => setView('week')} className={`px-3 py-2 text-[13px] transition-colors ${view === 'week' ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}>Semana</button>
          </div>

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

          <button onClick={prevPeriod} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">←</button>
          <button onClick={goToday}  className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">Hoy</button>
          <button onClick={nextPeriod} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">→</button>

          {view === 'day' && (
            <button onClick={() => exportDay(dayTurnos, selectedDay)} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">
              Exportar
            </button>
          )}

          <button onClick={() => setSettingsOpen(true)} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors" title="Configurar agenda">
            ⚙
          </button>

          <button onClick={() => openNew()} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">
            + Nuevo turno
          </button>
        </div>
      </div>

      {/* CALENDAR GRID */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden">

        {view === 'day' ? (
          <>
            <div className="flex border-b-[0.5px] border-border">
              <div className="w-[48px] shrink-0 border-r-[0.5px] border-border" />
              <div className="flex-1 py-3 px-4">
                <p className="text-[13px] font-medium capitalize">{periodLabel}</p>
              </div>
            </div>

            <div className="relative overflow-y-auto" style={{ maxHeight: '640px' }}>
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-primary/60">
                  <span className="text-[13px] text-text-secondary">Cargando...</span>
                </div>
              )}
              <div className="flex" style={{ height: `${GRID_HEIGHT}px` }}>
                <div className="relative shrink-0 w-[48px]" style={{ height: `${GRID_HEIGHT}px` }}>
                  {HOURS.map((h, i) => (
                    <div key={h} className="absolute left-0 right-0 border-t-[0.5px] border-border" style={{ top: `${i * 56}px`, height: '56px' }}>
                      <div className="pr-2 flex items-start justify-end pt-1">
                        <span className="text-[10px] text-text-tertiary tabular-nums">{String(h).padStart(2, '0')}:00</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex-1 overflow-x-auto" style={{ height: `${GRID_HEIGHT}px` }}>
                  <div className="relative" style={{ minWidth: `${maxSimultaneousCols * MIN_COL_WIDTH}px`, height: `${GRID_HEIGHT}px` }}>
                    {HOURS.map((h, i) => (
                      <div key={h} className="absolute left-0 right-0 border-t-[0.5px] border-border" style={{ top: `${i * 56}px`, height: '56px' }} />
                    ))}
                    {slotInterval < 60 && Array.from({ length: Math.ceil(GRID_TOTAL / slotInterval) }, (_, i) => {
                      const minuteOffset = i * slotInterval
                      if (minuteOffset % 60 === 0) return null
                      if (GRID_START + minuteOffset >= GRID_END) return null
                      return (
                        <div
                          key={`sub-${i}`}
                          className="absolute left-0 right-0 border-t-[0.5px] border-border/30 pointer-events-none"
                          style={{ top: `${(minuteOffset / GRID_TOTAL) * GRID_HEIGHT}px` }}
                        />
                      )
                    })}
                    {renderDayColumn(selectedDay, dayTurnos, dayColLayout)}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid border-b-[0.5px] border-border" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
              <div className="border-r-[0.5px] border-border" />
              {weekDays.map((day, i) => {
                const isToday = isSameDay(day, today)
                const dayCount = turnos.filter(t => isSameDay(new Date(t.start_time), day) && !t.is_blocked).length
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedDay(day); setView('day') }}
                    className={`py-3 px-2 text-center border-r-[0.5px] border-border last:border-r-0 hover:bg-accent/5 transition-colors ${isToday ? 'bg-accent/5' : ''}`}
                  >
                    <p className={`text-[11px] uppercase tracking-[0.06em] ${isToday ? 'text-accent' : 'text-text-secondary'}`}>{DAYS[i]}</p>
                    <p className={`text-[15px] font-medium mt-0.5 ${isToday ? 'text-accent' : 'text-text-primary'}`}>{day.getDate()}</p>
                    {dayCount > 0 && <p className="text-[10px] text-text-tertiary mt-0.5">{dayCount}t</p>}
                  </button>
                )
              })}
            </div>

            <div className="relative overflow-y-auto" style={{ maxHeight: '640px' }}>
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-primary/60">
                  <span className="text-[13px] text-text-secondary">Cargando...</span>
                </div>
              )}
              <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
                <div className="col-span-8 relative" style={{ height: `${HOURS.length * 56}px` }}>
                  {HOURS.map((h, i) => (
                    <div key={h} className="absolute left-0 right-0 border-t-[0.5px] border-border flex" style={{ top: `${i * 56}px`, height: '56px' }}>
                      <div className="w-[48px] shrink-0 pr-2 flex items-start justify-end pt-1">
                        <span className="text-[10px] text-text-tertiary tabular-nums">{String(h).padStart(2, '0')}:00</span>
                      </div>
                    </div>
                  ))}
                  {slotInterval < 60 && Array.from({ length: Math.ceil(GRID_TOTAL / slotInterval) }, (_, i) => {
                    const minuteOffset = i * slotInterval
                    if (minuteOffset % 60 === 0) return null
                    if (GRID_START + minuteOffset >= GRID_END) return null
                    return (
                      <div
                        key={`sub-${i}`}
                        className="absolute left-[48px] right-0 border-t-[0.5px] border-border/30 pointer-events-none"
                        style={{ top: `${(minuteOffset / GRID_TOTAL) * GRID_HEIGHT}px` }}
                      />
                    )
                  })}
                  <div className="absolute inset-0 left-[48px] grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {weekDays.map((day) => {
                      const dt = turnos.filter(t => isSameDay(new Date(t.start_time), day))
                      const layout = assignColumns(dt)
                      return renderDayColumn(day, dt, layout)
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* LEGEND */}
      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_COLORS).map(([type, cls]) => (
            <span key={type} className={`text-[11px] px-2 py-1 rounded-md border-[0.5px] ${cls}`}>
              {TYPE_LABELS[type] ?? type}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['ausente', 'cancelado', 'sobreturno'] as const).map(status => (
            <span key={status} className={`text-[11px] px-2 py-1 rounded-md border-[0.5px] capitalize ${STATUS_COLORS[status]}`}>
              {status}
            </span>
          ))}
        </div>
      </div>

      {/* TURNO MODAL */}
      {modal.open && (
        <TurnoModal
          userId={userId}
          orgId={orgId}
          orgName={orgName}
          professionals={professionals}
          areas={areas}
          turno={modal.turno}
          defaultStart={modal.defaultStart}
          slotInterval={slotInterval}
          onClose={closeModal}
          onSaved={handleSaved}
          onClone={handleClone}
        />
      )}

      {/* CLONE MODAL */}
      {cloneModal && (
        <CloneTurnoModal
          turno={cloneModal}
          userId={userId}
          orgId={orgId}
          onClose={() => setCloneModal(null)}
          onSaved={() => { setCloneModal(null); fetchTurnos() }}
        />
      )}

      {/* SETTINGS MODAL */}
      {settingsOpen && (
        <AgendaSettings
          orgId={orgId}
          userId={userId}
          isOwner={isOwner}
          initialAreas={areas}
          initialSlotInterval={slotInterval}
          members={members}
          shareToken={shareToken}
          shareEnabled={shareEnabled}
          onClose={() => setSettingsOpen(false)}
          onSaved={(newAreas, newSlotInterval) => { setAreas(newAreas); setSlotInterval(newSlotInterval); setSettingsOpen(false) }}
        />
      )}
    </div>
  )
}
