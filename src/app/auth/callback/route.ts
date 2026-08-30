import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { authCookieDomain } from '@/utils/supabase/cookieDomain'

// Intercambia el código del email (login mágico / recuperación) por una sesión.
// Las cookies de sesión se escriben sobre la respuesta de redirect para que
// persistan de forma confiable (si no, la pantalla siguiente no encuentra la
// sesión y el middleware rebota al usuario al login).
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  // Este callback es sobre todo el retorno de OAuth (Google) y la confirmación de
  // email; NO es el flujo de recuperación (ese usa un código OTP). Por eso, ante
  // una falla, mandamos a /login (donde se puede reintentar) y no a
  // /forgot-password con un mensaje de "link vencido", que confundía al usuario
  // que solo intentaba entrar con Google.
  const loginError = (msg: string) =>
    NextResponse.redirect(
      new URL(`/login?message=${encodeURIComponent(msg)}&returnUrl=${encodeURIComponent(next)}`, request.url)
    )

  if (!code) {
    return loginError('No pudimos completar el ingreso. Probá de nuevo.')
  }

  const response = NextResponse.redirect(new URL(next, request.url))
  const cookieStore = cookies()
  const cookieDomain = authCookieDomain(request.headers.get('host'))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options, domain: cookieDomain })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options, domain: cookieDomain })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    // Falla típica del OAuth: el código ya se usó, venció, o el code_verifier de
    // PKCE quedó en otro dominio (www vs. apex). Volvemos a /login para reintentar.
    return loginError('No pudimos completar el ingreso con Google. Probá de nuevo.')
  }

  // Perfil en public.users para quien entra con Google (o cualquier método que no
  // pase por el signup con email). El signup por email ya crea su fila; acá la
  // creamos SOLO si falta (ignoreDuplicates) para no pisar el rol de los que ya
  // existen. Rol inicial 'free' → quedan en paywall, igual que un alta normal.
  const user = data.user
  if (user) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // Traemos también el nombre: sirve para decidir si hay que pedirlo.
    const { data: existing } = await adminClient
      .from('users').select('id, full_name').eq('id', user.id).maybeSingle()

    const googleName =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null

    if (!existing) {
      // Prueba de 7 días con acceso completo desde el primer ingreso: durante ese
      // período trialActive es verdadero y el usuario ve toda la funcionalidad.
      // Al vencer, vuelve al gating de free (paywall / límites).
      const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const { error: profileError } = await adminClient.from('users').insert(
        { id: user.id, email: user.email, full_name: googleName, role: 'free', trial_expires_at: trialExpiresAt },
      )
      if (profileError) console.error('Error creando perfil OAuth:', profileError)
    }

    // Si la cuenta no tiene nombre cargado —un alta nueva sin nombre, o una cuenta
    // vieja que quedó sin él— pedimos completarlo antes de entrar. Si ya lo tiene,
    // entra directo. Llevamos las cookies de sesión al nuevo redirect.
    const effectiveName = (existing?.full_name ?? googleName ?? '').trim()
    if (!effectiveName) {
      const perfilRes = NextResponse.redirect(
        new URL(`/completar-perfil?next=${encodeURIComponent(next)}`, request.url)
      )
      response.cookies.getAll().forEach(c => perfilRes.cookies.set(c))
      return perfilRes
    }
  }

  return response
}
