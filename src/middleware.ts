import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { authCookieDomain } from './utils/supabase/cookieDomain'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const cookieDomain = authCookieDomain(request.headers.get('host'))

  // Limpieza de migración: durante un tiempo las cookies de sesión se setearon con
  // domain=.reason.com.ar. Ahora volvimos a host-only, pero quedaron cookies de
  // dominio "fantasma" que conviven con las host-only (mismo nombre) y traban el
  // login según cuál lea el server. Acá expiramos SOLO la variante de dominio de
  // cualquier cookie de Supabase (sb-*), en TODAS las respuestas (incluidos los
  // redirects), para que nadie quede afuera. En localhost/preview cookieDomain es
  // undefined → no hacemos nada (y así no borramos las host-only por error).
  const staleCookieNames = cookieDomain
    ? request.cookies.getAll().filter(c => c.name.startsWith('sb-')).map(c => c.name)
    : []
  const withCleanup = (res: NextResponse) => {
    if (cookieDomain) {
      for (const name of staleCookieNames) {
        // IMPORTANTE: usamos headers.append (no res.cookies.set). Si en esta misma
        // respuesta el refresh de sesión ya seteó la cookie host-only del mismo
        // nombre, `res.cookies.set` la pisaría (NextResponse.cookies deduplica por
        // nombre) y dejaría al usuario con el token viejo → logout. Con un
        // Set-Cookie aparte, el borrado de la variante de DOMINIO convive con la
        // cookie de sesión host-only sin tocarla.
        res.headers.append(
          'Set-Cookie',
          `${name}=; Domain=${cookieDomain}; Path=/; Max-Age=0; Secure; SameSite=Lax`
        )
      }
    }
    return res
  }

  // Portales públicos de paciente (acceso por token, sin sesión): solo necesitan
  // los headers no-cache. Salimos temprano SIN llamar a supabase.auth.getUser()
  // para ahorrar un viaje de red al servidor de auth en cada carga del portal.
  if (
    pathname.startsWith('/paciente/') ||
    pathname.startsWith('/plan/') ||
    pathname.startsWith('/turno/')
  ) {
    const res = NextResponse.next({ request: { headers: request.headers } })
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.headers.set('Pragma', 'no-cache')
    res.headers.set('Expires', '0')
    return res
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // This will refresh session if expired
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error('Middleware Supabase Error:', error)
  }

  // Rutas que requieren solo estar logueado
  const authRoutes = ['/dashboard', '/library', '/content', '/account', '/recursos', '/ficha']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Rutas que requieren suscripción activa (o trial vigente)
  // /dashboard/ejercicios/plan y /calendario son accesibles para free (1 paciente)
  const subscriberRoutes = ['/library', '/content', '/recursos', '/ficha', '/dashboard/ejercicios/biblioteca']

  // Rutas exclusivas para Pro/admin o miembros de org (agenda)
  const proRoutes = ['/dashboard/agenda']
  const isProRoute = proRoutes.some(route => pathname.startsWith(route))
  const isSubscriberRoute = subscriberRoutes.some(route => pathname.startsWith(route))

  // Módulos avanzados dentro del dashboard de pacientes — bloqueados para free sin trial
  // /calendario no está bloqueado: usuarios free pueden ver el calendario de su único paciente
  const advancedModulePatterns = ['/carga', '/rts', '/fichas']
  const isAdvancedModule =
    pathname.startsWith('/dashboard/pacientes/') &&
    advancedModulePatterns.some(p => pathname.includes(p))

  // Excepción: artículo de muestra gratuito
  const isFreeContent = pathname === '/content/dolor-lumbar-inespecifico'

  const isAdminRoute = pathname.startsWith('/admin')
  const isEquipoRoute = pathname.startsWith('/account/equipo')

  // 1. Si no está logueado → login
  if ((isAuthRoute || isAdminRoute) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('returnUrl', pathname)
    return withCleanup(NextResponse.redirect(url))
  }

  // 2. Si está logueado → verificar acceso para rutas premium y admin
  if (user && (isSubscriberRoute || isProRoute || isAdvancedModule || isAdminRoute || isEquipoRoute) && !isFreeContent) {
    const { data: userData } = await supabase
      .from('users')
      .select('role, trial_expires_at')
      .eq('id', user.id)
      .single()

    const role = userData?.role
    const trialExpiresAt = userData?.trial_expires_at
    const trialActive = trialExpiresAt ? new Date(trialExpiresAt) > new Date() : false

    // ¿Es integrante de alguna organización? No dependemos del cookie de contexto:
    // un integrante recién logueado todavía no lo tiene seteado (su contexto por
    // defecto ya es la organización), y aun así debe poder acceder a las features
    // del equipo —incluida la agenda, en modo lectura— aunque su plan personal sea
    // free o subscriber. Antes se exigía estar "en contexto org" por cookie, y por
    // eso el integrante caía en el paywall.
    let isOrgMember = false
    if (role === 'free' || role === 'subscriber') {
      const { count } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      isOrgMember = (count ?? 0) > 0
    }

    const isActive = role === 'subscriber' || role === 'admin' || role === 'pro' || trialActive || isOrgMember
    const isProActive = role === 'admin' || role === 'pro' || isOrgMember

    if (isAdminRoute && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return withCleanup(NextResponse.redirect(url))
    }

    // Only org owners (pro/admin) can manage the team page
    if (isEquipoRoute && role !== 'pro' && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/account'
      return withCleanup(NextResponse.redirect(url))
    }

    if ((isSubscriberRoute || isAdvancedModule) && !isActive) {
      const url = request.nextUrl.clone()
      url.pathname = '/paywall'
      return withCleanup(NextResponse.redirect(url))
    }

    if (isProRoute && !isProActive) {
      const url = request.nextUrl.clone()
      url.pathname = '/paywall'
      return withCleanup(NextResponse.redirect(url))
    }
  }

  return withCleanup(supabaseResponse)
}

export const config = {
  // Matcher positivo: el middleware solo corre en rutas que realmente lo necesitan
  // (gating de auth/suscripción y portales con no-cache). El resto —landing, login,
  // signup, checkout, paywall, /api, /auth, /agenda/share— se sirve sin el costo de
  // supabase.auth.getUser() en cada navegación. La sesión se refresca igual al entrar
  // a cualquier ruta protegida (que es donde el usuario realmente trabaja), y el
  // cliente de navegador de Supabase renueva el token por su cuenta.
  matcher: [
    '/dashboard/:path*',
    '/library/:path*',
    '/content/:path*',
    '/account/:path*',
    '/recursos/:path*',
    '/ficha/:path*',
    '/admin/:path*',
    '/paciente/:path*',
    '/plan/:path*',
    '/turno/:path*',
  ],
}
