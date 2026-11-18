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
  age: number | null
  ageBucket: string | null
  dolorEvaInicial: number | null
  // Último EVA cargado en un hito (Evaluación/Reevaluación/Control/Alta)
  // posterior a esta ficha, antes de la ficha diagnosticada siguiente del
  // mismo paciente (si la hay) — ver resolveDolorEvaSeguimiento en page.tsx.
  dolorEvaSeguimiento: number | null
  duracionSintomas: 'agudo' | 'subagudo' | 'cronico' | null
  episodioRecurrente: boolean | null
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

export interface AverageStat {
  avg: number
  n: number
}

// Promedio simple de un valor numérico (ej. EVA), ignorando los casos sin
// dato. No es una comparación apareada — ver la nota en EstadisticasClient.
export function averageStat(
  rows: CaseRow[],
  extractor: (row: CaseRow) => number | null,
): AverageStat | null {
  const values = rows.map(extractor).filter((v): v is number => v !== null)
  if (values.length === 0) return null
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length
  return { avg: Math.round(avg * 10) / 10, n: values.length }
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
export const DURACION_SINTOMAS_LABELS: Record<string, string> = { agudo: 'Agudo (< 6 sem.)', subagudo: 'Subagudo (6-12 sem.)', cronico: 'Crónico (> 3 meses)' }
