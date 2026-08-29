import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import { getActiveContext } from '@/lib/context'
import CajaClient from './CajaClient'

// Fecha de HOY en horario Argentina, para que coincida con el default de la base
// (así la secretaria, que por RLS solo ve el día de hoy, ve lo que carga).
function todayAR(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

export default async function CajaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // La caja es de un centro: opera sobre el workspace (org) activo.
  const ctx = await getActiveContext(user.id, supabase)
  if (ctx.type !== 'org' || !ctx.orgId) redirect('/dashboard')
  const orgId = ctx.orgId

  const { data: org } = await supabase
    .from('organizations').select('id, name, owner_id, agenda_areas').eq('id', orgId).single()
  if (!org) redirect('/dashboard')

  const isOwner = org.owner_id === user.id
  let canRegister = isOwner
  if (!canRegister) {
    const { data: mem } = await supabase
      .from('organization_members').select('can_register_cash').eq('org_id', orgId).eq('user_id', user.id).single()
    canRegister = mem?.can_register_cash ?? false
  }
  if (!canRegister) redirect('/dashboard') // ni dueño ni secretaria con permiso

  const today = todayAR()
  const { data: entries } = await supabase
    .from('cash_entries')
    .select('id, type, amount, payment_method, area, notes, created_by, created_at')
    .eq('org_id', orgId)
    .eq('entry_date', today)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-4 md:px-8 py-8">
        <CajaClient
          userId={user.id}
          orgId={orgId}
          orgName={org.name}
          isOwner={isOwner}
          areas={org.agenda_areas ?? []}
          today={today}
          initialEntries={(entries ?? []) as never[]}
        />
      </main>
    </div>
  )
}
