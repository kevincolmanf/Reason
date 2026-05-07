import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    const supabase = createAdminClient()
    const token = params.token
    const body = await request.json()

    const { exercise_id, exercise_name, session_id, week, rpe, eva, notes } = body

    // 1. Validar que el token existe y no está expirado
    const { data: plan, error: planError } = await supabase
      .from('exercise_plans')
      .select('id, share_token_expires_at, plan_data')
      .eq('share_token', token)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan no encontrado o link inválido' }, { status: 404 })
    }

    if (plan.share_token_expires_at && new Date(plan.share_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expirado' }, { status: 403 })
    }

    // 2. Validar que el ejercicio exista en el plan (opcional, pero buena práctica)
    // 3. Validar rangos
    if (rpe < 1 || rpe > 10) return NextResponse.json({ error: 'RPE debe ser entre 1 y 10' }, { status: 400 })
    if (eva < 0 || eva > 10) return NextResponse.json({ error: 'EVA debe ser entre 0 y 10' }, { status: 400 })

    // 4. Insertar en log
    const { error: insertError } = await supabase
      .from('plan_activity_logs')
      .insert({
        plan_id: plan.id,
        share_token: token,
        exercise_id,
        exercise_name,
        session_id,
        week,
        rpe,
        eva,
        notes: notes ? String(notes).substring(0, 300) : null
      })

    if (insertError) {
      console.error(insertError)
      return NextResponse.json({ error: 'Error al guardar el reporte' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
