'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Props {
  anchorMonth: Date          // mes a mostrar al abrir
  selectedDay: Date          // día actualmente elegido en la agenda
  orgId: string | null
  userId: string
  filterProf: string         // 'all' o id de profesional
  onPick: (day: Date) => void
  onClose: () => void
}

const WEEK_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// Lunes de la semana que contiene a `d` (semana arranca lunes)
function mondayOf(d: Date): Date {
  const x = new Date(d)
  const dow = x.getDay() // 0 dom … 6 sáb
  const diff = dow === 0 ? -6 : 1 - dow
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function MiniCalendar({ anchorMonth, selectedDay, orgId, userId, filterProf, onPick, onClose }: Props) {
  const [month, setMonth] = useState<Date>(() => firstOfMonth(anchorMonth))
  const [daysWithTurnos, setDaysWithTurnos] = useState<Set<string>>(new Set())
  const supabaseRef = useRef(createClient())
  const today = new Date()

  const loadMonth = useCallback(async () => {
    const from = firstOfMonth(month)
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 1)
    let query = supabaseRef.current
      .from('turnos')
      .select('start_time')
      .gte('start_time', from.toISOString())
      .lt('start_time', to.toISOString())
      .neq('status', 'cancelado')
      .eq('is_blocked', false)
    if (orgId) query = query.eq('org_id', orgId)
    else       query = query.eq('created_by', userId)
    if (filterProf !== 'all') query = query.eq('professional_id', filterProf)
    const { data } = await query
    setDaysWithTurnos(new Set((data ?? []).map(t => ymd(new Date(t.start_time)))))
  }, [month, orgId, userId, filterProf])

  useEffect(() => { loadMonth() }, [loadMonth])

  // 6 semanas (42 celdas) desde el lunes de la primera semana del mes
  const gridStart = mondayOf(firstOfMonth(month))
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const monthLabel = month.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <div className="absolute right-0 z-40 mt-2 bg-bg-secondary border-[0.5px] border-border rounded-xl shadow-xl p-3 w-[280px]" onClick={e => e.stopPropagation()}>
      {/* Header mes */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
        >←</button>
        <span className="text-[13px] font-medium capitalize">{monthLabel}</span>
        <button
          onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
        >→</button>
      </div>

      {/* Encabezado días */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_LETTERS.map((l, i) => (
          <div key={i} className="text-center text-[10px] text-text-tertiary uppercase py-1">{l}</div>
        ))}
      </div>

      {/* Grilla */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === month.getMonth()
          const isToday = sameDay(d, today)
          const isSelected = sameDay(d, selectedDay)
          const hasTurnos = daysWithTurnos.has(ymd(d))
          return (
            <button
              key={i}
              onClick={() => onPick(d)}
              className={`relative h-8 flex flex-col items-center justify-center rounded-md text-[12px] transition-colors
                ${isSelected ? 'bg-accent text-bg-primary font-semibold'
                  : isToday ? 'border-[0.5px] border-accent text-accent'
                  : inMonth ? 'text-text-primary hover:bg-bg-primary'
                  : 'text-text-tertiary hover:bg-bg-primary'}`}
              title={d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            >
              <span className="leading-none">{d.getDate()}</span>
              {hasTurnos && (
                <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-bg-primary' : 'bg-green-400'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Pie */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t-[0.5px] border-border">
        <span className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Con turnos
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => onPick(new Date())} className="text-[12px] text-accent hover:opacity-80">Hoy</button>
          <button onClick={onClose} className="text-[12px] text-text-secondary hover:text-text-primary">Cerrar</button>
        </div>
      </div>
    </div>
  )
}
