import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActiveContext } from './types'

export async function resolveDefaultContext(
  userId: string,
  supabase: SupabaseClient
): Promise<ActiveContext> {
  // 1. ¿Tiene un org propio?
  const { data: ownedOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .single()

  if (ownedOrg) return { type: 'org', orgId: ownedOrg.id }

  // 2. ¿Es miembro de un org?
  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (membership?.org_id) return { type: 'org', orgId: membership.org_id }

  // 3. Fallback: espacio personal
  return { type: 'personal', orgId: null }
}
