// Config del feature "estandares_calidad", por ÁREA — cada centro define sus
// propias áreas (reusa organizations.agenda_areas, no hay catálogo nuevo) y,
// para cada una, sus propios umbrales y campos de evaluación de ingreso. Un
// área ausente de `areas` simplemente no calcula esos indicadores — no rompe,
// no inventa un valor por Build. Mismo criterio que DEFAULT_AREAS en
// src/lib/agendaAreas.ts: el centro arranca en blanco y arma lo suyo.
import type { IntakeFieldDef } from './intakeFields'

export const FEATURE_KEY_ESTANDARES_CALIDAD = 'estandares_calidad'

export interface AreaConfig {
  dias_max_cuestionario_ingreso?: number
  dias_paciente_abierto?: number
  dias_max_plan?: number
  campos_evaluacion_ingreso?: IntakeFieldDef[]
}

export interface EstandaresCalidadConfig {
  areas: Record<string, AreaConfig>
}

export const DEFAULT_ESTANDARES_CALIDAD_CONFIG: EstandaresCalidadConfig = { areas: {} }

export function withEstandaresCalidadDefaults(
  config: Record<string, unknown> | null | undefined
): EstandaresCalidadConfig {
  const areas = config && typeof config === 'object' && config.areas && typeof config.areas === 'object'
    ? (config.areas as Record<string, AreaConfig>)
    : {}
  return { areas }
}

// "Paciente abierto" es universal (aplica a cualquier área aunque el centro
// nunca la haya configurado) — por eso tiene un default (21) incluso si el
// área no está en config.areas. Los demás umbrales son opt-in por área: si
// no están configurados, ese indicador no se calcula para esa área (ver
// supabase_panel_cumplimiento_v2.sql).
export const DIAS_PACIENTE_ABIERTO_DEFAULT = 21

export function areaConfig(config: EstandaresCalidadConfig, area: string): AreaConfig {
  return config.areas[area] ?? {}
}
