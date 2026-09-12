import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  // Endpoint de diagnóstico: usa el cliente admin (se salta la RLS), así que lo
  // restringimos a admins. Antes bastaba con estar logueado, y cualquier usuario
  // con un load_share_token podía leer datos de pacientes ajenos.
  const userSupabase = createClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const supabase = createAdminClient()

  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Falta token' }, { status: 400 })

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, name, user_id, load_share_token')
    .eq('load_share_token', token)
    .single()

  if (patientError || !patient) {
    return NextResponse.json({ error: 'Paciente no encontrado', patientError }, { status: 404 })
  }

  const { data: plansByPatient, error: plansError } = await supabase
    .from('exercise_plans')
    .select('id, name, patient_id, share_token, updated_at')
    .eq('patient_id', patient.id)

  const planIds = (plansByPatient ?? []).map((p: { id: string }) => p.id)

  const { data: sessionsByPlanId, error: sessionsError1 } = planIds.length > 0
    ? await supabase
        .from('scheduled_sessions')
        .select('id, plan_id, session_name, scheduled_date, session_data')
        .in('plan_id', planIds)
        .order('scheduled_date', { ascending: true })
    : { data: [], error: null }

  const { data: sessionsByPatientId, error: sessionsError2 } = await supabase
    .from('scheduled_sessions')
    .select('id, plan_id, session_name, scheduled_date, session_data')
    .eq('patient_id', patient.id)
    .order('scheduled_date', { ascending: true })

  // También buscar sesiones por user_id del kine para diagnóstico
  const { data: sessionsByUserId, error: sessionsError3 } = await supabase
    .from('scheduled_sessions')
    .select('id, plan_id, patient_id, session_name, scheduled_date, session_data')
    .eq('user_id', patient.user_id)
    .limit(20)
    .order('scheduled_date', { ascending: false })

  return NextResponse.json({
    patient: { id: patient.id, name: patient.name, user_id: patient.user_id },
    plansByPatient: { count: plansByPatient?.length ?? 0, data: plansByPatient, error: plansError },
    sessionsByPlanId: {
      count: sessionsByPlanId?.length ?? 0,
      withSessionData: sessionsByPlanId?.filter((s: { session_data: unknown }) => s.session_data !== null).length ?? 0,
      data: sessionsByPlanId,
      error: sessionsError1,
    },
    sessionsByPatientId: {
      count: sessionsByPatientId?.length ?? 0,
      withSessionData: sessionsByPatientId?.filter((s: { session_data: unknown }) => s.session_data !== null).length ?? 0,
      data: sessionsByPatientId,
      error: sessionsError2,
    },
    sessionsByUserId: {
      count: sessionsByUserId?.length ?? 0,
      data: sessionsByUserId,
      error: sessionsError3,
    },
  })
}
