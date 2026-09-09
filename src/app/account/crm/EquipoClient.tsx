'use client'

import { useState, useMemo } from 'react'

export type TeamMember = {
  id: string
  name: string
  turnos: number
  nuevos: number
  horas: number
  pacDia: number
  pacHora: number
  ausenciaPct: number | null
  pacientesMes: number
  activos: number
  altas: number
  abandonos: number
  abandonoPct: number | null
  completanPct: number | null
  duracionSem: number | null
  enRiesgo: number
  fichasMes: number
  planesMes: number
  evalsMes: number
  planesDesact: number
}

type SortKey = 'name' | 'activos' | 'nuevos' | 'horas' | 'pacDia' | 'pacHora' | 'ausenciaPct' | 'completanPct' | 'abandonoPct' | 'duracionSem' | 'fichasMes' | 'planesMes' | 'planesDesact' | 'evalsMes'

// Textos de ayuda (globo al pasar el mouse por cada columna).
const TIPS: Record<SortKey, string> = {
  name: 'Profesional del equipo. Tocá la fila para su resumen 1:1.',
  activos: 'Pacientes en tratamiento: sin alta ni abandono marcados.',
  nuevos: 'Primeras consultas del mes (turnos "primera vez" o "ingreso").',
  horas: 'Horas atendidas en el mes (suma de la duración de sus turnos).',
  pacDia: 'Promedio de pacientes por día trabajado en el mes.',
  pacHora: 'Pacientes por hora: densidad de atención.',
  ausenciaPct: 'Ausencias sobre turnos resueltos (presentes + ausentes). Objetivo: ≤ 10%.',
  completanPct: 'De los que ya pudieron (primer turno hace ≥6 sem), cuántos llegan a ≥10 sesiones o 6 semanas.',
  abandonoPct: 'De los tratamientos terminados, qué proporción fue abandono (vs. alta).',
  duracionSem: 'Duración media del tratamiento: del primer turno al alta (solo pacientes dados de alta).',
  fichasMes: 'Fichas cargadas o actualizadas en el mes.',
  planesMes: 'Planes de ejercicio creados en el mes.',
  planesDesact: 'Pacientes activos con ≥7 días desde la consulta y sin plan cargado/actualizado.',
  evalsMes: 'Evaluaciones del mes: cuestionarios + dinamometría + RTS.',
}

// ── Semáforos (umbrales definidos con Kevin) ──
const cAus = (v: number | null) => v == null ? '' : v > 20 ? 'text-red-400' : v > 10 ? 'text-warning' : 'text-emerald-400'
const cComp = (v: number | null) => v == null ? '' : v < 60 ? 'text-red-400' : v < 75 ? 'text-warning' : 'text-emerald-400'
const cAband = (v: number | null) => v == null ? '' : v > 30 ? 'text-red-400' : v > 15 ? 'text-warning' : 'text-emerald-400'
const cDur = (v: number | null) => v == null ? '' : v < 6 ? 'text-red-400' : v < 9 ? 'text-warning' : 'text-emerald-400'
const cDesact = (v: number) => v >= 7 ? 'text-red-400' : v >= 4 ? 'text-warning' : 'text-emerald-400'

const fmtPct = (v: number | null) => v == null ? '—' : `${v}%`
const fmtSem = (v: number | null) => v == null ? '—' : `${v} sem`

function flagged(m: TeamMember): boolean {
  return (m.ausenciaPct != null && m.ausenciaPct > 10) ||
    (m.completanPct != null && m.completanPct < 60) ||
    m.planesDesact >= 7 || m.pacHora >= 3 ||
    (m.duracionSem != null && m.duracionSem < 6)
}

export default function EquipoClient({ team, monthLabel }: { team: TeamMember[]; monthLabel: string }) {
  const [sortKey, setSortKey] = useState<SortKey>('activos')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [open, setOpen] = useState<TeamMember | null>(null)
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null)

  const rows = useMemo(() => {
    const arr = [...team]
    arr.sort((a, b) => {
      const x = a[sortKey], y = b[sortKey]
      if (typeof x === 'string' || typeof y === 'string') return sortDir * String(x).localeCompare(String(y))
      const xv = x == null ? -1 : x, yv = y == null ? -1 : y
      return sortDir * ((xv as number) - (yv as number))
    })
    return arr
  }, [team, sortKey, sortDir])

  // Promedios del centro (ignora nulos) para la comparación del 1:1.
  const center = useMemo(() => {
    const avg = (pick: (m: TeamMember) => number | null) => {
      const vals = team.map(pick).filter((v): v is number => v != null)
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
    }
    return {
      ausenciaPct: avg(m => m.ausenciaPct),
      completanPct: avg(m => m.completanPct),
      abandonoPct: avg(m => m.abandonoPct),
      duracionSem: avg(m => m.duracionSem),
      fichasMes: avg(m => m.fichasMes),
      planesMes: avg(m => m.planesMes),
      planesDesact: avg(m => m.planesDesact),
      evalsMes: avg(m => m.evalsMes),
    }
  }, [team])

  const setSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => (d === 1 ? -1 : 1))
    else { setSortKey(k); setSortDir(k === 'name' ? 1 : -1) }
  }

  const H = ({ k, label, right = true }: { k: SortKey; label: string; right?: boolean }) => (
    <th
      onClick={() => setSort(k)}
      onMouseEnter={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setTip({ text: TIPS[k], x: Math.max(8, Math.min(r.left, window.innerWidth - 300)), y: r.bottom + 6 }) }}
      onMouseLeave={() => setTip(null)}
      className={`${right ? 'text-right' : 'text-left'} px-3 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] cursor-help select-none hover:text-text-primary whitespace-nowrap`}
    >
      {label}{sortKey === k && <span className="opacity-50 ml-1 text-[9px]">{sortDir < 0 ? '▼' : '▲'}</span>}
    </th>
  )

  if (team.length === 0) {
    return <div className="p-12 text-center text-[14px] text-text-secondary">Todavía no hay profesionales con actividad para mostrar.</div>
  }

  return (
    <div>
      <p className="text-[13px] text-text-secondary mb-4">
        Un vistazo de cada profesional para conversar cara a cara. Tocá una fila para ver su resumen 1:1. Operación y trabajo clínico son del mes de <span className="text-text-primary">{monthLabel}</span>; retención y duración, sobre todo el historial.
      </p>

      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px]">
            <thead>
              <tr className="border-b-[0.5px] border-border">
                <H k="name" label="Profesional" right={false} />
                <H k="activos" label="Activos" />
                <H k="nuevos" label="Nuevos" />
                <H k="horas" label="Horas" />
                <H k="pacDia" label="Pac/día" />
                <H k="pacHora" label="Pac/hora" />
                <H k="ausenciaPct" label="% Aus." />
                <H k="completanPct" label="Completan" />
                <H k="abandonoPct" label="% Aband." />
                <H k="duracionSem" label="Durac." />
                <H k="fichasMes" label="Fichas/mes" />
                <H k="planesMes" label="Planes/mes" />
                <H k="planesDesact" label="Planes desact." />
                <H k="evalsMes" label="Evals" />
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => (
                <tr
                  key={m.id}
                  onClick={() => setOpen(m)}
                  className={`border-b-[0.5px] border-border last:border-b-0 cursor-pointer hover:bg-bg-secondary transition-colors ${i % 2 === 1 ? 'bg-bg-secondary/30' : ''}`}
                >
                  <td className="px-3 py-3 text-[13px] font-medium text-text-primary whitespace-nowrap">
                    {m.name}{flagged(m) && <span className="text-warning ml-1.5" title="A conversar">⚑</span>}
                    <span className="text-text-tertiary ml-1.5 text-[11px]">›</span>
                  </td>
                  <td className="px-3 py-3 text-[13px] text-text-secondary text-right font-mono tabular-nums">{m.activos}</td>
                  <td className="px-3 py-3 text-[13px] text-text-secondary text-right font-mono tabular-nums">{m.nuevos}</td>
                  <td className="px-3 py-3 text-[13px] text-text-secondary text-right font-mono tabular-nums">{m.horas}</td>
                  <td className="px-3 py-3 text-[13px] text-text-secondary text-right font-mono tabular-nums">{m.pacDia}</td>
                  <td className={`px-3 py-3 text-[13px] text-right font-mono tabular-nums ${m.pacHora >= 3 ? 'text-warning' : 'text-text-secondary'}`}>{m.pacHora}</td>
                  <td className={`px-3 py-3 text-[13px] text-right font-mono tabular-nums ${cAus(m.ausenciaPct)}`}>{fmtPct(m.ausenciaPct)}</td>
                  <td className={`px-3 py-3 text-[13px] text-right font-mono tabular-nums ${cComp(m.completanPct)}`}>{fmtPct(m.completanPct)}</td>
                  <td className={`px-3 py-3 text-[13px] text-right font-mono tabular-nums ${cAband(m.abandonoPct)}`}>{fmtPct(m.abandonoPct)}</td>
                  <td className={`px-3 py-3 text-[13px] text-right font-mono tabular-nums ${cDur(m.duracionSem)}`}>{fmtSem(m.duracionSem)}</td>
                  <td className="px-3 py-3 text-[13px] text-text-secondary text-right font-mono tabular-nums">{m.fichasMes}</td>
                  <td className="px-3 py-3 text-[13px] text-text-secondary text-right font-mono tabular-nums">{m.planesMes}</td>
                  <td className={`px-3 py-3 text-[13px] text-right font-mono tabular-nums ${cDesact(m.planesDesact)}`}>{m.planesDesact}</td>
                  <td className="px-3 py-3 text-[13px] text-text-secondary text-right font-mono tabular-nums">{m.evalsMes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11.5px] text-text-tertiary mt-3">
        <span className="text-emerald-400">verde</span> bien · <span className="text-warning">ámbar</span> a vigilar · <span className="text-red-400">rojo</span> a conversar ·
        {' '}<span className="text-text-primary">pasá el mouse por cada columna</span> para ver qué mide. Activos = en tratamiento (sin alta ni abandono); duración = hasta el alta; ausencia alerta &gt;10%.
      </p>

      {open && <Scorecard m={open} center={center} monthLabel={monthLabel} onClose={() => setOpen(null)} />}

      {tip && (
        <div
          className="fixed z-[70] pointer-events-none max-w-[280px] bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[12px] text-text-secondary shadow-xl leading-snug"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text} <span className="text-text-tertiary">· Clic para ordenar.</span>
        </div>
      )}
    </div>
  )
}

// ── Scorecard 1:1 ──
function Scorecard({ m, center, monthLabel, onClose }: {
  m: TeamMember
  center: { ausenciaPct: number | null; completanPct: number | null; abandonoPct: number | null; duracionSem: number | null; fichasMes: number | null; planesMes: number | null; planesDesact: number | null; evalsMes: number | null }
  monthLabel: string
  onClose: () => void
}) {
  const cmp = (val: number | null, cen: number | null, unit: string, better: 'low' | 'high') => {
    let cls = 'text-text-primary'
    if (val != null && cen != null) {
      const good = better === 'low' ? val <= cen : val >= cen
      const bad = better === 'low' ? val >= cen * 1.2 : val <= cen * 0.8
      cls = good ? 'text-emerald-400' : bad ? 'text-red-400' : 'text-warning'
    }
    return { v: val == null ? '—' : `${val}${unit}`, c: cen == null ? '—' : `${Math.round(cen)}${unit}`, cls }
  }

  const rowsCore: [string, ReturnType<typeof cmp>][] = [
    ['% Ausencia de sus pacientes', cmp(m.ausenciaPct, center.ausenciaPct, '%', 'low')],
    ['Completan (≥10 ses / 6 sem)', cmp(m.completanPct, center.completanPct, '%', 'high')],
    ['% Abandono (de los terminados)', cmp(m.abandonoPct, center.abandonoPct, '%', 'low')],
    ['Duración (hasta el alta)', cmp(m.duracionSem, center.duracionSem, ' sem', 'high')],
  ]
  const rowsClin: [string, ReturnType<typeof cmp>][] = [
    ['Fichas trabajadas (mes)', cmp(m.fichasMes, center.fichasMes, '', 'high')],
    ['Planes cargados (mes)', cmp(m.planesMes, center.planesMes, '', 'high')],
    ['Planes desactualizados', cmp(m.planesDesact, center.planesDesact, '', 'low')],
    ['Evaluaciones (mes)', cmp(m.evalsMes, center.evalsMes, '', 'high')],
  ]

  // Señales para conversar
  const talk: { sev: 'bad' | 'warn' | 'good'; t: string }[] = []
  if (m.planesDesact >= 7) talk.push({ sev: 'bad', t: `${m.planesDesact} pacientes con plan desactualizado (≥7 días de la consulta sin plan)` })
  else if (m.planesDesact >= 4) talk.push({ sev: 'warn', t: `${m.planesDesact} pacientes con plan desactualizado` })
  if (m.completanPct != null && m.completanPct < 60) talk.push({ sev: 'bad', t: `Solo ${m.completanPct}% de sus pacientes completa el tratamiento (≥10 ses / 6 sem)` })
  else if (m.completanPct != null && m.completanPct >= 80) talk.push({ sev: 'good', t: `${m.completanPct}% de sus pacientes llega al tratamiento completo` })
  if (m.abandonoPct != null && m.abandonoPct > 30) talk.push({ sev: 'bad', t: `${m.abandonoPct}% de sus tratamientos terminados fueron abandono (${m.abandonos} de ${m.altas + m.abandonos})` })
  else if (m.abandonoPct != null && m.abandonoPct <= 15 && (m.altas + m.abandonos) >= 3) talk.push({ sev: 'good', t: `Bajo abandono (${m.abandonoPct}%)` })
  if (m.duracionSem != null && m.duracionSem < 6) talk.push({ sev: 'warn', t: `Tratamientos cortos (${m.duracionSem} sem de media) — muchos no llegan a 6 semanas` })
  if (m.ausenciaPct != null && m.ausenciaPct > 20) talk.push({ sev: 'bad', t: `Ausentismo muy alto (${m.ausenciaPct}%) — muy por encima del 10%` })
  else if (m.ausenciaPct != null && m.ausenciaPct > 10) talk.push({ sev: 'warn', t: `Ausentismo ${m.ausenciaPct}% — sobre el objetivo de 10%` })
  else if (m.ausenciaPct != null) talk.push({ sev: 'good', t: `Ausentismo bajo control (${m.ausenciaPct}%)` })
  if (m.pacHora >= 3) talk.push({ sev: 'warn', t: `Densidad alta (${m.pacHora} pac/hora, ${m.horas} h en el mes) — posible sobrecarga` })
  if (m.enRiesgo > 0) talk.push({ sev: 'warn', t: `${m.enRiesgo} de sus pacientes en riesgo de perderse (sin turno hace +7 días)` })
  if (talk.length === 0) talk.push({ sev: 'good', t: 'Sin señales de alerta este mes.' })
  const order = { bad: 0, warn: 1, good: 2 }
  talk.sort((a, b) => order[a.sev] - order[b.sev])
  const sevColor = { bad: 'border-red-400', warn: 'border-warning', good: 'border-emerald-400' }

  const CmpTable = ({ title, rows }: { title: string; rows: [string, ReturnType<typeof cmp>][] }) => (
    <>
      <div className="text-[11px] uppercase tracking-[0.06em] text-text-secondary font-medium mt-6 mb-2">{title}</div>
      <table className="w-full">
        <thead>
          <tr className="border-b-[0.5px] border-border">
            <th className="text-left py-2 text-[10px] uppercase tracking-[0.05em] text-text-secondary font-medium">Métrica</th>
            <th className="text-right py-2 text-[10px] uppercase tracking-[0.05em] text-text-secondary font-medium">Profesional</th>
            <th className="text-right py-2 text-[10px] uppercase tracking-[0.05em] text-text-secondary font-medium">Prom. centro</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, r]) => (
            <tr key={label} className="border-b-[0.5px] border-border last:border-b-0">
              <td className="py-2 text-[13px] text-text-primary">{label}</td>
              <td className={`py-2 text-[13px] text-right font-mono tabular-nums ${r.cls}`}>{r.v}</td>
              <td className="py-2 text-[13px] text-right font-mono tabular-nums text-text-tertiary">{r.c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl w-full max-w-[680px] my-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-5 border-b-[0.5px] border-border">
          <div>
            <h3 className="text-[19px] font-medium">{m.name}</h3>
            <p className="text-[12.5px] text-text-secondary mt-1">Resumen para una conversación 1:1</p>
          </div>
          <button onClick={onClose} className="text-[13px] text-text-secondary hover:text-text-primary border-[0.5px] border-border rounded-lg w-8 h-8 shrink-0">✕</button>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-3 gap-3 mb-2">
            {[['Horas / mes', m.horas, 'atendidas'], ['Pacientes / día', m.pacDia, 'promedio'], ['Pacientes / hora', m.pacHora, 'densidad']].map(([l, v, s]) => (
              <div key={l as string} className="bg-bg-primary border-[0.5px] border-border rounded-xl p-4">
                <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-secondary">{l}</div>
                <div className="font-mono text-[20px] font-medium mt-1.5 tabular-nums">{v}</div>
                <div className="text-[10.5px] text-text-tertiary mt-1">{s}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-4" title="Pacientes en tratamiento: sin alta ni abandono">
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-secondary">Activos</div>
              <div className="font-mono text-[18px] font-medium mt-1.5 tabular-nums">{m.activos}</div>
            </div>
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-4" title="Pacientes dados de alta (tratamiento terminado)">
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-secondary">Altas</div>
              <div className="font-mono text-[18px] font-medium mt-1.5 tabular-nums text-emerald-400">{m.altas}</div>
            </div>
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-4" title="Pacientes que abandonaron el tratamiento">
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-secondary">Abandonos</div>
              <div className={`font-mono text-[18px] font-medium mt-1.5 tabular-nums ${m.abandonos > 0 ? 'text-red-400' : ''}`}>{m.abandonos}</div>
            </div>
          </div>
          <p className="text-[12px] text-text-secondary mt-3">Nuevos en {monthLabel.split(' ')[0]}: <span className="text-text-primary font-mono">{m.nuevos}</span> · En riesgo de perderse: <span className={`font-mono ${m.enRiesgo > 0 ? 'text-warning' : 'text-text-primary'}`}>{m.enRiesgo}</span></p>

          <CmpTable title="Núcleo" rows={rowsCore} />
          <CmpTable title="Trabajo clínico" rows={rowsClin} />

          <div className="text-[11px] uppercase tracking-[0.06em] text-text-secondary font-medium mt-6 mb-2">Señales para conversar</div>
          <div className="flex flex-col gap-2">
            {talk.map((s, i) => (
              <div key={i} className={`text-[13px] bg-bg-primary border-[0.5px] border-border ${sevColor[s.sev]} border-l-[3px] rounded-lg px-3 py-2.5`}>{s.t}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
