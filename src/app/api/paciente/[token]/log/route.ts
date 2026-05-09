import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    const supabase = createAdminClient()
    const { token } = params
    const body = await request.json()

    const { exercise_id, exercise_name, session_id, week, rpe, eva, notes } = body

    // Validate via load_share_token
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('load_share_token', token)
      .single()

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
    }

    if (rpe < 1 || rpe > 10) return NextResponse.json({ error: 'RPE debe ser entre 1 y 10' }, { status: 400 })
    if (eva < 0 || eva > 10) return NextResponse.json({ error: 'EVA debe ser entre 0 y 10' }, { status: 400 })

    // Find the plan that contains this session
    const { data: plan } = await supabase
      .from('exercise_plans')
      .select('id')
      .eq('patient_id', patient.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    const { error: insertError } = await supabase
      .from('plan_activity_logs')
      .insert({
        plan_id: plan?.id ?? null,
        share_token: token,
        exercise_id,
        exercise_name,
        session_id,
        week,
        rpe,
        eva,
        notes: notes ? String(notes).substring(0, 300) : null,
      })

    if (insertError) {
      console.error('[paciente/log]', insertError)
      return NextResponse.json({ error: 'Error al guardar el reporte' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
