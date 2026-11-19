'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

// Agrupa los accesos secundarios del nav (Recursos, Biblioteca, Equipo, Panel
// de gestión, Caja) en un desplegable — sueltos en la barra competían por
// espacio con lo de uso diario (Pacientes, Estadísticas, Agenda, Ejercicios),
// haciéndola larguísima. Mismo patrón que ya usan Agenda/Eventos/Plan Editor
// para este mismo problema. Solo desktop (hidden lg:block): en mobile, el
// menú hamburguesa de HeaderClient ya lista estos accesos planos.
export default function NavMoreMenu({
  canManageTeam, canSeePanelGestion, ownsAnyOrg, canSeeCaja,
}: {
  canManageTeam: boolean
  canSeePanelGestion: boolean
  ownsAnyOrg: boolean
  canSeeCaja: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const close = () => setOpen(false)
  const itemClass = "block px-4 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline"

  return (
    <div className="relative hidden lg:block" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 whitespace-nowrap text-[14px] transition-colors ${open ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
      >
        Más
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-bg-primary border-[0.5px] border-border rounded-xl shadow-lg py-2 z-20 animate-menu-pop-in">
          <Link href="/recursos" onClick={close} className={itemClass}>
            Recursos
          </Link>
          <Link href="/library" onClick={close} className={itemClass}>
            Biblioteca
          </Link>
          {canManageTeam && (
            <Link href="/account/equipo" onClick={close} className={itemClass}>
              Equipo
            </Link>
          )}
          {canSeePanelGestion ? (
            <Link href="/account/crm" onClick={close} className={itemClass}>
              Panel de gestión
            </Link>
          ) : ownsAnyOrg ? (
            // Tiene un centro propio, pero no es el workspace activo ahora mismo
            // (está en su espacio personal o como invitado en otro centro) — el
            // panel de ESE centro no tiene sentido acá. Lo mandamos a cambiar de
            // workspace, no a /account/crm (que mostraría el de su propio centro
            // igual, pero de forma confusa estando "parado" en otro lado).
            <div className="block px-4 py-2">
              <span className="block text-[14px] text-[#c47c5a]">Panel de gestión</span>
              <span className="block text-[11px] text-text-tertiary mt-0.5">Cambiá a tu centro para verlo</span>
            </div>
          ) : (
            // Un Pro que todavía no creó su centro NO tiene métricas que mostrar
            // (el CRM exige owner de una organización) — lo guiamos a crearlo en
            // vez de ocultar el acceso. Quien no es Pro ve el upsell.
            <Link
              href={canManageTeam ? '/account/equipo' : '/account/subscription'}
              onClick={close}
              className="block px-4 py-2 hover:bg-bg-secondary transition-colors no-underline"
            >
              <span className="block text-[14px] text-[#c47c5a]">Panel de gestión</span>
              <span className="block text-[11px] text-text-tertiary mt-0.5">{canManageTeam ? 'Creá tu centro para verlo' : 'Disponible en Plan Pro'}</span>
            </Link>
          )}
          {canSeeCaja && (
            <Link href="/dashboard/caja" onClick={close} className={itemClass}>
              Caja
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
