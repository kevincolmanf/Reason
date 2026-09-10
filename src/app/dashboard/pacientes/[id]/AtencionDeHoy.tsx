'use client'

import { useState } from 'react'

// Capa "Atención de hoy" del Modo Kinesiología. Se muestra solo en pacientes con
// kine_mode = true. Resuelve el ajuste del día en 1–2 toques: check de síntoma →
// sugerencia (no se auto-aplica) → registrar. La continuidad se arma sola y la
// lee el próximo profesional arriba de todo.

export interface Attention {
  id: string
  attended_on: string
  professional_name: string | null
  symptom: string | null
  manage_symptoms: boolean
  modalities: string[]
  auto_summary: string | null
  note: string | null
  created_at: string
}

interface SessionExerciseLite { exercise_name?: string; sets?: string; reps?: string; load?: string }
interface SessionBlockLite { name?: string; exercises?: SessionExerciseLite[] }
interface KineSessionData { blocks?: SessionBlockLite[] }
export interface ScheduledSessionLite {
  id: string
  scheduled_date: string
  session_name: string | null
  session_data: KineSessionData | null
  completed?: boolean
}
export interface KineSession {
  planId: string
  today: string
  todaySession: ScheduledSessionLite | null
  pending: { date: string; kind: 'upcoming' | 'last' } | null
}

type Symptom = 'mejor' | 'igual' | 'peor'

const SYM_META: Record<Symptom, { label: string; sub: string; color: string; soft: string }> = {
  peor:  { label: 'Peor',  sub: 'síntomas ↑',    color: '#f87171', soft: 'rgba(248,113,113,0.12)' },
  igual: { label: 'Igual', sub: 'sin cambios',   color: '#fbbf24', soft: 'rgba(251,191,36,0.12)' },
  mejor: { label: 'Mejor', sub: 'síntomas ↓',    color: '#4ade80', soft: 'rgba(74,222,128,0.12)' },
}

const SUGG: Record<Symptom, { title: string; items: string[] }> = {
  mejor: { title: 'Progresar', items: ['Subir carga un escalón donde el dolor lo permita.', 'Habilitar el próximo ejercicio del plan si tolera.'] },
  igual: { title: 'Mantener',  items: ['Repetir la sesión anterior tal cual.', 'Reevaluar en ~1 semana si sigue estable.'] },
  peor:  { title: 'Descargar / manejar síntoma', items: ['Bajar carga o pasar a manejo de síntomas.', 'Considerá cambiar el ejercicio por una variante tolerable.', 'Sumar terapia manual y reevaluar con un cuestionario.'] },
}

const MODALITIES: { id: string; label: string }[] = [
  { id: 'manual', label: 'Terapia manual' },
  { id: 'reeval', label: 'Reevaluación' },
  { id: 'cuest', label: 'Cuestionario' },
]

function upperName(s?: string): string {
  return (s ?? '').toUpperCase()
}

function dateLabel(d: string): string {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch { return d }
}

function symTagStyle(sym: string | null) {
  const m = sym && sym in SYM_META ? SYM_META[sym as Symptom] : null
  return m ? { color: m.color, background: m.soft } : { color: 'var(--text-secondary)', background: 'transparent' }
}

export default function AtencionDeHoy({ patientId, initialAttentions = [], kineSession = null }: { patientId: string; initialAttentions?: Attention[]; kineSession?: KineSession | null }) {
  const [attentions, setAttentions] = useState<Attention[]>(initialAttentions)
  const [symptom, setSymptom] = useState<Symptom | null>(null)
  const [manage, setManage] = useState(false)
  const [modalities, setModalities] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [showAll, setShowAll] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const deleteAttention = async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch('/api/pacientes/atencion', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attentionId: id }),
      })
      if (!res.ok) throw new Error()
      setAttentions(prev => prev.filter(a => a.id !== id))
    } catch { /* si falla, se mantiene */ } finally {
      setDeleting(null); setConfirmDel(null)
    }
  }

  // Sesión del plan para hoy (precargada del calendario).
  const [session, setSession] = useState<ScheduledSessionLite | null>(kineSession?.todaySession ?? null)
  const [pending, setPending] = useState(kineSession?.pending ?? null)
  const [bringing, setBringing] = useState(false)
  const [bringError, setBringError] = useState<string | null>(null)
  const planId = kineSession?.planId ?? null

  // Edición inline de la sesión (Fase 2c)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<SessionBlockLite[] | null>(null)
  const [savingSession, setSavingSession] = useState(false)
  const [sessionErr, setSessionErr] = useState<string | null>(null)
  const [sessionEdited, setSessionEdited] = useState(false)

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

  // Señal para reevaluar (Fase 4b): SOLO si empeora — racha de "peor" seguidos
  // desde la atención más reciente. Si se mantiene ("igual") o mejora, no avisa.
  const worseStreak = (() => {
    let n = 0
    for (const a of attentions.filter(x => x.symptom)) { if (a.symptom === 'peor') n++; else break }
    return n
  })()
  const showSignal = worseStreak >= 2

  const bringToToday = async () => {
    setBringing(true); setBringError(null)
    try {
      const res = await fetch('/api/sessions/bring-to-today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const toggleMod = (id: string) => {
    setModalities(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const setSym = (s: Symptom) => setSymptom(s)

  const register = async () => {
    setSaving(true); setStatus('idle')
    try {
      const res = await fetch('/api/pacientes/atencion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, symptom, manageSymptoms: manage, modalities: Array.from(modalities), note, adjustedSession: sessionEdited }),
      })
      if (!res.ok) throw new Error()
      const { attention } = await res.json()
      setAttentions(prev => [attention as Attention, ...prev])
      setSymptom(null); setManage(false); setModalities(new Set()); setNote(''); setSessionEdited(false)
      setStatus('saved'); setTimeout(() => setStatus('idle'), 2500)
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const sug = symptom ? SUGG[symptom] : null
  const sugColor = symptom ? SYM_META[symptom].color : 'var(--accent)'
  const sugSoft = symptom ? SYM_META[symptom].soft : 'rgba(45,216,168,0.1)'

  // Preview de la línea que se guardará
  const previewActions: string[] = []
  if (manage) previewActions.push('manejo de síntomas (sin carga)')
  Array.from(modalities).forEach(m => previewActions.push(MODALITIES.find(x => x.id === m)!.label.toLowerCase()))
  if (sessionEdited) previewActions.push('ajustó la sesión')
  const previewParts: string[] = []
  if (symptom) previewParts.push(`Síntoma: ${symptom}`)
  if (previewActions.length) previewParts.push(previewActions.join(' · '))
  const preview = previewParts.length ? previewParts.join(' · ') : 'Atención registrada'

  const visible = showAll ? attentions : attentions.slice(0, 3)

  return (
    <section data-tour="ficha-atencion" className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 mb-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[16px] font-medium">Atención de hoy</h2>
          <p className="text-[12px] text-text-secondary mt-0.5">Modo kinesiología · resolvé el ajuste del día en un par de toques.</p>
        </div>
      </div>

      {/* SEÑAL PARA REEVALUAR (Fase 4b) */}
      {showSignal && (
        <div className="rounded-lg p-3.5 mb-5 border-[0.5px]" style={{ borderColor: 'rgba(245,196,81,0.4)', background: 'rgba(245,196,81,0.1)' }}>
          <div className="flex items-start gap-2.5">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f5c451" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <p className="text-[13px] font-medium text-text-primary">
                {worseStreak >= 3
                  ? `Hace ${worseStreak} atenciones seguidas que el síntoma empeora.`
                  : 'El síntoma viene empeorando en las últimas atenciones.'}
              </p>
              <p className="text-[12px] text-text-secondary mt-0.5">Buen momento para reevaluar o tomar un cuestionario auto-reportado y medir dónde está parado.</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <a href={`/recursos/cuestionarios?paciente=${patientId}&from=/dashboard/pacientes/${patientId}`} className="text-[12px] font-medium text-accent no-underline hover:underline">Tomar cuestionario →</a>
                {planId && <a href={`/dashboard/ejercicios/plan/${planId}`} className="text-[12px] text-text-secondary no-underline hover:text-text-primary">Programar reevaluación en el plan →</a>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTINUIDAD */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Continuidad</span>
          <span className="text-[9.5px] tracking-[0.06em] text-accent border-[0.5px] border-accent/30 bg-accent/10 rounded px-1.5 py-0.5">AUTO</span>
          <span className="text-[11px] text-text-secondary">— lo que dejó quien atendió antes</span>
        </div>
        <div className="bg-bg-primary border-[0.5px] border-border rounded-lg">
          {attentions.length === 0 ? (
            <p className="text-[12.5px] text-text-secondary p-3">Todavía no hay atenciones registradas. La primera línea se genera al registrar la de hoy.</p>
          ) : (
            <>
              {visible.map((a, i) => (
                <div key={a.id} className={`flex gap-3 px-3 py-2.5 items-start ${i > 0 ? 'border-t-[0.5px] border-border' : ''}`}>
                  <div className="shrink-0 w-[104px]">
                    <div className="text-[11.5px] text-text-secondary capitalize">{dateLabel(a.attended_on)}</div>
                    <div className="text-[11px] text-text-secondary/70 truncate">{a.professional_name ?? 'Profesional'}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {a.symptom && (
                        <span className="text-[10.5px] font-semibold rounded px-1.5 py-0.5 capitalize" style={symTagStyle(a.symptom)}>
                          Síntoma: {a.symptom}
                        </span>
                      )}
                      {a.auto_summary && (() => {
                        // muestra solo la parte de "acción" (lo que sigue al síntoma)
                        const rest = a.symptom ? a.auto_summary.replace(new RegExp(`^Síntoma: ${a.symptom}\\s*·?\\s*`), '') : a.auto_summary
                        return rest ? <span className="text-[11px] text-text-secondary border-[0.5px] border-border bg-bg-secondary rounded px-1.5 py-0.5">{rest}</span> : null
                      })()}
                    </div>
                    {a.note && <div className="text-[12px] text-text-secondary/80 italic mt-1">“{a.note}”</div>}
                  </div>
                  <div className="ml-auto shrink-0">
                    {confirmDel === a.id ? (
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-text-secondary">¿Borrar?</span>
                        <button onClick={() => deleteAttention(a.id)} disabled={deleting === a.id} className="text-warning font-medium hover:underline disabled:opacity-50">Sí</button>
                        <button onClick={() => setConfirmDel(null)} className="text-text-secondary hover:text-text-primary">No</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDel(a.id)} aria-label="Borrar atención" title="Borrar atención" className="text-text-secondary/50 hover:text-warning text-[15px] leading-none px-1">×</button>
                    )}
                  </div>
                </div>
              ))}
              {attentions.length > 3 && (
                <button onClick={() => setShowAll(v => !v)} className="text-[11.5px] text-text-secondary hover:text-text-primary px-3 py-2 border-t-[0.5px] border-border w-full text-left">
                  {showAll ? 'Ver menos' : `Ver las ${attentions.length} atenciones`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* CHECK DE SÍNTOMA */}
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.08em] text-text-secondary mb-2">¿Cómo llegó hoy?</div>
        <div className="grid grid-cols-3 gap-2">
          {(['peor', 'igual', 'mejor'] as Symptom[]).map(s => {
            const on = symptom === s
            const m = SYM_META[s]
            return (
              <button
                key={s}
                onClick={() => setSym(s)}
                className="rounded-lg py-3 px-2 border-[0.5px] flex flex-col items-center gap-0.5 transition-colors"
                style={on
                  ? { borderColor: m.color, background: m.soft, color: m.color }
                  : { borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
              >
                <span className="text-[13px] font-semibold">{m.label}</span>
                <span className="text-[10.5px]" style={{ opacity: 0.8 }}>{m.sub}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* SUGERENCIA */}
      {sug && (
        <div className="rounded-lg p-3.5 mb-4 border-[0.5px]" style={{ borderColor: sugColor + '66', background: sugSoft }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold tracking-[0.06em] uppercase text-text-secondary border-[0.5px] border-border bg-bg-primary rounded px-1.5 py-0.5">Sugerido</span>
            <span className="text-[13px] font-semibold" style={{ color: sugColor }}>{sug.title}</span>
          </div>
          <ul className="flex flex-col gap-1 mt-1 list-none p-0">
            {sug.items.map((it, i) => <li key={i} className="text-[12.5px] text-text-primary flex gap-2"><span style={{ color: sugColor }}>·</span>{it}</li>)}
          </ul>
          <div className="text-[11px] text-text-secondary mt-2.5">Es una sugerencia — confirmás o corregís vos. Nada se aplica solo.</div>
        </div>
      )}

      {/* SESIÓN DE HOY (precargada del plan) */}
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.08em] text-text-secondary mb-2">Sesión de hoy</div>
        {session ? (
          <div className={`border-[0.5px] border-border rounded-lg overflow-hidden transition-opacity ${manage ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-2 px-3 py-2 bg-bg-primary border-b-[0.5px] border-border">
              <span className="text-[12.5px] font-medium">{session.session_name || 'Sesión'}</span>
              {sessionEdited && !editing && <span className="text-[10.5px] text-accent border-[0.5px] border-accent/30 bg-accent/10 rounded-full px-2 py-0.5">ajustada hoy</span>}
              {!sessionEdited && <span className="text-[10.5px] text-text-secondary border-[0.5px] border-border rounded-full px-2 py-0.5">precargada del plan</span>}
              {!editing ? (
                <div className="ml-auto flex items-center gap-3">
                  {(session.session_data?.blocks ?? []).length > 0 && <button onClick={startEdit} className="text-[12px] text-text-secondary hover:text-text-primary">Ajustar carga</button>}
                  {planId && <a href={`/dashboard/ejercicios/plan/${planId}`} className="text-[12px] text-accent no-underline hover:underline">Abrir plan</a>}
                </div>
              ) : (
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={cancelEdit} className="text-[12px] text-text-secondary hover:text-text-primary">Cancelar</button>
                  <button onClick={saveSession} disabled={savingSession} className="bg-accent text-bg-primary px-2.5 py-1 rounded text-[12px] font-medium hover:opacity-90 disabled:opacity-50">{savingSession ? 'Guardando…' : 'Guardar'}</button>
                </div>
              )}
            </div>
            {(session.session_data?.blocks ?? []).length === 0 ? (
              <p className="text-[12.5px] text-text-secondary p-3">La sesión no tiene ejercicios cargados. Abrí el plan para armarla.</p>
            ) : (
              (editing ? (draft ?? []) : (session.session_data!.blocks ?? [])).map((b, bi) => (
                <div key={bi} className={bi > 0 ? 'border-t-[0.5px] border-border' : ''}>
                  {b.name && <div className="text-[11px] text-text-secondary px-3 pt-2">{b.name}</div>}
                  {(b.exercises ?? []).map((ex, ei) => (
                    <div key={ei} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                      <span className="flex-1">{upperName(ex.exercise_name) || 'EJERCICIO'}</span>
                      {editing ? (
                        <span className="flex items-center gap-1.5 shrink-0">
                          <input value={ex.sets ?? ''} onChange={e => editEx(bi, ei, 'sets', e.target.value)} placeholder="series" className="w-12 bg-bg-secondary border-[0.5px] border-border rounded px-1.5 py-1 text-[12px] text-text-primary text-center" />
                          <span className="text-text-secondary text-[12px]">×</span>
                          <input value={ex.reps ?? ''} onChange={e => editEx(bi, ei, 'reps', e.target.value)} placeholder="reps" className="w-12 bg-bg-secondary border-[0.5px] border-border rounded px-1.5 py-1 text-[12px] text-text-primary text-center" />
                          <input value={ex.load ?? ''} onChange={e => editEx(bi, ei, 'load', e.target.value)} placeholder="carga" className="w-16 bg-bg-secondary border-[0.5px] border-border rounded px-1.5 py-1 text-[12px] text-text-primary text-center" />
                        </span>
                      ) : (
                        <span className="text-[12.5px] text-text-secondary">{[[ex.sets, ex.reps].filter(Boolean).join(' × '), ex.load].filter(Boolean).join(' · ')}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
            {sessionErr && <div className="text-[12px] text-warning px-3 py-2 border-t-[0.5px] border-border">{sessionErr}</div>}
            {manage && <div className="text-[12px] text-text-secondary px-3 py-2 border-t-[0.5px] border-border" style={{ background: 'rgba(248,113,113,0.08)' }}>Día de manejo de síntomas: no se carga. La progresión del plan no se rompe.</div>}
            <div className="text-[11px] text-text-secondary px-3 py-2 border-t-[0.5px] border-border">
              {editing ? 'Editás series × reps · carga. Se guarda en la sesión del calendario del plan.' : 'Ajustá la carga acá o abrí el plan para cambios más finos (ejercicios, bloques).'}
            </div>
          </div>
        ) : pending ? (
          <div className="flex items-center gap-3 rounded-lg px-3.5 py-3 border-[0.5px]" style={{ borderColor: 'rgba(45,216,168,0.35)', background: 'rgba(45,216,168,0.08)' }}>
            <div className="text-[12.5px] text-text-primary">
              {pending.kind === 'upcoming'
                ? <>La próxima sesión está agendada para <b className="text-accent capitalize">{dateLabel(pending.date)}</b>, pero el paciente vino hoy.</>
                : <>No hay sesión para hoy. Podés traer la última (<span className="capitalize">{dateLabel(pending.date)}</span>) al día de hoy.</>}
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

      {/* MODALIDADES + MANEJO DE SÍNTOMAS */}
      <div className="flex flex-wrap gap-2 mb-3">
        {MODALITIES.map(m => {
          const on = modalities.has(m.id)
          return (
            <button
              key={m.id}
              onClick={() => toggleMod(m.id)}
              className={`text-[11.5px] font-medium px-3 py-1.5 rounded-full border-[0.5px] transition-colors ${on ? 'text-accent border-accent/40 bg-accent/10' : 'text-text-secondary border-border bg-bg-primary hover:text-text-primary'}`}
            >
              {m.label}
            </button>
          )
        })}
      </div>
      <label className="flex items-center gap-2 mb-4 text-[12.5px] text-text-secondary cursor-pointer w-fit">
        <input type="checkbox" checked={manage} onChange={e => setManage(e.target.checked)} style={{ accentColor: '#f87171' }} />
        Manejo de síntomas (sin carga) — no rompe la progresión del plan
      </label>

      {/* NOTA OPCIONAL + REGISTRAR */}
      <div className="border-[0.5px] border-dashed border-border rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Se guardará como continuidad</span>
          <span className="text-[9.5px] tracking-[0.06em] text-accent border-[0.5px] border-accent/30 bg-accent/10 rounded px-1.5 py-0.5">AUTO</span>
        </div>
        <div className="text-[12.5px] text-text-primary mb-2">{preview}</div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Nota opcional para el próximo profesional (el “por qué”)…"
          className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[12.5px] text-text-primary resize-y min-h-[38px] placeholder:text-text-secondary/60"
        />
        <div className="text-[11px] text-text-secondary mt-1.5">La línea de arriba se arma sola. Escribir es opcional.</div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={register}
          disabled={saving}
          className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Registrando…' : 'Registrar atención de hoy'}
        </button>
        {status === 'saved' && <span className="text-[12px] text-[#4ade80]">✓ Registrada — la continuidad quedó lista</span>}
        {status === 'error' && <span className="text-[12px] text-warning">No se pudo registrar — reintentá</span>}
      </div>
    </section>
  )
}
