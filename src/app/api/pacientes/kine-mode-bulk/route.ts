import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

// Prende/apaga el Modo Kinesiología en tanda (Fase 4). Verifica el acceso a cada
// paciente (creador, o miembro/dueño de su organización) y actualiza solo los
// permitidos. Devuelve cuántos se actualizaron.

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: { patientIds?: string[]; enabled?: boolean }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  const ids = Array.isArray(body.patientIds) ? body.patientIds.filter(x => typeof x === 'string') : []
  const enabled = body.enabled === true
  if (ids.length === 0) return NextResponse.json({ error: 'Sin pacientes' }, { status: 400 })
  if (typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'Falta enabled' }, { status: 400 })

  const admin = createAdminClient()

  const { data: patients } = await admin
    .from('patients')
    .select('id, user_id, org_id')
    .in('id', ids)
  if (!patients || patients.length === 0) return NextResponse.json({ error: 'Pacientes no encontrados' }, { status: 404 })

  // Orgs a las que el usuario tiene acceso (miembro o dueño), entre las involucradas.
  const orgIds = Array.from(new Set(patients.map(p => p.org_id).filter(Boolean) as string[]))
  const allowedOrgs = new Set<string>()
  if (orgIds.length > 0) {
    const [{ data: memberships }, { data: owned }] = await Promise.all([
      admin.from('organization_members').select('org_id').eq('user_id', user.id).in('org_id', orgIds),
      admin.from('organizations').select('id').eq('owner_id', user.id).in('id', orgIds),
    ])
    for (const m of memberships ?? []) allowedOrgs.add(m.org_id)
    for (const o of owned ?? []) allowedOrgs.add(o.id)
  }

  const allowedIds = patients
    .filter(p => p.user_id === user.id || (p.org_id && allowedOrgs.has(p.org_id)))
    .map(p => p.id)
  if (allowedIds.length === 0) return NextResponse.json({ error: 'Sin acceso a estos pacientes' }, { status: 403 })

  const { error } = await admin.from('patients').update({ kine_mode: enabled }).in('id', allowedIds)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, updated: allowedIds.length, updatedIds: allowedIds })
}
