'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { Method, Preset } from '@/app/dashboard/caja/CajaConfig'

// Hoja rápida para cargar un ingreso a la caja durante la atención (dar presente
// y cobrar). Gemela de QuickSessionSheet, abierta desde el menú del turno. Queda
// enlazada al paciente del turno. Solo la usan quienes pueden registrar caja.

const DEFAULT_METHOD_NAMES = ['Efectivo', 'Cuenta bancaria', 'Mercado Pago']
const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface Props {
  orgId: string
  userId: string
  patientId: string | null
  patientName: string
  area: string
  presets: Preset[]
  methods: Method[]
  onClose: () => void
  onSaved?: () => void
}

export default function QuickCajaSheet({ orgId, userId, patientId, patientName, area, presets, methods, onClose, onSaved }: Props) {
  const supabase = createClient()
  const methodNames = useMemo(() => {
    const configured = methods.filter(m => m.active).map(m => m.name)
    return configured.length ? configured : DEFAULT_METHOD_NAMES
  }, [methods])

  const activePresets = presets.filter(p => p.active && p.type === 'ingreso')
  const [selectedPreset, setSelectedPreset] = useState('')
  const [amount, setAmount] = useState('')
  const [destino, setDestino] = useState(methodNames[0] ?? '')
  const [concept, setConcept] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  const applyPreset = (id: string) => {
    setSelectedPreset(id)
    const p = presets.find(x => x.id === id)
    if (!p) return
    setAmount(p.amount ? String(p.amount) : '')
    if (p.payment_method) setDestino(p.payment_method)
    setConcept(p.label)
    setError('')
  }

  const cargar = async () => {
    const amt = Number(amount)
    if (!amt || amt <= 0) { setError('Ingresá un monto.'); return }
    setSaving(true); setError('')
    const { error: insErr } = await supabase.from('cash_entries').insert({
      org_id: orgId,
      type: 'ingreso',
      amount: amt,
      payment_method: destino,
      area: area || null,
      concept: concept.trim() || null,
      notes: patientName || null,
      patient_id: patientId,
      source: 'agenda',
      created_by: userId,
    })
    setSaving(false)
    if (insErr) { setError(`No se pudo cargar: ${insErr.message}`); return }
    setSavedMsg(`✓ Ingreso de ${fmt(amt)} cargado a caja`)
    setAmount(''); setConcept(''); setSelectedPreset('')
    onSaved?.()
    setTimeout(() => setSavedMsg(''), 3000)
  }

  const inputCls = 'w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-accent'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[440px] shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b-[0.5px] border-border sticky top-0 bg-bg-secondary">
          <div>
            <h2 className="text-[16px] font-medium leading-tight">Cargar ingreso a caja</h2>
            <p className="text-[12px] text-text-secondary">{patientName || 'Sin paciente'}{area ? ` · ${area}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-[20px] leading-none px-1">×</button>
        </div>

        <div className="p-5 space-y-4">
          {activePresets.length > 0 && (
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Cobro / obra social</label>
              <select value={selectedPreset} onChange={e => applyPreset(e.target.value)} className={inputCls}>
                <option value="">— Elegí un cobro (o cargá manual) —</option>
                {activePresets.map(p => <option key={p.id} value={p.id}>{p.label} · {fmt(Number(p.amount))}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Monto</label>
              <input type="number" inputMode="numeric" min="0" value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') cargar() }}
                placeholder="0" className={inputCls + ' tabular-nums'} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Destino</label>
              <select value={destino} onChange={e => setDestino(e.target.value)} className={inputCls}>
                {!methodNames.includes(destino) && destino && <option value={destino}>{destino}</option>}
                {methodNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Concepto (opcional)</label>
            <input type="text" value={concept}
              onChange={e => setConcept(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') cargar() }}
              placeholder="Ej: OSDE, sesión…" className={inputCls} />
          </div>

          {error && <p className="text-[13px] text-red-400">{error}</p>}
          {savedMsg && <p className="text-[13px] text-[#6FAE7E]">{savedMsg}</p>}

          <button onClick={cargar} disabled={saving}
            className="w-full bg-accent text-bg-primary py-3 rounded-lg text-[14px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
            {saving ? 'Cargando…' : 'Cargar ingreso'}
          </button>
        </div>
      </div>
    </div>
  )
}
