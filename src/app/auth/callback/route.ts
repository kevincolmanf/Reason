import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Intercambia el código del email (login mágico / recuperación) por una sesión.
// Las cookies de sesión se escriben sobre la respuesta de redirect para que
// persistan de forma confiable (si no, la pantalla siguiente no encuentra la
// sesión y el middleware rebota al usuario al login).
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(new URL('/forgot-password?error=1&message=El link no es válido. Pedí uno nuevo.', request.url))
  }

  const response = NextResponse.redirect(new URL(next, request.url))
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    // Link vencido, ya usado, o abierto en otro navegador del que se pidió.
    return NextResponse.redirect(
      new URL('/forgot-password?error=1&message=El link venció o ya se usó. Pedí uno nuevo.', request.url)
    )
  }

  return response
}
