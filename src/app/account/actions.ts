'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Edición del propio perfil desde "Mi Perfil". Sirve para cualquier usuario
// (incluida una secretaria/integrante de un centro), no solo el dueño.
export async function updateOwnProfile(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión expiró. Recargá la página e iniciá sesión de nuevo.' }

  const fullName = ((formData.get('full_name') as string) || '').trim()
  if (!fullName) return { error: 'Ingresá tu nombre.' }

  // Metadatos de auth (nombre visible en el saludo/header).
  await supabase.auth.updateUser({ data: { full_name: fullName } })

  // public.users no tiene policy de UPDATE para el cliente → usamos el admin y
  // limitamos el update a la fila propia (id del usuario logueado).
  const admin = createAdminClient()
  const { error } = await admin.from('users').update({ full_name: fullName }).eq('id', user.id)
  if (error) {
    console.error('updateOwnProfile: error al actualizar users:', JSON.stringify(error))
    return { error: 'No se pudo guardar tu nombre. Probá de nuevo.' }
  }

  return { success: true }
}

// Cambio de la propia contraseña estando logueado (self-service). No hace falta
// el flujo de recuperación por mail: hay sesión activa, así que updateUser alcanza.
export async function updateOwnPassword(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión expiró. Recargá la página e iniciá sesión de nuevo.' }

  const password = (formData.get('password') as string) || ''
  const confirm = (formData.get('confirm') as string) || ''
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  if (password !== confirm) return { error: 'Las contraseñas no coinciden.' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    const msg = /same.*password|different from the old/i.test(error.message)
      ? 'La contraseña nueva no puede ser igual a la anterior.'
      : 'No se pudo actualizar la contraseña. Probá de nuevo.'
    return { error: msg }
  }

  return { success: true }
}
