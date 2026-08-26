'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// Guía de primer uso para la cara del profesional. Replica el patrón de
// "¿Cómo usar el portal?" que ya existe en el portal del paciente: orientar
// sobre el flujo de trabajo cuando hay muchas utilidades disponibles.
//
// Comportamiento:
// - Sin pacientes (usuario realmente nuevo): arranca abierta.
// - Con pacientes: arranca cerrada, pero descubrible.
// - "No mostrar de nuevo" la oculta de forma persistente (localStorage).

const STORAGE_KEY = 'reason_onboarding_dismissed_v1'

const steps = [
  { n: 1, title: 'Creá el paciente', desc: 'Es el punto de partida: reúne su ficha, planes, carga y evaluaciones.' },
  { n: 2, title: 'Completá la ficha kinésica', desc: 'Anamnesis, diagnóstico, goniometría, cuestionarios y dinamometría.' },
  { n: 3, title: 'Armá el plan de ejercicio', desc: 'Elegí ejercicios de la base con video y programá las sesiones en el calendario.' },
  { n: 4, title: 'Compartí el portal', desc: 'Un link para que el paciente siga el plan y registre cómo le fue.' },
  { n: 5, title: 'Seguí la evolución', desc: 'Monitoreo de carga y protocolos de retorno al deporte, integrados al historial.' },
]

export default function OnboardingGuide() {
  // Empezamos siempre oculto para evitar parpadeo antes de leer localStorage.
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(true)
  // Abierta por defecto: es la guía de orientación, tiene que ser imposible de
  // no ver. El usuario la pliega o la descarta con "No mostrar" si no la quiere.
  const [open, setOpen] = useState(true)

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
    <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl mb-6 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2.5 text-left"
          aria-expanded={open}
        >
          <span className="text-[16px]">🧭</span>
          <div>
            <span className="text-[14px] font-medium text-text-primary">Primeros pasos — Cómo trabajar un paciente en Reason</span>
          </div>
          <svg
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <button
          onClick={dismiss}
          className="text-[12px] text-text-secondary hover:text-text-primary transition-colors shrink-0 ml-3"
        >
          No mostrar
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t-[0.5px] border-border">
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
            {steps.map((s) => (
              <li key={s.n} className="flex flex-col gap-1.5">
                <span className="w-7 h-7 rounded-lg bg-accent/10 text-accent text-[13px] font-medium flex items-center justify-center">
                  {s.n}
                </span>
                <p className="text-[13px] font-medium text-text-primary leading-snug">{s.title}</p>
                <p className="text-[12px] text-text-secondary leading-snug">{s.desc}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex items-center gap-4">
            <Link
              href="/dashboard/pacientes?new=1"
              className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity no-underline"
            >
              Crear un paciente
            </Link>
            <Link
              href="/account/ayuda"
              className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline"
            >
              Ver la guía completa →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
