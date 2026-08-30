import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import { getActiveContext } from '@/lib/context'
import EventosClient from './EventosClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Eventos | Reason' }

export default async function EventosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Crear eventos es, por ahora, para organizadores (Pro/admin o dueño de un centro).
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = userData?.role
  const isOrganizer = role === 'pro' || role === 'admin'
  if (!isOrganizer) redirect('/dashboard')

  const ctx = await getActiveContext(user.id, supabase)
  const orgId = ctx.type === 'org' ? ctx.orgId : null

  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, location, starts_at, ends_at, cover_emoji, capacity, public_token, price, published, created_at')
    .eq('creator_id', user.id)
    .order('starts_at', { ascending: false })

  // Conteo de inscriptos por evento (una consulta).
  const ids = (events ?? []).map(e => e.id)
  const counts: Record<string, number> = {}
  if (ids.length > 0) {
    const { data: regs } = await supabase.from('event_registrations').select('event_id').in('event_id', ids)
    for (const r of regs ?? []) counts[r.event_id as string] = (counts[r.event_id as string] ?? 0) + 1
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-4 md:px-8 py-8">
        <EventosClient
          userId={user.id}
          orgId={orgId}
          initialEvents={(events ?? []) as never[]}
          initialCounts={counts}
        />
      </main>
    </div>
  )
}
