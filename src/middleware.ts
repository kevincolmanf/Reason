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
  const subscriberRoutes = ['/library', '/content', '/recursos', '/ficha', '/dashboard/ejercicios']
  const isSubscriberRoute = subscriberRoutes.some(route => pathname.startsWith(route))

  // Módulos avanzados dentro del dashboard de pacientes — bloqueados para free sin trial
  const advancedModulePatterns = ['/carga', '/calendario', '/rts', '/fichas']
  const isAdvancedModule =
    pathname.startsWith('/dashboard/pacientes/') &&
    advancedModulePatterns.some(p => pathname.includes(p))

  // Excepción: artículo de muestra gratuito
  const isFreeContent = pathname === '/content/dolor-lumbar-inespecifico'

  const isAdminRoute = pathname.startsWith('/admin')

  // 1. Si no está logueado → login
  if ((isAuthRoute || isAdminRoute) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Si está logueado → verificar acceso para rutas premium y admin
  if (user && (isSubscriberRoute || isAdvancedModule || isAdminRoute) && !isFreeContent) {
    const { data: userData } = await supabase
      .from('users')
      .select('role, trial_expires_at')
      .eq('id', user.id)
      .single()

    const role = userData?.role
    const trialExpiresAt = userData?.trial_expires_at
    const trialActive = trialExpiresAt ? new Date(trialExpiresAt) > new Date() : false
    const isActive = role === 'subscriber' || role === 'admin' || trialActive

    if (isAdminRoute && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    if ((isSubscriberRoute || isAdvancedModule) && !isActive) {
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
