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

    // El centro arranca SIN áreas de agenda: cada uno agrega las suyas ("agregá
    // tus áreas"), en vez de heredar un set por defecto que no le corresponde.
    if (orgId) {
      await adminClient.from('organizations').update({ agenda_areas: [] }).eq('id', orgId)
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
    user_metadata: { full_name: fullName, created_by_org: orgId },
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

// Regenera una contraseña temporal para un integrante y la devuelve para que el
// admin se la comparta. Pensado para quien todavía no ingresó (perdió el mensaje
// inicial, nunca lo recibió, etc.). Si el integrante YA ingresó alguna vez,
// significa que tiene su propia contraseña: no la pisamos para no dejarlo afuera,
// salvo que el admin lo fuerce explícitamente (force = true).
export async function resetMemberAccess(
  orgId: string,
  memberUserId: string,
  force = false,
): Promise<{ error?: string; email?: string; tempPassword?: string; alreadyLoggedIn?: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'admin') return { error: 'Solo el administrador puede reenviar accesos' }

  const adminClient = createAdminClient()

  // El objetivo tiene que ser realmente un integrante de ESTE equipo.
  const { data: targetMembership } = await adminClient
    .from('organization_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('user_id', memberUserId)
    .single()

  if (!targetMembership) return { error: 'Ese integrante no pertenece a tu equipo' }

  // Traemos el usuario de auth para conocer email y si alguna vez ingresó.
  const { data: authUser, error: getErr } = await adminClient.auth.admin.getUserById(memberUserId)
  if (getErr || !authUser?.user) return { error: 'No se pudo encontrar la cuenta del integrante' }

  const email = authUser.user.email ?? undefined
  const hasLoggedIn = !!authUser.user.last_sign_in_at

  // Protección: si ya ingresó, no le pisamos su contraseña salvo confirmación
  // explícita (podría ser una cuenta propia que usa por fuera del equipo).
  if (hasLoggedIn && !force) {
    return { alreadyLoggedIn: true, email }
  }

  const tempPassword = generateTempPassword()
  const { error: updErr } = await adminClient.auth.admin.updateUserById(memberUserId, {
    password: tempPassword,
  })

  if (updErr) return { error: 'No se pudo generar la contraseña' }

  return { email, tempPassword }
}

export async function updateMemberName(orgId: string, memberUserId: string, newName: string): Promise<{ error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'admin') return { error: 'Solo el administrador puede editar nombres' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('users')
    .update({ full_name: newName.trim() })
    .eq('id', memberUserId)

  if (error) return { error: 'Error al actualizar el nombre' }
  return {}
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

// Elimina un centro entero. Acción destructiva e irreversible: solo el DUEÑO
// real puede hacerlo. Los pacientes NO se borran (org_id es ON DELETE SET NULL →
// pasan al espacio personal de quien los creó); los integrantes se quitan por
// cascade; los turnos del centro se eliminan. Pide el nombre exacto para
// confirmar desde el cliente.
export async function deleteOrganization(orgId: string, confirmName: string): Promise<{ error?: string; success?: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organizations')
    .select('owner_id, name')
    .eq('id', orgId)
    .single()

  if (!org) return { error: 'El centro no existe.' }
  if (org.owner_id !== user.id) return { error: 'Solo el dueño del centro puede eliminarlo.' }
  if ((confirmName || '').trim() !== org.name) {
    return { error: 'El nombre no coincide. Escribí el nombre exacto del centro para confirmar.' }
  }

  const adminClient = createAdminClient()
  // Los turnos del centro no tienen cascade → los limpiamos antes.
  await adminClient.from('turnos').delete().eq('org_id', orgId)
  const { error } = await adminClient.from('organizations').delete().eq('id', orgId)
  if (error) {
    console.error('Error eliminando organización:', JSON.stringify(error))
    return { error: 'No se pudo eliminar el centro. Intentá de nuevo.' }
  }
  return { success: true }
}
