'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/components/Dialogs'

interface Transfer {
  id: string
  from_area: string | null
  to_area: string
  report_note: string | null
  transferred_at: string
}

export default function DerivarAreaAction({
  patientId, userId, areas,
}: {
  patientId: string
  userId: string
  areas: string[]
}) {
  const { notify, toast } = useToast()
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [fromArea, setFromArea] = useState('')
  const [toArea, setToArea] = useState(areas[0] ?? '')
  const [reportNote, setReportNote] = useState('')
  const [saving, setSaving] = useState(false)
  const supabaseRef = useRef(createClient())

  const loadTransfers = () => {
    supabaseRef.current
      .from('patient_area_transfers')
      .select('id, from_area, to_area, report_note, transferred_at')
      .eq('patient_id', patientId)
      .order('transferred_at', { ascending: false })
      .then(({ data }) => { setTransfers(data ?? []); setLoaded(true) })
  }

  useEffect(() => { loadTransfers() }, [patientId])

  const handleSave = async () => {
    if (!toArea.trim()) return
    setSaving(true)
    const { error } = await supabaseRef.current.from('patient_area_transfers').insert({
      patient_id: patientId,
      from_area: fromArea.trim() || null,
      to_area: toArea.trim(),
      transferred_by: userId,
      report_note: reportNote.trim() || null,
    })
    setSaving(false)
    if (error) { notify('No se pudo registrar el pase: ' + error.message, 'error'); return }
    setOpen(false)
    setFromArea('')
    setReportNote('')
    loadTransfers()
    notify('Pase registrado')
  }

  if (!loaded) return null

  return (
    <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-6">
      {toast}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-medium tracking-[-0.01em]">Pases entre áreas</h2>
        <button onClick={() => setOpen(true)}
          className="bg-bg-secondary border-[0.5px] border-border-strong rounded-lg px-3.5 py-2 text-[13px] font-medium hover:border-accent transition-colors">
          + Derivar a otra área
        </button>
      </div>

      {transfers.length === 0 ? (
        <p className="text-[13px] text-text-tertiary">Sin pases registrados.</p>
      ) : (
        <div className="space-y-2">
          {transfers.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-3 text-[13px] border-[0.5px] border-border rounded-lg px-3.5 py-2.5">
              <span>
                {t.from_area ? `${t.from_area} → ` : ''}<span className="font-medium">{t.to_area}</span>
                <span className="text-text-tertiary ml-2">{new Date(t.transferred_at).toLocaleDateString('es-AR')}</span>
              </span>
              {t.report_note ? (
                <span className="text-text-secondary">{t.report_note}</span>
              ) : (
                <span className="text-warning">Sin informe</span>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl w-full max-w-[440px] shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-medium mb-4">Derivar a otra área</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] text-text-secondary mb-1">Área de origen (opcional)</label>
                <input value={fromArea} onChange={e => setFromArea(e.target.value)} placeholder="Ej: Kinesiología"
                  className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[12px] text-text-secondary mb-1">Área de destino</label>
                {areas.length > 0 ? (
                  <select value={toArea} onChange={e => setToArea(e.target.value)}
                    className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent">
                    {areas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                ) : (
                  <input value={toArea} onChange={e => setToArea(e.target.value)} placeholder="Ej: Entrenamiento"
                    className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
                )}
              </div>
              <div>
                <label className="block text-[12px] text-text-secondary mb-1">Informe (opcional, se puede completar después)</label>
                <textarea value={reportNote} onChange={e => setReportNote(e.target.value)} rows={3}
                  className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setOpen(false)} className="px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !toArea.trim()}
                className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-all active:scale-[0.97]">
                {saving ? 'Guardando...' : 'Registrar pase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
