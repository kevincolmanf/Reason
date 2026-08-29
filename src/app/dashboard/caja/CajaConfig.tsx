'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export interface Method { id: string; name: string; sort_order: number; active: boolean }
export interface Preset {
  id: string; label: string; type: 'ingreso' | 'egreso'; amount: number
  payment_method: string | null; area: string | null; sort_order: number; active: boolean
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface Props {
  orgId: string
  methods: Method[]
  presets: Preset[]
  areas: string[]
  methodNames: string[]
  onMethods: (m: Method[]) => void
  onPresets: (p: Preset[]) => void
}

type PresetDraft = { label: string; type: 'ingreso' | 'egreso'; amount: string; payment_method: string; area: string }

export default function CajaConfig({ orgId, methods, presets, areas, methodNames, onMethods, onPresets }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [newMethod, setNewMethod] = useState('')
  const [editingPreset, setEditingPreset] = useState<string | null>(null) // id o 'new'
  const [draft, setDraft] = useState<PresetDraft>({ label: '', type: 'ingreso', amount: '', payment_method: '', area: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // ---- Medios de pago ----
  const addMethod = async () => {
    const name = newMethod.trim()
    if (!name) return
    if (methods.some(m => m.name.toLowerCase() === name.toLowerCase())) { setErr('Ese medio ya existe.'); return }
    setBusy(true); setErr('')
    const { data, error } = await supabase.from('cash_payment_methods')
      .insert({ org_id: orgId, name, sort_order: methods.length })
      .select('id, name, sort_order, active').single()
    setBusy(false)
    if (error || !data) { setErr('No se pudo agregar el medio.'); return }
    onMethods([...methods, data as Method])
    setNewMethod('')
  }
  const renameMethod = async (id: string, name: string) => {
    const clean = name.trim()
    if (!clean) return
    const prev = methods.find(m => m.id === id)
    if (!prev || prev.name === clean) return
    onMethods(methods.map(m => m.id === id ? { ...m, name: clean } : m))
    await supabase.from('cash_payment_methods').update({ name: clean }).eq('id', id)
  }
  const removeMethod = async (id: string) => {
    onMethods(methods.filter(m => m.id !== id))
    await supabase.from('cash_payment_methods').delete().eq('id', id)
  }

  // ---- Cobros rápidos (presets) ----
  const startNew = () => {
    setDraft({ label: '', type: 'ingreso', amount: '', payment_method: methodNames[0] ?? '', area: '' })
    setEditingPreset('new'); setErr('')
  }
  const startEdit = (p: Preset) => {
    setDraft({ label: p.label, type: p.type, amount: String(p.amount ?? ''), payment_method: p.payment_method ?? '', area: p.area ?? '' })
    setEditingPreset(p.id); setErr('')
  }
  const cancelEdit = () => { setEditingPreset(null); setErr('') }

  const saveDraft = async () => {
    const label = draft.label.trim()
    const amount = Number(draft.amount)
    if (!label) { setErr('Poné un nombre al cobro.'); return }
    if (!(amount >= 0)) { setErr('El monto no es válido.'); return }
    setBusy(true); setErr('')
    const payload = {
      label, type: draft.type, amount,
      payment_method: draft.payment_method || null,
      area: draft.area || null,
    }
    if (editingPreset === 'new') {
      const { data, error } = await supabase.from('cash_presets')
        .insert({ org_id: orgId, ...payload, sort_order: presets.length })
        .select('id, label, type, amount, payment_method, area, sort_order, active').single()
      setBusy(false)
      if (error || !data) { setErr('No se pudo guardar el cobro.'); return }
      onPresets([...presets, data as Preset])
    } else if (editingPreset) {
      const { error } = await supabase.from('cash_presets').update(payload).eq('id', editingPreset)
      setBusy(false)
      if (error) { setErr('No se pudo guardar el cobro.'); return }
      onPresets(presets.map(p => p.id === editingPreset ? { ...p, ...payload } as Preset : p))
    }
    setEditingPreset(null)
  }
  const removePreset = async (id: string) => {
    onPresets(presets.filter(p => p.id !== id))
    await supabase.from('cash_presets').delete().eq('id', id)
  }

  const inputCls = 'w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent'

  return (
    <div className="bg-bg-secondary rounded-xl border-[0.5px] border-border mb-6 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        <span>Configurar caja · cobros rápidos y medios de pago</span>
        <span className="text-[11px] opacity-50">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t-[0.5px] border-border">
          {err && <p className="text-[13px] text-red-400 mb-3">{err}</p>}

          {/* Cobros rápidos */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] uppercase tracking-[0.05em] text-text-tertiary">Cobros rápidos</div>
              {editingPreset !== 'new' && (
                <button onClick={startNew} className="text-[12px] text-accent hover:opacity-80">+ Nuevo cobro</button>
              )}
            </div>
            <p className="text-[12px] text-text-tertiary mb-3">
              Botones para cargar un monto exacto de un toque (ej. OSDE, Particular). Editá el monto cuando cambian los precios.
            </p>

            {editingPreset === 'new' && (
              <PresetForm draft={draft} setDraft={setDraft} methodNames={methodNames} areas={areas}
                onSave={saveDraft} onCancel={cancelEdit} busy={busy} inputCls={inputCls} />
            )}

            <ul className="flex flex-col gap-2">
              {presets.length === 0 && editingPreset !== 'new' && (
                <li className="text-[13px] text-text-secondary">Todavía no hay cobros rápidos.</li>
              )}
              {presets.map(p => (
                editingPreset === p.id ? (
                  <li key={p.id}>
                    <PresetForm draft={draft} setDraft={setDraft} methodNames={methodNames} areas={areas}
                      onSave={saveDraft} onCancel={cancelEdit} busy={busy} inputCls={inputCls} />
                  </li>
                ) : (
                  <li key={p.id} className="flex items-center gap-2 bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2">
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${p.type === 'ingreso' ? 'bg-[#6FAE7E]' : 'bg-[#c47c5a]'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] truncate">
                        <span className="font-medium">{p.label}</span>
                        <span className="tabular-nums text-text-secondary ml-2">{fmt(Number(p.amount))}</span>
                      </div>
                      {(p.payment_method || p.area) && (
                        <div className="text-[11px] text-text-tertiary truncate">
                          {[p.payment_method, p.area].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    <button onClick={() => startEdit(p)} className="text-[12px] text-text-tertiary hover:text-text-primary shrink-0">Editar</button>
                    <button onClick={() => removePreset(p.id)} className="text-text-tertiary hover:text-red-400 text-[16px] leading-none shrink-0" title="Eliminar">×</button>
                  </li>
                )
              ))}
            </ul>
          </div>

          {/* Medios de pago */}
          <div>
            <div className="text-[12px] uppercase tracking-[0.05em] text-text-tertiary mb-2">Medios de pago</div>
            <ul className="flex flex-col gap-2 mb-3">
              {methods.map(m => (
                <li key={m.id} className="flex items-center gap-2">
                  <input
                    defaultValue={m.name}
                    onBlur={e => renameMethod(m.id, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    className={inputCls + ' flex-1'}
                  />
                  <button onClick={() => removeMethod(m.id)} className="text-text-tertiary hover:text-red-400 text-[16px] leading-none shrink-0" title="Eliminar medio">×</button>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2">
              <input
                value={newMethod}
                onChange={e => setNewMethod(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addMethod() }}
                placeholder="Agregar medio (ej. Débito automático)"
                className={inputCls + ' flex-1'}
              />
              <button onClick={addMethod} disabled={busy} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 shrink-0">
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PresetForm({ draft, setDraft, methodNames, areas, onSave, onCancel, busy, inputCls }: {
  draft: PresetDraft; setDraft: (d: PresetDraft) => void; methodNames: string[]; areas: string[]
  onSave: () => void; onCancel: () => void; busy: boolean; inputCls: string
}) {
  return (
    <div className="bg-bg-primary border-[0.5px] border-accent/40 rounded-lg p-3 mb-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <input
          value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })}
          placeholder="Nombre (ej. OSDE, Particular)" className={inputCls}
        />
        <input
          type="number" inputMode="numeric" min="0" value={draft.amount}
          onChange={e => setDraft({ ...draft, amount: e.target.value })}
          placeholder="Monto" className={inputCls + ' tabular-nums'}
        />
        <select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value as 'ingreso' | 'egreso' })} className={inputCls}>
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </select>
        <select value={draft.payment_method} onChange={e => setDraft({ ...draft, payment_method: e.target.value })} className={inputCls}>
          <option value="">Medio (opcional)</option>
          {methodNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {areas.length > 0 && (
          <select value={draft.area} onChange={e => setDraft({ ...draft, area: e.target.value })} className={inputCls}>
            <option value="">Área (opcional)</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={busy} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40">
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[13px] text-text-secondary hover:text-text-primary">Cancelar</button>
      </div>
    </div>
  )
}
