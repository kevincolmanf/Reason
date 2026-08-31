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

  // Crear eventos está abierto a cualquier usuario (free o pago): es el embudo de
  // adquisición, y organizar un evento no debería requerir plan. La RLS ya limita
  // a que cada uno solo maneje sus propios eventos.
  const ctx = await getActiveContext(user.id, supabase)
  const orgId = ctx.type === 'org' ? ctx.orgId : null

  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, location, starts_at, ends_at, cover_emoji, capacity, public_token, price, published, created_at, cert_entity, cert_signer, cert_signer_role')
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
