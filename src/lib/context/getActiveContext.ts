import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { COOKIE_NAME } from './types'
import type { ActiveContext } from './types'
import { validateContext } from './validateContext'
import { resolveDefaultContext } from './resolveDefaultContext'

// Read-only — no escribe cookies (no permitido en server components).
// Siempre devuelve un ActiveContext válido, nunca lanza.
export async function getActiveContext(
  userId: string,
  supabase: SupabaseClient
): Promise<ActiveContext> {
  const raw = cookies().get(COOKIE_NAME)?.value

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ActiveContext

      // Validar que el tipo tiene la forma correcta
      if (parsed.type !== 'personal' && parsed.type !== 'org') throw new Error('invalid type')

      const valid = await validateContext(parsed, userId, supabase)
      if (valid) return parsed
    } catch {
      // cookie corrompida o inválida — continúa al fallback
    }
  }

  return resolveDefaultContext(userId, supabase)
}
