'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useTopLoader } from 'nextjs-toploader'

// nextjs-toploader escucha "popstate" (atrás del navegador, y el swipe-back
// de celu/tablet que dispara lo mismo) pero solo para apagar la barra —
// nunca la prende ahí, solo en clicks de link. No podemos prenderla nosotros
// escuchando "popstate" directo: el router de Next corta la propagación de
// ese evento antes de que llegue a otros listeners (confirmado probando
// contra el build real). Por eso escuchamos "reason:popstate" en su lugar,
// un evento propio que un script en el <head> (ver layout.tsx) reenvía desde
// un listener registrado antes que el bundle de Next, así que siempre llega.
export default function BackNavigationLoader() {
  const { start, done } = useTopLoader()
  const pathname = usePathname()
  const pendingRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onBackNav = () => {
      pendingRef.current = true
      start()
      // Red de seguridad: si la ruta nunca termina de cambiar (volver a un
      // hash, alguna navegación que no dispara un pathname nuevo), no
      // dejamos la barra prendida para siempre.
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        if (pendingRef.current) { pendingRef.current = false; done() }
      }, 4000)
    }
    window.addEventListener('reason:popstate', onBackNav)
    return () => {
      window.removeEventListener('reason:popstate', onBackNav)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [start, done])

  useEffect(() => {
    if (pendingRef.current) {
      pendingRef.current = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      done()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return null
}
