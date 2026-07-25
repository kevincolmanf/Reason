'use client'

import { useState } from 'react'
import QuickNoteField from './QuickNoteField'

// Hoja rápida para registrar una sesión durante la atención (tablet, una mano).
// Nota (chips + voz) + esfuerzo + duración + un dolor opcional. Si viene un turno,
// puede marcarlo presente. Guarda por /api/carga/registrar-kine (source: 'kine').

interface Props {
  patientId: string
  patientName: string
  onClose: () => void
  onSaved?: () => void
  turnoId?: string | null      // si viene de la agenda
  canMarkPresent?: boolean      // mostrar el toggle "marcar presente"
}

const DURATIONS = [30, 45, 60, 90]

export default function QuickSessionSheet({ patientId, patientName, onClose, onSaved, turnoId, canMarkPresent }: Props) {
  const [note, setNote] = useState('')
  const [rpe, setRpe] = useState<number | null>(null)
  const [duration, setDuration] = useState(45)
  const [pain, setPain] = useState<number | null>(null)
  const [markPresent, setMarkPresent] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = rpe !== null ? rpe * duration : null

  const handleSave = async () => {
    if (rpe === null) { setError('Marcá el esfuerzo (RPE) de la sesión.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/carga/registrar-kine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          note,
          rpe,
          durationMinutes: duration,
          pain,
          turnoId: (turnoId && canMarkPresent && markPresent) ? turnoId : null,
        }),
      })
      if (!res.ok) throw new Error()
      onSaved?.()
      onClose()
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[460px] shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b-[0.5px] border-border sticky top-0 bg-bg-secondary">
          <div>
            <h2 className="text-[16px] font-medium leading-tight">Registrar sesión</h2>
            <p className="text-[12px] text-text-secondary">{patientName} · hoy</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-[20px] leading-none px-1">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Nota — lo principal */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1.5">Nota de la sesión</label>
            <QuickNoteField
              value={note}
              onChange={setNote}
              rows={2}
              placeholder="Cómo le fue hoy…"
              phrases={['Tolera bien la carga', 'Sin dolor', 'Dolor leve post', 'Buena técnica', 'Progresa de fase', 'Aumentar carga próxima', 'Mantener carga', 'Fatiga marcada']}
              textClassName="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y"
            />
          </div>

          {/* Esfuerzo */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Esfuerzo de la sesión (RPE 0–10)</label>
            <div className="grid grid-cols-6 gap-1.5">
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} type="button" onClick={() => setRpe(n)}
                  className={`py-2.5 rounded-lg text-[14px] font-medium border-[0.5px] transition-colors ${rpe === n ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border text-text-primary hover:border-accent'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Duración — para que la carga (RPE × min) sea precisa */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Duración</label>
            <div className="flex gap-1.5 flex-wrap">
              {DURATIONS.map(d => (
                <button key={d} type="button" onClick={() => setDuration(d)}
                  className={`px-3.5 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${duration === d ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'}`}>
                  {d} min
                </button>
              ))}
              {load !== null && <span className="ml-auto self-center text-[12px] text-accent">Carga: {load} UA</span>}
            </div>
          </div>

          {/* Dolor (opcional) */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Dolor de la sesión (0–10) · opcional</label>
            <div className="grid grid-cols-6 gap-1.5">
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} type="button" onClick={() => setPain(n === pain ? null : n)}
                  className={`py-2.5 rounded-lg text-[14px] font-medium border-[0.5px] transition-colors ${pain === n ? 'bg-[#f87171] text-white border-[#f87171]' : 'bg-bg-primary border-border text-text-primary hover:border-[#f87171]/60'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Marcar presente (solo desde la agenda) */}
          {canMarkPresent && turnoId && (
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={markPresent} onChange={e => setMarkPresent(e.target.checked)} className="w-4 h-4 accent-accent" />
              <span className="text-[13px] text-text-primary">Marcar el turno como presente</span>
            </label>
          )}

          {error && <p className="text-[13px] text-warning">{error}</p>}
        </div>

        <div className="flex gap-2 p-5 pt-0">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-accent text-bg-primary py-3 rounded-lg text-[14px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
            {saving ? 'Guardando…' : 'Guardar sesión'}
          </button>
          <button onClick={onClose} className="px-4 py-3 text-[13px] text-text-secondary hover:text-text-primary">Cancelar</button>
        </div>
      </div>
    </div>
  )
}
