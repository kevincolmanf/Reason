import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import EquipoClient from './EquipoClient'

export const metadata = { title: 'Mi Equipo | Reason' }

export default async function EquipoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'pro') redirect('/paywall')

  // Check if user has an org (as admin)
  const { data: orgRows } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)

  const org = orgRows?.[0] || null

  let members: { id: string; user_id: string; role: string; users: { full_name: string | null; email: string } }[] = []

  if (org) {
    const { data: membersData } = await supabase
      .from('organization_members')
      .select('id, user_id, role, users(full_name, email)')
      .eq('org_id', org.id)
      .order('created_at', { ascending: true })

    members = (membersData as unknown as typeof members) || []
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[720px] mx-auto px-8 py-12">
        <Link href="/account" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-8">
          ← Volver a mi cuenta
        </Link>
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">Mi Equipo</h1>
        <p className="text-text-secondary text-[15px] mb-10">
          Administrá los integrantes de tu centro. Cada uno tendrá su propio acceso y verá los mismos pacientes.
        </p>

        <EquipoClient
          userId={user.id}
          org={org || null}
          members={members}
        />
      </main>
    </div>
  )
}
