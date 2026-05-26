import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { broadcastPortalRefresh } from '@/utils/portal-broadcast'

export async function POST(request: Request) {
  try {
    const userSupabase = createClient()
    const { data: { user } } = await userSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { session_id, session_name, session_data } = body

    if (!session_id) {
      return NextResponse.json({ error: 'Falta session_id' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Obtener la sesión con admin (sin RLS) para leer plan_id
    const { data: session, error: fetchError } = await admin
      .from('scheduled_sessions')
      .select('id, plan_id, patient_id')
      .eq('id', session_id)
      .single()

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario tiene acceso al plan (respeta RLS de exercise_plans)
    const { data: plan, error: planError } = await userSupabase
      .from('exercise_plans')
      .select('id')
      .eq('id', session.plan_id)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Sin acceso a esta sesión' }, { status: 403 })
    }

    // Actualizar con admin client (bypasea RLS) y devolver la fila actualizada
    const { data: updated, error: updateError } = await admin
      .from('scheduled_sessions')
      .update({ session_name, session_data })
      .eq('id', session_id)
      .select('id, session_name, session_data')
      .single()

    if (updateError) {
      console.error('[sessions/update] Error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (session.patient_id) {
      broadcastPortalRefresh(session.patient_id)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const savedBlocks = (updated?.session_data as any)?.blocks ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const savedExercises = savedBlocks.reduce((n: number, b: any) => n + (b.exercises?.length ?? 0), 0)

    return NextResponse.json({ ok: true, blocks: savedBlocks.length, exercises: savedExercises })
  } catch (err) {
    console.error('[sessions/update] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
