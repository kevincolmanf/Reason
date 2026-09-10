import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

// Prende/apaga el Modo Kinesiología de un paciente (patients.kine_mode).
// Cuando está en true, el paciente muestra la capa "Atención de hoy". El default
// es false (modo normal/entrenamiento), así que los alumnos nunca se tocan salvo
// que alguien con acceso lo active a propósito. Va por el servidor con cliente
// admin + verificación de acceso, igual que los otros modos del paciente.

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: { patientId?: string; enabled?: boolean }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  const { patientId, enabled } = body

  if (!patientId) return NextResponse.json({ error: 'Falta patientId' }, { status: 400 })
  if (typeof enabled !== 'boolean') return NextResponse.json({ error: 'Falta enabled (booleano)' }, { status: 400 })

  const admin = createAdminClient()

  const { data: patient } = await admin
    .from('patients')
    .select('user_id, org_id')
    .eq('id', patientId)
    .single()
  if (!patient) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })

  // Acceso: creador del registro, o miembro/dueño de la organización del paciente.
  let allowed = patient.user_id === user.id
  if (!allowed && patient.org_id) {
    const { count } = await admin
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', patient.org_id)
      .eq('user_id', user.id)
    if ((count ?? 0) > 0) allowed = true
    if (!allowed) {
      const { data: org } = await admin
        .from('organizations')
        .select('id')
        .eq('id', patient.org_id)
        .eq('owner_id', user.id)
        .maybeSingle()
      if (org) allowed = true
    }
  }
  if (!allowed) return NextResponse.json({ error: 'Sin acceso a este paciente' }, { status: 403 })

  const { error } = await admin.from('patients').update({ kine_mode: enabled }).eq('id', patientId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, kine_mode: enabled })
}
