import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: Request) {
  try {
    const userSupabase = createClient()
    const { data: { user } } = await userSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { plan_id, scheduled_date } = body

    if (!plan_id || !scheduled_date) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verificar que el plan pertenece al usuario (o puede verlo via org)
    const { data: plan, error: planError } = await admin
      .from('exercise_plans')
      .select('id, user_id, patient_id, name')
      .eq('id', plan_id)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    if (plan.user_id !== user.id) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    // Insertar sesión con admin client (bypasea RLS)
    const { data: session, error: insertError } = await admin
      .from('scheduled_sessions')
      .insert({
        user_id: user.id,
        patient_id: plan.patient_id,
        plan_id: plan.id,
        plan_name: plan.name ?? '',
        scheduled_date,
        session_name: 'Nueva sesión',
        session_data: { blocks: [] },
        session_id: crypto.randomUUID(),
        week: 1,
      })
      .select('id, scheduled_date, session_name, session_data, completed')
      .single()

    if (insertError) {
      console.error('[sessions/create] Error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ session })
  } catch (err) {
    console.error('[sessions/create] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
