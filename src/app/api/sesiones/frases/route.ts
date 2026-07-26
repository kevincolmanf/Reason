import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

// Frases rápidas personalizadas de la nota de sesión. Se guardan por organización
// (equipo Pro) o, si el paciente no tiene org, de forma personal. Cualquier
// integrante con acceso al paciente puede leerlas, crearlas y borrarlas.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = ReturnType<typeof createAdminClient>

// Devuelve el org_id del paciente si el usuario tiene acceso; null si es personal;
// lanza (retornando undefined) si no hay acceso o el paciente no existe.
async function resolveScope(admin: Admin, patientId: string, userId: string): Promise<{ orgId: string | null } | null> {
  const { data: patient } = await admin.from('patients').select('user_id, org_id').eq('id', patientId).single()
  if (!patient) return null
  let allowed = patient.user_id === userId
  if (!allowed && patient.org_id) {
    const { count } = await admin
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', patient.org_id).eq('user_id', userId)
    if ((count ?? 0) > 0) allowed = true
    if (!allowed) {
      const { data: org } = await admin.from('organizations').select('id').eq('id', patient.org_id).eq('owner_id', userId).maybeSingle()
      if (org) allowed = true
    }
  }
  if (!allowed) return null
  return { orgId: patient.org_id ?? null }
}

// GET /api/sesiones/frases?patientId=xxx → frases del equipo (o personales)
export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patientId')
  if (!patientId) return NextResponse.json({ error: 'Falta patientId' }, { status: 400 })

  const admin = createAdminClient()
  const scope = await resolveScope(admin, patientId, user.id)
  if (!scope) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const query = scope.orgId
    ? admin.from('session_note_phrases').select('id, label').eq('org_id', scope.orgId).order('created_at')
    : admin.from('session_note_phrases').select('id, label').eq('user_id', user.id).is('org_id', null).order('created_at')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/sesiones/frases  { patientId, label } → crear frase
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { patientId, label } = await request.json()
  if (!patientId) return NextResponse.json({ error: 'Falta patientId' }, { status: 400 })
  const clean = (label ?? '').trim()
  if (!clean) return NextResponse.json({ error: 'La frase no puede estar vacía' }, { status: 400 })
  if (clean.length > 80) return NextResponse.json({ error: 'La frase es demasiado larga' }, { status: 400 })

  const admin = createAdminClient()
  const scope = await resolveScope(admin, patientId, user.id)
  if (!scope) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const { data, error } = await admin.from('session_note_phrases').insert({
    user_id: user.id,
    org_id: scope.orgId,
    label: clean,
  }).select('id, label').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/sesiones/frases  { id, patientId } → borrar frase
export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, patientId } = await request.json()
  if (!id || !patientId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const admin = createAdminClient()
  const scope = await resolveScope(admin, patientId, user.id)
  if (!scope) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  // Solo se borra dentro del mismo scope (equipo o personal) al que el usuario tiene acceso.
  const query = scope.orgId
    ? admin.from('session_note_phrases').delete().eq('id', id).eq('org_id', scope.orgId)
    : admin.from('session_note_phrases').delete().eq('id', id).eq('user_id', user.id).is('org_id', null)

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
