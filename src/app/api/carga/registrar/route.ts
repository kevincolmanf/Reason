import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { token, session_date, activity, duration_minutes, rpe, vas_post } = body

  if (!token || !session_date || !duration_minutes || rpe === undefined) {
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
    duration_minutes,
    rpe,
    load_units,
    vas_post: vas_post ?? null,
    source: 'patient',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
