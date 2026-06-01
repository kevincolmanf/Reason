import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/pacientes/fuentes?orgId=xxx  → lista de fuentes
export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId')

  const admin = createAdminClient()
  const query = orgId
    ? admin.from('patient_sources').select('id, label, sort_order').eq('org_id', orgId).order('sort_order').order('created_at')
    : admin.from('patient_sources').select('id, label, sort_order').eq('user_id', user.id).is('org_id', null).order('sort_order').order('created_at')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/pacientes/fuentes  → crear nueva fuente (solo Pro)
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('role').eq('id', user.id).single()
  const role = userData?.role ?? 'free'
  if (role !== 'pro' && role !== 'admin') {
    return NextResponse.json({ error: 'Función exclusiva del Plan Pro' }, { status: 403 })
  }

  const { label, orgId } = await request.json()
  if (!label?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

  const { data, error } = await admin.from('patient_sources').insert({
    user_id: user.id,
    org_id: orgId ?? null,
    label: label.trim(),
  }).select('id, label, sort_order').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/pacientes/fuentes  → eliminar fuente
export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('patient_sources').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
