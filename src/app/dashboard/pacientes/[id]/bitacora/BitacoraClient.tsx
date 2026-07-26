'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useConfirm, useToast } from '@/components/Dialogs'

interface ExerciseRef { id?: string; name: string }
interface Entry {
  id: string
  activity_date: string
  exercises: ExerciseRef[]
  note: string | null
  created_at: string
  user_id: string | null
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function BitacoraClient({
  patientId, userId, planMode, graduateWeeks: initialGraduateWeeks, authorNames, initialEntries,
}: {
  patientId: string
  userId: string
  planMode: string
  graduateWeeks: number
  authorNames: Record<string, string>
  initialEntries: Entry[]
}) {
  const router = useRouter()
  const { confirm, confirmDialog } = useConfirm()
  const { notify, toast } = useToast()
  const supabaseRef = useRef(createClient())

  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [date, setDate] = useState(todayStr())
  const [chips, setChips] = useState<ExerciseRef[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [graduateWeeks, setGraduateWeeks] = useState(initialGraduateWeeks)

  const authorName = (id: string | null) => (id ? (authorNames[id] ?? '—') : '—')

  // Buscador de ejercicios (biblioteca + propios), para sumar por nombre
  const [q, setQ] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<any[]>([])
  const [gradSaving, setGradSaving] = useState(false)

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/exercises?q=${encodeURIComponent(q)}`)
      const curated = res.ok ? await res.json() : []
      const { data: mine } = await supabaseRef.current
        .from('user_exercises').select('id, name').eq('user_id', userId).ilike('name', `%${q}%`).limit(20)
      setResults([...(mine ?? []), ...curated].slice(0, 8))
    }, 300)
    return () => clearTimeout(t)
  }, [q, userId])

  const addChip = (ex: ExerciseRef) => {
    if (!ex.name.trim()) return
    if (chips.some(c => c.name.toLowerCase() === ex.name.toLowerCase())) return
    setChips(prev => [...prev, { id: ex.id, name: ex.name.trim() }])
    setQ(''); setResults([])
  }
  const removeChip = (name: string) => setChips(prev => prev.filter(c => c.name !== name))

  const canSave = chips.length > 0 || note.trim().length > 0

  const resetForm = () => { setChips([]); setNote(''); setDate(todayStr()); setEditingId(null); setQ(''); setResults([]) }

  const startEdit = (e: Entry) => {
    setEditingId(e.id)
    setDate(e.activity_date)
    setChips(e.exercises ?? [])
    setNote(e.note ?? '')
    setQ(''); setResults([])
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveEntry = async () => {
    if (!canSave || !date) return
    setSaving(true)
    if (editingId) {
      // Editar (cualquier profesional del equipo puede; no se cambia el autor original)
      const { data, error } = await supabaseRef.current
        .from('simple_activity_log')
        .update({ activity_date: date, exercises: chips, note: note.trim() || null })
        .eq('id', editingId)
        .select('id, activity_date, exercises, note, created_at, user_id')
        .single()
      setSaving(false)
      if (error || !data) { notify('No se pudo guardar el cambio: ' + (error?.message ?? 'error'), 'error'); return }
      setEntries(prev => prev.map(e => e.id === editingId ? (data as Entry) : e).sort((a, b) =>
        b.activity_date.localeCompare(a.activity_date) || b.created_at.localeCompare(a.created_at)))
      resetForm()
      return
    }
    const { data, error } = await supabaseRef.current
      .from('simple_activity_log')
      .insert({ patient_id: patientId, user_id: userId, activity_date: date, exercises: chips, note: note.trim() || null })
      .select('id, activity_date, exercises, note, created_at, user_id')
      .single()
    setSaving(false)
    if (error || !data) { notify('No se pudo guardar: ' + (error?.message ?? 'error'), 'error'); return }
    setEntries(prev => [data as Entry, ...prev].sort((a, b) =>
      b.activity_date.localeCompare(a.activity_date) || b.created_at.localeCompare(a.created_at)))
    resetForm()
  }

  const deleteEntry = async (id: string) => {
    if (!(await confirm({ message: '¿Borrar este registro de la bitácora?', danger: true, confirmLabel: 'Borrar' }))) return
    setEntries(prev => prev.filter(e => e.id !== id))
    if (editingId === id) resetForm()
    await supabaseRef.current.from('simple_activity_log').delete().eq('id', id)
  }

  // Umbral de graduación configurable por paciente (semanas)
  const updateGraduateWeeks = async (weeks: number) => {
    const w = Math.max(1, Math.min(52, Math.round(weeks)))
    setGraduateWeeks(w)
    try {
      const res = await fetch('/api/pacientes/plan-mode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, graduateWeeks: w }),
      })
      if (!res.ok) throw new Error()
    } catch {
      notify('No se pudo guardar el umbral de graduación.', 'error')
    }
  }

  // Aviso de graduación: si la bitácora supera el umbral (semanas) del paciente,
  // sugerir pasar a plan detallado.
  const oldest = entries.length > 0 ? entries[entries.length - 1].activity_date : null
  const daysSinceStart = oldest
    ? Math.floor((Date.now() - new Date(oldest + 'T00:00:00').getTime()) / 86_400_000)
    : 0
  const suggestGraduate = daysSinceStart >= graduateWeeks * 7

  const graduate = async () => {
    setGradSaving(true)
    try {
      if (planMode !== 'detallado') {
        const res = await fetch('/api/pacientes/plan-mode', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId, mode: 'detallado' }),
        })
        if (!res.ok) throw new Error()
      }
      router.push(`/dashboard/ejercicios/plan?paciente=${patientId}`)
    } catch {
      setGradSaving(false)
      notify('No se pudo crear el plan detallado. Reintentá.', 'error')
    }
  }

  return (
    <div>
      {confirmDialog}
      {toast}

      {/* Aviso de graduación */}
      {suggestGraduate && (
        <div className="bg-accent/10 border-[0.5px] border-accent/40 rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-medium text-text-primary mb-0.5">
              Este paciente lleva {Math.floor(daysSinceStart / 7)} semanas en seguimiento simple
            </p>
            <p className="text-[12px] text-text-secondary">¿Es momento de pasar a un plan detallado con dosificación y progresión?</p>
          </div>
          <button onClick={graduate} disabled={gradSaving}
            className="shrink-0 bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
            {gradSaving ? '…' : 'Crear plan detallado'}
          </button>
        </div>
      )}

      {/* Umbral de graduación configurable por paciente */}
      <div className="flex items-center gap-2 mb-4 text-[12px] text-text-secondary">
        <span>Avisarme para graduar a plan detallado a las</span>
        <input type="number" min={1} max={52} value={graduateWeeks}
          onChange={e => setGraduateWeeks(Number(e.target.value))}
          onBlur={e => updateGraduateWeeks(Number(e.target.value))}
          className="w-14 bg-bg-secondary border-[0.5px] border-border rounded-lg px-2 py-1 text-[13px] text-text-primary text-center focus:outline-none focus:border-accent" />
        <span>semanas de seguimiento simple</span>
      </div>

      {/* Alta rápida */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5 mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <label className="text-[11px] uppercase tracking-[0.05em] text-text-secondary">
            {editingId ? 'Editando registro · Día' : 'Día'}
          </label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-accent" />
        </div>

        {/* Ejercicios elegidos */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {chips.map(c => (
              <span key={c.name} className="inline-flex items-center rounded-full border-[0.5px] border-accent/35 bg-accent/10 overflow-hidden">
                <span className="text-[12px] pl-2.5 pr-1.5 py-1.5 text-accent">{c.name}</span>
                <button onClick={() => removeChip(c.name)} className="text-[13px] leading-none px-1.5 py-1.5 text-accent/60 hover:text-warning hover:bg-accent/20 transition-colors">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Buscador / agregar ejercicio */}
        <div className="relative mb-3">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && q.trim()) { e.preventDefault(); addChip({ name: q }) } }}
            placeholder="Agregar ejercicio (buscá en tu biblioteca o escribí el nombre y Enter)…"
            className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent"
          />
          {results.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-bg-primary border-[0.5px] border-border rounded-lg shadow-lg max-h-[220px] overflow-y-auto">
              {results.map((r, i) => (
                <button key={r.id ?? i} onClick={() => addChip({ id: r.id, name: r.name })}
                  className="w-full text-left px-3 py-2 text-[13px] hover:bg-bg-secondary transition-colors">
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder="Nota (opcional): cómo le fue, observaciones…"
          className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent resize-y mb-3"
        />

        <div className="flex items-center gap-2">
          <button onClick={saveEntry} disabled={!canSave || saving}
            className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
            {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Registrar día'}
          </button>
          {editingId && (
            <button onClick={resetForm} className="text-[13px] text-text-secondary hover:text-text-primary px-3 py-2">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Historial */}
      {entries.length === 0 ? (
        <p className="text-[13px] text-text-secondary text-center py-8">
          Todavía no hay registros. Cargá el primero arriba.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map(e => (
            <div key={e.id} className={`bg-bg-primary border-[0.5px] rounded-xl p-4 ${editingId === e.id ? 'border-accent' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="text-[13px] font-medium text-text-primary capitalize">{formatDate(e.activity_date)}</span>
                  <span className="text-[11px] text-text-secondary ml-2">· cargado por {authorName(e.user_id)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => startEdit(e)} className="text-text-secondary hover:text-accent text-[12px]" title="Editar">Editar</button>
                  <button onClick={() => deleteEntry(e.id)} className="text-text-secondary hover:text-warning text-[16px] leading-none" title="Borrar">×</button>
                </div>
              </div>
              {e.exercises?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {e.exercises.map((ex, i) => (
                    <span key={i} className="text-[12px] px-2 py-1 rounded-full border-[0.5px] border-border bg-bg-secondary text-text-secondary">{ex.name}</span>
                  ))}
                </div>
              )}
              {e.note && <p className="text-[13px] text-text-secondary">{e.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
