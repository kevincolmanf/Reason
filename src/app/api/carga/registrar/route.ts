import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

// Normaliza un valor numérico a un rango [min, max]; devuelve null si no es válido.
function clampOrNull(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  if (Number.isNaN(n)) return null
  if (n < min || n > max) return null
  return n
}

export async function POST(request: Request) {
  const body = await request.json()
  const {
    token,
    session_date,
    activity,
    activity_type,
    duration_minutes,
    rpe,
    vas_pre,
    vas_during,
    vas_post,
    sleep_quality,
    energy,
    stress,
  } = body

  if (!token || !session_date || duration_minutes === undefined || duration_minutes === null || rpe === undefined || rpe === null) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verificar que el token existe y obtener patient_id y user_id
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, user_id')
    .eq('load_share_token', token)
    .single()

  if (patientError || !patient) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  const load_units = Math.round(rpe * duration_minutes)

  const { error } = await supabase.from('load_sessions').insert({
    user_id: patient.user_id,
    patient_id: patient.id,
    session_date,
    activity: activity || null,
    activity_type: activity_type || null,
    duration_minutes,
    rpe,
    load_units,
    // Dolor (VAS 0–100)
    vas_pre: clampOrNull(vas_pre, 0, 100),
    vas_during: clampOrNull(vas_during, 0, 100),
    vas_post: clampOrNull(vas_post, 0, 100),
    // Bienestar pre-sesión (0–10)
    sleep_quality: clampOrNull(sleep_quality, 0, 10),
    energy: clampOrNull(energy, 0, 10),
    stress: clampOrNull(stress, 0, 10),
    source: 'patient',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
