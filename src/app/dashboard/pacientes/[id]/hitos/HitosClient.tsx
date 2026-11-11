'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useConfirm, useToast } from '@/components/Dialogs'
import { softDeleteRecord } from '@/lib/softDelete'
import { EVENT_TYPES, eventMeta, type PatientEvent } from '@/lib/patientEvents'

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
  const [evSaving, setEvSaving] = useState(false)

  const addEvent = async () => {
    if (!evDate) return
    setEvSaving(true)
    const { data, error } = await supabaseRef.current
      .from('patient_events')
      .insert({ patient_id: patientId, user_id: userId, event_date: evDate, type: evType, title: evTitle.trim() || null, note: evNote.trim() || null })
      .select('id, event_date, type, title, note')
      .single()
    if (!error && data) {
      setEvents(prev => [...prev, data as PatientEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)))
      setEvTitle(''); setEvNote(''); setShowEventForm(false)
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
                {EVENT_TYPES.map(t => (
                  <button key={t.value} onClick={() => setEvType(t.value)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium border-[0.5px] transition-colors ${evType === t.value ? 'text-white' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'}`}
                    style={evType === t.value ? { backgroundColor: t.color, borderColor: t.color } : {}}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: evType === t.value ? '#fff' : t.color }} />
                    {t.label}
                  </button>
                ))}
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
            <button onClick={addEvent} disabled={evSaving || !evDate}
              className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-all active:scale-[0.97]">
              {evSaving ? 'Guardando…' : 'Agregar hito'}
            </button>
          </div>
        )}

        {events.length === 0 ? (
          <p className="text-[13px] text-text-secondary bg-bg-secondary border-[0.5px] border-dashed border-border rounded-xl px-4 py-5 text-center">
            Sin hitos todavía. Marcá evaluaciones, RTP, altas o competencias para ver el proceso completo del paciente.
          </p>
        ) : (
          <div className="border-[0.5px] border-border rounded-xl overflow-hidden divide-y-[0.5px] divide-border">
            {events.map(ev => {
              const meta = eventMeta(ev.type)
              const past = ev.event_date < new Date().toISOString().split('T')[0]
              return (
                <div key={ev.id} className={`flex items-center gap-3 px-4 py-3 ${past ? 'opacity-60' : ''}`}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                  <div className="w-[92px] shrink-0 text-[12px] text-text-secondary tabular-nums">
                    {new Date(ev.event_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-medium" style={{ color: meta.color }}>{meta.label}</span>
                    {ev.title && <span className="text-[13px] text-text-primary"> · {ev.title}</span>}
                    {ev.note && <p className="text-[12px] text-text-secondary truncate">{ev.note}</p>}
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
