import { createClient } from '@supabase/supabase-js'

// Cliente con service role (bypassa RLS). Se fuerza `cache: 'no-store'` en el
// fetch: Next.js cachea por defecto las llamadas fetch de supabase-js aun en
// rutas dynamic, lo que hacía que server components (p. ej. el portal del
// paciente) leyeran datos viejos. Un cliente admin debe leer siempre fresco.
export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  )
}
