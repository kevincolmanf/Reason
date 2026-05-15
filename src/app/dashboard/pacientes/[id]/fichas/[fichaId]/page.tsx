import Header from '@/components/Header'
import Link from 'next/link'
import PatientFichaEditor from './PatientFichaEditor'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { verifyPatientAccess } from '@/utils/patient-access'

export const metadata = {
  title: 'Ficha Kinésica | Reason',
}

export default async function FichaPage({ params }: { params: { id: string, fichaId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await verifyPatientAccess(params.id, user.id)

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, name')
    .eq('id', params.id)
    .single()

  if (patientError || !patient) redirect('/dashboard/pacientes')

  const { data: ficha, error: fichaError } = await supabase
    .from('patient_fichas')
    .select('*')
    .eq('id', params.fichaId)
    .single()

  if (fichaError || !ficha) redirect(`/dashboard/pacientes/${params.id}`)

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[800px] mx-auto px-8 py-12">
        <div className="mb-8">
          <Link
            href={`/dashboard/pacientes/${params.id}`}
            className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6"
          >
            ← Volver a {patient.name}
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[28px] font-medium tracking-[-0.02em]">Ficha Kinésica</h1>
          </div>
          <p className="text-text-secondary text-[15px]">{patient.name}</p>
        </div>

        <PatientFichaEditor initialFicha={ficha} patientName={patient.name} />
      </main>
    </div>
  )
}
