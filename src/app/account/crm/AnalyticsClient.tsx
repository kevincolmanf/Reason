'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, Legend,
} from 'recharts'
import type { Analytics, RawTurno } from './CRMPageClient'

const ACCENT   = '#c47c5a'
const EMERALD  = '#10b981'
const RED      = '#ef4444'
const GRAY     = '#6b7280'
const BLUE     = '#3b82f6'
const AXIS_CLR = '#6b6b65'
const GRID_CLR = '#2a2a28'

// Distinct colors for line chart series (up to 6 professionals)
const PROF_COLORS = ['#c47c5a', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899']

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function delta(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? '+∞' : '—'
  const pct = Math.round(((curr - prev) / prev) * 100)
  return (pct >= 0 ? '+' : '') + pct + '%'
}

function deltaColor(curr: number, prev: number, higherIsBetter = true) {
  if (curr === prev) return 'text-text-tertiary'
  const better = curr > prev
  return (better === higherIsBetter) ? 'text-emerald-400' : 'text-red-400'
}

function KPICard({ label, value, prev, prevLabel, higherIsBetter = true }: {
  label: string; value: number; prev: number; prevLabel: string; higherIsBetter?: boolean
}) {
  const d = delta(value, prev)
  const cls = deltaColor(value, prev, higherIsBetter)
  return (
    <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
      <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-3">{label}</div>
      <div className="font-mono text-[32px] font-medium text-text-primary tracking-[-0.02em]">{value}</div>
      <div className={`text-[12px] mt-2 ${cls}`}>
        {d} <span className="text-text-tertiary">vs {prevLabel}</span>
      </div>
    </div>
  )
}

type TooltipPayloadItem = { name: string; value: number; fill?: string; stroke?: string; color?: string }
type TooltipProps = { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[12px] shadow-lg">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? p.fill ?? p.stroke }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

function computeStats(turnos: RawTurno[]) {
  const total = turnos.length
  const presentes = turnos.filter(t => t.status === 'presente').length
  const ausentes = turnos.filter(t => t.status === 'ausente').length
  const cancelados = turnos.filter(t => t.status === 'cancelado').length
  const nuevos = turnos.filter(t => ['primera_vez', 'ingreso'].includes(t.appointment_type ?? '')).length
  return { total, presentes, ausentes, cancelados, nuevos }
}

// cargados = total - cancelados (slots occupied regardless of attendance)
function computeByProfessional(turnos: RawTurno[]) {
  type ProfEntry = {
    cargados: number
    presentes: number
    ausentes: number
    cancelados: number
    days: Map<string, { minStart: number; maxEnd: number }>
  }
  const profMap = new Map<string, ProfEntry>()

  turnos.forEach((t) => {
    const name = t.professional_name ?? 'Sin asignar'
    if (!profMap.has(name)) profMap.set(name, { cargados: 0, presentes: 0, ausentes: 0, cancelados: 0, days: new Map() })
    const e = profMap.get(name)!
    if (t.status === 'presente') e.presentes++
    if (t.status === 'ausente') e.ausentes++
    if (t.status === 'cancelado') {
      e.cancelados++
      return // cancelled slots don't count as load
    }
    e.cargados++

    const dateKey = t.start_time.slice(0, 10)
    const startMs = new Date(t.start_time).getTime()
    const endMs = t.end_time ? new Date(t.end_time).getTime() : startMs
    const existing = e.days.get(dateKey)
    if (!existing) {
      e.days.set(dateKey, { minStart: startMs, maxEnd: endMs })
    } else {
      if (startMs < existing.minStart) existing.minStart = startMs
      if (endMs > existing.maxEnd) existing.maxEnd = endMs
    }
  })

  return Array.from(profMap.entries())
    .map(([name, e]) => {
      const totalHours = Array.from(e.days.values())
        .reduce((acc, d) => acc + Math.max(0, (d.maxEnd - d.minStart) / 3600000), 0)
      return {
        name,
        total: e.cargados + e.cancelados,
        cargados: e.cargados,
        presentes: e.presentes,
        ausentes: e.ausentes,
        cancelados: e.cancelados,
        avgPerHour: totalHours > 0 ? +(e.cargados / totalHours).toFixed(1) : 0,
      }
    })
    .sort((a, b) => b.cargados - a.cargados)
}

function computeByHour(turnos: RawTurno[]) {
  const hourMap = new Map<number, number>()
  for (let h = 7; h <= 20; h++) hourMap.set(h, 0)
  turnos.filter(t => t.status !== 'cancelado').forEach((t) => {
    const h = new Date(t.start_time).getHours()
    hourMap.set(h, (hourMap.get(h) ?? 0) + 1)
  })
  return Array.from(hourMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hour, count]) => ({ hour: `${String(hour).padStart(2, '0')}:00`, count }))
}

function computeByDayOfWeek(turnos: RawTurno[]) {
  const dayMap = new Map<number, number>()
  for (let d = 0; d < 7; d++) dayMap.set(d, 0)
  turnos.filter(t => t.status !== 'cancelado').forEach((t) => {
    const d = new Date(t.start_time).getDay()
    dayMap.set(d, (dayMap.get(d) ?? 0) + 1)
  })
  return Array.from(dayMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, count]) => ({ day: DAYS[day], count }))
    .filter(d => d.count > 0)
}

// Monthly trend: for each month, compute avgPerHour per professional
function computeMonthlyTrend(turnos: RawTurno[], monthKeys: string[]) {
  return monthKeys.map((monthKey) => {
    const monthTurnos = turnos.filter(t => t.start_time.startsWith(monthKey))
    const byProf = computeByProfessional(monthTurnos)
    const entry: Record<string, number | string> = { month: monthKey.slice(0, 7) }
    byProf.forEach(p => { entry[p.name] = p.avgPerHour })
    return entry
  })
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const s = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function AnalyticsClient({ analytics }: { analytics: Analytics }) {
  const { rawTurnos, upcoming, thisMonthLabel, lastMonthLabel, thisMonthKey, lastMonthKey, totalPatients, activePatients } = analytics

  // Derive available areas
  const areas = useMemo(() => {
    const set = new Set<string>()
    rawTurnos.forEach(t => { if (t.area) set.add(t.area) })
    return Array.from(set).sort()
  }, [rawTurnos])

  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [threshold, setThreshold] = useState<number>(3)

  const filtered = useMemo(() =>
    selectedArea === 'all' ? rawTurnos : rawTurnos.filter(t => t.area === selectedArea),
    [rawTurnos, selectedArea]
  )

  const filteredThis = useMemo(() =>
    filtered.filter(t => t.start_time.startsWith(thisMonthKey)),
    [filtered, thisMonthKey]
  )
  const filteredLast = useMemo(() =>
    filtered.filter(t => t.start_time.startsWith(lastMonthKey)),
    [filtered, lastMonthKey]
  )

  // Last 5 month keys in chronological order
  const monthKeys = useMemo(() => {
    const [y, m] = thisMonthKey.split('-').map(Number)
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(y, m - 1 - (4 - i), 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
  }, [thisMonthKey])

  const t = useMemo(() => computeStats(filteredThis), [filteredThis])
  const l = useMemo(() => computeStats(filteredLast), [filteredLast])
  const byProfessional = useMemo(() => computeByProfessional(filteredThis), [filteredThis])
  const byHour = useMemo(() => computeByHour(filteredThis), [filteredThis])
  const byDayOfWeek = useMemo(() => computeByDayOfWeek(filteredThis), [filteredThis])

  const monthlyTrend = useMemo(() => computeMonthlyTrend(filtered, monthKeys), [filtered, monthKeys])

  // Professional names that appear in trend data
  const trendProfNames = useMemo(() => {
    const names = new Set<string>()
    monthlyTrend.forEach(row => {
      Object.keys(row).filter(k => k !== 'month').forEach(k => names.add(k))
    })
    return Array.from(names)
  }, [monthlyTrend])

  const ausenteRate = t.total > 0 ? Math.round((t.ausentes / t.total) * 100) : 0
  const prevAusenteRate = l.total > 0 ? Math.round((l.ausentes / l.total) * 100) : 0

  const cargadosThis = t.total - t.cancelados
  const cargadosLast = l.total - l.cancelados

  const breakdownData = [
    { name: 'Presentes', value: t.presentes, fill: EMERALD },
    { name: 'Ausentes', value: t.ausentes, fill: RED },
    { name: 'Cancelados', value: t.cancelados, fill: GRAY },
    { name: 'Programados', value: t.total - t.presentes - t.ausentes - t.cancelados, fill: BLUE },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-10">

      {/* Area filter */}
      {areas.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[13px] text-text-secondary">Área:</span>
          <button
            onClick={() => setSelectedArea('all')}
            className={`px-3 py-1.5 rounded-lg text-[13px] border-[0.5px] transition-colors ${selectedArea === 'all' ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}
          >
            Todas
          </button>
          {areas.map(a => (
            <button
              key={a}
              onClick={() => setSelectedArea(a)}
              className={`px-3 py-1.5 rounded-lg text-[13px] border-[0.5px] transition-colors capitalize ${selectedArea === a ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div>
        <h2 className="text-[16px] font-medium mb-4">{thisMonthLabel}{selectedArea !== 'all' ? ` — ${selectedArea}` : ''}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard label="Turnos totales" value={t.total} prev={l.total} prevLabel={lastMonthLabel} />
          <KPICard label="Cargados" value={cargadosThis} prev={cargadosLast} prevLabel={lastMonthLabel} />
          <KPICard label="Presentes" value={t.presentes} prev={l.presentes} prevLabel={lastMonthLabel} />
          <KPICard label="Ausentes" value={t.ausentes} prev={l.ausentes} prevLabel={lastMonthLabel} higherIsBetter={false} />
          <KPICard label="Cancelados" value={t.cancelados} prev={l.cancelados} prevLabel={lastMonthLabel} higherIsBetter={false} />
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
            <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-3">Pendientes del mes</div>
            <div className="font-mono text-[32px] font-medium text-accent tracking-[-0.02em]">{upcoming}</div>
            <div className="text-[12px] mt-2 text-text-tertiary">turnos agendados restantes</div>
          </div>
        </div>
      </div>

      {/* Pacientes — only in overall view */}
      {selectedArea === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
            <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-3">Pacientes totales</div>
            <div className="font-mono text-[32px] font-medium text-text-primary tracking-[-0.02em]">{totalPatients}</div>
          </div>
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
            <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-3">Activos (últimos 30 días)</div>
            <div className="font-mono text-[32px] font-medium text-emerald-400 tracking-[-0.02em]">{activePatients}</div>
            <div className="text-[12px] mt-2 text-text-tertiary">
              {totalPatients > 0 ? Math.round((activePatients / totalPatients) * 100) : 0}% del total
            </div>
          </div>
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
            <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-3">% Ausencia del mes</div>
            <div className={`font-mono text-[32px] font-medium tracking-[-0.02em] ${ausenteRate > 20 ? 'text-red-400' : 'text-text-primary'}`}>{ausenteRate}%</div>
            <div className={`text-[12px] mt-2 ${ausenteRate > prevAusenteRate ? 'text-red-400' : 'text-emerald-400'}`}>
              {delta(ausenteRate, prevAusenteRate)} <span className="text-text-tertiary">vs {lastMonthLabel}</span>
            </div>
          </div>
        </div>
      )}

      {/* % Ausencia in area view */}
      {selectedArea !== 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
            <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-3">% Ausencia del mes</div>
            <div className={`font-mono text-[32px] font-medium tracking-[-0.02em] ${ausenteRate > 20 ? 'text-red-400' : 'text-text-primary'}`}>{ausenteRate}%</div>
            <div className={`text-[12px] mt-2 ${ausenteRate > prevAusenteRate ? 'text-red-400' : 'text-emerald-400'}`}>
              {delta(ausenteRate, prevAusenteRate)} <span className="text-text-tertiary">vs {lastMonthLabel}</span>
            </div>
          </div>
        </div>
      )}

      {/* Por profesional — this month + threshold */}
      {byProfessional.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-[16px] font-medium">Por profesional — {thisMonthLabel}{selectedArea !== 'all' ? ` — ${selectedArea}` : ''}</h2>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-text-secondary">Alerta turnos/hora ≥</span>
              <input
                type="number"
                min={0.5}
                max={10}
                step={0.5}
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                className="w-16 bg-bg-secondary border-[0.5px] border-border rounded-lg px-2 py-1 text-[13px] text-text-primary focus:outline-none focus:border-accent text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
              <div className="text-[12px] text-text-secondary mb-4">Turnos cargados (excl. cancelados)</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byProfessional} margin={{ left: -20 }}>
                  <CartesianGrid vertical={false} stroke={GRID_CLR} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: AXIS_CLR }} />
                  <YAxis tick={{ fontSize: 11, fill: AXIS_CLR }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2a2a2800' }} />
                  <Bar dataKey="cargados" name="Cargados" radius={[4, 4, 0, 0]}>
                    {byProfessional.map((_, i) => <Cell key={i} fill={ACCENT} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
              <div className="text-[12px] text-text-secondary mb-4">Presentes vs ausentes</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byProfessional} margin={{ left: -20 }}>
                  <CartesianGrid vertical={false} stroke={GRID_CLR} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: AXIS_CLR }} />
                  <YAxis tick={{ fontSize: 11, fill: AXIS_CLR }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="presentes" name="Presentes" stackId="a" fill={EMERALD} />
                  <Bar dataKey="ausentes" name="Ausentes" stackId="a" fill={RED} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b-[0.5px] border-border">
                  {['Profesional', 'Cargados', 'Presentes', 'Ausentes', 'Cancelados', '% Ausencia', 'Turnos/hora'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byProfessional.map((p, i) => {
                  const ausenciaPct = p.cargados > 0 ? Math.round((p.ausentes / p.cargados) * 100) : 0
                  const overThreshold = p.avgPerHour >= threshold
                  return (
                    <tr key={i} className={`border-b-[0.5px] border-border last:border-b-0 ${overThreshold ? 'bg-amber-500/5' : ''}`}>
                      <td className="px-4 py-3 text-[13px] font-medium text-text-primary">{p.name}</td>
                      <td className="px-4 py-3 text-[13px] text-text-secondary font-mono">{p.cargados}</td>
                      <td className="px-4 py-3 text-[13px] text-emerald-400 font-mono">{p.presentes}</td>
                      <td className="px-4 py-3 text-[13px] text-red-400 font-mono">{p.ausentes}</td>
                      <td className="px-4 py-3 text-[13px] text-text-tertiary font-mono">{p.cancelados}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[12px] font-mono font-medium ${ausenciaPct > 20 ? 'text-red-400' : 'text-text-secondary'}`}>{ausenciaPct}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[13px] font-mono font-medium ${overThreshold ? 'text-amber-400' : 'text-text-secondary'}`}>
                          {p.avgPerHour}{overThreshold ? ' ⚠' : ''}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tendencia histórica — turnos/hora por profesional */}
      {trendProfNames.length > 0 && (
        <div>
          <h2 className="text-[16px] font-medium mb-4">Tendencia — turnos/hora últimos 5 meses{selectedArea !== 'all' ? ` — ${selectedArea}` : ''}</h2>
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
            <div className="text-[12px] text-text-secondary mb-4">Turnos cargados ÷ horas trabajadas por mes</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyTrend.map(row => ({ ...row, month: monthLabel(row.month as string) }))} margin={{ left: -10, right: 10 }}>
                <CartesianGrid stroke={GRID_CLR} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: AXIS_CLR }} />
                <YAxis tick={{ fontSize: 11, fill: AXIS_CLR }} allowDecimals={true} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: AXIS_CLR }} />
                {/* Threshold reference line as a dashed series */}
                {trendProfNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={PROF_COLORS[i % PROF_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            {threshold > 0 && (
              <p className="text-[11px] text-text-tertiary mt-3">
                Umbral de alerta: {threshold} turnos/hora — valores iguales o superiores se marcan con ⚠ en la tabla.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Distribución por día de la semana */}
      {byDayOfWeek.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
            <div className="text-[12px] text-text-secondary mb-4">Carga por día de la semana — {thisMonthLabel}{selectedArea !== 'all' ? ` — ${selectedArea}` : ''}</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byDayOfWeek} margin={{ left: -20 }}>
                <CartesianGrid vertical={false} stroke={GRID_CLR} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: AXIS_CLR }} />
                <YAxis tick={{ fontSize: 11, fill: AXIS_CLR }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Turnos" radius={[3, 3, 0, 0]}>
                  {byDayOfWeek.map((d, i) => {
                    const max = Math.max(...byDayOfWeek.map(h => h.count))
                    return <Cell key={i} fill={d.count === max ? ACCENT : GRAY} fillOpacity={d.count === max ? 1 : 0.5} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Estado de turnos — pie */}
          {t.total > 0 && (
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
              <div className="text-[12px] text-text-secondary mb-4">Distribución de estados — {thisMonthLabel}{selectedArea !== 'all' ? ` — ${selectedArea}` : ''}</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={breakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                    {breakdownData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Horas pico */}
      {t.total > 0 && (
        <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
          <div className="text-[12px] text-text-secondary mb-4">Horas pico — {thisMonthLabel}{selectedArea !== 'all' ? ` — ${selectedArea}` : ''}</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byHour} margin={{ left: -24 }}>
              <CartesianGrid vertical={false} stroke={GRID_CLR} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: AXIS_CLR }} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: AXIS_CLR }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Turnos" radius={[3, 3, 0, 0]}>
                {byHour.map((d, i) => {
                  const max = Math.max(...byHour.map(h => h.count))
                  return <Cell key={i} fill={d.count === max ? ACCENT : GRAY} fillOpacity={d.count === max ? 1 : 0.5} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {t.total === 0 && (
        <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-12 text-center">
          <p className="text-[14px] text-text-secondary">No hay turnos registrados en {thisMonthLabel}{selectedArea !== 'all' ? ` para ${selectedArea}` : ''}.</p>
        </div>
      )}
    </div>
  )
}
