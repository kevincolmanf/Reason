'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { Method, Preset } from '../caja/CajaConfig'

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
}

// Carga rápida de un ingreso a la caja desde el modal del turno ("dar presente y
// cobrar en el momento"). Queda enlazado al paciente del turno. Solo se muestra a
// quien puede registrar caja (dueño o secretaria con permiso), gate en el server.
export default function CargarIngresoAgenda({ orgId, userId, patientId, patientName, area, presets, methods }: Props) {
  const supabase = createClient()
  const methodNames = useMemo(() => {
    const configured = methods.filter(m => m.active).map(m => m.name)
    return configured.length ? configured : DEFAULT_METHOD_NAMES
  }, [methods])

  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [destino, setDestino] = useState(methodNames[0] ?? '')
  const [concept, setConcept] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  const activePresets = presets.filter(p => p.active && p.type === 'ingreso')

  const applyPreset = (p: Preset) => {
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
      notes: patientName ? patientName : null,
      patient_id: patientId,
      source: 'agenda',
      created_by: userId,
    })
    setSaving(false)
    if (insErr) { setError(`No se pudo cargar: ${insErr.message}`); return }
    setSavedMsg(`✓ Ingreso de ${fmt(amt)} cargado a caja`)
    setAmount(''); setConcept('')
    setTimeout(() => setSavedMsg(''), 4000)
  }

  const inputCls = 'w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent'

  if (!open) {
    return (
      <div className="mt-4">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-[0.5px] border-dashed border-border-strong text-[13px] text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
        >
          <span className="text-[15px] leading-none">＋</span> Cargar ingreso a caja
        </button>
        {savedMsg && <p className="text-[12px] text-[#6FAE7E] mt-2 text-center">{savedMsg}</p>}
      </div>
    )
  }

  return (
    <div className="mt-4 bg-bg-secondary rounded-xl border-[0.5px] border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-medium">Cargar ingreso a caja</div>
        <button onClick={() => setOpen(false)} className="text-text-tertiary hover:text-text-primary text-[16px] leading-none">×</button>
      </div>

      {patientName && (
        <p className="text-[12px] text-text-tertiary mb-3">Se enlaza a <span className="text-text-secondary">{patientName}</span>{area ? ` · ${area}` : ''}.</p>
      )}

      {activePresets.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {activePresets.map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className="flex items-center gap-2 bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-1.5 text-[13px] hover:border-accent transition-colors"
            >
              <span className="font-medium">{p.label}</span>
              <span className="tabular-nums text-text-secondary">{fmt(Number(p.amount))}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <input
          type="number" inputMode="numeric" min="0" value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') cargar() }}
          placeholder="Monto" className={inputCls + ' tabular-nums'}
        />
        <select value={destino} onChange={e => setDestino(e.target.value)} className={inputCls}>
          {!methodNames.includes(destino) && destino && <option value={destino}>{destino}</option>}
          {methodNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input
          type="text" value={concept}
          onChange={e => setConcept(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') cargar() }}
          placeholder="Concepto (ej. OSDE, sesión)" className={inputCls + ' sm:col-span-2'}
        />
      </div>

      {error && <p className="text-[12px] text-red-400 mb-2">{error}</p>}
      {savedMsg && <p className="text-[12px] text-[#6FAE7E] mb-2">{savedMsg}</p>}

      <button
        onClick={cargar}
        disabled={saving}
        className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {saving ? 'Cargando…' : 'Cargar ingreso'}
      </button>
    </div>
  )
}
