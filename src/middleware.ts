import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const pathname = request.nextUrl.pathname

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
    return NextResponse.redirect(url)
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

    // Check org membership for free users who belong to a team
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
      return NextResponse.redirect(url)
    }

    // Only org owners (pro/admin) can manage the team page
    if (isEquipoRoute && role !== 'pro' && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/account'
      return NextResponse.redirect(url)
    }

    if ((isSubscriberRoute || isAdvancedModule) && !isActive) {
      const url = request.nextUrl.clone()
      url.pathname = '/paywall'
      return NextResponse.redirect(url)
    }

    if (isProRoute && !isProActive) {
      const url = request.nextUrl.clone()
      url.pathname = '/paywall'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
