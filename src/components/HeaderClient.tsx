'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

export default function HeaderClient({ userMetadata }: { userMetadata: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggleMenu = () => setIsOpen(!isOpen)

  const closeMenu = () => setIsOpen(false)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [menuRef])

  const name = userMetadata?.full_name || 'Usuario'
  const initials = name.substring(0, 2).toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={toggleMenu}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-secondary border-[0.5px] border-border text-[12px] font-medium text-text-primary hover:border-border-strong transition-colors focus:outline-none"
      >
        {initials}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-bg-primary border-[0.5px] border-border rounded-xl shadow-lg py-2 z-20">
          <div className="px-4 py-2 border-b-[0.5px] border-border mb-2">
            <p className="text-[13px] font-medium text-text-primary truncate">{name}</p>
          </div>
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
