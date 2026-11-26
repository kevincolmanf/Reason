// Defaults de la app para la config del feature "estandares_calidad" — un
// centro nuevo que prenda el feature arranca con estos valores razonables,
// editables desde su propia fila en organization_feature_settings. Ningún
// valor de acá es específico de Build: son el punto de partida genérico: Build
// los ajustó a 7/10/21 y a sus campos de evaluación de ingreso, pero otro
// centro puede dejarlos como están o cambiarlos todos.
//
// Mismo criterio que DEFAULT_AREAS en src/lib/agendaAreas.ts: el default vive
// en código, lo específico de un centro vive en su config guardada.

export const FEATURE_KEY_ESTANDARES_CALIDAD = 'estandares_calidad'

export interface EstandaresCalidadConfig {
  dias_max_cuestionario_ingreso: number
  dias_max_plan_entrenamiento: number
  dias_paciente_abierto: number
  campos_obligatorios_evaluacion_ingreso: string[]
}

export const DEFAULT_ESTANDARES_CALIDAD_CONFIG: EstandaresCalidadConfig = {
  dias_max_cuestionario_ingreso: 7,
  dias_max_plan_entrenamiento: 10,
  dias_paciente_abierto: 21,
  campos_obligatorios_evaluacion_ingreso: [],
}

// Completa con el default cualquier clave ausente en la config guardada (p. ej.
// un centro que prendió el feature antes de que se agregara un campo nuevo).
export function withEstandaresCalidadDefaults(
  config: Partial<EstandaresCalidadConfig> | null | undefined
): EstandaresCalidadConfig {
  return { ...DEFAULT_ESTANDARES_CALIDAD_CONFIG, ...(config ?? {}) }
}
