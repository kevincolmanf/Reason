// Campos de evaluación de ingreso: 100% definidos por cada centro (no hay
// catálogo fijo). Build puede definir "Calidad de sentadilla" o "Dorsiflexión
// de tobillo"; otro centro define lo que le sirva a su propia práctica. Lo
// único que Reason aporta es el TIPO de campo (cómo se renderiza y valida),
// no el campo en sí.

export type IntakeFieldType = 'texto' | 'numero' | 'calidad'

export interface IntakeFieldDef {
  key: string
  label: string
  type: IntakeFieldType
}

// Vocabulario común para campos de tipo "calidad" (semáforo) — mismo usado en
// los protocolos RTS (slsquat_quality: good/acceptable/poor), para
// consistencia visual en toda la app.
export const QUALITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'good', label: 'Buena' },
  { value: 'acceptable', label: 'Aceptable' },
  { value: 'poor', label: 'Deficiente' },
]

// ¿Esta evaluación tiene todos los campos configurados para el área completos?
export function isIntakeComplete(data: Record<string, unknown>, fields: IntakeFieldDef[]): boolean {
  return fields.every(f => {
    const v = data[f.key]
    return v !== null && v !== undefined && v !== ''
  })
}

const COMBINING_DIACRITICS = new RegExp('[̀-ͯ]', 'g')

export function newFieldKey(label: string): string {
  const base = label.trim().toLowerCase()
    .normalize('NFD').replace(COMBINING_DIACRITICS, '') // sin tildes
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return base || `campo_${Date.now()}`
}
