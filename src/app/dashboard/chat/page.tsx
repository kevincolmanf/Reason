import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import { getActiveContext } from '@/lib/context'
import ChatClient, { type ChatMember, type ChatMessage } from './ChatClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Chat del equipo | Reason' }

// Historial inicial: alcanza para ver de qué se viene hablando sin traer todo
// el canal. Mensajes más viejos no se paginan por ahora (fuera de alcance).
const INITIAL_MESSAGES = 200

type MemberRow = { user_id: string; users: { id: string; full_name: string | null; email: string | null } | null }
type MessageRow = { id: string; user_id: string; body: string; created_at: string }

export default async function ChatPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // getActiveContext ya valida que, si el contexto es de organización, el
  // usuario es su dueño o figura en organization_members — no hace falta
  // revalidar acá. Sin equipo (contexto personal) no hay con quién chatear.
  const ctx = await getActiveContext(user.id, supabase)
  if (ctx.type !== 'org' || !ctx.orgId) redirect('/dashboard')
  const orgId = ctx.orgId

  const adminClient = createAdminClient()
  const [{ data: org }, { data: memberRows }, { data: messageRows }] = await Promise.all([
    supabase.from('organizations').select('id, name, owner_id').eq('id', orgId).maybeSingle(),
    // Admin: el dueño no siempre tiene fila en organization_members, y un
    // integrante no puede leer el full_name de otro por RLS directa — mismo
    // patrón que ya usa la agenda para armar la lista de profesionales.
    adminClient.from('organization_members').select('user_id, users(id, full_name, email)').eq('org_id', orgId),
    supabase.from('team_messages').select('id, user_id, body, created_at').eq('org_id', orgId)
      .order('created_at', { ascending: false }).limit(INITIAL_MESSAGES),
  ])

  if (!org) redirect('/dashboard')

  let members: ChatMember[] = ((memberRows ?? []) as unknown as MemberRow[]).map(m => ({
    id: m.users?.id ?? m.user_id,
    name: m.users?.full_name ?? m.users?.email ?? 'Integrante',
  }))
  if (!members.find(m => m.id === org.owner_id)) {
    const { data: ownerRow } = await adminClient.from('users').select('id, full_name, email').eq('id', org.owner_id).maybeSingle()
    members = [{ id: org.owner_id, name: ownerRow?.full_name ?? ownerRow?.email ?? 'Dueño' }, ...members]
  }

  const messages: ChatMessage[] = ((messageRows ?? []) as MessageRow[])
    .map(m => ({ id: m.id, userId: m.user_id, body: m.body, createdAt: m.created_at }))
    .reverse()

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[720px] mx-auto px-4 md:px-8 py-10 flex flex-col min-h-0">
        <h1 className="text-[28px] font-medium tracking-[-0.01em] mb-1">Chat del equipo</h1>
        <p className="text-[14px] text-text-secondary mb-6">{org.name} · {members.length} integrante{members.length === 1 ? '' : 's'}</p>
        <ChatClient orgId={orgId} userId={user.id} members={members} initialMessages={messages} />
      </main>
    </div>
  )
}
