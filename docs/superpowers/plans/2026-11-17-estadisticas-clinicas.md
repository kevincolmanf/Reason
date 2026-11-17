# Pantalla de estadísticas clínicas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una pantalla `/dashboard/estadisticas` donde se elige una categoría corporal o un diagnóstico puntual + un período, y se ve cuántos casos hay y cómo se cruzan contra cada factor de riesgo (hábitos, comorbilidades, sociodemográficos, datos del episodio) — solo agregado, nunca lista de pacientes.

**Architecture:** El server component (`page.tsx`) resuelve el alcance de acceso (personal vs. dueño de equipo), trae todas las fichas con diagnóstico estructurado + el perfil clínico de esos pacientes + los catálogos necesarios para resolver nombres/categorías, arma un array plano de "casos" (`CaseRow[]`) y se lo pasa como prop a un client component. Ahí, los filtros (categoría/diagnóstico/período) y los cruces se calculan en memoria con `useMemo` — mismo patrón que ya usa `AnalyticsClient.tsx` del Panel de gestión, sin queries de agregación SQL ni RPC.

**Tech Stack:** Next.js 14 (App Router) + TypeScript + Supabase + Tailwind. Sin framework de tests — verificación con `tsc --noEmit`, `eslint`, `npm run build` y prueba manual en el navegador.

**Flujo de git:** feature nueva significativa → rama obligatoria (`feature/estadisticas-clinicas`) + confirmación de Kevin antes de mergear a `main` (regla del proyecto en CLAUDE.md). No toca base de datos — todas las tablas que usa ya existen y están en producción.

**Spec de referencia:** [docs/superpowers/specs/2026-11-17-datos-clinicos-estructurados-design.md](docs/superpowers/specs/2026-11-17-datos-clinicos-estructurados-design.md), sección 5 ("Pantalla de reportes"). Esto es la Fase B — la Fase A (catálogos, perfil clínico, diagnóstico del episodio) ya está en producción.

**Decisiones de diseño tomadas en este plan (detalles de implementación, no estaban cerradas en la spec):**
- **Granularidad: 1 fila = 1 ficha con diagnóstico, no 1 por paciente.** Si un paciente vuelve en un año con otro diagnóstico, cada ficha cuenta como un caso aparte — es lo que pidió Kevin explícitamente ("los datos exactos de la gente con dolor lumbar", pensado como casos/episodios, no pacientes únicos). Una ficha sin `diagnosis_id` (texto libre viejo, o todavía sin completar) queda afuera de las estadísticas — eso ya lo decidía la spec (sección 6).
- **Campo de fecha para el período: `patient_fichas.fecha`** ("fecha de primera consulta"). No existe un campo de "fecha de diagnóstico" separado y no se agrega uno — fuera de alcance. Una ficha sin `fecha` cargada queda afuera de cualquier filtro de período que no sea "Todo" (no se puede ubicar en el tiempo).
- **Umbral de "muestra chica": 8 casos.** Lo suficientemente bajo para no esconder categorías poco frecuentes todavía, lo suficientemente alto para que un porcentaje individual no sea en realidad un solo paciente disfrazado de estadística.
- **Buckets de edad:** 0-17, 18-30, 31-45, 46-60, 61+. Rangos típicos de una práctica musculoesquelética general; sin dato de edad, el caso no entra en el cruce por edad (pero sí en el resto).
- **Selector categoría → diagnóstico de dos niveles:** el select de diagnóstico puntual solo se habilita después de elegir una categoría corporal, y muestra los diagnósticos de esa categoría (global + custom combinados). Elegir "Todas" en categoría filtra por ningún diagnóstico (todos los casos). Elegir una categoría sin diagnóstico puntual filtra por región corporal. Elegir un diagnóstico puntual filtra por ese diagnóstico exacto.
- **Comorbilidades se muestran como % que la tiene, sobre los pacientes que fueron preguntados** (no cuenta "no preguntado" `null` como "no tiene") — mismo criterio que ya definió la spec para el modelo de datos.
- **Sin recharts para esta pantalla**, aunque ya es dependencia del proyecto: se reusa el patrón de "ranking con barra de porcentaje" que ya existe en `AnalyticsClient.tsx` (sección "Ranking de vías") — la spec pide explícitamente evitar gráficos pesados acá.
- **Resolución de `diagnosis_id`/`occupation_id` (pueden venir de la tabla global o la `_custom`)** se hace en memoria, cruzando con un `Map` armado a partir de ambos catálogos ya traídos — mismo patrón que ya usa `clinicalCatalog.ts`.
- **Acceso al camino "dueño de equipo" usa `createAdminClient()`** (como ya hace `src/app/account/crm/page.tsx`), porque el dueño de una organización no siempre tiene fila en `organization_members` — depender de RLS vía `is_org_member` podría dejar casos afuera de las estadísticas sin que se note.

---

### Task 1: Rama de trabajo

- [ ] **Step 1: Verificar working tree limpio**

Run: `git status --short`
Expected: nada tuyo pendiente (ignorar los archivos sueltos `* 2.*`/`* 3.*` preexistentes, no son de este plan).

- [ ] **Step 2: Crear la rama**

```bash
git checkout -b feature/estadisticas-clinicas
```

---

### Task 2: Helpers de agregación puros

**Files:**
- Create: `src/app/dashboard/estadisticas/stats.ts`

- [ ] **Step 1: Escribir el archivo completo**

```typescript
// Tipos y funciones puras de agregación para la pantalla de estadísticas.
// Todo se calcula en memoria sobre un array ya traído del server — el
// volumen de datos de una clínica no justifica agregación en SQL.

export interface CaseRow {
  patientId: string
  fichaFecha: string | null
  diagnosisId: string | null
  bodyRegionId: string | null
  mecanismoLesion: 'traumatico' | 'sobreuso' | 'degenerativo' | null
  lateralidad: 'derecha' | 'izquierda' | 'bilateral' | 'no_aplica' | null
  sexo: 'masculino' | 'femenino' | 'otro' | null
  nivelActividadFisica: 'sedentario' | 'activo' | 'muy_activo' | null
  tabaquismo: 'no_fuma' | 'fuma' | 'ex_fumador' | null
  consumoAlcohol: 'no' | 'ocasional' | 'habitual' | null
  diabetes: boolean | null
  hipertension: boolean | null
  obesidad: boolean | null
  enfCardiovascular: boolean | null
  osteoporosis: boolean | null
  cirugiaPrevia: boolean | null
  nivelSocioeconomico: 'bajo' | 'medio' | 'alto' | null
  occupationNivelEsfuerzo: 'sedentaria' | 'de_pie' | 'esfuerzo_fisico' | null
  ageBucket: string | null
}

export interface RankingItem {
  label: string
  count: number
  pct: number
}

// Agrupa por valor categórico (ignora null = "sin dato") y ordena de mayor a
// menor. `labels` traduce la clave cruda ('sedentario') a lo que se muestra
// ('Sedentario'); si no hay traducción, usa la clave tal cual.
export function rankingByCategory(
  rows: CaseRow[],
  extractor: (row: CaseRow) => string | null,
  labels: Record<string, string>,
): RankingItem[] {
  const counted = new Map<string, number>()
  let answered = 0
  for (const row of rows) {
    const value = extractor(row)
    if (value === null) continue
    answered++
    counted.set(value, (counted.get(value) ?? 0) + 1)
  }
  return Array.from(counted.entries())
    .map(([key, count]) => ({
      label: labels[key] ?? key,
      count,
      pct: answered > 0 ? Math.round((count / answered) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export interface BooleanStat {
  count: number
  answered: number
  pct: number
}

// Para comorbilidades (booleanas): % que tiene "sí" sobre los pacientes que
// fueron preguntados — null ("no preguntado") no cuenta como "no tiene".
export function percentTrue(
  rows: CaseRow[],
  extractor: (row: CaseRow) => boolean | null,
): BooleanStat {
  let count = 0
  let answered = 0
  for (const row of rows) {
    const value = extractor(row)
    if (value === null) continue
    answered++
    if (value) count++
  }
  return { count, answered, pct: answered > 0 ? Math.round((count / answered) * 100) : 0 }
}

const AGE_BUCKETS: { max: number; label: string }[] = [
  { max: 17, label: '0-17' },
  { max: 30, label: '18-30' },
  { max: 45, label: '31-45' },
  { max: 60, label: '46-60' },
  { max: Infinity, label: '61+' },
]

export function ageBucket(age: number | null): string | null {
  if (age === null) return null
  const bucket = AGE_BUCKETS.find(b => age <= b.max)
  return bucket ? bucket.label : null
}

export interface PeriodOption {
  value: string
  label: string
  months: number | null // null = sin límite ("Todo")
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: '1m', label: 'Último mes', months: 1 },
  { value: '3m', label: 'Últimos 3 meses', months: 3 },
  { value: '6m', label: 'Últimos 6 meses', months: 6 },
  { value: '12m', label: 'Último año', months: 12 },
  { value: '24m', label: 'Últimos 2 años', months: 24 },
  { value: '60m', label: 'Últimos 5 años', months: 60 },
  { value: 'todo', label: 'Todo', months: null },
]

export function withinPeriod(fichaFecha: string | null, monthsBack: number | null): boolean {
  if (monthsBack === null) return true
  if (!fichaFecha) return false
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - monthsBack)
  return new Date(fichaFecha) >= cutoff
}

export const MIN_SAMPLE_SIZE = 8

export const ACTIVIDAD_LABELS: Record<string, string> = { sedentario: 'Sedentario', activo: 'Activo', muy_activo: 'Muy activo' }
export const TABAQUISMO_LABELS: Record<string, string> = { no_fuma: 'No fuma', fuma: 'Fuma', ex_fumador: 'Ex-fumador' }
export const ALCOHOL_LABELS: Record<string, string> = { no: 'No', ocasional: 'Ocasional', habitual: 'Habitual' }
export const SOCIOECONOMICO_LABELS: Record<string, string> = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto' }
export const SEXO_LABELS: Record<string, string> = { masculino: 'Masculino', femenino: 'Femenino', otro: 'Otro' }
export const MECANISMO_LABELS: Record<string, string> = { traumatico: 'Traumático', sobreuso: 'Por sobreuso', degenerativo: 'Degenerativo' }
export const LATERALIDAD_LABELS: Record<string, string> = { derecha: 'Derecha', izquierda: 'Izquierda', bilateral: 'Bilateral', no_aplica: 'No aplica' }
export const ESFUERZO_LABELS: Record<string, string> = { sedentaria: 'Sedentaria', de_pie: 'De pie', esfuerzo_fisico: 'Esfuerzo físico' }
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/estadisticas/stats.ts
git commit -m "$(cat <<'EOF'
feat(estadisticas): helpers puros de agregación (ranking, comorbilidades, período)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Componente `EstadisticasClient` (filtros + render)

**Files:**
- Create: `src/app/dashboard/estadisticas/EstadisticasClient.tsx`

- [ ] **Step 1: Escribir el componente**

```tsx
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
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint src/app/dashboard/estadisticas/EstadisticasClient.tsx`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/estadisticas/EstadisticasClient.tsx
git commit -m "$(cat <<'EOF'
feat(estadisticas): componente de filtros y cruces (EstadisticasClient)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Página `/dashboard/estadisticas` (acceso + fetch de datos)

**Files:**
- Create: `src/app/dashboard/estadisticas/page.tsx`

- [ ] **Step 1: Escribir la página**

```tsx
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import { getActiveContext } from '@/lib/context'
import EstadisticasClient, { type DiagnosisOption, type BodyRegion } from './EstadisticasClient'
import { ageBucket, type CaseRow } from './stats'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Estadísticas | Reason' }

type PatientRow = { id: string; birth_date: string | null; age: number | null }
type FichaRow = {
  patient_id: string
  fecha: string | null
  diagnosis_id: string | null
  mecanismo_lesion: CaseRow['mecanismoLesion']
  lateralidad: CaseRow['lateralidad']
}
type ProfileRow = {
  patient_id: string
  sexo: CaseRow['sexo']
  nivel_actividad_fisica: CaseRow['nivelActividadFisica']
  tabaquismo: CaseRow['tabaquismo']
  consumo_alcohol: CaseRow['consumoAlcohol']
  diabetes: boolean | null
  hipertension: boolean | null
  obesidad: boolean | null
  enf_cardiovascular: boolean | null
  osteoporosis: boolean | null
  cirugia_previa: boolean | null
  nivel_socioeconomico: CaseRow['nivelSocioeconomico']
  occupation_id: string | null
}
type DiagnosisRow = { id: string; nombre: string; codigo_cie10: string | null; body_region_id: string }
type OccupationRow = { id: string; nivel_esfuerzo: 'sedentaria' | 'de_pie' | 'esfuerzo_fisico' }

function calcAge(birth_date: string | null, fallback: number | null): number | null {
  if (birth_date) {
    const today = new Date(); const dob = new Date(birth_date)
    let a = today.getFullYear() - dob.getFullYear()
    if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) a--
    return a
  }
  return fallback
}

// Supabase corta las respuestas en 1000 filas por defecto — paginamos en
// bloques para traer todo (mismo patrón que src/app/account/crm/page.tsx).
const PAGE_SIZE = 1000
type PagedQuery<T> = { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }> }
async function fetchAllRows<T>(buildQuery: () => PagedQuery<T>): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...(data as T[]))
    if (data.length < PAGE_SIZE) break
  }
  return all
}

export default async function EstadisticasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getActiveContext(user.id, supabase)
  const isOrgCtx = ctx.type === 'org' && !!ctx.orgId

  // Acceso: contexto personal siempre permitido (datos propios). Contexto de
  // equipo: solo el dueño de la organización ve el agregado — un integrante
  // no-dueño no tiene acceso a esta pantalla, ni vacía.
  let scopedClient: SupabaseClient = supabase
  if (isOrgCtx) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', ctx.orgId!)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!org) redirect('/dashboard/pacientes')
    // El dueño no siempre tiene fila en organization_members — un cliente
    // admin (bypassa RLS) evita que eso deje casos afuera del agregado.
    scopedClient = createAdminClient()
  }

  const patients = await fetchAllRows<PatientRow>(() =>
    isOrgCtx
      ? scopedClient.from('patients').select('id, birth_date, age').eq('org_id', ctx.orgId!)
      : scopedClient.from('patients').select('id, birth_date, age').eq('user_id', user.id).is('org_id', null)
  )
  const patientIds = patients.map(p => p.id)
  const ageById = new Map(patients.map(p => [p.id, calcAge(p.birth_date, p.age)]))

  const [fichas, profiles, diagnosisGlobal, diagnosisCustom, occupationGlobal, occupationCustom, bodyRegions] = await Promise.all([
    patientIds.length === 0 ? Promise.resolve([]) : fetchAllRows<FichaRow>(() =>
      scopedClient.from('patient_fichas')
        .select('patient_id, fecha, diagnosis_id, mecanismo_lesion, lateralidad')
        .in('patient_id', patientIds)
        .not('diagnosis_id', 'is', null)),
    patientIds.length === 0 ? Promise.resolve([]) : fetchAllRows<ProfileRow>(() =>
      scopedClient.from('patient_clinical_profile').select('*').in('patient_id', patientIds)),
    fetchAllRows<DiagnosisRow>(() =>
      scopedClient.from('diagnosis_catalog').select('id, nombre, codigo_cie10, body_region_id')),
    isOrgCtx
      ? fetchAllRows<DiagnosisRow>(() =>
          scopedClient.from('diagnosis_catalog_custom').select('id, nombre, codigo_cie10, body_region_id').eq('org_id', ctx.orgId!))
      : fetchAllRows<DiagnosisRow>(() =>
          scopedClient.from('diagnosis_catalog_custom').select('id, nombre, codigo_cie10, body_region_id').eq('user_id', user.id)),
    fetchAllRows<OccupationRow>(() =>
      scopedClient.from('occupation_catalog').select('id, nivel_esfuerzo')),
    isOrgCtx
      ? fetchAllRows<OccupationRow>(() =>
          scopedClient.from('occupation_catalog_custom').select('id, nivel_esfuerzo').eq('org_id', ctx.orgId!))
      : fetchAllRows<OccupationRow>(() =>
          scopedClient.from('occupation_catalog_custom').select('id, nivel_esfuerzo').eq('user_id', user.id)),
    fetchAllRows<BodyRegion>(() =>
      scopedClient.from('body_region_catalog').select('id, nombre')),
  ])

  const diagnosisById = new Map([...diagnosisGlobal, ...diagnosisCustom].map(d => [d.id, d]))
  const occupationEsfuerzoById = new Map([...occupationGlobal, ...occupationCustom].map(o => [o.id, o.nivel_esfuerzo]))
  const profileByPatient = new Map(profiles.map(p => [p.patient_id, p]))

  const cases: CaseRow[] = fichas.map(f => {
    const profile = profileByPatient.get(f.patient_id)
    return {
      patientId: f.patient_id,
      fichaFecha: f.fecha,
      diagnosisId: f.diagnosis_id,
      bodyRegionId: f.diagnosis_id ? diagnosisById.get(f.diagnosis_id)?.body_region_id ?? null : null,
      mecanismoLesion: f.mecanismo_lesion,
      lateralidad: f.lateralidad,
      sexo: profile?.sexo ?? null,
      nivelActividadFisica: profile?.nivel_actividad_fisica ?? null,
      tabaquismo: profile?.tabaquismo ?? null,
      consumoAlcohol: profile?.consumo_alcohol ?? null,
      diabetes: profile?.diabetes ?? null,
      hipertension: profile?.hipertension ?? null,
      obesidad: profile?.obesidad ?? null,
      enfCardiovascular: profile?.enf_cardiovascular ?? null,
      osteoporosis: profile?.osteoporosis ?? null,
      cirugiaPrevia: profile?.cirugia_previa ?? null,
      nivelSocioeconomico: profile?.nivel_socioeconomico ?? null,
      occupationNivelEsfuerzo: profile?.occupation_id ? occupationEsfuerzoById.get(profile.occupation_id) ?? null : null,
      ageBucket: ageBucket(ageById.get(f.patient_id) ?? null),
    }
  })

  const diagnosisOptions: DiagnosisOption[] = Array.from(diagnosisById.values()).map(d => ({
    id: d.id, nombre: d.nombre, codigoCie10: d.codigo_cie10, bodyRegionId: d.body_region_id,
  }))

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-4 md:px-8 py-10">
        <h1 className="text-[28px] font-medium tracking-[-0.01em] mb-2">Estadísticas</h1>
        <p className="text-[14px] text-text-secondary mb-8">
          {isOrgCtx ? 'Agregado de todos los casos del equipo.' : 'Agregado de tus casos.'} Solo conteos y porcentajes — nunca lista de pacientes.
        </p>
        <EstadisticasClient cases={cases} diagnosisOptions={diagnosisOptions} bodyRegions={bodyRegions} />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/estadisticas/page.tsx
git commit -m "$(cat <<'EOF'
feat(estadisticas): página /dashboard/estadisticas con control de acceso y fetch de datos

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Link "Estadísticas" en el nav

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Agregar el flag de acceso**

Junto a los demás `let` de flags de acceso (después de `let canSeeCaja = false`):

```tsx
  // Estadísticas clínicas: a diferencia del Panel de gestión (solo dueños Pro),
  // esta la ve cualquiera en contexto personal (sus propios datos). En
  // contexto de equipo, solo el dueño ve el agregado — un integrante no-dueño
  // no tiene acceso.
  let canSeeEstadisticas = false
```

- [ ] **Step 2: Calcularlo junto a `ownsThisOrg`**

Justo después de la línea `const ownsThisOrg = isOrgCtx && !!ctx.orgId && ownedOrgs.some(o => o.id === ctx.orgId)`:

```tsx
    canSeeEstadisticas = !isOrgCtx || ownsThisOrg
```

- [ ] **Step 3: Agregar el link al nav**

Justo después del link "Pacientes" (antes del bloque `{hasAgendaAccess ? (`):

```tsx
          {canSeeEstadisticas && (
            <Link href="/dashboard/estadisticas" className="hidden lg:inline whitespace-nowrap text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
              Estadísticas
            </Link>
          )}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx
git commit -m "$(cat <<'EOF'
feat(estadisticas): agregar "Estadísticas" al nav (personal siempre, equipo solo dueño)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Verificación final

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: build exitoso, sin errores de tipos ni de lint.

- [ ] **Step 2: Prueba manual en navegador**

Con `npm run dev`: entrar a `/dashboard/estadisticas` logueado con una cuenta que ya tenga fichas con diagnóstico cargado (del plan anterior). Verificar:
- El link "Estadísticas" aparece en el nav.
- Elegir una categoría corporal muestra solo diagnósticos de esa categoría en el segundo select, y filtra los casos.
- Elegir un diagnóstico puntual dentro de la categoría filtra más.
- Cambiar el período cambia el conteo de casos.
- Con pocos casos (menos de 8), aparece el aviso de "Muestra chica".
- Los cruces (actividad física, tabaquismo, comorbilidades, etc.) muestran barras con porcentajes coherentes con los datos cargados.
- Si la cuenta es de un equipo (Pro) y el usuario logueado NO es el dueño, entrar a `/dashboard/estadisticas` directamente por URL debe redirigir (no mostrar la pantalla vacía ni con datos).

- [ ] **Step 3: Push de la rama**

```bash
git push -u origin feature/estadisticas-clinicas
```

- [ ] **Step 4: Pedir confirmación a Kevin**

Feature nueva significativa sobre datos clínicos — por regla del proyecto (CLAUDE.md) necesita confirmación explícita antes de mergear a `main`, aunque no toque base de datos. No mergear hasta tener el OK.

---

## Fuera de este plan

- Exportación de datos (CSV/Excel) — decidido explícitamente fuera de alcance en la spec.
- Compartir estadísticas entre cuentas/organizaciones distintas — nunca.
- Un campo de "fecha de diagnóstico" separado de "fecha de primera consulta" — si en el futuro hace falta más precisión temporal por caso, es un cambio de modelo de datos aparte.
