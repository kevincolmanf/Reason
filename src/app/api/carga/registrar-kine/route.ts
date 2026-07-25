import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

// Registro rápido de sesión hecho por el kinesiólogo (no por el paciente).
// Pensado para cargar en pocos segundos desde la ficha o la agenda, durante la
// atención. Guarda una sesión de carga (source: 'kine') y, si viene un turno,
// lo marca como presente. Va por el servidor con verificación de acceso.

function clampInt(v: unknown, min: number, max: number): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = Math.round(Number(v))
  if (Number.isNaN(n) || n < min || n > max) return null
  return n
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: { patientId?: string; note?: string; rpe?: number; durationMinutes?: number; pain?: number | null; turnoId?: string | null }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const { patientId, note, turnoId } = body
  const rpe = clampInt(body.rpe, 0, 10)
  const duration = clampInt(body.durationMinutes, 1, 600)
  const pain010 = clampInt(body.pain, 0, 10) // 0–10 en la UI; se guarda como VAS 0–100

  if (!patientId || rpe === null || duration === null) {
    return NextResponse.json({ error: 'Faltan datos: paciente, esfuerzo y duración' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Acceso al paciente: creador del registro o miembro/dueño de su organización.
  const { data: patient } = await admin.from('patients').select('user_id, org_id').eq('id', patientId).single()
  if (!patient) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })

  let allowed = patient.user_id === user.id
  if (!allowed && patient.org_id) {
    const { count } = await admin
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', patient.org_id).eq('user_id', user.id)
    if ((count ?? 0) > 0) allowed = true
    if (!allowed) {
      const { data: org } = await admin.from('organizations').select('id').eq('id', patient.org_id).eq('owner_id', user.id).maybeSingle()
      if (org) allowed = true
    }
  }
  if (!allowed) return NextResponse.json({ error: 'Sin acceso a este paciente' }, { status: 403 })

  const today = new Date().toISOString().split('T')[0]
  const { data: inserted, error } = await admin.from('load_sessions').insert({
    user_id: patient.user_id, // dueño de los datos del paciente
    patient_id: patientId,
    session_date: today,
    activity: null,
    duration_minutes: duration,
    rpe,
    load_units: rpe * duration,
    vas_post: pain010 !== null ? pain010 * 10 : null,
    notes: (note ?? '').trim() || null,
    source: 'kine',
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Marcar el turno como presente (si vino y pertenece a la org del paciente).
  if (turnoId) {
    await admin.from('turnos').update({ status: 'presente' }).eq('id', turnoId)
  }

  return NextResponse.json({ ok: true, id: inserted?.id })
}
