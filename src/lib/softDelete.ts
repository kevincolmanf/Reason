import type { SupabaseClient } from '@supabase/supabase-js'

// Papelera / soft-delete (Fase 1). En vez de borrar un registro de forma
// permanente, guardamos una copia completa en `deleted_records` y lo eliminamos
// de su tabla. Queda recuperable por 30 días. Ver supabase_papelera.sql.

export type SoftDeletableTable =
  | 'rts_evaluations'
  | 'dynamometer_results'
  | 'questionnaire_results'
  | 'patient_events'
  | 'load_sessions'

// Etiqueta legible por tabla, para mostrar en la papelera.
export const SOFT_DELETE_LABELS: Record<SoftDeletableTable, string> = {
  rts_evaluations:        'Evaluación RTS',
  dynamometer_results:    'Dinamometría',
  questionnaire_results:  'Cuestionario',
  patient_events:         'Hito del tratamiento',
  load_sessions:          'Registro de carga',
}

interface SoftDeleteArgs {
  table: SoftDeletableTable
  id: string
  userId: string
  patientId?: string | null
  patientName?: string | null
  label?: string | null
  orgId?: string | null
}

// Guarda una copia en la papelera y luego borra la fila original. Cada paso usa el
// cliente del usuario, así que la RLS se respeta en select/insert/delete.
export async function softDeleteRecord(
  supabase: SupabaseClient,
  args: SoftDeleteArgs
): Promise<{ error: string | null }> {
  const { table, id, userId, patientId = null, patientName = null, label = null, orgId = null } = args

  // 1. Traer la fila completa para poder restaurarla luego.
  const { data: row, error: selErr } = await supabase.from(table).select('*').eq('id', id).single()
  if (selErr || !row) return { error: selErr?.message ?? 'No se encontró el registro a borrar' }

  // 2. Guardar la copia en la papelera.
  const { error: insErr } = await supabase.from('deleted_records').insert({
    table_name: table,
    record_id: id,
    data: row,
    patient_id: patientId ?? (row as Record<string, unknown>).patient_id ?? null,
    patient_name: patientName,
    label: label ?? SOFT_DELETE_LABELS[table],
    org_id: orgId,
    deleted_by: userId,
  })
  if (insErr) return { error: insErr.message }

  // 3. Borrar la fila original. Si esto falla, quedó una copia huérfana en la
  //    papelera (inofensiva): el registro sigue existiendo y se puede reintentar.
  const { error: delErr } = await supabase.from(table).delete().eq('id', id)
  if (delErr) return { error: delErr.message }

  return { error: null }
}

// Reinserta el registro en su tabla original a partir de la copia y limpia la
// entrada de la papelera.
export async function restoreRecord(
  supabase: SupabaseClient,
  deletedId: string
): Promise<{ error: string | null }> {
  const { data: rec, error } = await supabase
    .from('deleted_records')
    .select('table_name, data')
    .eq('id', deletedId)
    .single()
  if (error || !rec) return { error: error?.message ?? 'No se encontró el registro en la papelera' }

  const { error: insErr } = await supabase.from(rec.table_name).insert(rec.data)
  if (insErr) return { error: insErr.message }

  const { error: delErr } = await supabase.from('deleted_records').delete().eq('id', deletedId)
  if (delErr) return { error: delErr.message }

  return { error: null }
}

// Borra físicamente lo que ya superó los 30 días. Se llama al abrir la papelera.
// La RLS limita el DELETE a lo que el usuario puede ver.
export async function purgeExpiredDeletedRecords(supabase: SupabaseClient, days = 30): Promise<void> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  await supabase.from('deleted_records').delete().lt('deleted_at', cutoff)
}
