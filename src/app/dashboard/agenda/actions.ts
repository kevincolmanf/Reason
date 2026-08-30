'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Persiste la configuración de agenda del ESPACIO PERSONAL (Pro con agenda propia).
// Por qué existe: public.users no tiene policy de UPDATE, así que la escritura del
// cliente a `users` se descarta en silencio y la config volvía a los defaults al
// recargar (bug reportado por Hernán, #3). Acá escribimos con el admin client, pero
// SOLO la fila del propio usuario autenticado (nunca un id que venga del cliente),
// así no se abren permisos de más.
export async function savePersonalAgendaConfig(cfg: {
  agenda_areas: string[]
  agenda_slot_interval: number
  agenda_area_durations: Record<string, number>
  agenda_day_start: number
  agenda_day_end: number
  whatsapp: string | null
}): Promise<{ error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()

  // Núcleo (columnas que seguro existen). Si esto falla, avisamos.
  const { error } = await admin
    .from('users')
    .update({
      agenda_areas: cfg.agenda_areas,
      agenda_slot_interval: cfg.agenda_slot_interval,
      agenda_area_durations: cfg.agenda_area_durations,
    })
    .eq('id', user.id)
  if (error) return { error: error.message }

  // Best-effort: columnas que podrían no existir si su migración no corrió. Si
  // fallan, el resto de la config ya quedó guardada igual.
  await admin.from('users').update({ agenda_day_start: cfg.agenda_day_start, agenda_day_end: cfg.agenda_day_end }).eq('id', user.id)
  await admin.from('users').update({ whatsapp: cfg.whatsapp }).eq('id', user.id)

  return {}
}
