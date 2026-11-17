'use client'

import { useMemo, useState } from 'react'
import {
  type CaseRow, type RankingItem, rankingByCategory, percentTrue, withinPeriod,
  PERIOD_OPTIONS, MIN_SAMPLE_SIZE,
  ACTIVIDAD_LABELS, TABAQUISMO_LABELS, ALCOHOL_LABELS, SOCIOECONOMICO_LABELS,
  SEXO_LABELS, MECANISMO_LABELS, LATERALIDAD_LABELS, ESFUERZO_LABELS,
} from './stats'

const ACCENT = '#c47c5a'

export interface DiagnosisOption {
  id: string
  nombre: string
  codigoCie10: string | null
  bodyRegionId: string
}

export interface BodyRegion {
  id: string
  nombre: string
}

function RankingBar({ label, count, pct }: RankingItem) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[13px] text-text-primary">{label}</span>
        <span className="text-[13px] font-mono text-text-secondary">
          {count} <span className="text-text-tertiary text-[11px]">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
      </div>
    </div>
  )
}

function RankingSection({ title, items }: { title: string; items: RankingItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
      <div className="text-[12px] text-text-secondary mb-4">{title}</div>
      <div className="space-y-3">
        {items.map(i => <RankingBar key={i.label} {...i} />)}
      </div>
    </div>
  )
}

export default function EstadisticasClient({ cases, diagnosisOptions, bodyRegions }: {
  cases: CaseRow[]
  diagnosisOptions: DiagnosisOption[]
  bodyRegions: BodyRegion[]
}) {
  const [periodValue, setPeriodValue] = useState('todo')
  const [regionId, setRegionId] = useState('all')
  const [diagnosisId, setDiagnosisId] = useState('all')

  const period = PERIOD_OPTIONS.find(p => p.value === periodValue) ?? PERIOD_OPTIONS[PERIOD_OPTIONS.length - 1]

  const diagnosisInRegion = useMemo(
    () => regionId === 'all'
      ? []
      : diagnosisOptions.filter(d => d.bodyRegionId === regionId).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [diagnosisOptions, regionId],
  )

  const filtered = useMemo(() => cases.filter(c => {
    if (!withinPeriod(c.fichaFecha, period.months)) return false
    if (diagnosisId !== 'all') return c.diagnosisId === diagnosisId
    if (regionId !== 'all') return c.bodyRegionId === regionId
    return true
  }), [cases, period, regionId, diagnosisId])

  const total = filtered.length
  const smallSample = total > 0 && total < MIN_SAMPLE_SIZE

  const actividad = useMemo(() => rankingByCategory(filtered, c => c.nivelActividadFisica, ACTIVIDAD_LABELS), [filtered])
  const tabaquismo = useMemo(() => rankingByCategory(filtered, c => c.tabaquismo, TABAQUISMO_LABELS), [filtered])
  const alcohol = useMemo(() => rankingByCategory(filtered, c => c.consumoAlcohol, ALCOHOL_LABELS), [filtered])
  const socioeconomico = useMemo(() => rankingByCategory(filtered, c => c.nivelSocioeconomico, SOCIOECONOMICO_LABELS), [filtered])
  const sexo = useMemo(() => rankingByCategory(filtered, c => c.sexo, SEXO_LABELS), [filtered])
  const edad = useMemo(() => rankingByCategory(filtered, c => c.ageBucket, {}), [filtered])
  const esfuerzo = useMemo(() => rankingByCategory(filtered, c => c.occupationNivelEsfuerzo, ESFUERZO_LABELS), [filtered])
  const mecanismo = useMemo(() => rankingByCategory(filtered, c => c.mecanismoLesion, MECANISMO_LABELS), [filtered])
  const lateralidad = useMemo(() => rankingByCategory(filtered, c => c.lateralidad, LATERALIDAD_LABELS), [filtered])

  const comorbilidades: RankingItem[] = useMemo(() => ([
    { label: 'Diabetes', stat: percentTrue(filtered, c => c.diabetes) },
    { label: 'Hipertensión', stat: percentTrue(filtered, c => c.hipertension) },
    { label: 'Obesidad', stat: percentTrue(filtered, c => c.obesidad) },
    { label: 'Enf. cardiovascular', stat: percentTrue(filtered, c => c.enfCardiovascular) },
    { label: 'Osteoporosis', stat: percentTrue(filtered, c => c.osteoporosis) },
    { label: 'Cirugía previa', stat: percentTrue(filtered, c => c.cirugiaPrevia) },
  ])
    .filter(c => c.stat.answered > 0)
    .map(c => ({ label: c.label, count: c.stat.count, pct: c.stat.pct })),
    [filtered])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-[12px] text-text-secondary mb-1">Categoría corporal</label>
          <select
            value={regionId}
            onChange={e => { setRegionId(e.target.value); setDiagnosisId('all') }}
            className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent"
          >
            <option value="all">Todas</option>
            {bodyRegions.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] text-text-secondary mb-1">Diagnóstico</label>
          <select
            value={diagnosisId}
            onChange={e => setDiagnosisId(e.target.value)}
            disabled={regionId === 'all'}
            className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent disabled:opacity-40"
          >
            <option value="all">Todos los de esta categoría</option>
            {diagnosisInRegion.map(d => (
              <option key={d.id} value={d.id}>{d.nombre}{d.codigoCie10 ? ` · ${d.codigoCie10}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[12px] text-text-secondary mb-1">Período</label>
          <select
            value={periodValue}
            onChange={e => setPeriodValue(e.target.value)}
            className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent"
          >
            {PERIOD_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
        <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-3">Casos</div>
        <div className="font-mono text-[32px] font-medium text-text-primary tracking-[-0.02em]">{total}</div>
        {smallSample && (
          <p className="text-[12px] text-amber-400 mt-2">⚠ Muestra chica — no representativa para una presentación.</p>
        )}
      </div>

      {total === 0 ? (
        <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-12 text-center">
          <p className="text-[14px] text-text-secondary">No hay casos con diagnóstico estructurado para este filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RankingSection title="Nivel de actividad física" items={actividad} />
          <RankingSection title="Tabaquismo" items={tabaquismo} />
          <RankingSection title="Consumo de alcohol" items={alcohol} />
          <RankingSection title="Nivel socioeconómico" items={socioeconomico} />
          <RankingSection title="Sexo" items={sexo} />
          <RankingSection title="Rango de edad" items={edad} />
          <RankingSection title="Nivel de esfuerzo ocupacional" items={esfuerzo} />
          <RankingSection title="Mecanismo de lesión" items={mecanismo} />
          <RankingSection title="Lateralidad" items={lateralidad} />
          <RankingSection title="Comorbilidades — % que la tiene, sobre los preguntados" items={comorbilidades} />
        </div>
      )}
    </div>
  )
}
