import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
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

  if (userData?.role !== 'pro' && userData?.role !== 'admin') redirect('/paywall')

  // Check if user has an org (as admin)
  const { data: orgRows } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)

  const org = orgRows?.[0] || null

  let members: { id: string; user_id: string; role: string; can_register_cash: boolean; agenda_access: boolean; agenda_can_edit: boolean; hasLoggedIn: boolean; users: { full_name: string | null; email: string } }[] = []

  if (org) {
    const { data: membersData } = await supabase
      .from('organization_members')
      .select('id, user_id, role, can_register_cash, agenda_access, agenda_can_edit, users(full_name, email)')
      .eq('org_id', org.id)
      .order('created_at', { ascending: true })

    const baseMembers = (membersData as unknown as Omit<typeof members[number], 'hasLoggedIn'>[]) || []

    // Averiguamos quién ya ingresó al menos una vez (last_sign_in_at). Sirve para
    // mostrar el estado y para saber a quién le podemos reenviar el acceso sin
    // pisarle una contraseña que ya está usando.
    const admin = createAdminClient()
    const signInInfo = await Promise.all(
      baseMembers.map(async (m) => {
        try {
          const { data } = await admin.auth.admin.getUserById(m.user_id)
          return { user_id: m.user_id, hasLoggedIn: !!data?.user?.last_sign_in_at }
        } catch {
          return { user_id: m.user_id, hasLoggedIn: false }
        }
      })
    )
    const loggedInMap = new Map(signInInfo.map(s => [s.user_id, s.hasLoggedIn]))

    members = baseMembers.map(m => ({ ...m, hasLoggedIn: loggedInMap.get(m.user_id) ?? false }))
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
