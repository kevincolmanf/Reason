import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActiveContext } from './types'

export async function validateContext(
  ctx: ActiveContext,
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  // El contexto personal siempre es válido
  if (ctx.type === 'personal') return true
  if (!ctx.orgId) return false

  // ¿Sigue siendo owner?
  const { data: owned } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', ctx.orgId)
    .eq('owner_id', userId)
    .single()

  if (owned) return true

  // ¿Sigue siendo miembro?
  const { count } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', ctx.orgId)
    .eq('user_id', userId)

  return (count ?? 0) > 0
}
