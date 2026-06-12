'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { switchContext } from '@/app/actions/context'
import type { ActiveContext } from '@/lib/context'
import type { AvailableContext } from './ContextBadge'

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userMetadata: any
  hasAgendaAccess?: boolean
  isProOrAdmin?: boolean
  ctx?: ActiveContext
  currentLabel?: string
  available?: AvailableContext[]
}

export default function HeaderClient({ userMetadata, hasAgendaAccess, isProOrAdmin, ctx, currentLabel, available }: Props) {
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={toggleMenu}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-secondary border-[0.5px] border-border text-[12px] font-medium text-text-primary hover:border-border-strong transition-colors focus:outline-none"
      >
        {initials}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-bg-primary border-[0.5px] border-border rounded-xl shadow-lg py-2 z-20">
          <div className="px-4 py-2 border-b-[0.5px] border-border mb-2">
            <p className="text-[13px] font-medium text-text-primary truncate">{name}</p>
          </div>

          {/* Mobile-only navigation links */}
          <div className="md:hidden border-b-[0.5px] border-border mb-2 pb-2">
            <Link href="/dashboard/pacientes" onClick={closeMenu} className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline">
              Pacientes
            </Link>
            <Link href="/dashboard/ejercicios" onClick={closeMenu} className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline">
              Ejercicios
            </Link>
            <Link href="/recursos" onClick={closeMenu} className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline">
              Recursos
            </Link>
            <Link href="/library" onClick={closeMenu} className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline">
              Biblioteca
            </Link>
            {hasAgendaAccess && (
              <Link href="/dashboard/agenda" onClick={closeMenu} className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline">
                Agenda
              </Link>
            )}
            {isProOrAdmin && (
              <Link href="/account/crm" onClick={closeMenu} className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline">
                Analíticas
              </Link>
            )}
          </div>

          {/* Workspace switcher (mobile-only) */}
          {canSwitch && (
            <div className="md:hidden border-b-[0.5px] border-border mb-2 pb-2">
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
          <Link
            href="/account/subscription"
            onClick={closeMenu}
            className="block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline"
          >
            Gestionar suscripción
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
  )
}
