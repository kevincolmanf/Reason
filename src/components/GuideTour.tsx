'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

// Motor de guías de primer uso reutilizable. Ilumina (spotlight) un elemento de
// la página anclado con data-tour="..." y muestra un tooltip con el paso a paso.
// Sirve para dos usos con la misma config: guía automática de primer uso y un
// botón "?" que la reproduce a demanda. Cuando un paso no encuentra su ancla en
// la página (p. ej. un panel cerrado), el tooltip se muestra centrado igual.
//
// La app es de tema oscuro: los colores del overlay están calibrados para eso.

export type GuideStep = {
  target: string
  title: string
  body: string
}

const PAD = 8
const TIP_W = 340

export default function GuideTour({
  steps,
  open,
  onClose,
  helpHref = '/account/ayuda',
}: {
  steps: GuideStep[]
  open: boolean
  onClose: () => void
  helpHref?: string
}) {
  const [i, setI] = useState(0)
  const [minimized, setMinimized] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const tipRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])
  // Al (re)abrir, arrancamos del principio y expandido.
  useEffect(() => { if (open) { setI(0); setMinimized(false) } }, [open])

  const step = steps[i]
  const n = steps.length

  const measure = useCallback(() => {
    const el = step ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null
    setRect(el ? el.getBoundingClientRect() : null)
  }, [step])

  useEffect(() => {
    if (!open || minimized || !step) return
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    measure()
    // Recalculamos tras el scroll suave.
    const t = window.setTimeout(measure, 280)
    const onMove = () => measure()
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, minimized, step, measure])

  // Escape minimiza (no cierra: así no se pierde sin querer).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMinimized(m => !m) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!mounted || !open || !step) return null

  const goNext = () => { if (i < n - 1) setI(i + 1); else onClose() }
  const goPrev = () => { if (i > 0) setI(i - 1) }

  // Posición del tooltip: debajo del target si entra, si no arriba; centrado si
  // no hay target.
  let tipTop: number, tipLeft: number
  if (rect) {
    const th = tipRef.current?.offsetHeight ?? 210
    const below = rect.bottom + 14
    tipTop = below + th > window.innerHeight - 12 ? Math.max(12, rect.top - th - 14) : below
    tipLeft = Math.max(12, Math.min(rect.left + rect.width / 2 - TIP_W / 2, window.innerWidth - TIP_W - 12))
  } else {
    tipTop = Math.max(12, window.innerHeight / 2 - 130)
    tipLeft = Math.max(12, window.innerWidth / 2 - TIP_W / 2)
  }

  const content = minimized ? (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setMinimized(false)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setMinimized(false) }}
      className="fixed z-[95] right-5 bottom-5 w-[300px] max-w-[calc(100vw-24px)] bg-bg-secondary border-[0.5px] border-border-strong rounded-2xl shadow-2xl p-4 cursor-pointer"
    >
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-[13px] shrink-0">🧭</span>
        <span className="text-[13.5px] font-medium text-text-primary">Primeros pasos</span>
        <span className="ml-auto font-mono text-[12px] text-text-tertiary">{i + 1}/{n}</span>
        <button
          onClick={e => { e.stopPropagation(); onClose() }}
          aria-label="Cerrar la guía"
          className="text-text-tertiary hover:text-text-primary text-[15px] leading-none px-1"
        >×</button>
      </div>
      <p className="text-[12px] text-text-tertiary mt-2 leading-[1.5]">
        ¿La necesitás más adelante? Está siempre en{' '}
        <a
          href={helpHref}
          onClick={e => e.stopPropagation()}
          className="text-text-secondary underline hover:text-text-primary"
        >Cuenta → Ayuda</a>.
      </p>
      <div className="mt-2.5 h-[3px] bg-border rounded-full overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${((i + 1) / n) * 100}%` }} />
      </div>
    </div>
  ) : (
    <>
      {rect ? (
        <div
          className="fixed z-[90] rounded-xl pointer-events-none"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            border: '2px solid var(--color-accent)',
            boxShadow: '0 0 0 9999px rgba(8,6,4,0.72), 0 0 0 5px rgba(194,90,44,0.18), 0 0 32px 4px rgba(194,90,44,0.32)',
            transition: 'top .3s cubic-bezier(.4,0,.2,1), left .3s cubic-bezier(.4,0,.2,1), width .3s cubic-bezier(.4,0,.2,1), height .3s cubic-bezier(.4,0,.2,1)',
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[90]" style={{ background: 'rgba(8,6,4,0.72)' }} />
      )}

      <div
        ref={tipRef}
        className="fixed z-[92] w-[340px] max-w-[calc(100vw-24px)] bg-bg-secondary border-[0.5px] border-border-strong rounded-2xl shadow-2xl p-5"
        style={{ top: tipTop, left: tipLeft, transition: 'top .3s cubic-bezier(.4,0,.2,1), left .3s cubic-bezier(.4,0,.2,1)' }}
        role="dialog"
        aria-label="Guía de primeros pasos"
      >
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.06em]">
          <span className="text-accent">Paso {i + 1} de {n}</span>
          <button
            onClick={onClose}
            aria-label="Saltar la guía"
            className="ml-auto text-text-tertiary hover:text-text-secondary normal-case tracking-normal text-[12px]"
          >Saltar</button>
        </div>
        <h4 className="text-[17px] font-medium text-text-primary mt-2.5 mb-1.5 tracking-[-0.01em]">{step.title}</h4>
        <p className="text-[14px] text-text-secondary leading-[1.55]">{step.body}</p>

        <div className="flex gap-1.5 my-4">
          {steps.map((_, k) => (
            <span
              key={k}
              className={`h-1.5 rounded-full transition-all ${k === i ? 'w-4 bg-accent' : 'w-1.5 bg-border-strong'}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMinimized(true)}
            className="text-[12.5px] text-text-tertiary hover:text-text-secondary"
          >Minimizar</button>
          <div className="flex-1" />
          {i > 0 && (
            <button
              onClick={goPrev}
              className="text-[13px] text-text-secondary hover:text-text-primary border-[0.5px] border-border-strong rounded-lg px-3.5 py-2 transition-colors"
            >Anterior</button>
          )}
          <button
            onClick={goNext}
            className="text-[13px] font-medium text-bg-primary bg-accent hover:opacity-90 rounded-lg px-4 py-2 transition-opacity"
          >{i === n - 1 ? 'Listo' : 'Siguiente'}</button>
        </div>
      </div>
    </>
  )

  return createPortal(content, document.body)
}
