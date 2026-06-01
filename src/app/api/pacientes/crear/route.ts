import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

const LIMITS: Record<string, number> = {
  free: 1,
  subscriber: 20,
  pro: Infinity,
  admin: Infinity,
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { name, dni, birth_date, phone, email, obra_social, occupation, source, orgId } = body

  if (!name?.trim() || !dni?.trim()) {
    return NextResponse.json({ error: 'Nombre y DNI son obligatorios' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get user role
  const { data: userData } = await admin.from('users').select('role').eq('id', user.id).single()
  const role = userData?.role ?? 'free'
  const limit = LIMITS[role] ?? 1
  const isOrgContext = !!orgId

  // Count existing patients (org or personal)
  const countQuery = isOrgContext
    ? admin.from('patients').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
    : admin.from('patients').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('org_id', null)

  const { count } = await countQuery
  const currentCount = count ?? 0

  if (!isOrgContext && currentCount >= limit) {
    return NextResponse.json(
      { error: `Límite de pacientes alcanzado (${limit} para plan ${role})`, limitReached: true },
      { status: 403 }
    )
  }

  // Check duplicate DNI
  const dupQuery = isOrgContext
    ? admin.from('patients').select('id').eq('dni', dni.trim()).eq('org_id', orgId).maybeSingle()
    : admin.from('patients').select('id').eq('dni', dni.trim()).eq('user_id', user.id).is('org_id', null).maybeSingle()

  const { data: existing } = await dupQuery
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un paciente registrado con ese DNI.' }, { status: 409 })
  }

  // Create patient
  const { data: patient, error } = await admin.from('patients').insert({
    user_id: user.id,
    org_id: isOrgContext ? orgId : null,
    name: name.trim(),
    dni: dni.trim(),
    birth_date: birth_date || null,
    phone: phone?.trim() || null,
    email: email?.trim() || null,
    obra_social: obra_social?.trim() || null,
    occupation: occupation?.trim() || null,
    source: source?.trim() || null,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: patient.id })
}
