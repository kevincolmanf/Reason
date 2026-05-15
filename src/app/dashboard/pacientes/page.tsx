import Header from '@/components/Header'
import Link from 'next/link'
import PacientesClient from './PacientesClient'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Mis Pacientes | Reason',
}

export default async function PacientesPage({ searchParams }: { searchParams: { new?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role, trial_expires_at')
    .eq('id', user.id)
    .single()

  const role = userData?.role
  const trialExpiresAt = userData?.trial_expires_at
  const trialActive = trialExpiresAt ? new Date(trialExpiresAt) > new Date() : false

  // isPro = tiene suscripción propia (no por ser miembro de un equipo)
  const isPro = role === 'admin' || role === 'pro'

  // Detectamos org membership para TODOS los usuarios, independiente del plan personal
  let orgId: string | null = null
  let orgName: string | null = null
  let isOrgOwner = false

  const { data: ownedOrg } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (ownedOrg) {
    orgId = ownedOrg.id
    orgName = ownedOrg.name
    isOrgOwner = true
  } else {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single()
    if (membership?.org_id) {
      orgId = membership.org_id
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', membership.org_id)
        .single()
      orgName = orgData?.name || null
    }
  }

  const isOrgMember = !!orgId
  // isActiveUser: puede usar features (plan propio O miembro de equipo O trial)
  const isActiveUser = isPro || role === 'subscriber' || trialActive || isOrgMember
  // Sección personal: solo si tiene plan propio o es dueño del equipo
  const showPersonalSection = !orgId || isOrgOwner || isPro

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-8 py-12">
        <div className="mb-8 border-b-[0.5px] border-border pb-8">
          <Link href="/dashboard" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">
            {isOrgMember ? 'Pacientes del Equipo' : 'Mis Pacientes'}
          </h1>
          <p className="text-text-secondary text-[16px] max-w-[600px] leading-[1.5]">
            {isOrgMember
              ? 'Pacientes compartidos con todos los integrantes de tu equipo.'
              : 'Gestioná tu listado de pacientes y asociá sus planes de ejercicio.'}
          </p>
        </div>

        <PacientesClient userId={user.id} isActiveUser={isActiveUser} isPro={isPro} orgId={orgId} orgName={orgName} showPersonalSection={showPersonalSection} autoOpen={searchParams.new === '1'} />
      </main>
    </div>
  )
}
