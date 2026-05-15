import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import AgendaClient from './AgendaClient'
import { getActiveContext } from '@/lib/context'

export const metadata = { title: 'Agenda | Reason' }

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

export default async function AgendaPage() {
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

  const isOwner = role === 'pro' || role === 'admin'

  // Get org context
  let orgId: string | null = null
  let orgName: string | null = null
  let areas: string[] = userData?.agenda_areas ?? DEFAULT_AREAS
  let shareToken: string | null = null
  let shareEnabled = false

  if (isOrgContext && ctx.orgId) {
    type OrgData = { id: string; name: string; agenda_areas: string[] | null; agenda_share_token: string | null; agenda_share_enabled: boolean; owner_id: string }
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id, name, agenda_areas, agenda_share_token, agenda_share_enabled, owner_id')
      .eq('id', ctx.orgId)
      .single()
    const org = orgData as unknown as OrgData | null
    if (org) {
      orgId = org.id
      orgName = org.name
      areas = org.agenda_areas ?? DEFAULT_AREAS
      shareToken = org.agenda_share_token
      shareEnabled = org.agenda_share_enabled ?? false
    }
  }

  // Load org members — check access for non-owners, build professional filter
  let professionals: { id: string; full_name: string | null }[] = []
  let members: { id: string; full_name: string | null; agendaAccess: boolean }[] = []

  if (orgId) {
    type MemberRow = { user_id: string; agenda_access: boolean; users: { id: string; full_name: string | null } | null }
    const { data: memberRows } = await supabase
      .from('organization_members')
      .select('user_id, agenda_access, users(id, full_name)')
      .eq('org_id', orgId)

    members = ((memberRows ?? []) as unknown as MemberRow[]).map(m => ({
      id: m.users?.id ?? m.user_id,
      full_name: m.users?.full_name ?? null,
      agendaAccess: m.agenda_access ?? false,
    }))

    // Non-owner members need explicit agenda_access to enter
    if (!isOwner) {
      const myAccess = members.find(m => m.id === user.id)?.agendaAccess ?? false
      if (!myAccess) redirect('/dashboard')
    }

    professionals = members.map(m => ({ id: m.id, full_name: m.full_name }))
    // Add owner if not already in list
    if (userData?.full_name && !professionals.find(p => p.id === user.id)) {
      professionals = [{ id: user.id, full_name: userData.full_name }, ...professionals]
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 py-8">
        <AgendaClient
          userId={user.id}
          orgId={orgId}
          orgName={orgName}
          professionals={professionals}
          members={members}
          areas={areas}
          isOwner={isOwner}
          shareToken={shareToken}
          shareEnabled={shareEnabled}
        />
      </main>
    </div>
  )
}
