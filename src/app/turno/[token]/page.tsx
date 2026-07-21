import { createAdminClient } from '@/utils/supabase/admin'
import { notFound } from 'next/navigation'
import ConfirmTurnoClient from './ConfirmTurnoClient'

export const dynamic = 'force-dynamic'

export default async function ConfirmarTurnoPage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient()

  const { data: turno } = await supabase
    .from('turnos')
    .select('id, patient_name, start_time, end_time, area, status, org_id, is_blocked, confirm_token')
    .eq('confirm_token', params.token)
    .single()

  if (!turno || turno.is_blocked) notFound()

  let orgName: string | null = null
  if (turno.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', turno.org_id)
      .single()
    orgName = org?.name ?? null
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="py-6 border-b-[0.5px] border-border bg-bg-primary/80 backdrop-blur-md">
        <div className="w-full max-w-[560px] mx-auto px-4 sm:px-6 flex justify-between items-center">
          <span className="text-[20px] font-medium tracking-[-0.01em] text-text-primary">
            reason<span className="text-accent">.</span>
          </span>
          {orgName && <span className="text-[13px] text-text-secondary">{orgName}</span>}
        </div>
      </header>
      <main className="flex-grow w-full max-w-[560px] mx-auto px-4 sm:px-6 py-10">
        <ConfirmTurnoClient
          token={params.token}
          patientName={turno.patient_name}
          startTime={turno.start_time}
          endTime={turno.end_time}
          area={turno.area}
          orgName={orgName}
          initialStatus={turno.status}
        />
      </main>
    </div>
  )
}
