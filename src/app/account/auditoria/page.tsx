import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import AuditoriaClient from './AuditoriaClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Auditoría de accesos | Reason' }

type LogRow = { id: string; accessed_at: string; user_id: string; patients: { name: string | null } | null }

const LIMIT = 500

export default async function AuditoriaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orgRow } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!orgRow) redirect('/account')

  const admin = createAdminClient()

  const [{ data: logsRaw }, { data: members }] = await Promise.all([
    admin
      .from('ficha_access_log')
      .select('id, accessed_at, user_id, patients!inner(name)')
      .eq('org_id', orgRow.id)
      .order('accessed_at', { ascending: false })
      .limit(LIMIT),
    admin
      .from('organization_members')
      .select('user_id, users(full_name, email)')
      .eq('org_id', orgRow.id),
  ])

  const logs = (logsRaw ?? []) as unknown as LogRow[]

  const nameById = new Map<string, string>()
  ;(members ?? []).forEach((m) => {
    const u = m.users as unknown as { full_name: string | null; email: string | null } | null
    if (u) nameById.set(m.user_id, u.full_name || u.email || 'Sin nombre')
  })
  if (!nameById.has(user.id)) {
    const { data: ownerUser } = await admin.from('users').select('full_name, email').eq('id', user.id).single()
    if (ownerUser) nameById.set(user.id, ownerUser.full_name || ownerUser.email || 'Sin nombre')
  }

  const rows = logs.map((l) => ({
    id: l.id,
    accessedAt: l.accessed_at,
    professionalName: nameById.get(l.user_id) ?? 'Profesional',
    patientName: l.patients?.name ?? 'Paciente',
  }))

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[860px] mx-auto px-8 py-12">
        <Link href="/account" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-8">
          ← Volver a mi cuenta
        </Link>
        <div className="mb-10">
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-1">Auditoría de accesos</h1>
          <p className="text-[14px] text-text-secondary">
            Quién abrió cada ficha clínica y cuándo, en {orgRow.name}. Se muestran los últimos {LIMIT} accesos.
          </p>
        </div>

        <AuditoriaClient rows={rows} />
      </main>
    </div>
  )
}
