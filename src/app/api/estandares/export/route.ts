import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { getOrgFeatureSetting } from '@/lib/featureSettings'
import { FEATURE_KEY_ESTANDARES_CALIDAD, withEstandaresCalidadDefaults } from '@/lib/qualityStandards/defaults'

// Export semanal/mensual de "Estándares de calidad" (Vista C) — pensado para
// que un asistente lo lea y arme el resumen de los lunes del director, o para
// bajarlo directo como CSV. Deliberadamente NO expone ningún dato de
// paciente (nombre, DNI, teléfono, texto clínico): solo conteos por
// profesional y área, que es exactamente todo lo que devuelve
// panel_cumplimiento() — nunca seleccionó un campo de paciente para empezar.
//
// GET /api/estandares/export?orgId=...&from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv|json
// Solo el dueño del centro (o un admin de Reason) puede pedirlo — mismo gate
// que /dashboard/estandares.

type PanelRow = {
  professional_id: string
  area: string
  sesiones_total: number; sesiones_completas: number
  pacientes_nuevos: number; nuevos_sin_cuestionario: number
  altas: number; derivaciones: number; pausas: number; abandonos: number; desconocido: number
  pacientes_abiertos: number
  nuevos_sin_plan: number
  evaluaciones_incompletas: number
  pases_sin_informe: number
}
type MemberRow = { user_id: string; users: { id: string; full_name: string | null; email: string | null } | null }

function csvEscape(v: unknown): string {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(',')
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'Falta orgId' }, { status: 400 })

  const format = (searchParams.get('format') ?? 'csv').toLowerCase()

  const [{ data: orgData }, { data: userData }] = await Promise.all([
    supabase.from('organizations').select('id, name, owner_id').eq('id', orgId).single(),
    supabase.from('users').select('role').eq('id', user.id).single(),
  ])
  if (!orgData) return NextResponse.json({ error: 'Centro no encontrado' }, { status: 404 })

  const isOwner = orgData.owner_id === user.id
  if (!(isOwner || userData?.role === 'admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Semana por defecto (últimos 7 días) — "resumen de los lunes".
  const now = new Date()
  const defaultFrom = new Date(now)
  defaultFrom.setDate(defaultFrom.getDate() - 7)
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  const from = fromParam ? new Date(fromParam) : defaultFrom
  const to = toParam ? new Date(toParam) : now
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: 'from/to inválidos (YYYY-MM-DD)' }, { status: 400 })
  }

  const setting = await getOrgFeatureSetting(orgId, FEATURE_KEY_ESTANDARES_CALIDAD, supabase)
  const config = withEstandaresCalidadDefaults(setting.config)

  const [panelRes, membersRes] = await Promise.all([
    supabase.rpc('panel_cumplimiento', {
      p_org_id: orgId, p_from: from.toISOString(), p_to: to.toISOString(),
      p_areas_config: config.areas,
    }),
    supabase.from('organization_members').select('user_id, users(id, full_name, email)').eq('org_id', orgId),
  ])

  if (panelRes.error) return NextResponse.json({ error: panelRes.error.message }, { status: 400 })

  // Universo de profesionales = SOLO miembros de ESTE centro — mismo criterio
  // de seguridad que /account/crm y /dashboard/estandares: no confiar en los
  // ids que devuelve la RPC por sí sola.
  const members = (membersRes.data ?? []) as unknown as MemberRow[]
  const nameById = new Map<string, string>()
  members.forEach(m => {
    const id = m.users?.id ?? m.user_id
    if (m.users) nameById.set(id, m.users.full_name ?? m.users.email ?? 'Sin nombre')
  })
  if (isOwner && !nameById.has(user.id)) nameById.set(user.id, 'Dueño del centro')

  const rows = ((panelRes.data ?? []) as PanelRow[]).filter(r => nameById.has(r.professional_id))

  const periodo = { desde: from.toISOString().split('T')[0], hasta: to.toISOString().split('T')[0] }
  const filenameBase = `estandares-calidad_${periodo.desde}_${periodo.hasta}`

  if (format === 'json') {
    return NextResponse.json({
      centro: orgData.name,
      periodo,
      equipo: rows.map(r => ({
        profesional: nameById.get(r.professional_id),
        area: r.area,
        sesiones_completas: r.sesiones_completas, sesiones_total: r.sesiones_total,
        nuevos_sin_cuestionario: r.nuevos_sin_cuestionario,
        altas: r.altas, derivaciones: r.derivaciones, pausas: r.pausas, abandonos: r.abandonos, desconocido: r.desconocido,
        pacientes_abiertos: r.pacientes_abiertos,
        nuevos_sin_plan: r.nuevos_sin_plan,
        evaluaciones_incompletas: r.evaluaciones_incompletas,
        pases_sin_informe: r.pases_sin_informe,
      })),
    }, {
      headers: { 'Content-Disposition': `attachment; filename="${filenameBase}.json"` },
    })
  }

  const lines: string[] = []
  lines.push(csvRow(['Centro', orgData.name]))
  lines.push(csvRow(['Período', `${periodo.desde} a ${periodo.hasta}`]))
  lines.push('')
  lines.push(csvRow([
    'Área', 'Profesional', 'Sesiones completas', 'Sesiones totales', 'Nuevos sin cuestionario',
    'Altas', 'Derivaciones', 'Pausas', 'Abandonos', 'Desconocido', 'Pacientes abiertos',
    'Sin plan', 'Evaluaciones incompletas', 'Pases sin informe',
  ]))
  for (const r of rows) {
    lines.push(csvRow([
      r.area, nameById.get(r.professional_id), r.sesiones_completas, r.sesiones_total, r.nuevos_sin_cuestionario,
      r.altas, r.derivaciones, r.pausas, r.abandonos, r.desconocido, r.pacientes_abiertos,
      r.nuevos_sin_plan, r.evaluaciones_incompletas, r.pases_sin_informe,
    ]))
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
    },
  })
}
