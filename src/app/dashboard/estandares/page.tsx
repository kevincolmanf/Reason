import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import { getActiveContext } from '@/lib/context'
import { getOrgFeatureSetting } from '@/lib/featureSettings'
import { FEATURE_KEY_ESTANDARES_CALIDAD, withEstandaresCalidadDefaults } from '@/lib/qualityStandards/defaults'
import { DEFAULT_AREAS } from '@/lib/agendaAreas'
import EstandaresCalidadClient, { type ProRow } from './EstandaresCalidadClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Estándares de calidad | Reason' }

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

export default async function EstandaresCalidadPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: userData }, ctx] = await Promise.all([
    supabase.from('users').select('role').eq('id', user.id).single(),
    getActiveContext(user.id, supabase),
  ])

  // Es información de gestión de un centro: no existe en el espacio personal.
  if (ctx.type !== 'org' || !ctx.orgId) redirect('/dashboard')

  const { data: orgData } = await supabase
    .from('organizations')
    .select('id, name, owner_id, agenda_areas')
    .eq('id', ctx.orgId)
    .single()
  if (!orgData) redirect('/dashboard')

  const role = userData?.role
  const isOwner = orgData.owner_id === user.id
  // Mismo gate que Panel de gestión (CRM) y Estadísticas en contexto de
  // equipo: solo el dueño de ESTE centro (o un admin de Reason) — un
  // integrante no ve el panel agregado de todo el equipo.
  if (!(role === 'admin' || isOwner)) redirect('/dashboard')

  const setting = await getOrgFeatureSetting(ctx.orgId, FEATURE_KEY_ESTANDARES_CALIDAD, supabase)
  const config = withEstandaresCalidadDefaults(setting.config)
  // Las áreas para configurar son las de la agenda del centro (mismo
  // primitivo reusado, no un catálogo nuevo) — el dueño agrega/quita ahí, acá
  // solo se configuran los umbrales de cada una para este feature.
  const agendaAreas = (orgData.agenda_areas as string[] | null) ?? DEFAULT_AREAS

  let team: ProRow[] = []

  if (setting.enabled) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const [panelRes, membersRes] = await Promise.all([
      supabase.rpc('panel_cumplimiento', {
        p_org_id: ctx.orgId,
        p_from: monthStart.toISOString(),
        p_to: nextMonthStart.toISOString(),
        p_areas_config: config.areas,
      }),
      supabase.from('organization_members').select('user_id, users(id, full_name, email)').eq('org_id', ctx.orgId),
    ])

    const rows = (panelRes.data ?? []) as PanelRow[]
    const members = (membersRes.data ?? []) as unknown as MemberRow[]

    // Universo de profesionales = SOLO miembros de ESTE centro (members, ya
    // filtrado por org_id) — no los ids que devuelve la RPC por sí sola.
    // Mismo criterio de seguridad que /account/crm/page.tsx.
    const nameById = new Map<string, string>()
    members.forEach(m => {
      const id = m.users?.id ?? m.user_id
      if (m.users) nameById.set(id, m.users.full_name ?? m.users.email ?? 'Sin nombre')
    })
    if (isOwner && !nameById.has(user.id)) nameById.set(user.id, 'Vos')

    team = rows
      .filter(r => nameById.has(r.professional_id))
      .map(r => ({
        professionalId: r.professional_id,
        professionalName: nameById.get(r.professional_id) ?? 'Sin nombre',
        area: r.area,
        sesiones: `${r.sesiones_completas}/${r.sesiones_total}`,
        nuevosSinCuestionario: r.nuevos_sin_cuestionario,
        altas: r.altas, derivaciones: r.derivaciones, pausas: r.pausas,
        abandonos: r.abandonos, desconocido: r.desconocido,
        pacientesAbiertos: r.pacientes_abiertos,
        nuevosSinPlan: r.nuevos_sin_plan,
        evaluacionesIncompletas: r.evaluaciones_incompletas,
        pasesSinInforme: r.pases_sin_informe,
      }))
      .sort((a, b) => a.area.localeCompare(b.area) || a.professionalName.localeCompare(b.professionalName))
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12">
        <EstandaresCalidadClient
          orgId={ctx.orgId}
          orgName={orgData.name}
          enabled={setting.enabled}
          config={config}
          agendaAreas={agendaAreas}
          team={team}
        />
      </main>
    </div>
  )
}
