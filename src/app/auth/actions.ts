'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/login?message=No pudimos iniciar sesión. Verificá tus credenciales.')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

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
    // Insert extended profile in public.users if it doesn't exist
    // Note: In a production app with OAuth, a DB trigger on auth.users is recommended instead.
    const { error: insertError } = await supabase.from('users').upsert({
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
  redirect('/dashboard')
}

export async function resetPassword(formData: FormData) {
  const supabase = createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback?next=/account/update-password`,
  })

  if (error) {
    return redirect('/forgot-password?message=Error al enviar el correo')
  }

  return redirect('/forgot-password?message=Revisá tu correo para continuar')
}
