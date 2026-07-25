import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { broadcastPortalRefresh } from '@/utils/portal-broadcast'

// Duplica una semana entera de un plan a las próximas N semanas: copia cada
// sesión (nombre + ejercicios) al mismo día de la semana, +7·w días. No pisa
// días que ya tengan una sesión. Ahorra la carga repetitiva de varias semanas.

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export async function POST(request: Request) {
  try {
    const userSupabase = createClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await request.json()
    const plan_id: string | undefined = body.plan_id
    const sourceWeekStart: string | undefined = body.source_week_start // lunes, YYYY-MM-DD
    const weeks = Math.max(1, Math.min(12, Math.round(Number(body.weeks) || 0)))

    if (!plan_id || !sourceWeekStart || !weeks) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Acceso al plan (respeta RLS)
    const { data: plan, error: planError } = await userSupabase
      .from('exercise_plans')
      .select('id, patient_id, name')
      .eq('id', plan_id)
      .single()
    if (planError || !plan) return NextResponse.json({ error: 'Plan no encontrado o sin acceso' }, { status: 404 })
    if (!plan.patient_id) return NextResponse.json({ error: 'El plan no tiene paciente asignado' }, { status: 400 })

    const admin = createAdminClient()
    const sourceWeekEnd = addDaysStr(sourceWeekStart, 6)

    // Sesiones de la semana origen
    const { data: sourceSessions } = await admin
      .from('scheduled_sessions')
      .select('scheduled_date, session_name, session_data')
      .eq('plan_id', plan_id)
      .gte('scheduled_date', sourceWeekStart)
      .lte('scheduled_date', sourceWeekEnd)

    if (!sourceSessions || sourceSessions.length === 0) {
      return NextResponse.json({ error: 'No hay sesiones en esa semana para duplicar' }, { status: 400 })
    }

    // Fechas destino que YA tienen sesión (para no pisarlas)
    const firstTarget = addDaysStr(sourceWeekStart, 7)
    const lastTarget = addDaysStr(sourceWeekStart, 7 * weeks + 6)
    const { data: existing } = await admin
      .from('scheduled_sessions')
      .select('scheduled_date')
      .eq('plan_id', plan_id)
      .gte('scheduled_date', firstTarget)
      .lte('scheduled_date', lastTarget)
    const taken = new Set((existing ?? []).map(e => e.scheduled_date))

    const rows: Record<string, unknown>[] = []
    for (let w = 1; w <= weeks; w++) {
      for (const s of sourceSessions) {
        const targetDate = addDaysStr(s.scheduled_date, 7 * w)
        if (taken.has(targetDate)) continue
        taken.add(targetDate) // evita duplicar dos sesiones el mismo día en esta corrida
        rows.push({
          user_id: user.id,
          patient_id: plan.patient_id,
          plan_id: plan.id,
          plan_name: plan.name ?? '',
          scheduled_date: targetDate,
          session_name: s.session_name ?? 'Sesión',
          session_data: s.session_data ?? { blocks: [] },
          session_id: crypto.randomUUID(),
          week: 1,
        })
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, created: [], skipped: true })
    }

    const { data: created, error: insertError } = await admin
      .from('scheduled_sessions')
      .insert(rows)
      .select('id, scheduled_date, session_name, session_data, completed')
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    await broadcastPortalRefresh(plan.patient_id)

    return NextResponse.json({ ok: true, created: created ?? [] })
  } catch (err) {
    console.error('[sessions/duplicate-week] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
