import type { SupabaseClient } from '@supabase/supabase-js'

export type BodyRegion = { id: string; nombre: string }

export type NivelEsfuerzo = 'sedentaria' | 'de_pie' | 'esfuerzo_fisico'

export interface DiagnosisOption {
  id: string
  nombre: string
  codigo_cie10: string | null
  body_region_id: string
  source: 'global' | 'custom'
}

export interface OccupationOption {
  id: string
  nombre: string
  nivel_esfuerzo: NivelEsfuerzo
  source: 'global' | 'custom'
}

export async function fetchBodyRegions(supabase: SupabaseClient): Promise<BodyRegion[]> {
  const { data, error } = await supabase.from('body_region_catalog').select('id, nombre').order('nombre')
  if (error) throw error
  return data ?? []
}

// Trae catálogo global + el custom de la cuenta/equipo a la vez (RLS ya
// limita el custom a lo que esta cuenta puede ver). Un solo fetch al montar
// el combobox — filtrar por texto se hace en el cliente.
export async function fetchDiagnosisCatalog(supabase: SupabaseClient): Promise<DiagnosisOption[]> {
  const [{ data: global, error: e1 }, { data: custom, error: e2 }] = await Promise.all([
    supabase.from('diagnosis_catalog').select('id, nombre, codigo_cie10, body_region_id').eq('activo', true),
    supabase.from('diagnosis_catalog_custom').select('id, nombre, codigo_cie10, body_region_id'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const globalOpts: DiagnosisOption[] = (global ?? []).map(d => ({ ...d, source: 'global' as const }))
  const customOpts: DiagnosisOption[] = (custom ?? []).map(d => ({ ...d, source: 'custom' as const }))
  return [...globalOpts, ...customOpts].sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export async function createCustomDiagnosis(
  supabase: SupabaseClient,
  params: { nombre: string; bodyRegionId: string; userId: string; orgId: string | null },
): Promise<DiagnosisOption> {
  const { data, error } = await supabase
    .from('diagnosis_catalog_custom')
    .insert({ nombre: params.nombre, body_region_id: params.bodyRegionId, user_id: params.userId, org_id: params.orgId })
    .select('id, nombre, codigo_cie10, body_region_id')
    .single()
  if (error) throw error
  return { ...data, source: 'custom' }
}

export async function fetchOccupationCatalog(supabase: SupabaseClient): Promise<OccupationOption[]> {
  const [{ data: global, error: e1 }, { data: custom, error: e2 }] = await Promise.all([
    supabase.from('occupation_catalog').select('id, nombre, nivel_esfuerzo').eq('activo', true),
    supabase.from('occupation_catalog_custom').select('id, nombre, nivel_esfuerzo'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const globalOpts: OccupationOption[] = (global ?? []).map(o => ({ ...o, source: 'global' as const }))
  const customOpts: OccupationOption[] = (custom ?? []).map(o => ({ ...o, source: 'custom' as const }))
  return [...globalOpts, ...customOpts].sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export async function createCustomOccupation(
  supabase: SupabaseClient,
  params: { nombre: string; nivelEsfuerzo: NivelEsfuerzo; userId: string; orgId: string | null },
): Promise<OccupationOption> {
  const { data, error } = await supabase
    .from('occupation_catalog_custom')
    .insert({ nombre: params.nombre, nivel_esfuerzo: params.nivelEsfuerzo, user_id: params.userId, org_id: params.orgId })
    .select('id, nombre, nivel_esfuerzo')
    .single()
  if (error) throw error
  return { ...data, source: 'custom' }
}
