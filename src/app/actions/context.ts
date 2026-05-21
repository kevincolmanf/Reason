'use server'

import { createClient } from '@/utils/supabase/server'
import { setActiveContext, clearActiveContext, validateContext } from '@/lib/context'
import type { ActiveContext } from '@/lib/context'

export async function switchContext(newCtx: ActiveContext): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'unauthenticated' }

  const valid = await validateContext(newCtx, user.id, supabase)
  if (!valid) return { error: 'unauthorized' }

  setActiveContext(newCtx)
  return { ok: true }
}

export async function logoutContext(): Promise<void> {
  clearActiveContext()
}
