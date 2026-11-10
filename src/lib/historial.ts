import type { SupabaseClient } from '@supabase/supabase-js'

export type TimelineEventType = 'plan_session' | 'bitacora' | 'hito' | 'atencion' | 'carga' | 'turno'

export interface TimelineRow {
  id: string
  patient_id: string
  event_date: string
  event_type: TimelineEventType
  summary: string
  note: string | null
  author_name: string | null
  sort_key: string
  meta: Record<string, unknown>
}

const PAGE_SIZE = 40

// Pagina por cursor (sort_key del último elemento visto) en vez de traer todo
// de una — clave para pacientes con muchas sesiones. Más simple y confiable
// que pre-calcular resúmenes de "tramos viejos".
export async function fetchTimelinePage(
  supabase: SupabaseClient,
  patientId: string,
  beforeCursor?: string,
): Promise<{ rows: TimelineRow[]; hasMore: boolean }> {
  let query = supabase
    .from('patient_timeline')
    .select('*')
    .eq('patient_id', patientId)
    .order('sort_key', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (beforeCursor) query = query.lt('sort_key', beforeCursor)

  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as TimelineRow[]
  const hasMore = rows.length > PAGE_SIZE
  return { rows: hasMore ? rows.slice(0, PAGE_SIZE) : rows, hasMore }
}
