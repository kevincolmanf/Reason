'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// Guía de arranque (first-run) del dashboard. Es el punto de entrada del
// onboarding: orienta sobre el camino a seguir según el plan y enlaza cada paso
// a su sección, donde corre la guía spotlight propia de esa pantalla.
//
// Comportamiento: se muestra abierta por defecto (imposible de no ver); el
// usuario la pliega o la descarta con "No mostrar" (persistente en localStorage).
// El contenido cambia según sea un profesional individual ('solo') o un centro
// / equipo ('centro'), replicando la bifurcación de la landing.

const STORAGE_KEY = 'reason_onboarding_dismissed_v2'

type Variant = 'solo' | 'centro'
type Step = { n: number; title: string; desc: string; href: string }

const CONFIG: Record<Variant, { title: string; cta: { label: string; href: string }; steps: Step[] }> = {
  solo: {
    title: 'Primeros pasos — Trabajá tu primer paciente',
    cta: { label: 'Crear un paciente', href: '/dashboard/pacientes?new=1' },
    steps: [
      { n: 1, title: 'Creá el paciente', desc: 'El punto de partida: reúne su ficha, planes, carga y evaluaciones.', href: '/dashboard/pacientes?new=1' },
      { n: 2, title: 'Completá la ficha', desc: 'Anamnesis, diagnóstico, goniometría, cuestionarios y dinamometría.', href: '/dashboard/pacientes' },
      { n: 3, title: 'Armá el plan', desc: 'Elegí ejercicios de la base con video y programá las sesiones.', href: '/dashboard/ejercicios' },
      { n: 4, title: 'Compartí el portal', desc: 'Un link para que el paciente siga el plan desde el teléfono.', href: '/dashboard/pacientes' },
    ],
  },
  centro: {
    title: 'Primeros pasos — Poné en marcha tu centro',
    cta: { label: 'Ir a Mi Equipo', href: '/account/equipo' },
    steps: [
      { n: 1, title: 'Creá tu equipo', desc: 'Sumá a los profesionales del centro; cada uno con su propio acceso.', href: '/account/equipo' },
      { n: 2, title: 'Invitá un profesional', desc: 'Cargás su email y le llega una clave temporal para entrar.', href: '/account/equipo' },
      { n: 3, title: 'Cargá un paciente', desc: 'Queda compartido con todo el equipo, con historia clínica integral.', href: '/dashboard/pacientes?new=1' },
      { n: 4, title: 'Poné a andar la agenda', desc: 'Turnos y recordatorios por WhatsApp; definís qué agenda ve cada uno.', href: '/dashboard/agenda' },
    ],
  },
}

export default function OnboardingGuide({ variant = 'solo' }: { variant?: Variant }) {
  // Empezamos siempre oculto para evitar parpadeo antes de leer localStorage.
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(true)
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

  const { title, cta, steps } = CONFIG[variant]

  return (
    <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl mb-6 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2.5 text-left"
          aria-expanded={open}
        >
          <span className="text-[16px]">🧭</span>
          <span className="text-[14px] font-medium text-text-primary">{title}</span>
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
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {steps.map((s) => (
              <li key={s.n}>
                <Link
                  href={s.href}
                  className="flex flex-col gap-1.5 h-full p-3 rounded-lg border-[0.5px] border-transparent hover:border-border hover:bg-bg-primary transition-colors no-underline"
                >
                  <span className="w-7 h-7 rounded-lg bg-accent/10 text-accent text-[13px] font-medium flex items-center justify-center">
                    {s.n}
                  </span>
                  <span className="text-[13px] font-medium text-text-primary leading-snug">{s.title}</span>
                  <span className="text-[12px] text-text-secondary leading-snug">{s.desc}</span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex items-center gap-4">
            <Link
              href={cta.href}
              className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity no-underline"
            >
              {cta.label}
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
