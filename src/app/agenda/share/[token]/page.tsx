import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import SharedAgendaClient from './SharedAgendaClient'

export default async function SharedAgendaPage({ params }: { params: { token: string } }) {
  const supabase = createClient()

  // Verify token is valid and sharing is enabled
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, agenda_share_token, agenda_share_enabled')
    .eq('agenda_share_token', params.token)
    .eq('agenda_share_enabled', true)
    .single()

  if (!org) notFound()

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="py-6 border-b-[0.5px] border-border bg-bg-primary/80 backdrop-blur-md">
        <div className="w-full max-w-[1080px] mx-auto px-4 sm:px-8 flex justify-between items-center">
          <span className="text-[20px] font-medium tracking-[-0.01em] text-text-primary">
            reason<span className="text-accent">.</span>
          </span>
          <span className="text-[13px] text-text-secondary">{org.name} — Agenda (solo lectura)</span>
        </div>
      </header>
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 py-8">
        <SharedAgendaClient token={params.token} orgName={org.name} />
      </main>
    </div>
  )
}
