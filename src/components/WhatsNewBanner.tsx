'use client'

import { useState, useEffect } from 'react'

const BANNER_KEY = 'reason_whatsnew_20250522'
const BANNER_TTL_MS = 24 * 60 * 60 * 1000 // 24 horas

export default function WhatsNewBanner() {
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    try {
      const seen = localStorage.getItem(BANNER_KEY)
      if (!seen) {
        // Primera vez — mostrar y guardar timestamp
        localStorage.setItem(BANNER_KEY, String(Date.now()))
        setVisible(true)
      } else {
        const elapsed = Date.now() - Number(seen)
        if (elapsed < BANNER_TTL_MS) setVisible(true)
      }
    } catch {
      // localStorage bloqueado (modo privado estricto) — no mostrar
    }
  }, [])

  if (!visible) return null

  return (
    <div className="mb-6 rounded-xl border-[0.5px] border-accent/40 bg-accent/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-[18px]">🚀</span>
          <div>
            <p className="text-[14px] font-semibold text-text-primary leading-none mb-0.5">
              Novedades en el portal del paciente
            </p>
            <p className="text-[12px] text-text-secondary">
              Actualizaciones del {new Date('2025-05-22').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[12px] text-accent hover:underline"
          >
            {expanded ? 'Cerrar' : 'Ver más'}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-accent/15 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Cerrar"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Pills de cambios (siempre visibles) */}
      <div className="flex flex-wrap gap-2 px-5 pb-4">
        {[
          'Semana compacta en portal',
          'RPE y EVA por ejercicio',
          'Cargar plan al calendario',
          'Importar ejercicios por día',
        ].map(tag => (
          <span key={tag} className="text-[11px] font-medium bg-accent/10 border-[0.5px] border-accent/30 text-accent rounded-full px-2.5 py-1">
            {tag}
          </span>
        ))}
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <div className="border-t-[0.5px] border-accent/20 px-5 py-5 space-y-6">

          {/* Qué cambió */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-accent mb-3">Qué cambió</p>
            <div className="space-y-3">
              {[
                {
                  title: 'Semana compacta en el portal del paciente',
                  desc: 'La sección "Mi semana" ahora muestra chips de navegación por semana. La sesión del día aparece abierta automáticamente al entrar — sin scrollear.',
                },
                {
                  title: 'RPE y EVA por ejercicio',
                  desc: 'El paciente puede reportar su percepción de esfuerzo (RPE) y dolor (EVA) directamente en cada ejercicio tocando "+ Reportar ejercicio", sin salir de la sesión.',
                },
                {
                  title: 'Cargar plan al calendario',
                  desc: 'Para pacientes que ya tenían ejercicios cargados en el plan (sistema anterior), el botón "Cargar plan al calendario" migra todo automáticamente a las sesiones del calendario de una sola vez.',
                },
                {
                  title: 'Importar ejercicios del plan (por día)',
                  desc: 'En el calendario de cada sesión también aparece el botón "Importar ejercicios del plan" para cargar los ejercicios de a un día, con control total.',
                },
              ].map(({ title, desc }) => (
                <div key={title} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-text-primary leading-snug">{title}</p>
                    <p className="text-[12px] text-text-secondary leading-relaxed mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cómo usar */}
          <div className="space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-accent">Cómo usarlo</p>

            {/* Caso A — Paciente nuevo */}
            <div className="bg-bg-secondary rounded-xl p-4">
              <p className="text-[12px] font-semibold text-text-primary mb-3">
                Paciente nuevo
              </p>
              <ol className="space-y-2.5">
                {[
                  'Creá el paciente desde "Mis pacientes" si todavía no existe.',
                  'Abrí su ficha → "Plan de ejercicios" → creá un plan nuevo.',
                  'En el editor, armá las sesiones (Sesión A, B, etc.) y cargá los ejercicios con su dosificación completa: series, repeticiones, carga y descanso.',
                  'Una vez armado el plan, pasá a la pestaña "Calendario" y asigná cada sesión a un día.',
                  'Los ejercicios quedan disponibles en el portal del paciente automáticamente.',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-[12px] text-text-secondary">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-bg-primary border-[0.5px] border-border text-[10px] font-bold text-text-primary flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Caso B — Paciente ya cargado */}
            <div className="bg-bg-secondary rounded-xl p-4">
              <p className="text-[12px] font-semibold text-text-primary mb-0.5">
                Paciente que ya tenía ejercicios cargados
              </p>
              <p className="text-[11px] text-text-secondary mb-3">
                (plan armado antes del calendario, sin series/reps visibles en el portal)
              </p>
              <ol className="space-y-2.5">
                {[
                  'Abrí el plan del paciente desde su ficha.',
                  'Revisá que cada ejercicio tenga la dosificación completa (series, reps, carga). Si falta, completala en el editor antes de continuar — lo que esté vacío va a aparecer vacío en el portal.',
                  'Verificá que el calendario tenga sesiones con fechas asignadas.',
                  'Usá el botón "Cargar plan al calendario" (aparece arriba en el plan) para migrar todos los ejercicios a las sesiones del calendario de una sola vez.',
                  'Para ajustar un día suelto, usá "Importar ejercicios del plan" directamente en esa sesión del calendario.',
                  'El portal del paciente se actualiza solo — semana compacta, sesión de hoy abierta, RPE y EVA disponibles por ejercicio.',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-[12px] text-text-secondary">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-bg-primary border-[0.5px] border-border text-[10px] font-bold text-text-primary flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <button
            onClick={() => setVisible(false)}
            className="w-full py-2.5 rounded-lg border-[0.5px] border-border text-[13px] text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors"
          >
            Entendido, no mostrar más
          </button>

        </div>
      )}
    </div>
  )
}
