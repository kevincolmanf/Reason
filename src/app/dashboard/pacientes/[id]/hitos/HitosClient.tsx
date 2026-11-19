'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useConfirm, useToast } from '@/components/Dialogs'
import { softDeleteRecord } from '@/lib/softDelete'
import { EVENT_TYPES, eventMeta, EVENT_TYPES_WITH_EVA, type PatientEvent } from '@/lib/patientEvents'

// ─── Iconos por tipo de hito (mismo trazo que el resto de la app: 24x24,
// stroke 2, puntas redondeadas) — para escanear la lista sin leer cada
// etiqueta, igual que ya se hizo en Historial. ───
function IconEvaluacion() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3h8v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3z" /><rect x="4" y="4" width="16" height="17" rx="2" /><path d="m9 14 2 2 4-4" /></svg>
}
function IconReevaluacion() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></svg>
}
function IconRtp() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 10 4 15l5 5" /><path d="M4 15h11a4 4 0 0 0 0-8h-1" /></svg>
}
function IconControl() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 5-5" /></svg>
}
function IconAlta() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18" /><path d="M5 4h10l-2 4 2 4H5" /></svg>
}
function IconObjetivo() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" /></svg>
}
function IconCompetencia() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M7 5H4a2 2 0 0 0 0 4h1M17 5h3a2 2 0 0 1 0 4h-1" /></svg>
}
function IconOtro() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 3 10 10-7 7L2 10V3h7z" /><circle cx="6.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
}

const TYPE_ICON: Record<string, () => React.JSX.Element> = {
  evaluacion: IconEvaluacion,
  reevaluacion: IconReevaluacion,
  rtp: IconRtp,
  control: IconControl,
  alta: IconAlta,
  objetivo: IconObjetivo,
  competencia: IconCompetencia,
  otro: IconOtro,
}

export default function HitosClient({
  patientId, patientName, userId, initialEvents,
}: {
  patientId: string
  patientName: string
  userId: string
  initialEvents: PatientEvent[]
}) {
  const { confirm, confirmDialog } = useConfirm()
  const { notify, toast } = useToast()
  const supabaseRef = useRef(createClient())

  const [events, setEvents] = useState<PatientEvent[]>(initialEvents)
  const [showEventForm, setShowEventForm] = useState(false)
  const [evType, setEvType] = useState('evaluacion')
  const [evDate, setEvDate] = useState(() => new Date().toISOString().split('T')[0])
  const [evTitle, setEvTitle] = useState('')
  const [evNote, setEvNote] = useState('')
  const [evEva, setEvEva] = useState('')
  const [evSaving, setEvSaving] = useState(false)

  const addEvent = async () => {
    if (!evDate) return
    setEvSaving(true)
    const { data, error } = await supabaseRef.current
      .from('patient_events')
      .insert({
        patient_id: patientId, user_id: userId, event_date: evDate, type: evType,
        title: evTitle.trim() || null, note: evNote.trim() || null,
        eva_dolor: EVENT_TYPES_WITH_EVA.has(evType) && evEva !== '' ? Number(evEva) : null,
      })
      .select('id, event_date, type, title, note, eva_dolor')
      .single()
    if (!error && data) {
      setEvents(prev => [...prev, data as PatientEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)))
      setEvTitle(''); setEvNote(''); setEvEva(''); setShowEventForm(false)
    }
    setEvSaving(false)
  }

  const deleteEvent = async (id: string) => {
    if (!(await confirm({ title: 'Borrar hito', message: 'El hito se moverá a la papelera. Podés restaurarlo por 30 días.', danger: true, confirmLabel: 'Borrar' }))) return
    const { error } = await softDeleteRecord(supabaseRef.current, {
      table: 'patient_events', id, userId, patientId, patientName,
    })
    if (error) { notify('No se pudo borrar: ' + error, 'error'); return }
    setEvents(prev => prev.filter(e => e.id !== id))
    notify('Hito movido a la papelera')
  }

  return (
    <div>
      {confirmDialog}
      {toast}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-medium">Hitos del tratamiento</h2>
          <button onClick={() => setShowEventForm(v => !v)} className="text-[13px] font-medium text-accent hover:opacity-80">
            {showEventForm ? 'Cerrar' : '+ Agregar hito'}
          </button>
        </div>

        {showEventForm && (
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4 mb-4 space-y-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Tipo</label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.map(t => {
                  const Icon = TYPE_ICON[t.value]
                  const sel = evType === t.value
                  return (
                    <button key={t.value} onClick={() => setEvType(t.value)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium border-[0.5px] transition-colors ${sel ? 'text-white' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'}`}
                      style={sel ? { backgroundColor: t.color, borderColor: t.color } : {}}>
                      <Icon />
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha</label>
                <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Título (opcional)</label>
                <input type="text" value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Ej: Reeval. LCA, torneo regional…" className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nota (opcional)</label>
              <input type="text" value={evNote} onChange={e => setEvNote(e.target.value)} placeholder="Detalle del hito…" className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
            </div>
            {EVENT_TYPES_WITH_EVA.has(evType) && (
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Dolor en este momento (EVA 0-10, opcional)</label>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                    const sel = evEva === String(n)
                    return (
                      <button key={n} onClick={() => setEvEva(sel ? '' : String(n))}
                        className={`w-9 h-9 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${sel ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border-strong text-text-primary hover:border-accent'}`}
                      >{n}</button>
                    )
                  })}
                </div>
              </div>
            )}
            <button onClick={addEvent} disabled={evSaving || !evDate}
              className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-all active:scale-[0.97]">
              {evSaving ? 'Guardando…' : 'Agregar hito'}
            </button>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-[13px] text-text-secondary bg-bg-secondary border-[0.5px] border-dashed border-border rounded-xl px-4 py-6 text-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 opacity-40"><path d="M5 3v18" /><path d="M5 4h10l-2 4 2 4H5" /></svg>
            Sin hitos todavía. Marcá evaluaciones, RTP, altas o competencias para ver el proceso completo del paciente.
          </div>
        ) : (
          <div className="border-[0.5px] border-border rounded-xl overflow-hidden divide-y-[0.5px] divide-border">
            {events.map(ev => {
              const meta = eventMeta(ev.type)
              const Icon = TYPE_ICON[ev.type] ?? IconOtro
              const past = ev.event_date < new Date().toISOString().split('T')[0]
              return (
                <div key={ev.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary/60 transition-colors ${past ? 'opacity-60' : ''}`}>
                  <span className="w-[10px] h-[10px] rounded-full border-[1.5px] shrink-0" style={{ backgroundColor: meta.color, borderColor: meta.color }} />
                  <div className="w-[96px] shrink-0 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">
                    {new Date(ev.event_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded-full border-[0.5px]"
                        style={{ color: meta.color, backgroundColor: `${meta.color}1A`, borderColor: `${meta.color}4D` }}
                      >
                        <Icon />
                        {meta.label}
                      </span>
                      {ev.title && <span className="text-[13px] text-text-primary">{ev.title}</span>}
                      {ev.eva_dolor !== null && (
                        <span className="text-[10.5px] font-mono font-medium text-text-secondary bg-bg-tertiary border-[0.5px] border-border px-1.5 py-0.5 rounded-full">
                          EVA {ev.eva_dolor}/10
                        </span>
                      )}
                    </div>
                    {ev.note && <p className="text-[12px] text-text-secondary truncate mt-1">{ev.note}</p>}
                  </div>
                  <button onClick={() => deleteEvent(ev.id)} className="text-text-secondary hover:text-warning text-[14px] shrink-0 transition-colors" title="Eliminar hito">×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
