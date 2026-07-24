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
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return browserClient
}
