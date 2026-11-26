import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import { getActiveContext } from '@/lib/context'
import { getOrgFeatureSetting } from '@/lib/featureSettings'
import { FEATURE_KEY_ESTANDARES_CALIDAD, withEstandaresCalidadDefaults } from '@/lib/qualityStandards/defaults'
import EstandaresCalidadClient, { type KineProRow, type EntrenoProRow } from './EstandaresCalidadClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Estándares de calidad | Reason' }

type KineRow = {
  professional_id: string
  sesiones_total: number; sesiones_completas: number
  pacientes_nuevos: number; nuevos_sin_cuestionario: number
  altas: number; derivaciones: number; pausas: number; abandonos: number; desconocido: number
  pacientes_abiertos: number
  pases_sin_informe: number
}
type EntrenoRow = {
  professional_id: string
  alumnos_nuevos: number; nuevos_sin_plan: number
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
    .select('id, name, owner_id')
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

  let kineTeam: KineProRow[] = []
  let entrenoTeam: EntrenoProRow[] = []

  if (setting.enabled) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const [kineRes, entrenoRes, membersRes] = await Promise.all([
      supabase.rpc('panel_cumplimiento_kinesiologia', {
        p_org_id: ctx.orgId,
        p_from: monthStart.toISOString(),
        p_to: nextMonthStart.toISOString(),
        p_dias_cuestionario: config.dias_max_cuestionario_ingreso,
        p_dias_abierto: config.dias_paciente_abierto,
      }),
      supabase.rpc('panel_cumplimiento_entrenamiento', {
        p_org_id: ctx.orgId,
        p_from: monthStart.toISOString(),
        p_to: nextMonthStart.toISOString(),
        p_dias_plan: config.dias_max_plan_entrenamiento,
        p_campos_obligatorios: config.campos_obligatorios_evaluacion_ingreso,
      }),
      supabase.from('organization_members').select('user_id, users(id, full_name, email)').eq('org_id', ctx.orgId),
    ])

    const kineById = new Map<string, KineRow>(((kineRes.data ?? []) as KineRow[]).map(r => [r.professional_id, r]))
    const entrenoById = new Map<string, EntrenoRow>(((entrenoRes.data ?? []) as EntrenoRow[]).map(r => [r.professional_id, r]))
    const members = (membersRes.data ?? []) as unknown as MemberRow[]

    // Universo de profesionales = SOLO miembros de ESTE centro (members, ya
    // filtrado por org_id) — no los ids que devuelven las RPC por sí solos.
    // Mismo criterio de seguridad que /account/crm/page.tsx.
    const nameById = new Map<string, string>()
    members.forEach(m => {
      const id = m.users?.id ?? m.user_id
      if (m.users) nameById.set(id, m.users.full_name ?? m.users.email ?? 'Sin nombre')
    })
    if (isOwner && !nameById.has(user.id)) nameById.set(user.id, 'Vos')

    kineTeam = Array.from(nameById.entries()).map(([id, name]) => {
      const r = kineById.get(id)
      return {
        id, name,
        sesiones: r ? `${r.sesiones_completas}/${r.sesiones_total}` : '0/0',
        nuevosSinCuestionario: r?.nuevos_sin_cuestionario ?? 0,
        altas: r?.altas ?? 0, derivaciones: r?.derivaciones ?? 0, pausas: r?.pausas ?? 0,
        abandonos: r?.abandonos ?? 0, desconocido: r?.desconocido ?? 0,
        pacientesAbiertos: r?.pacientes_abiertos ?? 0,
        pasesSinInforme: r?.pases_sin_informe ?? 0,
      }
    }).filter(row => kineById.has(row.id))

    entrenoTeam = Array.from(nameById.entries()).map(([id, name]) => {
      const r = entrenoById.get(id)
      return {
        id, name,
        alumnosNuevos: r?.alumnos_nuevos ?? 0,
        nuevosSinPlan: r?.nuevos_sin_plan ?? 0,
        evaluacionesIncompletas: r?.evaluaciones_incompletas ?? 0,
        pasesSinInforme: r?.pases_sin_informe ?? 0,
      }
    }).filter(row => entrenoById.has(row.id))
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
          kineTeam={kineTeam}
          entrenoTeam={entrenoTeam}
        />
      </main>
    </div>
  )
}
