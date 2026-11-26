import type { SupabaseClient } from '@supabase/supabase-js'

export interface OrgFeatureSetting {
  enabled: boolean
  config: Record<string, unknown>
}

const DISABLED: OrgFeatureSetting = { enabled: false, config: {} }

// Lee si un feature está prendido para un centro, y su config. Nunca lanza:
// sin org (espacio personal), sin fila guardada, o ante cualquier error de
// lectura, devuelve "apagado" — el caller decide los defaults de la config
// (ver src/lib/qualityStandards/defaults.ts para el caso de estandares_calidad).
export async function getOrgFeatureSetting(
  orgId: string | null,
  featureKey: string,
  supabase: SupabaseClient
): Promise<OrgFeatureSetting> {
  if (!orgId) return DISABLED

  const { data } = await supabase
    .from('organization_feature_settings')
    .select('enabled, config')
    .eq('org_id', orgId)
    .eq('feature_key', featureKey)
    .maybeSingle()

  if (!data) return DISABLED
  return { enabled: data.enabled ?? false, config: (data.config as Record<string, unknown>) ?? {} }
}

// Prende/apaga un feature (y opcionalmente actualiza su config) para un
// centro. Solo el dueño del centro o un admin de Reason pueden llamarla con
// éxito — la RPC valida esto server-side (set_org_feature_setting en
// supabase_feature_settings.sql), así que no hace falta re-chequear acá.
export async function setOrgFeatureSetting(
  orgId: string,
  featureKey: string,
  enabled: boolean,
  config: Record<string, unknown> | null,
  supabase: SupabaseClient
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('set_org_feature_setting', {
    p_org_id: orgId,
    p_feature_key: featureKey,
    p_enabled: enabled,
    p_config: config,
  })
  return { error: error?.message ?? null }
}
