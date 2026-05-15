'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Turno {
  id: string
  patient_name: string
  professional_name: string | null
  start_time: string
  end_time: string
  area: string
  status: string
  appointment_type: string | null
  is_blocked: boolean | null
}

const TYPE_COLORS: Record<string, string> = {
  turno_comun:   'bg-slate-500/10 border-slate-500/25 text-slate-300',
  primera_vez:   'bg-sky-500/10 border-sky-500/25 text-sky-300',
  ingreso:       'bg-amber-500/10 border-amber-500/25 text-amber-300',
  consulta:      'bg-teal-500/10 border-teal-500/25 text-teal-300',
  antropometria: 'bg-orange-500/10 border-orange-500/25 text-orange-300',
  controles:     'bg-indigo-500/10 border-indigo-500/25 text-indigo-300',
}

const STATUS_COLORS: Record<string, string> = {
  programado: 'bg-bg-secondary border-border text-text-secondary',
  confirmado: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
  presente:   'bg-blue-500/10 border-blue-500/25 text-blue-300',
  ausente:    'bg-red-500/10 border-red-500/25 text-red-300',
  cancelado:  'bg-bg-secondary border-border text-text-tertiary line-through',
  sobreturno: 'bg-purple-500/10 border-purple-500/25 text-purple-300',
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)
const GRID_START = 7 * 60
const GRID_END   = 21 * 60
const GRID_TOTAL = GRID_END - GRID_START
const GRID_HEIGHT = HOURS.length * 56

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

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

const MIN_COL_WIDTH = 130

export default function SharedAgendaClient({ token, orgName, profId }: { token: string; orgName: string; profId?: string }) {
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())

  const fetchTurnos = useCallback(async () => {
    setLoading(true)
    const from = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate()).toISOString()
    const to   = addDays(selectedDay, 1).toISOString()

    const { data } = await supabaseRef.current.rpc('get_shared_agenda', {
      p_token:   token,
      p_from:    from,
      p_to:      to,
      p_prof_id: profId ?? null,
    })
    setTurnos((data ?? []) as Turno[])
    setLoading(false)
  }, [selectedDay, token, profId])

  useEffect(() => { fetchTurnos() }, [fetchTurnos])

  const colLayout = assignColumns(turnos)
  const maxCols = turnos.length > 0
    ? Math.max(...Array.from(colLayout.values()).map(v => v.totalCols))
    : 1

  const today = new Date()
  const periodLabel = formatDateLong(selectedDay)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[24px] font-medium tracking-[-0.01em]">Agenda — {orgName}</h1>
          <p className="text-[13px] text-text-secondary mt-0.5 capitalize">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedDay(d => addDays(d, -1))} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary">←</button>
          <button onClick={() => setSelectedDay(new Date())} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary">Hoy</button>
          <button onClick={() => setSelectedDay(d => addDays(d, 1))} className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary">→</button>
          <span className="ml-2 text-[11px] text-text-secondary bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2">Solo lectura</span>
        </div>
      </div>

      {/* List view for read-only (simpler and cleaner for secretaries) */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden">
        <div className="border-b-[0.5px] border-border px-4 py-3">
          <p className="text-[13px] font-medium capitalize">{periodLabel}</p>
        </div>

        <div className="relative overflow-y-auto" style={{ maxHeight: '640px' }}>
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-primary/60">
              <span className="text-[13px] text-text-secondary">Cargando...</span>
            </div>
          )}

          {/* Calendar grid */}
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
              <div className="relative" style={{ minWidth: `${maxCols * MIN_COL_WIDTH}px`, height: `${GRID_HEIGHT}px` }}>
                {HOURS.map((h, i) => (
                  <div key={h} className="absolute left-0 right-0 border-t-[0.5px] border-border" style={{ top: `${i * 56}px`, height: '56px' }} />
                ))}

                {/* Appointment blocks — read only, no click */}
                <div className={`relative ${isSameDay(selectedDay, today) ? 'bg-accent/[0.02]' : ''}`} style={{ height: `${GRID_HEIGHT}px` }}>
                  {turnos.map(t => {
                    const start = new Date(t.start_time)
                    const end   = new Date(t.end_time)
                    const top    = ((minutesFromMidnight(start) - GRID_START) / GRID_TOTAL) * 100
                    const height = ((minutesFromMidnight(end) - minutesFromMidnight(start)) / GRID_TOTAL) * 100
                    const colorClass = t.is_blocked
                      ? 'bg-bg-secondary border-border text-text-tertiary opacity-60'
                      : t.status === 'ausente' || t.status === 'cancelado' || t.status === 'sobreturno'
                        ? (STATUS_COLORS[t.status] ?? STATUS_COLORS.programado)
                        : (TYPE_COLORS[t.appointment_type ?? 'turno_comun'] ?? STATUS_COLORS.programado)
                    const layout = colLayout.get(t.id) ?? { col: 0, totalCols: 1 }
                    const widthPct = 100 / layout.totalCols
                    const leftPct  = layout.col * widthPct

                    return (
                      <div
                        key={t.id}
                        className={`absolute rounded-lg border-[0.5px] px-1.5 py-1 overflow-hidden ${colorClass}`}
                        style={{ top: `${top}%`, height: `${height}%`, minHeight: '24px', left: `${leftPct}%`, width: `${widthPct}%` }}
                      >
                        {t.is_blocked ? (
                          <p className="text-[10px] leading-tight truncate opacity-60">Bloqueado</p>
                        ) : (
                          <>
                            <p className="text-[10px] font-medium leading-tight truncate">{formatTime(start)} {t.patient_name}</p>
                            {height > 4 && <p className="text-[9px] opacity-70 leading-tight truncate">{t.area}</p>}
                            {height > 6 && t.professional_name && <p className="text-[9px] opacity-60 leading-tight truncate">{t.professional_name}</p>}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {turnos.length === 0 && !loading && (
        <p className="text-center text-[13px] text-text-secondary mt-8">Sin turnos para este día.</p>
      )}
    </div>
  )
}
