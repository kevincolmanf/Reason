import type { SupabaseClient } from '@supabase/supabase-js'

// Motivos de alta soportados por la UI. 'alta' y 'abandono' ya existen y están
// en uso real (src/app/dashboard/agenda/seguimiento/SeguimientoClient.tsx,
// panel_pro_retencion) — no se renombran para no tocar datos/queries
// existentes. 'derivacion' y 'pausa_acordada' son nuevos. 'desconocido' no se
// guarda nunca: es un bucket calculado para discharge_reason ausente/legado.
export type DischargeReason = 'alta' | 'derivacion' | 'pausa_acordada' | 'abandono'

export const DISCHARGE_REASON_LABELS: Record<DischargeReason, string> = {
  alta: 'Alta clínica',
  derivacion: 'Derivación',
  pausa_acordada: 'Pausa acordada',
  abandono: 'Abandono',
}

const EVENT_META: Record<DischargeReason, { type: string; title: string }> = {
  alta: { type: 'alta', title: 'Alta clínica' },
  derivacion: { type: 'alta', title: 'Derivación' },
  pausa_acordada: { type: 'otro', title: 'Pausa acordada' },
  abandono: { type: 'otro', title: 'Tratamiento abandonado' },
}

// Registra el alta/cierre de un paciente: actualiza patients.discharged_at +
// discharge_reason y deja un hito en patient_events. Mismo criterio que
// darDeAlta/marcarAbandono en SeguimientoClient.tsx — escritura directa
// (la RLS de patients/patient_events ya valida el acceso), solo que acá
// soporta los 4 motivos en un solo lugar reusable.
export async function dischargePatient(
  supabase: SupabaseClient,
  patientId: string,
  userId: string,
  reason: DischargeReason
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('patients')
    .update({ discharged_at: new Date().toISOString(), discharge_reason: reason })
    .eq('id', patientId)
  if (error) return { error: error.message }

  const meta = EVENT_META[reason]
  await supabase.from('patient_events').insert({
    patient_id: patientId,
    user_id: userId,
    event_date: new Date().toISOString().split('T')[0],
    type: meta.type,
    title: meta.title,
  })
  return { error: null }
}

// Reabre a un paciente dado de alta por error (vuelve a activo). No borra el
// hito que ya quedó en patient_events — es historial.
export async function reopenPatient(
  supabase: SupabaseClient,
  patientId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('patients')
    .update({ discharged_at: null, discharge_reason: null })
    .eq('id', patientId)
  return { error: error?.message ?? null }
}
