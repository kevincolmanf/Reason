'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface Candidate {
  id: string
  name: string
  turnoCount: number
}

export default function ActivarKineClient({ candidates, alreadyCount }: { candidates: Candidate[]; alreadyCount: number }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(candidates.map(c => c.id)))
  const [pending, setPending] = useState<Candidate[]>(candidates)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const allSelected = pending.length > 0 && pending.every(c => selected.has(c.id))
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(pending.map(c => c.id)))
  }

  const activate = async () => {
    const ids = pending.map(c => c.id).filter(id => selected.has(id))
    if (ids.length === 0) return
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/pacientes/kine-mode-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientIds: ids, enabled: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'error')
      const updated = new Set(json.updatedIds as string[])
      setPending(prev => prev.filter(c => !updated.has(c.id)))
      setSelected(prev => { const n = new Set(prev); updated.forEach(id => n.delete(id)); return n })
      setDone(d => d + (json.updated as number))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo activar')
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = pending.filter(c => selected.has(c.id)).length

  return (
    <div>
      {(alreadyCount > 0 || done > 0) && (
        <div className="bg-accent/10 border-[0.5px] border-accent/30 rounded-lg px-4 py-3 mb-5 text-[13px] text-text-primary">
          {done > 0 && <span className="text-accent font-medium">{done} paciente{done !== 1 ? 's' : ''} pasado{done !== 1 ? 's' : ''} a modo kine. </span>}
          {alreadyCount > 0 && <span className="text-text-secondary">{alreadyCount + done} en modo kinesiología en total.</span>}
        </div>
      )}

      {pending.length === 0 ? (
        <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-8 text-center">
          <p className="text-[14px] text-text-primary font-medium mb-1">No queda nadie por activar</p>
          <p className="text-[13px] text-text-secondary">Todos tus pacientes con turnos ya están en modo kine.</p>
          <Link href="/dashboard/agenda/atencion" className="inline-block mt-4 text-[13px] text-accent no-underline hover:underline">Ir a la Atención de hoy →</Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-2">
            <button onClick={toggleAll} className="text-[13px] text-text-secondary hover:text-text-primary">
              {allSelected ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
            <span className="text-[12.5px] text-text-secondary">{pending.length} con turnos · {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}</span>
          </div>

          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl divide-y divide-border overflow-hidden">
            {pending.map(c => (
              <label key={c.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-primary/40">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} style={{ accentColor: 'var(--accent)' }} />
                <span className="text-[14px] text-text-primary flex-1">{c.name}</span>
                <span className="text-[12px] text-text-secondary tabular-nums">{c.turnoCount} turno{c.turnoCount !== 1 ? 's' : ''}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <button
              onClick={activate}
              disabled={saving || selectedCount === 0}
              className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {saving ? 'Activando…' : `Pasar ${selectedCount} a modo kine`}
            </button>
            {error && <span className="text-[12.5px] text-warning">{error}</span>}
          </div>
        </>
      )}
    </div>
  )
}
