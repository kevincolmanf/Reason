'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'

function generateTempPassword(): string {
  const lower = Math.random().toString(36).slice(-6)
  const upper = Math.random().toString(36).toUpperCase().slice(-3)
  return `${lower}${upper}!`
}

export async function createOrganization(formData: FormData) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return { error: 'No autenticado' }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError) return { error: `Error al verificar usuario: ${userError.message}` }
    if (!userData) return { error: 'Usuario no encontrado en la base de datos' }
    if (userData.role !== 'pro' && userData.role !== 'admin') return { error: 'Se requiere Plan Pro' }

    const name = (formData.get('name') as string)?.trim()
    if (!name) return { error: 'El nombre del centro es requerido' }

    const adminClient = createAdminClient()

    const { data: orgId, error: rpcError } = await adminClient
      .rpc('create_organization_with_admin', { org_name: name, p_owner_id: user.id })

    if (rpcError) {
      console.error('Error creando org:', JSON.stringify(rpcError))
      if (rpcError.code === '23505') return { error: 'Ya tenés un equipo creado. Recargá la página.' }
      return { error: `Error al crear el equipo: ${rpcError.message}` }
    }

    return { success: true, orgId }
  } catch (e) {
    console.error('Excepción en createOrganization:', e)
    return { error: `Excepción: ${(e as Error).message}` }
  }
}

export async function addMember(orgId: string, formData: FormData): Promise<{ error?: string; tempPassword?: string; email?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify current user is admin of this org
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'admin') return { error: 'Solo el administrador puede agregar miembros' }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const fullName = (formData.get('full_name') as string)?.trim()

  if (!email || !fullName) return { error: 'Email y nombre son requeridos' }

  const adminClient = createAdminClient()

  // Check if user already exists
  const { data: existingUser } = await adminClient
    .from('users')
    .select('id, role')
    .eq('email', email)
    .single()

  let memberId: string

  if (existingUser) {
    // User already exists — add them to the org
    memberId = existingUser.id

    const { error: memberError } = await adminClient
      .from('organization_members')
      .insert({ org_id: orgId, user_id: existingUser.id, role: 'member' })

    if (memberError) {
      if (memberError.code === '23505') return { error: 'Este usuario ya es miembro del equipo' }
      return { error: 'Error al agregar el miembro' }
    }

    // No cambiamos el role — el acceso al equipo viene de organization_members, no del role
    return { success: true, email, tempPassword: undefined } as { error?: string; tempPassword?: string; email?: string }
  }

  // Create new auth user
  const tempPassword = generateTempPassword()

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (authError || !authData.user) return { error: 'Error al crear la cuenta del miembro' }

  memberId = authData.user.id

  await adminClient.from('users').insert({
    id: memberId,
    email,
    full_name: fullName,
    role: 'free',  // el acceso Pro viene del equipo, no del role personal
  })

  await adminClient.from('organization_members').insert({
    org_id: orgId,
    user_id: memberId,
    role: 'member',
  })

  return { tempPassword, email }
}

export async function removeMember(orgId: string, memberId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'admin') return { error: 'Solo el administrador puede eliminar miembros' }

  const adminClient = createAdminClient()

  await adminClient
    .from('organization_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', memberId)

  // No revertimos el role — el usuario mantiene el que tenía antes de entrar al equipo
  return { success: true }
}
