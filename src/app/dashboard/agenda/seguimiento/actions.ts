'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'

// Guardar en qué áreas se sigue la ausencia (organizations.absence_areas).
// La RLS de organizations deja UPDATE solo al dueño, así que validamos el
// permiso acá y escribimos con el admin client. Permitido al dueño o a un
// integrante que "modifica la agenda" (la secretaría con edición).
export async function setAbsenceAreas(
  orgId: string,
  areas: string[] | null,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', orgId)
    .single()

  let allowed = org?.owner_id === user.id
  if (!allowed) {
    const { data: member } = await supabase
      .from('organization_members')
      .select('agenda_access, agenda_can_edit')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()
    allowed = !!member?.agenda_access && !!member?.agenda_can_edit
  }
  if (!allowed) return { error: 'No tenés permiso para configurar el seguimiento' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('organizations')
    .update({ absence_areas: areas })
    .eq('id', orgId)

  if (error) return { error: 'No se pudo guardar la configuración' }
  return { success: true }
}
