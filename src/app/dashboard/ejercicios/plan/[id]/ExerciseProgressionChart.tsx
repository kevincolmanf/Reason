'use client'

import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export interface PerformanceLogRow {
  exercise_id: string
  exercise_name: string
  scheduled_date: string
  weight: number | null
}

const ACCENT = '#2dd8a8'
const AXIS_CLR = 'var(--text-secondary)'
const GRID_CLR = 'var(--border)'

function dateLabel(d: string): string {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  } catch { return d }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { dateLabel: string; weight: number } }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[12px]">
      <div className="text-text-secondary">{p.dateLabel}</div>
      <div className="text-text-primary font-medium">{p.weight} kg</div>
    </div>
  )
}

export default function ExerciseProgressionChart({ logs }: { logs: PerformanceLogRow[] }) {
  const exercises = useMemo(() => {
    const seen = new Map<string, string>()
    for (const l of logs) if (!seen.has(l.exercise_id)) seen.set(l.exercise_id, l.exercise_name)
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [logs])

  const [selected, setSelected] = useState<string | null>(exercises[0]?.id ?? null)

  const points = useMemo(() => {
    return logs
      .filter(l => l.exercise_id === selected && l.weight != null)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      .map(l => ({ dateLabel: dateLabel(l.scheduled_date), weight: l.weight as number }))
  }, [logs, selected])

  if (exercises.length === 0) {
    return (
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5">
        <h3 className="text-[15px] font-medium mb-1">Progresión</h3>
        <p className="text-[13px] text-text-secondary">Todavía no hay cargas registradas para este plan. Se completa desde &ldquo;Atención de hoy&rdquo; cada vez que se carga un peso.</p>
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h3 className="text-[15px] font-medium">Progresión</h3>
        <select
          value={selected ?? ''}
          onChange={e => setSelected(e.target.value)}
          className="bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-1.5 text-[12.5px] text-text-primary focus:outline-none focus:border-accent/50"
        >
          {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
      </div>

      {points.length === 0 ? (
        <p className="text-[13px] text-text-secondary">Sin pesos registrados todavía para este ejercicio.</p>
      ) : points.length === 1 ? (
        <p className="text-[13px] text-text-secondary">Un solo registro por ahora ({points[0].dateLabel}: <b className="text-text-primary">{points[0].weight} kg</b>) — el gráfico aparece desde el segundo.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={points} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_CLR} vertical={false} />
            <XAxis dataKey="dateLabel" tick={{ fill: AXIS_CLR, fontSize: 11 }} axisLine={{ stroke: GRID_CLR }} tickLine={false} />
            <YAxis tick={{ fill: AXIS_CLR, fontSize: 11 }} axisLine={false} tickLine={false} unit="kg" width={48} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="weight" stroke={ACCENT} strokeWidth={2} dot={{ r: 3, fill: ACCENT }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
