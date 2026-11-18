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

export interface PatientInfo {
  id: string
  name: string
  dni: string | null
  createdAt: string
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

type SortBy = 'casos' | 'nombre' | 'fecha'

// Lista de solo lectura para que el dueño revise qué pacientes componen las
// estadísticas antes de usarlas o exportarlas, y detecte pacientes de prueba.
// No filtra ni excluye nada: es una herramienta de auditoría manual, separada
// del agregado (que sigue siendo solo conteos y porcentajes).
function PatientReviewSection({ patients, casosPorPaciente }: {
  patients: PatientInfo[]
  casosPorPaciente: Map<string, number>
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('casos')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = patients
      .map(p => ({ ...p, casos: casosPorPaciente.get(p.id) ?? 0 }))
      .filter(p => !q || p.name.toLowerCase().includes(q) || (p.dni ?? '').includes(q))
    list.sort((a, b) => {
      if (sortBy === 'nombre') return a.name.localeCompare(b.name)
      if (sortBy === 'fecha') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return b.casos - a.casos
    })
    return list
  }, [patients, casosPorPaciente, search, sortBy])

  const sinCasos = patients.filter(p => (casosPorPaciente.get(p.id) ?? 0) === 0).length

  return (
    <div className="bg-bg-primary border-[0.5px] border-border rounded-xl">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-4 p-6 text-left">
        <div>
          <div className="text-[14px] font-medium text-text-primary">Revisar pacientes cargados</div>
          <div className="text-[12px] text-text-secondary mt-0.5">
            {patients.length} pacientes · {sinCasos} sin casos en las estadísticas — revisá antes de usar o exportar los datos
          </div>
        </div>
        <span className="text-[12px] text-text-secondary whitespace-nowrap">{open ? 'Ocultar ▲' : 'Mostrar ▼'}</span>
      </button>
      {open && (
        <div className="px-6 pb-6">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] mb-4 focus:outline-none focus:border-accent"
          />
          {rows.length === 0 ? (
            <p className="text-[13px] text-text-secondary py-4 text-center">Sin resultados para &quot;{search}&quot;.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-text-secondary border-b-[0.5px] border-border">
                    <th className="py-2 pr-4 font-normal cursor-pointer select-none" onClick={() => setSortBy('nombre')}>Paciente</th>
                    <th className="py-2 pr-4 font-normal">DNI</th>
                    <th className="py-2 pr-4 font-normal cursor-pointer select-none" onClick={() => setSortBy('fecha')}>Alta</th>
                    <th className="py-2 pr-0 font-normal text-right cursor-pointer select-none" onClick={() => setSortBy('casos')}>Casos</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(p => (
                    <tr key={p.id} className="border-b-[0.5px] border-border/50 last:border-0">
                      <td className="py-2 pr-4 text-text-primary">{p.name}</td>
                      <td className="py-2 pr-4 text-text-secondary font-mono">{p.dni || '—'}</td>
                      <td className="py-2 pr-4 text-text-secondary">{new Date(p.createdAt).toLocaleDateString('es-AR')}</td>
                      <td className="py-2 pr-0 text-right font-mono text-text-primary">{p.casos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function EstadisticasClient({ cases, diagnosisOptions, bodyRegions, patients }: {
  cases: CaseRow[]
  diagnosisOptions: DiagnosisOption[]
  bodyRegions: BodyRegion[]
  patients: PatientInfo[]
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

  // Casos por paciente sobre el total (no sobre `filtered`): la lista de
  // revisión es una auditoría de todo lo cargado, no de lo que esté filtrado
  // arriba en los gráficos.
  const casosPorPaciente = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of cases) m.set(c.patientId, (m.get(c.patientId) ?? 0) + 1)
    return m
  }, [cases])

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

      <PatientReviewSection patients={patients} casosPorPaciente={casosPorPaciente} />
    </div>
  )
}
