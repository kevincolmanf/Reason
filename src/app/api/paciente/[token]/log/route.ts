import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { exercise_id, exercise_name, session_id, week, rpe, eva, notes, plan_id } = body

    // Validar que el token de paciente existe
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('load_share_token', params.token)
      .single()

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
    }

    if (rpe < 1 || rpe > 10) return NextResponse.json({ error: 'RPE inválido' }, { status: 400 })
    if (eva < 0 || eva > 10) return NextResponse.json({ error: 'EVA inválido' }, { status: 400 })

    const { error } = await supabase
      .from('plan_activity_logs')
      .insert({
        plan_id,
        share_token: params.token,
        exercise_id,
        exercise_name,
        session_id,
        week: week ?? 1,
        rpe,
        eva,
        notes: notes ? String(notes).substring(0, 300) : null,
      })

    if (error) {
      console.error('[paciente/log]', error)
      return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
