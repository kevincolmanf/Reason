'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import type { Analytics, RawTurno } from './CRMPageClient'

const ACCENT   = '#c47c5a'
const EMERALD  = '#10b981'
const RED      = '#ef4444'
const GRAY     = '#6b7280'
const AXIS_CLR = '#6b6b65'
const GRID_CLR = '#2a2a28'

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

type TooltipPayloadItem = { name: string; value: number; fill?: string; stroke?: string }
type TooltipProps = { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[12px] shadow-lg">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill ?? p.stroke }}>{p.name}: {p.value}</p>
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

function computeByProfessional(turnos: RawTurno[]) {
  // avgPerHour: per professional, group by calendar date, for each date compute
  // (max end_time - min start_time) in hours, sum across all days, divide presentes by total hours
  type ProfEntry = {
    total: number
    presentes: number
    ausentes: number
    cancelados: number
    // date → { minStart, maxEnd }
    days: Map<string, { minStart: number; maxEnd: number }>
  }
  const profMap = new Map<string, ProfEntry>()

  turnos.forEach((t) => {
    const name = t.professional_name ?? 'Sin asignar'
    if (!profMap.has(name)) profMap.set(name, { total: 0, presentes: 0, ausentes: 0, cancelados: 0, days: new Map() })
    const e = profMap.get(name)!
    e.total++
    if (t.status === 'presente') e.presentes++
    if (t.status === 'ausente') e.ausentes++
    if (t.status === 'cancelado') e.cancelados++

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
        total: e.total,
        presentes: e.presentes,
        ausentes: e.ausentes,
        cancelados: e.cancelados,
        avgPerHour: totalHours > 0 ? +(e.presentes / totalHours).toFixed(1) : 0,
      }
    })
    .sort((a, b) => b.total - a.total)
}

function computeByHour(turnos: RawTurno[]) {
  const hourMap = new Map<number, number>()
  for (let h = 7; h <= 20; h++) hourMap.set(h, 0)
  turnos.forEach((t) => {
    const h = new Date(t.start_time).getHours()
    hourMap.set(h, (hourMap.get(h) ?? 0) + 1)
  })
  return Array.from(hourMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hour, count]) => ({ hour: `${String(hour).padStart(2, '0')}:00`, count }))
}

export default function AnalyticsClient({ analytics }: { analytics: Analytics }) {
  const { rawTurnosThis, rawTurnosLast, upcoming, thisMonthLabel, lastMonthLabel, totalPatients, activePatients } = analytics

  // Derive available areas
  const areas = useMemo(() => {
    const set = new Set<string>()
    rawTurnosThis.forEach(t => { if (t.area) set.add(t.area) })
    rawTurnosLast.forEach(t => { if (t.area) set.add(t.area) })
    return Array.from(set).sort()
  }, [rawTurnosThis, rawTurnosLast])

  const [selectedArea, setSelectedArea] = useState<string>('all')

  const filteredThis = useMemo(() =>
    selectedArea === 'all' ? rawTurnosThis : rawTurnosThis.filter(t => t.area === selectedArea),
    [rawTurnosThis, selectedArea]
  )
  const filteredLast = useMemo(() =>
    selectedArea === 'all' ? rawTurnosLast : rawTurnosLast.filter(t => t.area === selectedArea),
    [rawTurnosLast, selectedArea]
  )

  const t = useMemo(() => computeStats(filteredThis), [filteredThis])
  const l = useMemo(() => computeStats(filteredLast), [filteredLast])
  const byProfessional = useMemo(() => computeByProfessional(filteredThis), [filteredThis])
  const byHour = useMemo(() => computeByHour(filteredThis), [filteredThis])

  const ausenteRate = t.total > 0 ? Math.round((t.ausentes / t.total) * 100) : 0
  const prevAusenteRate = l.total > 0 ? Math.round((l.ausentes / l.total) * 100) : 0

  const breakdownData = [
    { name: 'Presentes', value: t.presentes, fill: EMERALD },
    { name: 'Ausentes', value: t.ausentes, fill: RED },
    { name: 'Cancelados', value: t.cancelados, fill: GRAY },
    { name: 'Programados', value: t.total - t.presentes - t.ausentes - t.cancelados, fill: '#3b82f6' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-10">

      {/* Area filter */}
      {areas.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-text-secondary">Ver:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedArea('all')}
              className={`px-3 py-1.5 rounded-lg text-[13px] border-[0.5px] transition-colors ${selectedArea === 'all' ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}
            >
              Todas las áreas
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
        </div>
      )}

      {/* KPI Cards */}
      <div>
        <h2 className="text-[16px] font-medium mb-4">{thisMonthLabel}{selectedArea !== 'all' ? ` — ${selectedArea}` : ''}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard label="Turnos totales" value={t.total} prev={l.total} prevLabel={lastMonthLabel} />
          <KPICard label="Presentes" value={t.presentes} prev={l.presentes} prevLabel={lastMonthLabel} />
          <KPICard label="Ausentes" value={t.ausentes} prev={l.ausentes} prevLabel={lastMonthLabel} higherIsBetter={false} />
          <KPICard label="Cancelados" value={t.cancelados} prev={l.cancelados} prevLabel={lastMonthLabel} higherIsBetter={false} />
          <KPICard label="Nuevos ingresos" value={t.nuevos} prev={l.nuevos} prevLabel={lastMonthLabel} />
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

      {/* % Ausencia in area-filtered view */}
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

      {/* Por profesional */}
      {byProfessional.length > 0 && (
        <div>
          <h2 className="text-[16px] font-medium mb-4">Por profesional — {thisMonthLabel}{selectedArea !== 'all' ? ` — ${selectedArea}` : ''}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
              <div className="text-[12px] text-text-secondary mb-4">Turnos totales</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byProfessional} margin={{ left: -20 }}>
                  <CartesianGrid vertical={false} stroke={GRID_CLR} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: AXIS_CLR }} />
                  <YAxis tick={{ fontSize: 11, fill: AXIS_CLR }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2a2a2800' }} />
                  <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]}>
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
                  {['Profesional', 'Turnos', 'Presentes', 'Ausentes', 'Cancelados', '% Ausencia', 'Pac/hora'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byProfessional.map((p, i) => {
                  const ausenciaPct = p.total > 0 ? Math.round((p.ausentes / p.total) * 100) : 0
                  return (
                    <tr key={i} className="border-b-[0.5px] border-border last:border-b-0">
                      <td className="px-4 py-3 text-[13px] font-medium text-text-primary">{p.name}</td>
                      <td className="px-4 py-3 text-[13px] text-text-secondary font-mono">{p.total}</td>
                      <td className="px-4 py-3 text-[13px] text-emerald-400 font-mono">{p.presentes}</td>
                      <td className="px-4 py-3 text-[13px] text-red-400 font-mono">{p.ausentes}</td>
                      <td className="px-4 py-3 text-[13px] text-text-tertiary font-mono">{p.cancelados}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[12px] font-mono font-medium ${ausenciaPct > 20 ? 'text-red-400' : 'text-text-secondary'}`}>{ausenciaPct}%</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-text-secondary font-mono">{p.avgPerHour}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estado de turnos — pie + horas pico */}
      {t.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
            <div className="text-[12px] text-text-secondary mb-4">Distribución de estados — {thisMonthLabel}{selectedArea !== 'all' ? ` — ${selectedArea}` : ''}</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={breakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                  {breakdownData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
            <div className="text-[12px] text-text-secondary mb-4">Horas pico — {thisMonthLabel}{selectedArea !== 'all' ? ` — ${selectedArea}` : ''}</div>
            <ResponsiveContainer width="100%" height={220}>
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
        </div>
      )}

      {t.total === 0 && (
        <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-12 text-center">
          <p className="text-[14px] text-text-secondary">No hay turnos registrados en {thisMonthLabel}{selectedArea !== 'all' ? ` para el área ${selectedArea}` : ''}.</p>
        </div>
      )}
    </div>
  )
}
