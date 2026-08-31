import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import RecordatoriosClient from './RecordatoriosClient'
import { getActiveContext } from '@/lib/context'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Recordatorios | Reason' }

const DEFAULT_AREAS = [
  'Kinesiología',
  'Entrenamiento adultos',
  'Entrenamiento niños',
  'RPG',
  'Pilates',
  'Yoga',
  'Nutrición',
  'Traumatología',
  'Análisis de la marcha',
]

export default async function RecordatoriosPage({ searchParams }: { searchParams: { day?: string; area?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: userData }, ctx] = await Promise.all([
    supabase.from('users').select('role, full_name, agenda_areas').eq('id', user.id).single(),
    getActiveContext(user.id, supabase),
  ])

  const role = userData?.role
  const isOrgContext = ctx.type === 'org' && !!ctx.orgId
  const isActive = role === 'admin' || role === 'pro' || isOrgContext
  if (!isActive) redirect('/paywall')

  let isOrgOwner = false
  let orgId: string | null = null
  let orgName: string | null = null
  let areas: string[] = userData?.agenda_areas ?? DEFAULT_AREAS

  if (isOrgContext && ctx.orgId) {
    type OrgData = { id: string; name: string; agenda_areas: string[] | null; owner_id: string }
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id, name, agenda_areas, owner_id')
      .eq('id', ctx.orgId)
      .single()
    const org = orgData as unknown as OrgData | null
    if (org) {
      orgId = org.id
      orgName = org.name
      areas = org.agenda_areas ?? DEFAULT_AREAS
      isOrgOwner = org.owner_id === user.id
    }
  }

  // Puede enviar recordatorios el dueño/admin o un integrante que "modifica la
  // agenda" (mismo permiso con el que se muestra el botón "Recordatorios" en la
  // agenda). Antes solo entraba el dueño, así que la secretaria con permiso de
  // edición hacía clic en el botón y rebotaba a la agenda.
  const isOwner = role === 'admin' || !orgId || isOrgOwner

  // Profesionales de la org (para filtrar la lista por profesional) + permiso del
  // integrante actual.
  let professionals: { id: string; full_name: string | null }[] = []
  let canEdit = isOwner
  if (orgId) {
    type MemberRow = { user_id: string; agenda_access: boolean | null; agenda_can_edit: boolean | null; users: { id: string; full_name: string | null; email: string | null } | null }
    const adminClient = createAdminClient()
    const { data: memberRows } = await adminClient
      .from('organization_members')
      .select('user_id, agenda_access, agenda_can_edit, users(id, full_name, email)')
      .eq('org_id', orgId)
    const rows = (memberRows ?? []) as unknown as MemberRow[]
    const myRow = rows.find(m => m.user_id === user.id)
    canEdit = isOwner || (!!myRow?.agenda_can_edit && !!myRow?.agenda_access)
    professionals = rows.map(m => ({
      id: m.users?.id ?? m.user_id,
      full_name: m.users?.full_name ?? m.users?.email ?? null,
    }))
    if (userData?.full_name && !professionals.find(p => p.id === user.id)) {
      professionals = [{ id: user.id, full_name: userData.full_name }, ...professionals]
    }
  }

  if (!canEdit) redirect('/dashboard/agenda')

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[820px] mx-auto px-6 py-8">
        <RecordatoriosClient
          userId={user.id}
          orgId={orgId}
          orgName={orgName}
          areas={areas}
          professionals={professionals}
          initialDay={searchParams.day ?? null}
          initialArea={searchParams.area ?? null}
        />
      </main>
    </div>
  )
}
