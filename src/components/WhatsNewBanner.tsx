'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// Cartel de aparición única anunciando las novedades del "Historial del
// paciente": atribución por turno, línea de tiempo unificada y reorganización
// de la ficha. Se muestra una vez y se descarta para siempre (localStorage) —
// mismo patrón que OnboardingGuide, pero sin colapsar: es una noticia, no una
// guía a la que se vuelve.

const STORAGE_KEY = 'reason_whats_new_2026_11_historial'

const ITEMS = [
  { title: 'Historial', desc: 'Línea de tiempo única: turnos, bitácora, hitos, plan y carga, todo junto por fecha.' },
  { title: 'Ficha reorganizada', desc: 'Hitos y Portal ahora son accesos propios en la barra, junto con Atención.' },
  { title: 'Atribución real', desc: 'La continuidad ahora muestra quién atendió según el turno del día, no la sesión logueada.' },
  { title: 'Carga avanzada', desc: 'Monitoreo de RPE/VAS/ACWR, ahora opcional — prendelo solo para deportistas.' },
]

export default function WhatsNewBanner() {
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    let isDismissed = false
    try {
      isDismissed = localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      // localStorage no disponible (modo privado, etc.): mostramos igual.
    }
    setDismissed(isDismissed)
    setReady(true)
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* noop */ }
  }

  if (!ready || dismissed) return null

  return (
    <div className="bg-bg-secondary border-[0.5px] border-accent/30 rounded-xl mb-6 overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-4">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-accent">Novedades</span>
          <p className="text-[13px] sm:text-[14px] font-medium text-text-primary mt-1">Historial del paciente y ficha reorganizada</p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Descartar"
          className="text-text-secondary hover:text-text-primary transition-colors shrink-0 text-[18px] leading-none px-1"
        >
          ×
        </button>
      </div>

      <div className="px-4 sm:px-5 pb-5 pt-1">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 list-none p-0 m-0">
          {ITEMS.map(item => (
            <li key={item.title} className="p-3 rounded-lg border-[0.5px] border-border bg-bg-primary/40">
              <span className="block text-[13px] font-medium text-text-primary leading-snug">{item.title}</span>
              <span className="block text-[12px] text-text-secondary leading-snug mt-0.5">{item.desc}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <Link
            href="/dashboard/pacientes"
            className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity no-underline"
          >
            Ver un paciente
          </Link>
          <button onClick={dismiss} className="text-[13px] text-text-secondary hover:text-text-primary transition-colors">
            Ya lo vi
          </button>
        </div>
      </div>
    </div>
  )
}
