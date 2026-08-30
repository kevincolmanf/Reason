'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// Set estándar de Argentina, usado como fallback si el contexto todavía no tiene
// lista cargada (centro/persona nuevos). Los contextos existentes ya vienen
// sembrados por la migración.
const AR_DEFAULT = ['OSDE', 'Swiss Medical', 'Galeno', 'OMINT', 'Medifé', 'Medicus', 'PAMI', 'IOMA', 'OSDEPYM', 'OSECAC', 'Sancor Salud', 'Particular']

interface Row { id: string; name: string; sort_order: number; active: boolean }

interface Props {
  value: string
  onChange: (v: string) => void
  orgId: string | null
  userId: string
  // Clases del <select>/<input> para que matchee el form donde se usa.
  inputClassName?: string
}

// Desplegable gestionable de obras sociales (reemplaza el texto libre). Lee la
// lista del contexto (centro por org_id, o personal por user_id), deja elegir de
// un toque, agregar al vuelo, y gestionar (renombrar/borrar). El paciente guarda
// el nombre elegido en su campo obra_social (texto), sin cambiar ese esquema.
export default function ObraSocialField({ value, onChange, orgId, userId, inputClassName = '' }: Props) {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [manage, setManage] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)
  const addRef = useRef<HTMLInputElement>(null)

  const fetchRows = async () => {
    const base = supabase.from('obras_sociales').select('id, name, sort_order, active').order('sort_order').order('name')
    const q = orgId ? base.eq('org_id', orgId) : base.eq('user_id', userId).is('org_id', null)
    const { data } = await q
    setRows((data ?? []) as Row[])
    setLoaded(true)
  }
  useEffect(() => { fetchRows() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId, userId])

  const names = useMemo(() => {
    const active = rows.filter(r => r.active).map(r => r.name)
    return active.length ? active : AR_DEFAULT
  }, [rows])
  const hasRows = rows.length > 0

  // El valor actual siempre debe poder elegirse aunque no esté en la lista
  // (paciente viejo con una obra social que ya no figura).
  const options = useMemo(() => {
    const set = [...names]
    if (value && !set.some(n => n.toLowerCase() === value.toLowerCase())) set.unshift(value)
    return set
  }, [names, value])

  const insertRow = async (name: string): Promise<Row | null> => {
    const clean = name.trim()
    if (!clean) return null
    if (rows.some(r => r.name.toLowerCase() === clean.toLowerCase())) {
      const existing = rows.find(r => r.name.toLowerCase() === clean.toLowerCase())!
      return existing
    }
    setBusy(true)
    const payload = orgId ? { org_id: orgId, name: clean, sort_order: rows.length } : { user_id: userId, name: clean, sort_order: rows.length }
    const { data, error } = await supabase.from('obras_sociales').insert(payload).select('id, name, sort_order, active').single()
    setBusy(false)
    if (error || !data) return null
    setRows(r => [...r, data as Row])
    return data as Row
  }

  const seedStandard = async () => {
    setBusy(true)
    const payload = AR_DEFAULT.map((name, i) => (orgId ? { org_id: orgId, name, sort_order: i } : { user_id: userId, name, sort_order: i }))
    await supabase.from('obras_sociales').insert(payload)
    await fetchRows()
    setBusy(false)
  }

  const rename = async (id: string, name: string) => {
    const clean = name.trim()
    if (!clean) return
    setRows(r => r.map(x => (x.id === id ? { ...x, name: clean } : x)))
    setEditingId(null)
    await supabase.from('obras_sociales').update({ name: clean }).eq('id', id)
  }
  const remove = async (id: string) => {
    setRows(r => r.filter(x => x.id !== id))
    await supabase.from('obras_sociales').delete().eq('id', id)
  }

  const handleSelect = (v: string) => {
    if (v === '__add__') { setAdding(true); setTimeout(() => addRef.current?.focus(), 30); return }
    onChange(v)
  }
  const handleAdd = async () => {
    const created = await insertRow(newName)
    if (created) { onChange(created.name); setNewName(''); setAdding(false) }
  }

  const chev = 'appearance-none pr-9'
  const manageBtn = 'text-[11px] text-text-tertiary hover:text-text-primary transition-colors'

  return (
    <div>
      {adding ? (
        <div className="flex gap-2">
          <input
            ref={addRef} type="text" value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } if (e.key === 'Escape') { setAdding(false); setNewName('') } }}
            placeholder="Nueva obra social" className={inputClassName + ' flex-1'}
          />
          <button type="button" onClick={handleAdd} disabled={busy || !newName.trim()} className="bg-accent text-bg-primary px-3 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 shrink-0">Agregar</button>
          <button type="button" onClick={() => { setAdding(false); setNewName('') }} className="text-[13px] text-text-secondary hover:text-text-primary px-1 shrink-0">Cancelar</button>
        </div>
      ) : (
        <div className="relative">
          <select value={options.some(o => o === value) ? value : ''} onChange={e => handleSelect(e.target.value)} className={inputClassName + ' ' + chev}>
            <option value="">Sin especificar</option>
            {options.map(n => <option key={n} value={n}>{n}</option>)}
            <option value="__add__">＋ Agregar otra…</option>
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      )}

      <div className="flex items-center gap-3 mt-1.5">
        <button type="button" onClick={() => setManage(m => !m)} className={manageBtn}>{manage ? 'Cerrar' : 'Gestionar lista'}</button>
        {loaded && !hasRows && <button type="button" onClick={seedStandard} disabled={busy} className={manageBtn}>Cargar set estándar</button>}
      </div>

      {manage && (
        <div className="mt-2 bg-bg-secondary border-[0.5px] border-border rounded-lg p-3">
          {!hasRows && <p className="text-[12px] text-text-tertiary mb-2">Todavía no cargaste tu lista. Tocá “Cargar set estándar” o agregá las tuyas.</p>}
          <ul className="flex flex-col gap-1.5">
            {rows.map(r => (
              <li key={r.id} className="flex items-center gap-2">
                {editingId === r.id ? (
                  <>
                    <input
                      type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') rename(r.id, editName); if (e.key === 'Escape') setEditingId(null) }}
                      className="flex-1 bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-accent"
                      autoFocus
                    />
                    <button type="button" onClick={() => rename(r.id, editName)} className="text-[12px] text-accent">Guardar</button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-[12px] text-text-tertiary">✕</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-[13px] text-text-primary truncate">{r.name}</span>
                    <button type="button" onClick={() => { setEditingId(r.id); setEditName(r.name) }} className="text-[12px] text-text-tertiary hover:text-text-primary">Editar</button>
                    <button type="button" onClick={() => remove(r.id)} className="text-text-tertiary hover:text-red-400 text-[15px] leading-none">×</button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => { setManage(false); setAdding(true); setTimeout(() => addRef.current?.focus(), 30) }}
            className="text-[12px] text-accent hover:opacity-80 mt-2"
          >
            ＋ Agregar obra social
          </button>
        </div>
      )}
    </div>
  )
}
