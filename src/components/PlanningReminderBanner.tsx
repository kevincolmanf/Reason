'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AlertPatient {
  id: string
  name: string
  lastDate: string
}

const STORAGE_KEY = 'planning_reminder_dismissed'
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export default function PlanningReminderBanner({ patients }: { patients: AlertPatient[] }) {
  const [visible, setVisible] = useState(false)
  const [filtered, setFiltered] = useState<AlertPatient[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const dismissed: Record<string, number> = raw ? JSON.parse(raw) : {}
      const now = Date.now()

      // Remove expired dismissals
      const fresh: Record<string, number> = {}
      for (const [id, ts] of Object.entries(dismissed)) {
        if (now - ts < DISMISS_TTL_MS) fresh[id] = ts
      }

      const active = patients.filter(p => !fresh[p.id])
      setFiltered(active)
      setVisible(active.length > 0)

      if (Object.keys(fresh).length !== Object.keys(dismissed).length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
      }
    } catch {
      setFiltered(patients)
      setVisible(patients.length > 0)
    }
  }, [patients])

  const dismiss = (patientId: string) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const dismissed: Record<string, number> = raw ? JSON.parse(raw) : {}
      dismissed[patientId] = Date.now()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed))
    } catch {}

    const next = filtered.filter(p => p.id !== patientId)
    setFiltered(next)
    if (next.length === 0) setVisible(false)
  }

  const dismissAll = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const dismissed: Record<string, number> = raw ? JSON.parse(raw) : {}
      const now = Date.now()
      for (const p of filtered) dismissed[p.id] = now
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed))
    } catch {}
    setVisible(false)
  }

  if (!visible || filtered.length === 0) return null

  return (
    <div className="bg-amber-50 border-[0.5px] border-amber-300 rounded-xl p-5 mb-8">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-grow">
          <p className="text-[14px] font-medium text-amber-900 mb-1">
            {filtered.length === 1
              ? 'Un paciente queda sin sesiones planificadas mañana'
              : `${filtered.length} pacientes quedan sin sesiones planificadas mañana`}
          </p>
          <p className="text-[12px] text-amber-700 mb-3">
            Planificá antes de encontrarte en el gimnasio sin programa cargado.
          </p>
          <div className="flex flex-wrap gap-2">
            {filtered.map(p => (
              <div key={p.id} className="flex items-center gap-1.5 bg-amber-100 border-[0.5px] border-amber-300 rounded-lg px-3 py-1.5">
                <Link
                  href={`/dashboard/pacientes/${p.id}`}
                  className="text-[13px] font-medium text-amber-900 no-underline hover:underline"
                >
                  {p.name}
                </Link>
                <button
                  onClick={() => dismiss(p.id)}
                  className="text-amber-500 hover:text-amber-800 text-[14px] leading-none ml-1"
                  title="Descartar"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        {filtered.length > 1 && (
          <button
            onClick={dismissAll}
            className="text-[12px] text-amber-600 hover:text-amber-900 shrink-0 mt-0.5"
          >
            Descartar todos
          </button>
        )}
      </div>
    </div>
  )
}
