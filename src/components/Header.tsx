import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import HeaderClient from './HeaderClient'
import ContextBadge from './ContextBadge'
import { getActiveContext } from '@/lib/context'
import type { ActiveContext } from '@/lib/context'
import type { AvailableContext } from './ContextBadge'

export default async function Header() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let currentLabel = 'Mi espacio'
  let available: AvailableContext[] = []
  let ctx: ActiveContext = { type: 'personal', orgId: null }

  if (user) {
    const [activeCtx, ownedOrgsResult, memberOrgsResult] = await Promise.all([
      getActiveContext(user.id, supabase),
      supabase.from('organizations').select('id, name').eq('owner_id', user.id),
      supabase.from('organization_members').select('org_id, organizations(id, name)').eq('user_id', user.id),
    ])

    ctx = activeCtx

    type MemberRow = { org_id: string; organizations: { id: string; name: string } | null }

    const ownedOrgs = (ownedOrgsResult.data ?? []) as { id: string; name: string }[]
    const memberOrgs = ((memberOrgsResult.data ?? []) as unknown as MemberRow[])
      .map(r => r.organizations)
      .filter((o): o is { id: string; name: string } => o !== null)
      .filter(o => !ownedOrgs.some(owned => owned.id === o.id))

    available = [
      { type: 'personal', orgId: null, label: 'Mi espacio' },
      ...ownedOrgs.map(o => ({ type: 'org' as const, orgId: o.id, label: o.name })),
      ...memberOrgs.map(o => ({ type: 'org' as const, orgId: o.id, label: o.name })),
    ]

    if (ctx.type === 'org' && ctx.orgId) {
      const found = available.find(a => a.orgId === ctx.orgId)
      if (found) currentLabel = found.label
    }
  }

  return (
    <header className="py-6 border-b-[0.5px] border-border sticky top-0 bg-bg-primary/80 backdrop-blur-md z-10">
      <div className="w-full max-w-[1080px] mx-auto px-4 sm:px-8 flex justify-between items-center">
        <Link href="/dashboard" className="text-[20px] font-medium tracking-[-0.01em] no-underline text-text-primary">
          reason<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link href="/library" className="hidden sm:inline text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Biblioteca
          </Link>
          <Link href="/recursos" className="hidden sm:inline text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Recursos
          </Link>
          <Link href="/dashboard/ejercicios" className="text-[13px] sm:text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Ejercicios
          </Link>
          <Link href="/dashboard/pacientes" className="text-[13px] sm:text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Pacientes
          </Link>
          <Link href="/dashboard/agenda" className="hidden sm:inline text-[13px] sm:text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Agenda
          </Link>

          {user && (
            <ContextBadge
              current={ctx}
              currentLabel={currentLabel}
              available={available}
            />
          )}

          {user ? (
            <HeaderClient userMetadata={user.user_metadata} />
          ) : (
            <Link href="/login" className="text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
              Iniciar sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
