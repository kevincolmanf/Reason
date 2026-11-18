'use client'

import { useEffect, useRef } from 'react'
import { useTopLoader } from 'nextjs-toploader'

// El navegador no nos avisa de ningún modo cuando alguien desliza hacia abajo
// para refrescar (gesto nativo de pull-to-refresh en celu/tablet) — y si
// efectivamente recarga, nuestro JS se destruye antes de poder mostrar nada
// durante la espera de red. Lo único que SÍ podemos controlar es el momento
// en que la persona todavía está arrastrando, antes de soltar: ahí mostramos
// la barra para confirmar que la app está viva, aunque después la recarga
// (si ocurre) quede fuera de nuestro control.
const PULL_THRESHOLD = 60 // px arrastrados hacia abajo antes de prender la barra

export default function PullToRefreshLoader() {
  const { start, done } = useTopLoader()
  const startYRef = useRef<number | null>(null)
  const activeRef = useRef(false)

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Solo nos interesa si el gesto arranca con la página ya arriba del
      // todo — igual que la condición que usa el navegador para el gesto
      // nativo. Si no, es un scroll normal en el medio de la página.
      if (window.scrollY === 0 && e.touches.length === 1) {
        startYRef.current = e.touches[0].clientY
      } else {
        startYRef.current = null
      }
      activeRef.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || e.touches.length !== 1) return
      const deltaY = e.touches[0].clientY - startYRef.current
      if (!activeRef.current && deltaY > PULL_THRESHOLD && window.scrollY === 0) {
        activeRef.current = true
        start()
      }
    }

    const onTouchEnd = () => {
      if (activeRef.current) { activeRef.current = false; done() }
      startYRef.current = null
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [start, done])

  return null
}
