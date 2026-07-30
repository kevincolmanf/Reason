import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Guarda (o borra) la carga real que el paciente usó en un ejercicio de una sesión.
// Validado por el share_token del plan. Si actual_load viene vacío, se elimina el
// override y queda la carga sugerida del kinesiólogo.
export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    const supabase = createAdminClient()
    const token = params.token
    const body = await request.json()
    const { session_id, exercise_id, actual_load, scheduled_date } = body

    if (!session_id || !exercise_id) {
      return NextResponse.json({ error: 'Faltan datos del ejercicio' }, { status: 400 })
    }

    const { data: plan, error: planError } = await supabase
      .from('exercise_plans')
      .select('id, share_token_expires_at')
      .eq('share_token', token)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan no encontrado o link inválido' }, { status: 404 })
    }
    if (plan.share_token_expires_at && new Date(plan.share_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expirado' }, { status: 403 })
    }

    const load = typeof actual_load === 'string' ? actual_load.trim() : ''

    if (load === '') {
      // Sin carga real → borrar override, vuelve a la sugerida.
      const { error } = await supabase
        .from('plan_load_overrides')
        .delete()
        .eq('plan_id', plan.id)
        .eq('session_id', String(session_id))
        .eq('exercise_id', String(exercise_id))
      if (error) { console.error(error); return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 }) }
      return NextResponse.json({ success: true, cleared: true })
    }

    const { error } = await supabase
      .from('plan_load_overrides')
      .upsert({
        plan_id: plan.id,
        session_id: String(session_id),
        exercise_id: String(exercise_id),
        actual_load: load.substring(0, 40),
        scheduled_date: scheduled_date || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'plan_id,session_id,exercise_id' })

    if (error) { console.error(error); return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 }) }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
