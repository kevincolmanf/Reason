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
// "En el tope" = hasta este scroll, no literal 0 — ver truco de iOS abajo.
const AT_TOP = 1

export default function PullToRefreshLoader() {
  const { start, done } = useTopLoader()
  const startYRef = useRef<number | null>(null)
  const activeRef = useRef(false)

  useEffect(() => {
    // Truco para iOS Safari: con la página en scrollY exactamente 0, WebKit
    // agarra el gesto para el "rebote" (rubber-band) nativo y deja de
    // mandarle touchmove a la página durante ese rebote — nuestro código
    // nunca se enteraba del arrastre ahí (confirmado: solo fallaba en
    // iPhone, no en Android). Dejando 1px de scroll "de sobra" en vez de 0
    // clavado, WebKit no entra en modo rebote al empezar a arrastrar y los
    // touchmove siguen llegando normal. Imperceptible visualmente.
    const ensureScrollOffset = () => {
      if (document.documentElement.scrollHeight > window.innerHeight && window.scrollY === 0) {
        window.scrollTo(0, AT_TOP)
      }
    }
    ensureScrollOffset()
    window.addEventListener('scroll', ensureScrollOffset, { passive: true })

    const onTouchStart = (e: TouchEvent) => {
      // Solo nos interesa si el gesto arranca con la página ya arriba del
      // todo — igual que la condición que usa el navegador para el gesto
      // nativo. Si no, es un scroll normal en el medio de la página.
      if (window.scrollY <= AT_TOP && e.touches.length === 1) {
        startYRef.current = e.touches[0].clientY
      } else {
        startYRef.current = null
      }
      activeRef.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || e.touches.length !== 1) return
      const deltaY = e.touches[0].clientY - startYRef.current
      if (!activeRef.current && deltaY > PULL_THRESHOLD && window.scrollY <= AT_TOP) {
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
      window.removeEventListener('scroll', ensureScrollOffset)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [start, done])

  return null
}
