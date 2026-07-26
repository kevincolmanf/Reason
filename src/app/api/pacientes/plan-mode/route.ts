import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

// Cambia el modo de planificación de un paciente (detallado | simple).
// 'detallado' usa el editor de planes completo; 'simple' usa la bitácora de
// actividad. Va por el servidor con cliente admin + verificación de acceso.

const VALID = ['detallado', 'simple']

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: { patientId?: string; mode?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  const { patientId, mode } = body

  if (!patientId || !mode || !VALID.includes(mode)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

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

  const { error } = await admin.from('patients').update({ plan_mode: mode }).eq('id', patientId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, plan_mode: mode })
}
