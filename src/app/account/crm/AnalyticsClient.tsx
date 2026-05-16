'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import type { Analytics } from './CRMPageClient'

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

export default function AnalyticsClient({ analytics }: { analytics: Analytics }) {
  const { thisStats: t, lastStats: l, byProfessional, byHour, upcoming, thisMonthLabel, lastMonthLabel, totalPatients, activePatients } = analytics

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

      {/* KPI Cards */}
      <div>
        <h2 className="text-[16px] font-medium mb-4">{thisMonthLabel}</h2>
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

      {/* Pacientes */}
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

      {/* Por profesional */}
      {byProfessional.length > 0 && (
        <div>
          <h2 className="text-[16px] font-medium mb-4">Por profesional — {thisMonthLabel}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bar chart */}
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

            {/* Presentes vs ausentes stacked */}
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

          {/* Table */}
          <div className="mt-4 bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b-[0.5px] border-border">
                  {['Profesional', 'Turnos', 'Presentes', 'Ausentes', 'Cancelados', '% Ausencia', 'Prom/hora'].map(h => (
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

      {/* Estado de turnos — pie */}
      {t.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
            <div className="text-[12px] text-text-secondary mb-4">Distribución de estados — {thisMonthLabel}</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={breakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                  {breakdownData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Horas pico */}
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
            <div className="text-[12px] text-text-secondary mb-4">Horas pico — {thisMonthLabel}</div>
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
          <p className="text-[14px] text-text-secondary">No hay turnos registrados en {thisMonthLabel}.</p>
        </div>
      )}
    </div>
  )
}
