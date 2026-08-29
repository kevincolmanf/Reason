'use client'

import { useMemo, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import CajaConfig, { type Method, type Preset } from './CajaConfig'

interface Entry {
  id: string
  type: 'ingreso' | 'egreso'
  amount: number
  payment_method: string
  area: string | null
  concept: string | null
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
  initialMethods: Method[]
  initialPresets: Preset[]
}

// Destinos por defecto para un centro que todavía no configuró ninguno (dónde
// entra la plata; es texto libre, así que sirve aunque no haya filas en la base).
const DEFAULT_METHOD_NAMES = ['Efectivo', 'Cuenta bancaria', 'Mercado Pago']

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

function Select({ value, onChange, children, className = '' }: { value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`appearance-none w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg pl-3 pr-9 py-2.5 text-[14px] text-text-primary focus:outline-none focus:border-accent ${className}`}
      >
        {children}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
    </div>
  )
}

type FormState = { type: 'ingreso' | 'egreso'; amount: string; payment_method: string; area: string; concept: string; notes: string }

export default function CajaClient({ userId, orgId, orgName, isOwner, areas, today, initialEntries, initialMethods, initialPresets }: Props) {
  const supabase = createClient()
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [methods, setMethods] = useState<Method[]>(initialMethods)
  const [presets, setPresets] = useState<Preset[]>(initialPresets)

  const methodNames = useMemo(() => {
    const configured = methods.filter(m => m.active).map(m => m.name)
    return configured.length ? configured : DEFAULT_METHOD_NAMES
  }, [methods])

  const [form, setForm] = useState<FormState>({ type: 'ingreso', amount: '', payment_method: methodNames[0] ?? '', area: areas[0] ?? '', concept: '', notes: '' })
  const [selectedPreset, setSelectedPreset] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  // Edición de un movimiento
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>({ type: 'ingreso', amount: '', payment_method: '', area: '', concept: '', notes: '' })

  const formRef = useRef<HTMLDivElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  const ingresos = entries.filter(e => e.type === 'ingreso').reduce((s, e) => s + Number(e.amount), 0)
  const egresos = entries.filter(e => e.type === 'egreso').reduce((s, e) => s + Number(e.amount), 0)
  const neto = ingresos - egresos

  // Desglose por medio de pago: los medios configurados + cualquier otro que
  // aparezca en los movimientos del día (para que los totales siempre cierren).
  const netByMethod = useMemo(() => {
    const names = [...methodNames]
    for (const e of entries) if (e.payment_method && !names.includes(e.payment_method)) names.push(e.payment_method)
    return names.map(name => {
      const inn = entries.filter(e => e.payment_method === name && e.type === 'ingreso').reduce((s, e) => s + Number(e.amount), 0)
      const out = entries.filter(e => e.payment_method === name && e.type === 'egreso').reduce((s, e) => s + Number(e.amount), 0)
      return { name, net: inn - out }
    }).filter(m => m.net !== 0 || methodNames.includes(m.name))
  }, [entries, methodNames])

  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  const applyPreset = (id: string) => {
    setSelectedPreset(id)
    const p = presets.find(x => x.id === id)
    if (!p) return
    setForm(f => ({
      ...f,
      type: p.type,
      amount: p.amount ? String(p.amount) : '',
      payment_method: p.payment_method || f.payment_method || methodNames[0] || '',
      area: p.area || f.area,
      concept: p.label,
    }))
    setError('')
  }

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
      concept: form.concept.trim() || null,
      notes: form.notes.trim() || null,
      created_by: userId,
    }).select('id, type, amount, payment_method, area, concept, notes, created_by, created_at').single()
    if (insErr || !data) { setError(`No se pudo guardar: ${insErr?.message ?? 'error'}`); setSaving(false); return }
    setEntries(prev => [data as Entry, ...prev])
    // Mantenemos tipo/medio/área para cargar rápido varios seguidos; limpiamos el resto.
    setForm(f => ({ ...f, amount: '', concept: '', notes: '' }))
    setSelectedPreset('')
    setSaving(false)
  }

  const startEdit = (e: Entry) => {
    setEditingId(e.id)
    setEditForm({
      type: e.type, amount: String(e.amount), payment_method: e.payment_method,
      area: e.area ?? '', concept: e.concept ?? '', notes: e.notes ?? '',
    })
  }
  const saveEdit = async () => {
    if (!editingId) return
    const amt = Number(editForm.amount)
    if (!amt || amt <= 0) { setError('Ingresá un monto válido.'); return }
    const patch = {
      type: editForm.type, amount: amt, payment_method: editForm.payment_method,
      area: editForm.area || null, concept: editForm.concept.trim() || null, notes: editForm.notes.trim() || null,
    }
    const { error: updErr } = await supabase.from('cash_entries').update(patch).eq('id', editingId)
    if (updErr) { setError('No se pudo guardar el cambio.'); return }
    setEntries(prev => prev.map(e => e.id === editingId ? { ...e, ...patch } as Entry : e))
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    const { error: delErr } = await supabase.from('cash_entries').delete().eq('id', id)
    if (!delErr) setEntries(prev => prev.filter(e => e.id !== id))
    setConfirmingDelete(null)
  }

  const activePresets = presets.filter(p => p.active)

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
        <div className="text-[11px] uppercase tracking-[0.05em] text-text-tertiary mb-3">Neto por destino (dónde entró la plata)</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {netByMethod.map(m => (
            <div key={m.name}>
              <div className="text-[12px] text-text-secondary">{m.name}</div>
              <div className="text-[15px] font-medium tabular-nums">{fmt(m.net)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Nuevo movimiento */}
      <div ref={formRef} className="bg-bg-secondary rounded-xl border-[0.5px] border-border p-5 mb-6">
        <div className="text-[13px] font-medium mb-4">Cargar movimiento</div>

        {/* Selector de cobro / obra social: al elegir uno se completa el monto solo */}
        {activePresets.length > 0 && (
          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Cobro / obra social</label>
            <Select value={selectedPreset} onChange={applyPreset}>
              <option value="">— Elegí un cobro (o cargá manual) —</option>
              {activePresets.map(p => (
                <option key={p.id} value={p.id}>{p.label} · {fmt(Number(p.amount))}</option>
              ))}
            </Select>
          </div>
        )}

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
              ref={amountRef}
              type="number" inputMode="numeric" min="0" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              placeholder="0"
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2.5 text-[14px] tabular-nums focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Destino</label>
            <Select value={form.payment_method} onChange={v => setForm(f => ({ ...f, payment_method: v }))}>
              {methodNames.map(n => <option key={n} value={n}>{n}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Concepto (opcional)</label>
            <input
              type="text" value={form.concept}
              onChange={e => setForm(f => ({ ...f, concept: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              placeholder="Ej: OSDE, Particular, sesión…"
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-accent"
            />
          </div>
          {areas.length > 0 && (
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Área</label>
              <Select value={form.area} onChange={v => setForm(f => ({ ...f, area: v }))}>
                <option value="">—</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </Select>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nota (opcional)</label>
            <input
              type="text" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              placeholder="Ej: nombre del paciente, detalle…"
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

      {/* Configuración (cobros rápidos + medios) */}
      <CajaConfig
        orgId={orgId}
        methods={methods}
        presets={presets}
        areas={areas}
        methodNames={methodNames}
        onMethods={setMethods}
        onPresets={setPresets}
      />

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
              <li key={e.id} className="px-5 py-3 border-b-[0.5px] border-border last:border-0">
                {editingId === e.id ? (
                  <EditRow
                    editForm={editForm} setEditForm={setEditForm} methodNames={methodNames} areas={areas}
                    onSave={saveEdit} onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${e.type === 'ingreso' ? 'bg-[#6FAE7E]' : 'bg-[#c47c5a]'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] tabular-nums">
                        <span className={e.type === 'ingreso' ? 'text-text-primary' : 'text-[#c47c5a]'}>
                          {e.type === 'egreso' ? '-' : ''}{fmt(Number(e.amount))}
                        </span>
                        <span className="text-text-tertiary text-[12px] ml-2">{e.payment_method}</span>
                        {e.area && <span className="text-text-tertiary text-[12px] ml-2">· {e.area}</span>}
                      </div>
                      {(e.concept || e.notes) && (
                        <div className="text-[12px] text-text-secondary truncate">
                          {[e.concept, e.notes].filter(Boolean).join(' — ')}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-text-tertiary shrink-0">
                      {new Date(e.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {confirmingDelete === e.id ? (
                      <span className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleDelete(e.id)} className="text-[12px] text-red-400 hover:opacity-80">Borrar</button>
                        <button onClick={() => setConfirmingDelete(null)} className="text-[12px] text-text-tertiary hover:text-text-primary">No</button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 shrink-0">
                        <button onClick={() => startEdit(e)} className="text-[12px] text-text-tertiary hover:text-text-primary" title="Editar">Editar</button>
                        <button onClick={() => setConfirmingDelete(e.id)} className="text-text-tertiary hover:text-red-400 text-[16px] leading-none" title="Eliminar">×</button>
                      </span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function EditRow({ editForm, setEditForm, methodNames, areas, onSave, onCancel }: {
  editForm: FormState; setEditForm: (f: FormState) => void; methodNames: string[]; areas: string[]
  onSave: () => void; onCancel: () => void
}) {
  const cls = 'w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent'
  return (
    <div className="bg-bg-primary/40 rounded-lg">
      <div className="flex gap-2 mb-2">
        {(['ingreso', 'egreso'] as const).map(t => (
          <button key={t} onClick={() => setEditForm({ ...editForm, type: t })}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border-[0.5px] capitalize ${editForm.type === t ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border text-text-secondary'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <input type="number" inputMode="numeric" min="0" value={editForm.amount}
          onChange={e => setEditForm({ ...editForm, amount: e.target.value })} placeholder="Monto" className={cls + ' tabular-nums'} />
        <select value={editForm.payment_method} onChange={e => setEditForm({ ...editForm, payment_method: e.target.value })} className={cls}>
          {!methodNames.includes(editForm.payment_method) && editForm.payment_method && <option value={editForm.payment_method}>{editForm.payment_method}</option>}
          {methodNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input type="text" value={editForm.concept} onChange={e => setEditForm({ ...editForm, concept: e.target.value })} placeholder="Concepto" className={cls} />
        {areas.length > 0 ? (
          <select value={editForm.area} onChange={e => setEditForm({ ...editForm, area: e.target.value })} className={cls}>
            <option value="">— Área —</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        ) : (
          <input type="text" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Nota" className={cls} />
        )}
        {areas.length > 0 && (
          <input type="text" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Nota" className={cls + ' sm:col-span-2'} />
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="bg-accent text-bg-primary px-4 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-90">Guardar</button>
        <button onClick={onCancel} className="px-4 py-1.5 rounded-lg text-[12px] text-text-secondary hover:text-text-primary">Cancelar</button>
      </div>
    </div>
  )
}
