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

    const { session_id } = await request.json()

    if (!session_id) {
      return NextResponse.json({ error: 'Falta session_id' }, { status: 400 })
    }

    // Verificar acceso usando el cliente del usuario
    const { data: session, error: fetchError } = await userSupabase
      .from('scheduled_sessions')
      .select('id, patient_id')
      .eq('id', session_id)
      .single()

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Sesión no encontrada o sin acceso' }, { status: 404 })
    }

    const admin = createAdminClient()
    const { error: deleteError } = await admin
      .from('scheduled_sessions')
      .delete()
      .eq('id', session_id)

    if (deleteError) {
      console.error('[sessions/delete] Error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    if (session.patient_id) {
      broadcastPortalRefresh(session.patient_id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[sessions/delete] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
