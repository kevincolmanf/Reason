'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

// Hoja rápida para cargar la "Atención de hoy" (modo kine) desde la agenda, sin
// entrar a la ficha. Muestra un resumen de las últimas atenciones + check de
// síntoma + nota opcional, y registra por /api/pacientes/atencion.

interface Props {
  patientId: string
  patientName: string
  onClose: () => void
  onSaved?: () => void
}

type Symptom = 'peor' | 'igual' | 'mejor'
const SYM: { id: Symptom; label: string; color: string; soft: string }[] = [
  { id: 'peor', label: 'Peor', color: '#f87171', soft: 'rgba(248,113,113,0.12)' },
  { id: 'igual', label: 'Igual', color: '#fbbf24', soft: 'rgba(251,191,36,0.12)' },
  { id: 'mejor', label: 'Mejor', color: '#4ade80', soft: 'rgba(74,222,128,0.12)' },
]

interface RecentAtt { symptom: string | null; auto_summary: string | null; note: string | null; attended_on: string; professional_name: string | null }

function dLabel(d: string): string {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) } catch { return d }
}

export default function QuickAtencionSheet({ patientId, patientName, onClose, onSaved }: Props) {
  const [recent, setRecent] = useState<RecentAtt[] | null>(null)
  const [symptom, setSymptom] = useState<Symptom | null>(null)
  const [manage, setManage] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('kine_attentions')
      .select('symptom, auto_summary, note, attended_on, professional_name')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(2)
      .then(({ data }) => setRecent((data ?? []) as RecentAtt[]))
  }, [patientId])

  const register = async () => {
    if (!symptom) { setError('Marcá cómo llegó hoy.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/pacientes/atencion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, symptom, manageSymptoms: manage, modalities: [], note }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'error')
      setDone(true)
      onSaved?.()
      setTimeout(onClose, 900)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[460px] shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b-[0.5px] border-border sticky top-0 bg-bg-secondary">
          <div>
            <h2 className="text-[16px] font-medium leading-tight">Atención de hoy</h2>
            <p className="text-[12px] text-text-secondary">{patientName} · modo kine</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-[20px] leading-none px-1">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Resumen: últimas atenciones */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1.5">Últimas atenciones</label>
            {recent === null ? (
              <p className="text-[12.5px] text-text-secondary">Cargando…</p>
            ) : recent.length === 0 ? (
              <p className="text-[12.5px] text-text-secondary">Sin atenciones previas. Esta es la primera.</p>
            ) : (
              <div className="space-y-1.5">
                {recent.map((a, i) => (
                  <div key={i} className="text-[12.5px] text-text-secondary bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2">
                    <span className="capitalize text-text-tertiary">{dLabel(a.attended_on)}</span>
                    {a.professional_name ? <span className="text-text-tertiary"> · {a.professional_name}</span> : null}
                    {a.auto_summary ? <div className="text-text-primary">{a.auto_summary}</div> : null}
                    {a.note ? <div className="italic">“{a.note}”</div> : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Check de síntoma */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">¿Cómo llegó hoy?</label>
            <div className="grid grid-cols-3 gap-2">
              {SYM.map(s => {
                const on = symptom === s.id
                return (
                  <button key={s.id} onClick={() => setSymptom(s.id)}
                    className="rounded-lg py-3 text-[14px] font-medium border-[0.5px] transition-colors"
                    style={on ? { borderColor: s.color, background: s.soft, color: s.color } : { borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-[13px] text-text-secondary cursor-pointer w-fit">
            <input type="checkbox" checked={manage} onChange={e => setManage(e.target.checked)} style={{ accentColor: '#f87171' }} />
            Manejo de síntomas (sin carga)
          </label>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1.5">Nota (opcional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="El porqué, para el próximo profe…"
              className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-primary resize-y placeholder:text-text-tertiary" />
          </div>

          {error && <p className="text-[12.5px] text-warning">{error}</p>}

          <div className="flex items-center gap-3">
            <button onClick={register} disabled={saving || done}
              className="flex-1 bg-accent text-bg-primary px-4 py-2.5 rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {done ? '✓ Registrada' : saving ? 'Registrando…' : 'Registrar atención'}
            </button>
            <a href={`/dashboard/pacientes/${patientId}`} className="text-[12.5px] text-text-secondary hover:text-text-primary no-underline shrink-0">Abrir ficha →</a>
          </div>
        </div>
      </div>
    </div>
  )
}
