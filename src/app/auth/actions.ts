'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const returnUrl = formData.get('returnUrl') as string | null

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/login?message=No pudimos iniciar sesión. Verificá tus credenciales.')
  }

  revalidatePath('/', 'layout')
  redirect(returnUrl || '/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const returnUrl = formData.get('returnUrl') as string | null

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    return redirect(`/signup?message=${error.message}`)
  }

  if (data.user) {
    // Insert extended profile in public.users
    // We need a way to bypass RLS.
    // Wait, createClient uses cookies, it doesn't bypass RLS.
    // Let's create an admin client directly from supabase-js
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Prueba de 7 días con acceso completo desde el registro (ver auth/callback).
    const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { error: insertError } = await adminClient.from('users').upsert({
      id: data.user.id,
      email: data.user.email,
      full_name: fullName,
      role: 'free',
      trial_expires_at: trialExpiresAt
    })
    
    if (insertError) {
      console.error('Error creating user profile:', insertError)
    }
  }

  revalidatePath('/', 'layout')
  redirect(returnUrl || '/dashboard')
}

// ── Login por código de 6 dígitos (passwordless) ────────────────────────────
// Paso 1: manda el código al mail. Guardamos el email en una cookie httpOnly
// (no en la URL, por privacidad) para el paso 2 y para prellenar la pantalla.
export async function sendLoginCode(formData: FormData) {
  const supabase = createClient()
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()
  const returnUrl = (formData.get('returnUrl') as string) || ''

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return redirect('/login?metodo=codigo&message=Ingresá un email válido.')
  }

  // shouldCreateUser: true → sirve también como alta (el perfil + trial se crean
  // al verificar, más abajo). El código va en el mail si la plantilla de "Magic
  // Link" incluye {{ .Token }} (ver nota de config).
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })

  if (error) {
    return redirect(`/login?metodo=codigo&message=${encodeURIComponent('No pudimos enviar el código. Probá de nuevo en un momento.')}`)
  }

  cookies().set('login_code_email', email, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 15,
  })

  const params = new URLSearchParams({ metodo: 'codigo', sent: '1' })
  if (returnUrl.startsWith('/')) params.set('returnUrl', returnUrl)
  redirect(`/login?${params.toString()}`)
}

// Paso 2: verifica el código y deja la sesión. Si es un usuario nuevo, le crea
// el perfil con 7 días de prueba (igual que el alta por Google) y lo manda a
// completar su nombre.
export async function verifyLoginCode(formData: FormData) {
  const supabase = createClient()
  const code = ((formData.get('code') as string) || '').replace(/\s/g, '')
  const returnUrl = (formData.get('returnUrl') as string) || ''
  const email = cookies().get('login_code_email')?.value || ''

  const next = returnUrl.startsWith('/') ? returnUrl : '/dashboard'

  if (!email) {
    return redirect('/login?metodo=codigo&message=Se venció el pedido. Ingresá tu email de nuevo.')
  }
  if (!/^\d{6,10}$/.test(code)) {
    return redirect('/login?metodo=codigo&sent=1&message=Ingresá el código de dígitos que te llegó por mail.')
  }

  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
  if (error) {
    return redirect('/login?metodo=codigo&sent=1&message=El código es incorrecto o venció. Pedí uno nuevo.')
  }

  cookies().delete('login_code_email')

  // Perfil en public.users si es un alta nueva (mismo criterio que /auth/callback).
  const user = data.user
  if (user) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: existing } = await adminClient
      .from('users').select('id').eq('id', user.id).maybeSingle()

    if (!existing) {
      const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      await adminClient.from('users').insert({
        id: user.id, email: user.email, full_name: null, role: 'free', trial_expires_at: trialExpiresAt,
      })
      revalidatePath('/', 'layout')
      // Usuario nuevo: le pedimos el nombre antes de entrar.
      return redirect(`/completar-perfil?next=${encodeURIComponent(next)}`)
    }
  }

  revalidatePath('/', 'layout')
  redirect(next)
}

// Guarda el nombre que el usuario ingresa en /completar-perfil (típicamente tras
// entrar con Google, donde el nombre puede venir vacío o como un apodo). Escribe
// tanto en los metadatos de auth (que usa el saludo/header) como en public.users.
export async function completarPerfil(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const fullName = ((formData.get('fullName') as string) || '').trim()
  const rawNext = (formData.get('next') as string) || '/dashboard'
  const next = rawNext.startsWith('/') ? rawNext : '/dashboard'

  if (!fullName) {
    return redirect(`/completar-perfil?next=${encodeURIComponent(next)}&message=Ingresá tu nombre para continuar.`)
  }

  // Metadatos de auth (nombre visible en la app)
  await supabase.auth.updateUser({ data: { full_name: fullName } })

  // public.users (no tiene policy de UPDATE para el cliente → usamos admin)
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  await adminClient.from('users').update({ full_name: fullName }).eq('id', user.id)

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function resetPassword(formData: FormData) {
  const supabase = createClient()
  const email = (formData.get('email') as string || '').trim().toLowerCase()

  // Recuperación por CÓDIGO de 6 dígitos (no por link). El link de un solo uso lo
  // consumían los escáneres de correo (Gmail lo pre-abría) y llegaba "vencido". El
  // código va en el cuerpo del mail (plantilla usa {{ .Token }}) y no se puede
  // consumir con un pre-click. resetPasswordForEmail genera igual el token OTP;
  // no pasamos redirectTo porque no usamos el link.
  const { error } = await supabase.auth.resetPasswordForEmail(email)

  // No revelamos si el email existe o no (evita enumeración de cuentas): siempre
  // el mismo mensaje de éxito. Solo un error real de envío se muestra distinto.
  if (error) {
    return redirect('/forgot-password?error=1&message=No pudimos enviar el correo. Probá de nuevo en un momento.')
  }

  // Guardamos el email en una cookie corta (httpOnly, no va en la URL) para
  // pre-cargarlo en la pantalla donde se ingresa el código.
  cookies().set('pw_reset_email', email, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15, // 15 minutos
  })

  return redirect('/reset-password?sent=1')
}

// Verifica el código de 6 dígitos del mail y, si es válido, setea la contraseña
// nueva en la misma acción (el verifyOtp deja una sesión de recuperación).
export async function resetPasswordWithCode(formData: FormData) {
  const supabase = createClient()
  const email = (formData.get('email') as string || '').trim().toLowerCase()
  const code = (formData.get('code') as string || '').replace(/\s/g, '')
  const password = (formData.get('password') as string) || ''
  const confirm = (formData.get('confirm') as string) || ''

  if (!email) {
    return redirect('/reset-password?message=Ingresá tu email.')
  }
  if (!/^\d{6,10}$/.test(code)) {
    return redirect('/reset-password?message=Ingresá el código de dígitos que te llegó por mail.')
  }
  if (password.length < 8) {
    return redirect('/reset-password?message=La contraseña debe tener al menos 8 caracteres.')
  }
  if (password !== confirm) {
    return redirect('/reset-password?message=Las contraseñas no coinciden.')
  }

  // 1) Canjear el código por una sesión de recuperación.
  const { error: otpError } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' })
  if (otpError) {
    return redirect('/reset-password?message=El código es incorrecto o venció. Pedí uno nuevo.')
  }

  // 2) Con la sesión activa, actualizar la contraseña.
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return redirect('/reset-password?message=No pudimos guardar la contraseña. Probá de nuevo.')
  }

  cookies().delete('pw_reset_email')
  revalidatePath('/', 'layout')
  return redirect('/dashboard')
}

export async function updatePassword(formData: FormData) {
  const supabase = createClient()
  const password = (formData.get('password') as string) || ''
  const confirm  = (formData.get('confirm')  as string) || ''

  // Validaciones antes de tocar nada.
  if (password.length < 8) {
    return redirect('/reset-password?message=La contraseña debe tener al menos 8 caracteres.')
  }
  if (password !== confirm) {
    return redirect('/reset-password?message=Las contraseñas no coinciden.')
  }

  // Solo se puede cambiar si hay una sesión de recuperación válida (la del link).
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/reset-password?expired=1&message=El link venció o ya se usó. Pedí uno nuevo.')
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    const msg = /same.*password|different from the old/i.test(error.message)
      ? 'La contraseña nueva no puede ser igual a la anterior.'
      : `No se pudo actualizar la contraseña: ${error.message}`
    return redirect(`/reset-password?message=${encodeURIComponent(msg)}`)
  }

  // Cerramos la sesión abierta por el link: el usuario ingresa con su nueva clave.
  // Así el link de recuperación por sí solo nunca deja una sesión activa.
  await supabase.auth.signOut()
  return redirect('/login?message=Contraseña actualizada. Ingresá con tu nueva contraseña.')
}
