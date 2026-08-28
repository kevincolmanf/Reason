'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { switchContext } from '@/app/actions/context'
import type { ActiveContext } from '@/lib/context'
import type { AvailableContext } from './ContextBadge'
import GuideTour from './GuideTour'
import { guideForPath } from '@/lib/guides'

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userMetadata: any
  hasAgendaAccess?: boolean
  isProOrAdmin?: boolean
  canManageTeam?: boolean
  ctx?: ActiveContext
  currentLabel?: string
  available?: AvailableContext[]
}

export default function HeaderClient({ userMetadata, hasAgendaAccess, isProOrAdmin, canManageTeam, ctx, currentLabel, available }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [showWorkspaces, setShowWorkspaces] = useState(false)
  const [isPending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => { setIsOpen(false); setShowWorkspaces(false) }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowWorkspaces(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [menuRef])

  const handleSwitch = (avail: AvailableContext) => {
    closeMenu()
    startTransition(async () => {
      const result = await switchContext({ type: avail.type, orgId: avail.orgId })
      if ('ok' in result) router.refresh()
    })
  }

  const name = userMetadata?.full_name || 'Usuario'
  const initials = name.substring(0, 2).toUpperCase()
  const canSwitch = (available?.length ?? 0) > 1

  // Guía de primer uso de la sección actual. El "?" del header la abre; si la
  // sección no tiene guía, lleva al centro de ayuda. Se abre sola una vez por
  // sección (flag en localStorage).
  const pathname = usePathname()
  const guide = guideForPath(pathname)
  const guideKey = guide?.key
  const [guideOpen, setGuideOpen] = useState(false)
  useEffect(() => {
    if (!guideKey) return
    try {
      if (localStorage.getItem(`reason_guide:${guideKey}`) !== '1') setGuideOpen(true)
    } catch { /* localStorage no disponible */ }
  }, [guideKey])
  const closeGuide = () => {
    setGuideOpen(false)
    if (guideKey) { try { localStorage.setItem(`reason_guide:${guideKey}`, '1') } catch { /* noop */ } }
  }
  const handleHelp = () => {
    if (guide) setGuideOpen(true)
    else router.push('/account/ayuda')
  }

  return (
    <>
      <button
        onClick={handleHelp}
        aria-label="Ayuda de esta sección"
        title="Ayuda de esta sección"
        className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-secondary border-[0.5px] border-border text-[14px] font-medium text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors focus:outline-none"
      >
        ?
      </button>

      <div className="relative" ref={menuRef}>
      <button
        onClick={toggleMenu}
        aria-label="Menú"
        className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-secondary border-[0.5px] border-border text-[12px] font-medium text-text-primary hover:border-border-strong transition-colors focus:outline-none"
      >
        {/* En mobile mostramos un ícono de menú para que la navegación sea descubrible;
            en desktop, las iniciales del usuario. */}
        <svg className="lg:hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        <span className="hidden lg:inline">{initials}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-bg-primary border-[0.5px] border-border rounded-xl shadow-lg py-2 z-20">
          <div className="px-4 py-2 border-b-[0.5px] border-border mb-2">
            <p className="text-[13px] font-medium text-text-primary truncate">{name}</p>
          </div>

          {/* Mobile-only navigation links */}
          <div className="lg:hidden border-b-[0.5px] border-border mb-2 pb-2">
            <Link href="/dashboard/pacientes" onClick={closeMenu} className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline">
              Pacientes
            </Link>
            {hasAgendaAccess && (
              <Link href="/dashboard/agenda" onClick={closeMenu} className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline">
                Agenda
              </Link>
            )}
            <Link href="/dashboard/ejercicios" onClick={closeMenu} className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline">
              Ejercicios
            </Link>
            <Link href="/recursos" onClick={closeMenu} className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline">
              Recursos
            </Link>
            <Link href="/library" onClick={closeMenu} className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline">
              Biblioteca
            </Link>
            {canManageTeam && (
              <Link href="/account/equipo" onClick={closeMenu} className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline">
                Mi equipo
              </Link>
            )}
            {isProOrAdmin && (
              <Link href="/account/crm" onClick={closeMenu} className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline">
                Panel de gestión
              </Link>
            )}
          </div>

          {/* Workspace switcher (mobile-only) */}
          {canSwitch && (
            <div className="lg:hidden border-b-[0.5px] border-border mb-2 pb-2">
              <button
                onClick={() => setShowWorkspaces(v => !v)}
                className="w-full text-left px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors flex items-center justify-between"
              >
                <span className="truncate">{isPending ? '…' : (currentLabel ?? 'Workspace')}</span>
                <span className="text-[10px] opacity-40 ml-1">{showWorkspaces ? '▴' : '▾'}</span>
              </button>
              {showWorkspaces && available?.map(avail => {
                const isActive = avail.type === ctx?.type && avail.orgId === ctx?.orgId
                return (
                  <button
                    key={avail.orgId ?? 'personal'}
                    onClick={() => !isActive && handleSwitch(avail)}
                    className={`w-full text-left px-6 py-2 text-[13px] transition-colors flex items-center justify-between ${
                      isActive ? 'text-accent cursor-default' : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                    }`}
                  >
                    <span className="truncate">{avail.label}</span>
                    {isActive && <span className="text-[10px] shrink-0 ml-2">✓</span>}
                  </button>
                )
              })}
            </div>
          )}

          <Link
            href="/account"
            onClick={closeMenu}
            className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline"
          >
            Mi cuenta
          </Link>
          {canManageTeam && (
            <Link
              href="/account/equipo"
              onClick={closeMenu}
              className="hidden lg:block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline"
            >
              Mi equipo
            </Link>
          )}
          <Link
            href="/account/subscription"
            onClick={closeMenu}
            className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline"
          >
            Gestionar suscripción
          </Link>
          <Link
            href="/dashboard/papelera"
            onClick={closeMenu}
            className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline"
          >
            Papelera
          </Link>
          <Link
            href="/account/ayuda"
            onClick={closeMenu}
            className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline"
          >
            Ayuda
          </Link>
          <form action="/auth/signout" method="post" className="mt-2 border-t-[0.5px] border-border pt-2">
            <button
              type="submit"
              className="w-full text-left px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors bg-transparent border-none cursor-pointer"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
      </div>

      {guide && <GuideTour steps={guide.steps} open={guideOpen} onClose={closeGuide} />}
    </>
  )
}
