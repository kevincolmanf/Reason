import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Un único cliente por pestaña del navegador (singleton). Antes createClient()
// devolvía una instancia nueva en cada llamada, y como ~28 componentes lo usan
// (muchos en cada render), se acumulaban decenas de instancias de GoTrueClient,
// cada una con su timer de refresco de token y sus listeners de storage. Eso
// hacía que la UI se pusiera pesada/laggy. Reusar una sola instancia lo evita.
let browserClient: SupabaseClient | undefined

export function createClient() {
  if (browserClient) return browserClient
  // Cookies de sesión host-only (sin domain). Antes forzábamos domain=.reason.com.ar
  // para compartir apex/www, pero eso dejó cookies duplicadas (host-only vieja +
  // de dominio nueva) que trababan el login. La canonicalización apex→www ya hace
  // que el auth ocurra en un solo host.
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return browserClient
}
