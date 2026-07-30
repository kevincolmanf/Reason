import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Guarda (o borra) la carga real de un ejercicio, validado por el token de
// paciente (load_share_token). Se usa cuando el plan no tiene su propio
// share_token pero el paciente accede por su portal.
export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    const supabase = createAdminClient()
    const { token } = params
    const body = await request.json()
    const { session_id, exercise_id, actual_load, scheduled_date } = body

    if (!session_id || !exercise_id) {
      return NextResponse.json({ error: 'Faltan datos del ejercicio' }, { status: 400 })
    }

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('load_share_token', token)
      .single()

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
    }

    // Resolver el plan: primero por la sesión, si no el plan más reciente del paciente.
    let planId: string | null = null
    const { data: sched } = await supabase
      .from('scheduled_sessions')
      .select('plan_id')
      .eq('id', String(session_id))
      .limit(1)
      .maybeSingle()
    if (sched?.plan_id) {
      planId = sched.plan_id
    } else {
      const { data: plan } = await supabase
        .from('exercise_plans')
        .select('id')
        .eq('patient_id', patient.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      planId = plan?.id ?? null
    }

    if (!planId) {
      return NextResponse.json({ error: 'No se encontró el plan' }, { status: 404 })
    }

    const load = typeof actual_load === 'string' ? actual_load.trim() : ''

    if (load === '') {
      const { error } = await supabase
        .from('plan_load_overrides')
        .delete()
        .eq('plan_id', planId)
        .eq('session_id', String(session_id))
        .eq('exercise_id', String(exercise_id))
      if (error) { console.error('[paciente/load]', error); return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 }) }
      return NextResponse.json({ success: true, cleared: true })
    }

    const { error } = await supabase
      .from('plan_load_overrides')
      .upsert({
        plan_id: planId,
        session_id: String(session_id),
        exercise_id: String(exercise_id),
        actual_load: load.substring(0, 40),
        scheduled_date: scheduled_date || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'plan_id,session_id,exercise_id' })

    if (error) { console.error('[paciente/load]', error); return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 }) }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
