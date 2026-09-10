import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { broadcastPortalRefresh } from '@/utils/portal-broadcast'

// "Traer sesión a hoy" (Modo Kinesiología). Cuando el paciente cae un día
// distinto al agendado, esto pone la sesión en el día real SIN romper el
// calendario: si hay una próxima sesión futura, la MUEVE a hoy; si no hay
// futura, COPIA la última al día de hoy. Nunca duplica una sesión que ya exista
// para hoy. El acceso se valida por el plan (RLS de exercise_plans).

function todayInAR(): string {
  // YYYY-MM-DD en horario de Argentina.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}

export async function POST(request: Request) {
  const userSupabase = createClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: { patientId?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  const { patientId } = body
  if (!patientId) return NextResponse.json({ error: 'Falta patientId' }, { status: 400 })

  // Plan del paciente (RLS de exercise_plans hace de control de acceso).
  const { data: plan } = await userSupabase
    .from('exercise_plans')
    .select('id, user_id, patient_id, name')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!plan) return NextResponse.json({ error: 'El paciente no tiene un plan de ejercicios' }, { status: 409 })

  const today = todayInAR()
  const admin = createAdminClient()

  // ¿Ya hay una sesión para hoy? Entonces no hay nada que traer.
  const { data: existingToday } = await admin
    .from('scheduled_sessions')
    .select('id, scheduled_date, session_name, session_data, completed')
    .eq('plan_id', plan.id)
    .eq('scheduled_date', today)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (existingToday) return NextResponse.json({ session: existingToday, action: 'existing' })

  // Próxima sesión futura → mover a hoy (no duplica).
  const { data: upcoming } = await admin
    .from('scheduled_sessions')
    .select('id, scheduled_date, session_name, session_data')
    .eq('plan_id', plan.id)
    .gt('scheduled_date', today)
    .order('scheduled_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (upcoming) {
    const { data: moved, error } = await admin
      .from('scheduled_sessions')
      .update({ scheduled_date: today })
      .eq('id', upcoming.id)
      .select('id, scheduled_date, session_name, session_data, completed')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (plan.patient_id) await broadcastPortalRefresh(plan.patient_id)
    return NextResponse.json({ session: moved, action: 'moved', from: upcoming.scheduled_date })
  }

  // Sin futura → copiar la última pasada al día de hoy.
  const { data: last } = await admin
    .from('scheduled_sessions')
    .select('scheduled_date, session_name, session_data, week, plan_name')
    .eq('plan_id', plan.id)
    .lt('scheduled_date', today)
    .order('scheduled_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!last) return NextResponse.json({ error: 'El plan no tiene sesiones para traer' }, { status: 409 })

  const { data: created, error: insErr } = await admin
    .from('scheduled_sessions')
    .insert({
      user_id: user.id,
      patient_id: plan.patient_id,
      plan_id: plan.id,
      plan_name: last.plan_name ?? plan.name ?? '',
      scheduled_date: today,
      session_name: last.session_name ?? 'Sesión',
      session_data: last.session_data ?? { blocks: [] },
      session_id: crypto.randomUUID(),
      week: last.week ?? 1,
    })
    .select('id, scheduled_date, session_name, session_data, completed')
    .single()
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  if (plan.patient_id) await broadcastPortalRefresh(plan.patient_id)
  return NextResponse.json({ session: created, action: 'copied', from: last.scheduled_date })
}
