'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export interface WeekMilestone {
  key: string
  patientId: string
  patientName: string
  label: string
  date: string      // YYYY-MM-DD
  dateLabel: string // ej: "mié 30"
  color: string
  overdue?: boolean // evaluación programada con fecha ya pasada, aún no hecha
}

const STORAGE_KEY = 'week_milestones_dismissed'
const COLLAPSE_KEY = 'week_milestones_collapsed'
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 días (una semana)

export default function WeekMilestonesBanner({ milestones }: { milestones: WeekMilestone[] }) {
  const [visible, setVisible] = useState(false)
  const [items, setItems] = useState<WeekMilestone[]>([])
  // Plegado por defecto: con muchos recordatorios el bloque tapaba el dashboard.
  // Se recuerda la preferencia (abierto/cerrado) entre visitas.
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) !== 'false')
    } catch {}
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem(COLLAPSE_KEY, next ? 'true' : 'false') } catch {}
      return next
    })
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const dismissed: Record<string, number> = raw ? JSON.parse(raw) : {}
      const now = Date.now()

      // Limpiar descartes vencidos
      const fresh: Record<string, number> = {}
      for (const [key, ts] of Object.entries(dismissed)) {
        if (now - ts < DISMISS_TTL_MS) fresh[key] = ts
      }

      const active = milestones.filter(m => !fresh[m.key])
      setItems(active)
      setVisible(active.length > 0)

      if (Object.keys(fresh).length !== Object.keys(dismissed).length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
      }
    } catch {
      setItems(milestones)
      setVisible(milestones.length > 0)
    }
  }, [milestones])

  const dismiss = (key: string) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const dismissed: Record<string, number> = raw ? JSON.parse(raw) : {}
      dismissed[key] = Date.now()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed))
    } catch {}
    const next = items.filter(m => m.key !== key)
    setItems(next)
    if (next.length === 0) setVisible(false)
  }

  const dismissAll = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const dismissed: Record<string, number> = raw ? JSON.parse(raw) : {}
      const now = Date.now()
      for (const m of items) dismissed[m.key] = now
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed))
    } catch {}
    setVisible(false)
  }

  if (!visible || items.length === 0) return null

  return (
    <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 mb-8">
      <div className={`flex justify-between items-start gap-4 ${collapsed ? '' : 'mb-3'}`}>
        <button
          onClick={toggleCollapsed}
          className="flex items-start gap-2 text-left group"
          aria-expanded={!collapsed}
        >
          <svg
            className={`w-3.5 h-3.5 mt-1 text-text-secondary shrink-0 transition-transform ${collapsed ? '' : 'rotate-90'}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span>
            <span className="block text-[14px] font-medium text-text-primary mb-0.5 group-hover:underline">
              {items.length === 1
                ? 'Un recordatorio'
                : `${items.length} recordatorios`}
            </span>
            <span className="block text-[12px] text-text-secondary">
              Hitos de esta semana y evaluaciones programadas pendientes.
            </span>
          </span>
        </button>
        {!collapsed && items.length > 1 && (
          <button
            onClick={dismissAll}
            className="text-[12px] text-text-secondary hover:text-text-primary shrink-0 mt-0.5"
          >
            Descartar todos
          </button>
        )}
      </div>

      <div className={`space-y-1.5 ${collapsed ? 'hidden' : ''}`}>
        {items.map(m => (
          <div
            key={m.key}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 border-[0.5px] ${m.overdue ? 'bg-warning/5 border-warning/40' : 'bg-bg-primary border-border'}`}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
            <Link
              href={`/dashboard/pacientes/${m.patientId}`}
              className="text-[13px] font-medium text-text-primary no-underline hover:underline shrink-0"
            >
              {m.patientName}
            </Link>
            <span className="text-[13px] text-text-secondary truncate flex-grow">
              — {m.label}
            </span>
            {m.overdue && (
              <span className="text-[10px] font-medium text-warning bg-warning/10 border-[0.5px] border-warning/40 rounded px-1.5 py-0.5 shrink-0 uppercase tracking-[0.03em]">
                Atrasada
              </span>
            )}
            <span className="text-[11px] text-text-secondary shrink-0 capitalize">{m.dateLabel}</span>
            <button
              onClick={() => dismiss(m.key)}
              className="text-text-secondary hover:text-text-primary text-[15px] leading-none shrink-0 ml-1"
              title="Descartar"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
