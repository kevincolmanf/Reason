'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

export interface Candidate {
  id: string
  name: string
  turnoCount: number
  lastTurno: string | null
}

interface RpcRow { patient_id: string; name: string; kine_mode: boolean; turno_count: number; last_turno: string | null }

function lastTurnoLabel(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  const fecha = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  if (days <= 0) return 'último turno: hoy'
  if (days === 1) return 'último turno: ayer'
  if (days < 30) return `último turno: ${fecha} (hace ${days} días)`
  return `último turno: ${fecha}`
}

const WINDOWS = [30, 60, 90]

export default function ActivarKineClient({ candidates, alreadyCount, initialDays = 30 }: { candidates: Candidate[]; alreadyCount: number; initialDays?: number }) {
  const [days, setDays] = useState(initialDays)
  const [pending, setPending] = useState<Candidate[]>(candidates)
  const [already, setAlready] = useState(alreadyCount)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(candidates.map(c => c.id)))
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadWindow = async (d: number) => {
    setDays(d); setLoading(true); setError(null); setMsg(null)
    try {
      const supabase = createClient()
      const { data, error: rpcErr } = await supabase.rpc('get_kine_candidates', { p_days: d })
      if (rpcErr) throw new Error(rpcErr.message)
      const rows = (data ?? []) as RpcRow[]
      const cands = rows.filter(r => !r.kine_mode).map(r => ({ id: r.patient_id, name: r.name, turnoCount: Number(r.turno_count), lastTurno: r.last_turno }))
      setPending(cands)
      setAlready(rows.filter(r => r.kine_mode).length)
      setSelected(new Set(cands.map(c => c.id)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la lista')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const allSelected = pending.length > 0 && pending.every(c => selected.has(c.id))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(pending.map(c => c.id)))

  const activate = async () => {
    const ids = pending.map(c => c.id).filter(id => selected.has(id))
    if (ids.length === 0) return
    setSaving(true); setError(null); setMsg(null)
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
      setAlready(a => a + (json.updated as number))
      setMsg(`${json.updated} paciente${json.updated !== 1 ? 's' : ''} pasado${json.updated !== 1 ? 's' : ''} a modo kine`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo activar')
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = pending.filter(c => selected.has(c.id)).length

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className="text-[13px] text-text-secondary">Con turnos en:</span>
        <div className="inline-flex rounded-lg border-[0.5px] border-border overflow-hidden">
          {WINDOWS.map(w => (
            <button
              key={w}
              onClick={() => loadWindow(w)}
              disabled={loading || saving}
              className={`px-3 py-1.5 text-[13px] transition-colors disabled:opacity-50 ${
                days === w ? 'bg-accent text-bg-primary font-medium' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              {w} días
            </button>
          ))}
        </div>
        {loading && <span className="text-[12.5px] text-text-secondary">Cargando…</span>}
      </div>

      {(already > 0 || msg) && (
        <div className="bg-accent/10 border-[0.5px] border-accent/30 rounded-lg px-4 py-3 mb-5 text-[13px] text-text-primary">
          {msg && <span className="text-accent font-medium">{msg}. </span>}
          {already > 0 && <span className="text-text-secondary">{already} en modo kinesiología en total.</span>}
        </div>
      )}

      {pending.length === 0 && !loading ? (
        <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-8 text-center">
          <p className="text-[14px] text-text-primary font-medium mb-1">No hay pacientes por activar en esta ventana</p>
          <p className="text-[13px] text-text-secondary">Probá ampliar a 60 o 90 días, o activá el modo kine desde la ficha del paciente.</p>
          <Link href="/dashboard/agenda/atencion" className="inline-block mt-4 text-[13px] text-accent no-underline hover:underline">Ir a la Atención de hoy →</Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-2">
            <button onClick={toggleAll} disabled={loading} className="text-[13px] text-text-secondary hover:text-text-primary disabled:opacity-50">
              {allSelected ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
            <span className="text-[12.5px] text-text-secondary">{pending.length} con turnos recientes · {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}</span>
          </div>

          <div className={`bg-bg-secondary border-[0.5px] border-border rounded-xl divide-y divide-border overflow-hidden ${loading ? 'opacity-50' : ''}`}>
            {pending.map(c => (
              <label key={c.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-primary/40">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} style={{ accentColor: 'var(--accent)' }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] text-text-primary truncate">{c.name}</span>
                  <span className="block text-[11.5px] text-text-secondary">{lastTurnoLabel(c.lastTurno)}</span>
                </span>
                <span className="text-[12px] text-text-secondary tabular-nums shrink-0">{c.turnoCount} turno{c.turnoCount !== 1 ? 's' : ''}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <button
              onClick={activate}
              disabled={saving || loading || selectedCount === 0}
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
