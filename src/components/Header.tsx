import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import HeaderClient from './HeaderClient'
import NavMoreMenu from './NavMoreMenu'
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
  let hasAgendaAccess = false
  let agendaBlockedReason: 'plan' | 'member' = 'plan'
  let canSeePanelGestion = false
  // Para distinguir, cuando no se puede ver el panel, entre "no tenés centro
  // todavía" y "tenés uno pero no es el workspace activo ahora" (NavMoreMenu).
  let ownedOrgsCount = 0
  // Gestionar el equipo: mismo gate que /account/equipo (role pro/admin). Incluye
  // al Pro que todavía no creó su centro, para que pueda encontrar dónde armarlo.
  let canManageTeam = false
  // Caja diaria: visible en contexto de centro para el dueño o una secretaria
  // con permiso de registrar caja.
  let canSeeCaja = false
  // Estadísticas clínicas: a diferencia del Panel de gestión (solo dueños Pro),
  // esta la ve cualquiera en contexto personal (sus propios datos). En
  // contexto de equipo, solo el dueño ve el agregado — un integrante no-dueño
  // no tiene acceso.
  let canSeeEstadisticas = false
  // Chat de equipo: solo tiene sentido con organización activa (sin equipo no
  // hay con quién hablar). El conteo de no leídos se pide aparte, una vez que
  // sabemos el orgId — no se puede meter en el Promise.all de abajo porque
  // depende de activeCtx, que es una de esas mismas promesas.
  let unreadChatCount = 0

  if (user) {
    const [activeCtx, ownedOrgsResult, memberOrgsResult, userDataResult] = await Promise.all([
      getActiveContext(user.id, supabase),
      supabase.from('organizations').select('id, name').eq('owner_id', user.id),
      supabase.from('organization_members').select('org_id, agenda_access, can_register_cash, organizations(id, name)').eq('user_id', user.id),
      supabase.from('users').select('role').eq('id', user.id).single(),
    ])

    ctx = activeCtx
    const role = userDataResult.data?.role
    const isOrgCtx = ctx.type === 'org' && !!ctx.orgId

    type MemberRow = { org_id: string; agenda_access: boolean | null; can_register_cash: boolean | null; organizations: { id: string; name: string } | null }

    const ownedOrgs = (ownedOrgsResult.data ?? []) as { id: string; name: string }[]
    ownedOrgsCount = ownedOrgs.length
    const memberRows = (memberOrgsResult.data ?? []) as unknown as MemberRow[]
    const memberOrgs = memberRows
      .map(r => r.organizations)
      .filter((o): o is { id: string; name: string } => o !== null)
      .filter(o => !ownedOrgs.some(owned => owned.id === o.id))

    canManageTeam = role === 'pro' || role === 'admin'

    // En una org que NO es propia, el usuario es integrante: el acceso a la agenda
    // lo define agenda_access, no el role personal (que podría ser 'pro' propagado
    // por error). Solo cuenta como dueño la org que realmente le pertenece.
    const ownsThisOrg = isOrgCtx && !!ctx.orgId && ownedOrgs.some(o => o.id === ctx.orgId)
    canSeeEstadisticas = !isOrgCtx || ownsThisOrg

    // Panel de gestión (métricas del centro, info sensible de negocio): solo
    // tiene sentido DENTRO del workspace de la organización que el usuario
    // realmente posee — no alcanza con ser dueño de OTRA org. Antes se
    // mostraba con solo "sos dueño de alguna org en algún lado", así que un
    // profesional que además es integrante de otro centro (o está en su
    // espacio personal) seguía viendo el link, que siempre apunta al panel de
    // SU org — confuso, y mezclaba workspaces en la cabeza del usuario aunque
    // los datos ya estuvieran bien separados. Nunca se muestra en contexto
    // personal: no hay "panel de centro" sin un centro activo.
    canSeePanelGestion = role === 'admin' || ownsThisOrg
    if (isOrgCtx && ctx.orgId) {
      // Dentro de una organización, el acceso al menú de Agenda debe coincidir con
      // el de la propia página (isActive = admin/pro/org, isOwner = admin/dueño):
      // admin y dueño entran siempre; un integrante, según el agenda_access que le
      // habilitó el dueño. Antes, un admin (o alguien sin fila de miembro) caía en
      // la rama de integrante y quedaba bloqueado aunque la página lo dejara entrar.
      if (role === 'admin' || ownsThisOrg) {
        hasAgendaAccess = true
      } else {
        const myMemberRow = memberRows.find(r => r.org_id === ctx.orgId)
        hasAgendaAccess = myMemberRow?.agenda_access ?? false
        agendaBlockedReason = 'member'
      }
    } else if (role === 'pro' || role === 'admin') {
      // Contexto personal (sin org): agenda propia para pro/admin.
      hasAgendaAccess = true
    }

    if (isOrgCtx && ctx.orgId) {
      const myRow = memberRows.find(r => r.org_id === ctx.orgId)
      canSeeCaja = role === 'admin' || ownsThisOrg || (myRow?.can_register_cash ?? false)
    }

    available = [
      { type: 'personal', orgId: null, label: 'Mi espacio', kind: 'personal' as const },
      ...ownedOrgs.map(o => ({ type: 'org' as const, orgId: o.id, label: o.name, kind: 'owner' as const })),
      ...memberOrgs.map(o => ({ type: 'org' as const, orgId: o.id, label: o.name, kind: 'member' as const })),
    ]

    if (ctx.type === 'org' && ctx.orgId) {
      const found = available.find(a => a.orgId === ctx.orgId)
      if (found) currentLabel = found.label

      const { data: count } = await supabase.rpc('team_chat_unread_count', { p_org_id: ctx.orgId })
      unreadChatCount = typeof count === 'number' ? count : 0
    }
  }

  return (
    <header className="py-6 border-b-[0.5px] border-border sticky top-0 bg-bg-primary/80 backdrop-blur-md z-10">
      <div className="w-full max-w-[1080px] mx-auto px-4 md:px-8 flex justify-between items-center gap-4">
        <Link href="/dashboard" className="text-[20px] font-medium tracking-[-0.01em] no-underline text-text-primary shrink-0">
          reason<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-3 lg:gap-4 min-w-0">
          {/* Orden pensado por el flujo de trabajo real: primero el paciente y su
              agenda (lo clínico), después las bibliotecas de referencia. */}
          <Link href="/dashboard/pacientes" className="hidden lg:inline whitespace-nowrap text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline relative after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-0 after:bg-accent after:transition-all after:duration-200 hover:after:w-full">
            Pacientes
          </Link>
          {canSeeEstadisticas && (
            <Link href="/dashboard/estadisticas" className="hidden lg:inline whitespace-nowrap text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
              Estadísticas
            </Link>
          )}
          {hasAgendaAccess ? (
            <Link href="/dashboard/agenda" className="hidden lg:inline whitespace-nowrap text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline relative after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-0 after:bg-accent after:transition-all after:duration-200 hover:after:w-full">
              Agenda
            </Link>
          ) : (
            <div className="relative group hidden lg:inline-block">
              <span className="text-[13px] sm:text-[14px] text-[#c47c5a] cursor-default select-none">Agenda</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 bg-bg-secondary border-[0.5px] border-border rounded-lg text-[11px] text-text-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                {agendaBlockedReason === 'member' ? 'Sin acceso habilitado' : 'Disponible en Plan Pro'}
              </div>
            </div>
          )}
          <Link href="/dashboard/ejercicios" className="hidden lg:inline whitespace-nowrap text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline relative after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-0 after:bg-accent after:transition-all after:duration-200 hover:after:w-full">
            Ejercicios
          </Link>

          {/* Recursos, Biblioteca, Equipo, Panel de gestión y Caja son accesos
              ocasionales — agrupados en "Más" para no competir por espacio con
              la navegación de uso diario. En mobile, HeaderClient ya los lista
              planos dentro del menú hamburguesa. */}
          <NavMoreMenu canManageTeam={canManageTeam} canSeePanelGestion={canSeePanelGestion} ownsAnyOrg={ownedOrgsCount > 0} canSeeCaja={canSeeCaja} />

          {ctx.type === 'org' && ctx.orgId && (
            <Link
              href="/dashboard/chat"
              aria-label="Chat del equipo"
              title="Chat del equipo"
              className="relative flex items-center justify-center w-8 h-8 rounded-full bg-bg-secondary border-[0.5px] border-border text-text-secondary hover:text-text-primary hover:border-border-strong transition-all shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-accent text-white text-[10px] font-medium flex items-center justify-center leading-none">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </Link>
          )}

          {user && (
            <ContextBadge
              current={ctx}
              currentLabel={currentLabel}
              available={available}
            />
          )}

          {user ? (
            <HeaderClient
              userMetadata={user.user_metadata}
              hasAgendaAccess={hasAgendaAccess}
              canSeePanelGestion={canSeePanelGestion}
              canManageTeam={canManageTeam}
              canSeeCaja={canSeeCaja}
              canSeeEstadisticas={canSeeEstadisticas}
              ctx={ctx}
              currentLabel={currentLabel}
              available={available}
            />
          ) : (
            <Link href="/login" className="text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline relative after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-0 after:bg-accent after:transition-all after:duration-200 hover:after:w-full">
              Iniciar sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
