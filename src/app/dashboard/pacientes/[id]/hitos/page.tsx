import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { verifyPatientAccess } from '@/utils/patient-access'
import HitosClient from './HitosClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Hitos | Reason' }

export default async function HitosPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase.from('patients').select('id, name').eq('id', params.id).single()
  if (!patient) redirect('/dashboard/pacientes')
  await verifyPatientAccess(params.id, user.id)

  const { data: events } = await supabase
    .from('patient_events')
    .select('id, event_date, type, title, note')
    .eq('patient_id', params.id)
    .order('event_date', { ascending: true })

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Header />
      <main className="max-w-[820px] mx-auto px-6 py-8">
        <div className="mb-5">
          <Link href={`/dashboard/pacientes/${params.id}`} className="text-[13px] text-text-secondary hover:text-text-primary no-underline">← {patient.name}</Link>
        </div>
        <h1 className="text-[22px] font-medium mb-5">Hitos del tratamiento</h1>
        <HitosClient patientId={params.id} patientName={patient.name} userId={user.id} initialEvents={events ?? []} />
      </main>
    </div>
  )
}
