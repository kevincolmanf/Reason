import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import SeguimientoClient from './SeguimientoClient'
import { getActiveContext } from '@/lib/context'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Seguimiento de ausencias | Reason' }

// Umbral por defecto: aparece si hace >= 7 días que no viene y no tiene turno.
const THRESHOLD_DAYS = 7

const DEFAULT_AREAS = [
  'Kinesiología', 'Entrenamiento adultos', 'Entrenamiento niños', 'RPG',
  'Pilates', 'Yoga', 'Nutrición', 'Traumatología', 'Análisis de la marcha',
]

export default async function SeguimientoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: userData }, ctx] = await Promise.all([
    supabase.from('users').select('role').eq('id', user.id).single(),
    getActiveContext(user.id, supabase),
  ])

  const role = userData?.role
  const isOrgContext = ctx.type === 'org' && !!ctx.orgId
  const isActive = role === 'admin' || role === 'pro' || isOrgContext
  if (!isActive) redirect('/paywall')

  let isOrgOwner = false
  let orgId: string | null = null
  let orgName: string | null = null
  let areas: string[] = DEFAULT_AREAS
  let trackedAreas: string[] | null = null // null = todas

  if (isOrgContext && ctx.orgId) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id, name, owner_id, agenda_areas, absence_areas')
      .eq('id', ctx.orgId)
      .single()
    const org = orgData as unknown as { id: string; name: string; owner_id: string; agenda_areas: string[] | null; absence_areas: string[] | null } | null
    if (org) {
      orgId = org.id
      orgName = org.name
      isOrgOwner = org.owner_id === user.id
      areas = org.agenda_areas ?? DEFAULT_AREAS
      trackedAreas = org.absence_areas ?? null
    }
  }

  // Mismo permiso que Recordatorios: dueño/admin o integrante que "modifica la
  // agenda" (la secretaría con edición).
  const isOwner = role === 'admin' || !orgId || isOrgOwner
  let canEdit = isOwner
  if (orgId) {
    type MemberRow = { user_id: string; agenda_access: boolean | null; agenda_can_edit: boolean | null }
    const adminClient = createAdminClient()
    const { data: memberRows } = await adminClient
      .from('organization_members')
      .select('user_id, agenda_access, agenda_can_edit')
      .eq('org_id', orgId)
    const rows = (memberRows ?? []) as unknown as MemberRow[]
    const myRow = rows.find(m => m.user_id === user.id)
    canEdit = isOwner || (!!myRow?.agenda_can_edit && !!myRow?.agenda_access)
  }

  if (!canEdit) redirect('/dashboard/agenda')

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[820px] mx-auto px-6 py-8">
        <SeguimientoClient
          userId={user.id}
          orgId={orgId}
          orgName={orgName}
          thresholdDays={THRESHOLD_DAYS}
          areas={areas}
          trackedAreas={trackedAreas}
          canConfig={canEdit}
        />
      </main>
    </div>
  )
}
