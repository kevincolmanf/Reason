// Catálogo de campos estructurados disponibles para la "Evaluación de ingreso
// de entrenamiento". Cada centro elige, en su config
// (campos_obligatorios_evaluacion_ingreso), cuáles de estos campos son
// obligatorios para sus alumnos — no son texto libre inventado por cada
// centro, sino una lista curada que se puede ampliar acá cuando haga falta.
// Build usa sentadilla_calidad + dorsiflexion_tobillo_der_deg/izq_deg.

export type IntakeFieldType = 'quality' | 'degrees'

export interface IntakeFieldDef {
  key: string
  label: string
  type: IntakeFieldType
}

// Mismo vocabulario que slsquat_quality en los protocolos RTS (good/
// acceptable/poor) — consistencia con el resto de la app.
export const QUALITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'good', label: 'Buena' },
  { value: 'acceptable', label: 'Aceptable' },
  { value: 'poor', label: 'Deficiente' },
]

export const INTAKE_FIELD_CATALOG: IntakeFieldDef[] = [
  { key: 'sentadilla_calidad', label: 'Calidad de sentadilla', type: 'quality' },
  { key: 'dorsiflexion_tobillo_der_deg', label: 'Dorsiflexión de tobillo — derecha (°, goniómetro)', type: 'degrees' },
  { key: 'dorsiflexion_tobillo_izq_deg', label: 'Dorsiflexión de tobillo — izquierda (°, goniómetro)', type: 'degrees' },
]

export function intakeFieldDef(key: string): IntakeFieldDef | undefined {
  return INTAKE_FIELD_CATALOG.find(f => f.key === key)
}

// ¿Esta evaluación tiene todos los campos obligatorios del centro completos?
export function isIntakeComplete(data: Record<string, unknown>, requiredKeys: string[]): boolean {
  return requiredKeys.every(key => {
    const v = data[key]
    return v !== null && v !== undefined && v !== ''
  })
}
