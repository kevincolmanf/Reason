import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import BitacoraClient from './BitacoraClient'
import { verifyPatientAccess } from '@/utils/patient-access'

export const metadata = {
  title: 'Bitácora | Reason',
}

export default async function BitacoraPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await verifyPatientAccess(params.id, user.id)

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, name, plan_mode, simple_graduate_weeks')
    .eq('id', params.id)
    .single()
  if (patientError || !patient) redirect('/dashboard/pacientes')

  const { data: entries } = await supabase
    .from('simple_activity_log')
    .select('id, activity_date, exercises, note, created_at, user_id')
    .eq('patient_id', patient.id)
    .order('activity_date', { ascending: false })
    .order('created_at', { ascending: false })

  // Nombres de los autores (para "cargado por X"). La tabla users es solo-propio
  // por RLS, así que resolvemos con el cliente admin (server-only). Incluimos al
  // usuario actual para etiquetar sus propios registros nuevos al instante.
  const authorIds = Array.from(new Set([user.id, ...(entries ?? []).map(e => e.user_id).filter(Boolean)]))
  const admin = createAdminClient()
  const { data: authors } = await admin.from('users').select('id, full_name, email').in('id', authorIds)
  const authorNames: Record<string, string> = {}
  for (const a of authors ?? []) authorNames[a.id] = a.full_name?.trim() || a.email || '—'

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[860px] mx-auto px-8 py-12">
        <div className="mb-8">
          <Link
            href={`/dashboard/pacientes/${patient.id}`}
            className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6"
          >
            ← Volver a {patient.name}
          </Link>
          <h1 className="text-[28px] font-medium tracking-[-0.02em]">Bitácora de {patient.name}</h1>
          <p className="text-text-secondary text-[14px] mt-1">
            Registro simple de qué se hizo cada día. Rápido, sin dosificación, visible para el equipo.
          </p>
        </div>

        <BitacoraClient
          patientId={patient.id}
          userId={user.id}
          planMode={patient.plan_mode ?? 'detallado'}
          graduateWeeks={patient.simple_graduate_weeks ?? 3}
          authorNames={authorNames}
          initialEntries={entries ?? []}
        />
      </main>
    </div>
  )
}
