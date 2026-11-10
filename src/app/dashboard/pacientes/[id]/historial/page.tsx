import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { verifyPatientAccess } from '@/utils/patient-access'
import { fetchTimelinePage } from '@/lib/historial'
import HistorialTimeline from './HistorialTimeline'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Historial | Reason' }

export default async function HistorialPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: patient }, { data: ficha }] = await Promise.all([
    supabase.from('patients').select('id, name, user_id, created_at').eq('id', params.id).single(),
    supabase.from('patient_fichas').select('ficha_data').eq('patient_id', params.id).maybeSingle(),
  ])
  if (!patient) redirect('/dashboard/pacientes')
  await verifyPatientAccess(params.id, user.id)

  const { rows, hasMore } = await fetchTimelinePage(supabase, params.id)
  const diagnostico = (ficha?.ficha_data as Record<string, unknown> | null)?.diagnostico as string | undefined

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Header />
      <main className="max-w-[820px] mx-auto px-6 py-8">
        <div className="mb-5">
          <Link href={`/dashboard/pacientes/${params.id}`} className="text-[13px] text-text-secondary hover:text-text-primary no-underline">← {patient.name}</Link>
        </div>
        <h1 className="text-[22px] font-medium mb-5">Historial</h1>
        <HistorialTimeline
          patientId={params.id}
          initialRows={rows}
          initialHasMore={hasMore}
          ingresoLabel={new Date(patient.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
          diagnostico={diagnostico?.trim() || null}
        />
      </main>
    </div>
  )
}
