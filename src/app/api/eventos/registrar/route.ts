import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Inscripción pública a un evento. NO requiere sesión. Crea (o enlaza) una cuenta
// free en Reason con el email del inscripto — el embudo de adquisición. El acceso
// a esa cuenta es passwordless (código por email), así que crearla por email es
// seguro: solo el dueño real del mail puede entrar.
export async function POST(request: Request) {
  const admin = createAdminClient()

  let body: { token?: string; name?: string; email?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }

  const token = (body.token ?? '').trim()
  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()

  if (!token || !name || !email) return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'El email no es válido.' }, { status: 400 })

  // Evento
  const { data: event } = await admin
    .from('events')
    .select('id, capacity, published, starts_at')
    .eq('public_token', token)
    .maybeSingle()
  if (!event || !event.published) return NextResponse.json({ error: 'El evento no existe o no está disponible.' }, { status: 404 })

  // ¿Ya inscripto?
  const { data: existingReg } = await admin
    .from('event_registrations')
    .select('id')
    .eq('event_id', event.id)
    .eq('email', email)
    .maybeSingle()
  if (existingReg) return NextResponse.json({ error: 'Ya estás inscripto a este evento con ese email.' }, { status: 409 })

  // Cupo
  if (event.capacity != null) {
    const { count } = await admin.from('event_registrations').select('*', { count: 'exact', head: true }).eq('event_id', event.id)
    if ((count ?? 0) >= event.capacity) return NextResponse.json({ error: 'El cupo está completo.' }, { status: 409 })
  }

  // Cuenta free: enlazar si el email ya existe, o crear una nueva (passwordless).
  let userId: string | null = null
  const { data: existingUser } = await admin.from('users').select('id').eq('email', email).maybeSingle()
  if (existingUser) {
    userId = existingUser.id
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name },
    })
    if (createErr || !created?.user) {
      // Si otro proceso lo creó en el medio, reintentamos leerlo; si no, seguimos sin cuenta.
      const { data: retry } = await admin.from('users').select('id').eq('email', email).maybeSingle()
      userId = retry?.id ?? null
    } else {
      userId = created.user.id
      await admin.from('users').insert({ id: userId, email, full_name: name, role: 'free' })
    }
  }

  // Inscripción
  const { error: regErr } = await admin.from('event_registrations').insert({
    event_id: event.id,
    name,
    email,
    user_id: userId,
  })
  if (regErr) {
    if (regErr.code === '23505') return NextResponse.json({ error: 'Ya estás inscripto a este evento con ese email.' }, { status: 409 })
    return NextResponse.json({ error: 'No se pudo completar la inscripción.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
