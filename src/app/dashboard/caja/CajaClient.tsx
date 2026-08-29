'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Entry {
  id: string
  type: 'ingreso' | 'egreso'
  amount: number
  payment_method: string
  area: string | null
  notes: string | null
  created_by: string
  created_at: string
}

interface Props {
  userId: string
  orgId: string
  orgName: string
  isOwner: boolean
  areas: string[]
  today: string
  initialEntries: Entry[]
}

const METHODS: { value: string; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'mp', label: 'Mercado Pago' },
  { value: 'obra_social', label: 'Obra social' },
  { value: 'transferencia', label: 'Transferencia' },
]
const METHOD_LABEL: Record<string, string> = Object.fromEntries(METHODS.map(m => [m.value, m.label]))

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg pl-3 pr-9 py-2.5 text-[14px] text-text-primary focus:outline-none focus:border-accent"
      >
        {children}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
    </div>
  )
}

export default function CajaClient({ userId, orgId, orgName, isOwner, areas, today, initialEntries }: Props) {
  const supabase = createClient()
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [form, setForm] = useState({ type: 'ingreso' as 'ingreso' | 'egreso', amount: '', payment_method: 'efectivo', area: areas[0] ?? '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const ingresos = entries.filter(e => e.type === 'ingreso').reduce((s, e) => s + Number(e.amount), 0)
  const egresos = entries.filter(e => e.type === 'egreso').reduce((s, e) => s + Number(e.amount), 0)
  const neto = ingresos - egresos
  const netByMethod = METHODS.map(m => {
    const inn = entries.filter(e => e.payment_method === m.value && e.type === 'ingreso').reduce((s, e) => s + Number(e.amount), 0)
    const out = entries.filter(e => e.payment_method === m.value && e.type === 'egreso').reduce((s, e) => s + Number(e.amount), 0)
    return { ...m, net: inn - out }
  })

  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  const handleAdd = async () => {
    const amt = Number(form.amount)
    if (!amt || amt <= 0) { setError('Ingresá un monto válido.'); return }
    setSaving(true); setError('')
    const { data, error: insErr } = await supabase.from('cash_entries').insert({
      org_id: orgId,
      type: form.type,
      amount: amt,
      payment_method: form.payment_method,
      area: form.area || null,
      notes: form.notes.trim() || null,
      created_by: userId,
    }).select('id, type, amount, payment_method, area, notes, created_by, created_at').single()
    if (insErr || !data) { setError(`No se pudo guardar: ${insErr?.message ?? 'error'}`); setSaving(false); return }
    setEntries(prev => [data as Entry, ...prev])
    // Mantenemos tipo/medio/área para cargar rápido varios seguidos; limpiamos monto y nota.
    setForm(f => ({ ...f, amount: '', notes: '' }))
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const { error: delErr } = await supabase.from('cash_entries').delete().eq('id', id)
    if (!delErr) setEntries(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-[28px] font-medium tracking-[-0.02em]">Caja diaria</h1>
        <p className="text-[14px] text-text-secondary mt-1 capitalize">{orgName} · {dateLabel}</p>
        <p className="text-[12px] text-text-tertiary mt-1">
          {isOwner ? 'Ves la caja completa del centro.' : 'Ves solo la caja de hoy (para el arqueo).'}
        </p>
      </div>

      {/* Totales del día */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-bg-secondary rounded-xl p-4">
          <div className="text-[12px] text-text-secondary">Ingresos</div>
          <div className="text-[22px] font-medium text-[#6FAE7E] tabular-nums">{fmt(ingresos)}</div>
        </div>
        <div className="bg-bg-secondary rounded-xl p-4">
          <div className="text-[12px] text-text-secondary">Egresos</div>
          <div className="text-[22px] font-medium text-[#c47c5a] tabular-nums">{fmt(egresos)}</div>
        </div>
        <div className="bg-bg-secondary rounded-xl p-4">
          <div className="text-[12px] text-text-secondary">Neto del día</div>
          <div className="text-[22px] font-medium tabular-nums">{fmt(neto)}</div>
        </div>
      </div>

      {/* Desglose por medio de pago (para el arqueo) */}
      <div className="bg-bg-secondary rounded-xl border-[0.5px] border-border p-4 mb-6">
        <div className="text-[11px] uppercase tracking-[0.05em] text-text-tertiary mb-3">Neto por medio de pago</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {netByMethod.map(m => (
            <div key={m.value}>
              <div className="text-[12px] text-text-secondary">{m.label}</div>
              <div className="text-[15px] font-medium tabular-nums">{fmt(m.net)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Nuevo movimiento */}
      <div className="bg-bg-secondary rounded-xl border-[0.5px] border-border p-5 mb-6">
        <div className="text-[13px] font-medium mb-4">Cargar movimiento</div>
        <div className="flex gap-2 mb-4">
          {(['ingreso', 'egreso'] as const).map(t => (
            <button
              key={t}
              onClick={() => setForm(f => ({ ...f, type: t }))}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors capitalize ${
                form.type === t ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Monto</label>
            <input
              type="number" inputMode="numeric" min="0" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              placeholder="0"
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Medio de pago</label>
            <Select value={form.payment_method} onChange={v => setForm(f => ({ ...f, payment_method: v }))}>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          </div>
          {areas.length > 0 && (
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Área</label>
              <Select value={form.area} onChange={v => setForm(f => ({ ...f, area: v }))}>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </Select>
            </div>
          )}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nota (opcional)</label>
            <input
              type="text" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              placeholder="Ej: producto, paciente…"
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-accent"
            />
          </div>
        </div>
        {error && <p className="text-[13px] text-red-400 mb-3">{error}</p>}
        <button
          onClick={handleAdd}
          disabled={saving}
          className="bg-accent text-bg-primary px-5 py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {saving ? 'Guardando…' : 'Agregar movimiento'}
        </button>
      </div>

      {/* Lista del día */}
      <div className="bg-bg-secondary rounded-xl border-[0.5px] border-border overflow-hidden">
        <div className="px-5 py-3 border-b-[0.5px] border-border text-[13px] font-medium">
          Movimientos de hoy <span className="text-text-tertiary font-normal">· {entries.length}</span>
        </div>
        {entries.length === 0 ? (
          <p className="px-5 py-8 text-center text-[14px] text-text-secondary">Todavía no cargaste movimientos hoy.</p>
        ) : (
          <ul>
            {entries.map(e => (
              <li key={e.id} className="px-5 py-3 border-b-[0.5px] border-border last:border-0 flex items-center gap-3">
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${e.type === 'ingreso' ? 'bg-[#6FAE7E]' : 'bg-[#c47c5a]'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] tabular-nums">
                    <span className={e.type === 'ingreso' ? 'text-text-primary' : 'text-[#c47c5a]'}>
                      {e.type === 'egreso' ? '-' : ''}{fmt(Number(e.amount))}
                    </span>
                    <span className="text-text-tertiary text-[12px] ml-2">{METHOD_LABEL[e.payment_method] ?? e.payment_method}</span>
                    {e.area && <span className="text-text-tertiary text-[12px] ml-2">· {e.area}</span>}
                  </div>
                  {e.notes && <div className="text-[12px] text-text-secondary truncate">{e.notes}</div>}
                </div>
                <span className="text-[11px] text-text-tertiary shrink-0">
                  {new Date(e.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-text-tertiary hover:text-red-400 text-[16px] leading-none shrink-0"
                  title="Eliminar movimiento"
                >×</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
