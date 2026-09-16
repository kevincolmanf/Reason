'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

// Hoja rápida para cargar la "Atención de hoy" (modo kine) desde la agenda, sin
// entrar a la ficha. Muestra un resumen de las últimas atenciones + check de
// síntoma + la sesión del plan (ver/ajustar carga acá mismo) + nota opcional, y
// registra por /api/pacientes/atencion.

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

// Sesión del plan (misma forma que en la ficha / AtencionDeHoy).
interface SessionExerciseLite { exercise_name?: string; sets?: string; reps?: string; load?: string }
interface SessionBlockLite { name?: string; exercises?: SessionExerciseLite[] }
interface KineSessionData { blocks?: SessionBlockLite[] }
interface ScheduledSessionLite { id: string; scheduled_date: string; session_name: string | null; session_data: KineSessionData | null; completed?: boolean }

function dLabel(d: string): string {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) } catch { return d }
}
function upperName(s?: string): string { return (s ?? '').toUpperCase() }
function todayAR(): string { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }) }

export default function QuickAtencionSheet({ patientId, patientName, onClose, onSaved }: Props) {
  const [recent, setRecent] = useState<RecentAtt[] | null>(null)
  const [symptom, setSymptom] = useState<Symptom | null>(null)
  const [manage, setManage] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Sesión del plan para hoy (se carga en cliente, respeta RLS).
  const [planId, setPlanId] = useState<string | null>(null)
  const [session, setSession] = useState<ScheduledSessionLite | null>(null)
  const [pending, setPending] = useState<{ date: string; kind: 'upcoming' | 'last' } | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [bringing, setBringing] = useState(false)
  const [bringError, setBringError] = useState<string | null>(null)

  // Edición inline de la sesión.
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<SessionBlockLite[] | null>(null)
  const [savingSession, setSavingSession] = useState(false)
  const [sessionErr, setSessionErr] = useState<string | null>(null)
  const [sessionEdited, setSessionEdited] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('kine_attentions')
      .select('symptom, auto_summary, note, attended_on, professional_name')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(2)
      .then(({ data }) => setRecent((data ?? []) as RecentAtt[]))
  }, [patientId])

  // Cargar plan + sesión de hoy (o próxima/última como pending), igual que la ficha.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const supabase = createClient()
      const today = todayAR()
      const { data: plan } = await supabase
        .from('exercise_plans')
        .select('id, name')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (!plan) { setLoadingSession(false); return }
      setPlanId(plan.id)

      const { data: todaySession } = await supabase
        .from('scheduled_sessions')
        .select('id, scheduled_date, session_name, session_data, completed')
        .eq('plan_id', plan.id)
        .eq('scheduled_date', today)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (cancelled) return

      if (todaySession) {
        setSession(todaySession as ScheduledSessionLite)
      } else {
        const { data: upcoming } = await supabase
          .from('scheduled_sessions')
          .select('scheduled_date')
          .eq('plan_id', plan.id)
          .gt('scheduled_date', today)
          .order('scheduled_date', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (cancelled) return
        if (upcoming) {
          setPending({ date: upcoming.scheduled_date, kind: 'upcoming' })
        } else {
          const { data: last } = await supabase
            .from('scheduled_sessions')
            .select('scheduled_date')
            .eq('plan_id', plan.id)
            .lt('scheduled_date', today)
            .order('scheduled_date', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (cancelled) return
          if (last) setPending({ date: last.scheduled_date, kind: 'last' })
        }
      }
      setLoadingSession(false)
    }
    load()
    return () => { cancelled = true }
  }, [patientId])

  const startEdit = () => {
    setDraft(JSON.parse(JSON.stringify(session?.session_data?.blocks ?? [])))
    setEditing(true); setSessionErr(null)
  }
  const cancelEdit = () => { setEditing(false); setDraft(null) }
  const editEx = (bi: number, ei: number, field: 'sets' | 'reps' | 'load', value: string) => {
    setDraft(prev => prev?.map((b, i) => i !== bi ? b : ({
      ...b, exercises: (b.exercises ?? []).map((ex, j) => j !== ei ? ex : ({ ...ex, [field]: value })),
    })) ?? prev)
  }
  const saveSession = async () => {
    if (!session || !draft) return
    setSavingSession(true); setSessionErr(null)
    try {
      const newData = { ...(session.session_data ?? {}), blocks: draft }
      const res = await fetch('/api/sessions/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, session_name: session.session_name, session_data: newData }),
      })
      if (!res.ok) throw new Error()
      setSession(s => s ? { ...s, session_data: newData } : s)
      setSessionEdited(true); setEditing(false); setDraft(null)
    } catch {
      setSessionErr('No se pudo guardar la sesión')
    } finally {
      setSavingSession(false)
    }
  }

  const bringToToday = async () => {
    setBringing(true); setBringError(null)
    try {
      const res = await fetch('/api/sessions/bring-to-today', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'error')
      setSession(json.session as ScheduledSessionLite)
      setPending(null)
    } catch (e) {
      setBringError(e instanceof Error ? e.message : 'No se pudo traer la sesión')
    } finally {
      setBringing(false)
    }
  }

  const register = async () => {
    if (!symptom) { setError('Marcá cómo llegó hoy.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/pacientes/atencion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, symptom, manageSymptoms: manage, modalities: [], note, adjustedSession: sessionEdited }),
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

  const blocks = editing ? (draft ?? []) : (session?.session_data?.blocks ?? [])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[460px] shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b-[0.5px] border-border sticky top-0 bg-bg-secondary z-10">
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

          {/* Sesión de hoy (del plan) — ver y ajustar carga acá mismo */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1.5">Sesión de hoy</label>
            {loadingSession ? (
              <p className="text-[12.5px] text-text-secondary">Cargando entrenamiento…</p>
            ) : session ? (
              <div className={`border-[0.5px] border-border rounded-lg overflow-hidden transition-opacity ${manage ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-2 px-3 py-2 bg-bg-primary border-b-[0.5px] border-border">
                  <span className="text-[12.5px] font-medium min-w-0 truncate">{session.session_name || 'Sesión'}</span>
                  {sessionEdited && !editing && <span className="text-[10.5px] text-accent border-[0.5px] border-accent/30 bg-accent/10 rounded-full px-2 py-0.5 shrink-0">ajustada hoy</span>}
                  {!editing ? (
                    <div className="ml-auto flex items-center gap-3 shrink-0">
                      {(session.session_data?.blocks ?? []).length > 0 && <button onClick={startEdit} className="text-[12px] text-text-secondary hover:text-text-primary">Ajustar carga</button>}
                      {planId && <a href={`/dashboard/ejercicios/plan/${planId}`} className="text-[12px] text-accent no-underline hover:underline">Abrir plan</a>}
                    </div>
                  ) : (
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      <button onClick={cancelEdit} className="text-[12px] text-text-secondary hover:text-text-primary">Cancelar</button>
                      <button onClick={saveSession} disabled={savingSession} className="bg-accent text-bg-primary px-2.5 py-1 rounded text-[12px] font-medium hover:opacity-90 disabled:opacity-50">{savingSession ? 'Guardando…' : 'Guardar'}</button>
                    </div>
                  )}
                </div>
                {(session.session_data?.blocks ?? []).length === 0 ? (
                  <p className="text-[12.5px] text-text-secondary p-3">La sesión no tiene ejercicios cargados. Abrí el plan para armarla.</p>
                ) : (
                  blocks.map((b, bi) => (
                    <div key={bi} className={bi > 0 ? 'border-t-[0.5px] border-border' : ''}>
                      {b.name && <div className="text-[11px] text-text-secondary px-3 pt-2">{b.name}</div>}
                      {(b.exercises ?? []).map((ex, ei) => (
                        <div key={ei} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                          <span className="flex-1 min-w-0 truncate">{upperName(ex.exercise_name) || 'EJERCICIO'}</span>
                          {editing ? (
                            <span className="flex items-center gap-1.5 shrink-0">
                              <input value={ex.sets ?? ''} onChange={e => editEx(bi, ei, 'sets', e.target.value)} placeholder="series" className="w-11 bg-bg-secondary border-[0.5px] border-border rounded px-1.5 py-1 text-[12px] text-text-primary text-center" />
                              <span className="text-text-secondary text-[12px]">×</span>
                              <input value={ex.reps ?? ''} onChange={e => editEx(bi, ei, 'reps', e.target.value)} placeholder="reps" className="w-11 bg-bg-secondary border-[0.5px] border-border rounded px-1.5 py-1 text-[12px] text-text-primary text-center" />
                              <input value={ex.load ?? ''} onChange={e => editEx(bi, ei, 'load', e.target.value)} placeholder="carga" className="w-14 bg-bg-secondary border-[0.5px] border-border rounded px-1.5 py-1 text-[12px] text-text-primary text-center" />
                            </span>
                          ) : (
                            <span className="text-[12.5px] text-text-secondary shrink-0">{[[ex.sets, ex.reps].filter(Boolean).join(' × '), ex.load].filter(Boolean).join(' · ')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                )}
                {sessionErr && <div className="text-[12px] text-warning px-3 py-2 border-t-[0.5px] border-border">{sessionErr}</div>}
                {manage && <div className="text-[12px] text-text-secondary px-3 py-2 border-t-[0.5px] border-border" style={{ background: 'rgba(248,113,113,0.08)' }}>Día de manejo de síntomas: no se carga. La progresión del plan no se rompe.</div>}
              </div>
            ) : pending ? (
              <div className="flex items-center gap-3 rounded-lg px-3.5 py-3 border-[0.5px]" style={{ borderColor: 'rgba(45,216,168,0.35)', background: 'rgba(45,216,168,0.08)' }}>
                <div className="text-[12.5px] text-text-primary">
                  {pending.kind === 'upcoming'
                    ? <>La próxima sesión está agendada para <b className="text-accent capitalize">{dLabel(pending.date)}</b>, pero el paciente vino hoy.</>
                    : <>No hay sesión para hoy. Podés traer la última (<span className="capitalize">{dLabel(pending.date)}</span>) al día de hoy.</>}
                </div>
                <button onClick={bringToToday} disabled={bringing} className="ml-auto shrink-0 bg-accent text-bg-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-90 disabled:opacity-50">
                  {bringing ? 'Trayendo…' : 'Traer a hoy'}
                </button>
              </div>
            ) : planId ? (
              <p className="text-[12.5px] text-text-secondary">Este plan todavía no tiene sesiones. <a href={`/dashboard/ejercicios/plan/${planId}`} className="text-accent no-underline hover:underline">Abrí el plan</a> para armar la primera.</p>
            ) : (
              <p className="text-[12.5px] text-text-secondary">El paciente todavía no tiene un plan de ejercicios.</p>
            )}
            {bringError && <p className="text-[12px] text-warning mt-1.5">{bringError}</p>}
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1.5">Nota (opcional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="El porqué, para el próximo profesional…"
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
