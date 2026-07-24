'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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

    const { error: insertError } = await adminClient.from('users').upsert({
      id: data.user.id,
      email: data.user.email,
      full_name: fullName,
      role: 'free'
    })
    
    if (insertError) {
      console.error('Error creating user profile:', insertError)
    }
  }

  revalidatePath('/', 'layout')
  redirect(returnUrl || '/dashboard')
}

export async function resetPassword(formData: FormData) {
  const supabase = createClient()
  const email = (formData.get('email') as string || '').trim()

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}/auth/callback?next=/reset-password`,
  })

  // No revelamos si el email existe o no (evita enumeración de cuentas): siempre
  // el mismo mensaje de éxito. Solo un error real de envío se muestra distinto.
  if (error) {
    return redirect('/forgot-password?error=1&message=No pudimos enviar el correo. Probá de nuevo en un momento.')
  }

  return redirect('/forgot-password?sent=1&message=Si el email está registrado, te enviamos un link para crear una contraseña nueva. Revisá también el spam.')
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
