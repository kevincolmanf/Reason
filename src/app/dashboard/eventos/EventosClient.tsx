'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface EventRow {
  id: string
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string | null
  cover_emoji: string
  capacity: number | null
  public_token: string
  price: number
  payment_instructions: string | null
  published: boolean
  created_at: string
  cert_entity: string | null
  cert_signer: string | null
  cert_signer_role: string | null
}
interface Reg { id: string; name: string; email: string; created_at: string; checked_in: boolean }

interface Props {
  userId: string
  orgId: string | null
  initialEvents: EventRow[]
  initialCounts: Record<string, number>
}

const EMOJIS = ['🎟️', '🎓', '🏋️', '🧠', '🦴', '💪', '🩺', '📣']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function toLocalDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function toLocalTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const EMPTY = (date: string) => ({ title: '', description: '', location: '', cover_emoji: '🎟️', date, startTime: '19:00', endTime: '', capacity: '', price: '', payment_instructions: '' })

export default function EventosClient({ userId, orgId, initialEvents, initialCounts }: Props) {
  const supabase = createClient()
  const [events, setEvents] = useState<EventRow[]>(initialEvents)
  const [counts] = useState<Record<string, number>>(initialCounts)
  const today = new Date().toISOString().slice(0, 10)

  const [showForm, setShowForm] = useState(initialEvents.length === 0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY(today))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [openRegs, setOpenRegs] = useState<string | null>(null)
  const [regs, setRegs] = useState<Reg[]>([])
  const [loadingRegs, setLoadingRegs] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const publicUrl = (token: string) => `${origin}/evento/${token}`

  const openCreate = () => { setEditingId(null); setForm(EMPTY(today)); setError(''); setShowForm(true) }
  const openEdit = (e: EventRow) => {
    setEditingId(e.id)
    setForm({
      title: e.title, description: e.description ?? '', location: e.location ?? '', cover_emoji: e.cover_emoji,
      date: toLocalDate(e.starts_at), startTime: toLocalTime(e.starts_at), endTime: toLocalTime(e.ends_at),
      capacity: e.capacity != null ? String(e.capacity) : '',
      price: e.price ? String(e.price) : '', payment_instructions: e.payment_instructions ?? '',
    })
    setError(''); setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }
  const closeForm = () => { setShowForm(false); setEditingId(null); setError('') }

  const saveEvent = async () => {
    if (!form.title.trim()) { setError('Ponele un nombre al evento.'); return }
    if (!form.date || !form.startTime) { setError('Elegí fecha y hora de inicio.'); return }
    setSaving(true); setError('')
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      cover_emoji: form.cover_emoji,
      starts_at: new Date(`${form.date}T${form.startTime}`).toISOString(),
      ends_at: form.endTime ? new Date(`${form.date}T${form.endTime}`).toISOString() : null,
      capacity: form.capacity ? parseInt(form.capacity, 10) : null,
      price: form.price ? Number(form.price) : 0,
      payment_instructions: form.payment_instructions.trim() || null,
    }
    if (editingId) {
      const { error: updErr } = await supabase.from('events').update(payload).eq('id', editingId)
      setSaving(false)
      if (updErr) { setError(`No se pudo guardar: ${updErr.message}`); return }
      setEvents(prev => prev.map(e => e.id === editingId ? { ...e, ...payload } as EventRow : e))
    } else {
      const { data, error: insErr } = await supabase.from('events').insert({
        creator_id: userId, org_id: orgId, ...payload,
      }).select('id, title, description, location, starts_at, ends_at, cover_emoji, capacity, public_token, price, payment_instructions, published, created_at, cert_entity, cert_signer, cert_signer_role').single()
      setSaving(false)
      if (insErr || !data) { setError(`No se pudo crear: ${insErr?.message ?? 'error'}`); return }
      setEvents(prev => [data as EventRow, ...prev])
    }
    closeForm()
  }

  const removeEvent = async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    await supabase.from('events').delete().eq('id', id)
  }

  const copyLink = (token: string) => {
    navigator.clipboard?.writeText(publicUrl(token))
    setCopied(token); setTimeout(() => setCopied(null), 1800)
  }

  const toggleRegs = async (id: string) => {
    if (openRegs === id) { setOpenRegs(null); return }
    setOpenRegs(id); setLoadingRegs(true); setRegs([])
    const { data } = await supabase.from('event_registrations').select('id, name, email, created_at, checked_in').eq('event_id', id).order('created_at', { ascending: false })
    setRegs((data ?? []) as Reg[]); setLoadingRegs(false)
  }

  const toggleCheckIn = async (regId: string, next: boolean) => {
    setRegs(prev => prev.map(r => r.id === regId ? { ...r, checked_in: next } : r))
    await supabase.from('event_registrations').update({ checked_in: next }).eq('id', regId)
  }

  // Envío de certificados (solo a los presentes) con datos del template.
  const [certEventId, setCertEventId] = useState<string | null>(null)
  const [cert, setCert] = useState({ entity: '', signer: '', role: '' })
  const [certSending, setCertSending] = useState(false)
  const [certMsg, setCertMsg] = useState('')
  const openCert = (e: EventRow) => {
    setCertEventId(certEventId === e.id ? null : e.id)
    setCert({ entity: e.cert_entity ?? '', signer: e.cert_signer ?? '', role: e.cert_signer_role ?? '' })
    setCertMsg('')
  }
  const sendCerts = async () => {
    if (!certEventId) return
    setCertSending(true); setCertMsg('')
    const res = await fetch('/api/eventos/certificados', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: certEventId, entity: cert.entity, signer: cert.signer, signerRole: cert.role }),
    })
    const data = await res.json()
    setCertSending(false)
    if (!res.ok) { setCertMsg(data.error ?? 'No se pudo enviar.'); return }
    if (data.sent > 0) {
      setCertMsg(`✓ Enviados: ${data.sent}${data.failed ? ` · fallaron ${data.failed}` : ''}${data.error ? ` — ${data.error}` : ''}.`)
    } else {
      setCertMsg(`No se pudo enviar ningún certificado. Motivo: ${data.error || 'desconocido'}`)
    }
    setEvents(prev => prev.map(e => e.id === certEventId ? { ...e, cert_entity: cert.entity || null, cert_signer: cert.signer || null, cert_signer_role: cert.role || null } : e))
  }

  // Exporta los inscriptos a CSV (abre en Excel). BOM para acentos correctos.
  const exportCsv = async (e: EventRow) => {
    setExporting(e.id)
    const { data } = await supabase.from('event_registrations').select('name, email, created_at').eq('event_id', e.id).order('created_at', { ascending: true })
    setExporting(null)
    const rows = (data ?? []) as { name: string; email: string; created_at: string }[]
    if (rows.length === 0) { setError('Ese evento todavía no tiene inscriptos.'); return }
    const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`
    const csv = ['Nombre,Email,Fecha de inscripción',
      ...rows.map(r => [esc(r.name), esc(r.email), esc(new Date(r.created_at).toLocaleString('es-AR'))].join(','))
    ].join('\r\n')
    const slug = e.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'evento'
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `inscriptos-${slug}.csv`
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  const inputCls = 'w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-accent'
  const label = 'block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1'
  const chip = 'text-[12px] bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-1.5 hover:border-accent transition-colors'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-medium tracking-[-0.02em]">Eventos</h1>
          <p className="text-[14px] text-text-secondary mt-1">Creá una jornada o curso; cada inscripción entra a Reason.</p>
        </div>
        {!showForm && (
          <button onClick={openCreate} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">+ Nuevo evento</button>
        )}
      </div>

      {showForm && (
        <div ref={formRef} className="bg-bg-secondary rounded-xl border-[0.5px] border-border p-5 mb-6">
          <div className="text-[13px] font-medium mb-4">{editingId ? 'Editar evento' : 'Nuevo evento'}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={label}>Nombre</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Jornada de Kinesiología Build 2026" className={inputCls} />
            </div>
            <div>
              <label className={label}>Fecha</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Inicio</label><input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className={inputCls} /></div>
              <div><label className={label}>Fin (opc.)</label><input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className={inputCls} /></div>
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Lugar</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Dirección física o enlace virtual" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Descripción</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="De qué se trata, para quién, qué van a ver…" className={inputCls + ' resize-y'} />
            </div>
            <div>
              <label className={label}>Cupo (opc.)</label>
              <input type="number" min="1" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="Ilimitado" className={inputCls} />
            </div>
            <div>
              <label className={label}>Precio (opc.)</label>
              <input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="Gratis" className={inputCls + ' tabular-nums'} />
            </div>
            {Number(form.price) > 0 && (
              <div className="sm:col-span-2">
                <label className={label}>Cómo se paga</label>
                <textarea value={form.payment_instructions} onChange={e => setForm(f => ({ ...f, payment_instructions: e.target.value }))} rows={3} placeholder="Instrucciones claras para el inscripto: tu link de pago de Mercado Pago, CBU/alias, y si tiene que enviar el comprobante (a dónde) o no hace falta." className={inputCls + ' resize-y'} />
                <p className="text-[11px] text-text-tertiary mt-1">El pago es directo a vos. Reason solo muestra estas instrucciones; la plata no pasa por Reason.</p>
              </div>
            )}
            <div>
              <label className={label}>Portada</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map(em => (
                  <button key={em} onClick={() => setForm(f => ({ ...f, cover_emoji: em }))} className={`w-9 h-9 rounded-lg text-[18px] border-[0.5px] transition-colors ${form.cover_emoji === em ? 'border-accent bg-accent/10' : 'border-border hover:border-border-strong'}`}>{em}</button>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-[13px] text-red-400 mt-3">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={saveEvent} disabled={saving} className="bg-accent text-bg-primary px-5 py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40">{saving ? 'Guardando…' : (editingId ? 'Guardar cambios' : 'Crear evento')}</button>
            {(events.length > 0 || editingId) && <button onClick={closeForm} className="text-[13px] text-text-secondary hover:text-text-primary px-2">Cancelar</button>}
          </div>
        </div>
      )}

      {events.length === 0 && !showForm ? (
        <p className="text-[14px] text-text-secondary">Todavía no creaste eventos.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map(e => (
            <li key={e.id} className="bg-bg-secondary rounded-xl border-[0.5px] border-border overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                <span className="text-[26px] leading-none shrink-0">{e.cover_emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium text-text-primary">{e.title}</div>
                  <div className="text-[12px] text-text-secondary mt-0.5 capitalize">{fmtDate(e.starts_at)}{e.location ? ` · ${e.location}` : ''}</div>
                  <div className="text-[12px] text-text-tertiary mt-0.5">
                    {counts[e.id] ?? 0} inscripto{(counts[e.id] ?? 0) === 1 ? '' : 's'}{e.capacity ? ` / ${e.capacity}` : ''}
                  </div>
                </div>
                <button onClick={() => removeEvent(e.id)} className="text-text-tertiary hover:text-red-400 text-[16px] leading-none shrink-0" title="Eliminar evento">×</button>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
                <button onClick={() => copyLink(e.public_token)} className={chip}>{copied === e.public_token ? '¡Copiado!' : 'Copiar link de inscripción'}</button>
                <a href={publicUrl(e.public_token)} target="_blank" rel="noopener noreferrer" className="text-[12px] text-text-secondary hover:text-text-primary no-underline px-1">Ver página →</a>
                <button onClick={() => openEdit(e)} className="text-[12px] text-text-secondary hover:text-text-primary px-1">Editar</button>
                <button onClick={() => toggleRegs(e.id)} className="text-[12px] text-text-secondary hover:text-text-primary px-1">{openRegs === e.id ? 'Ocultar inscriptos' : 'Ver inscriptos'}</button>
                <button onClick={() => exportCsv(e)} disabled={exporting === e.id} className="text-[12px] text-text-secondary hover:text-text-primary px-1 disabled:opacity-40">{exporting === e.id ? 'Exportando…' : 'Exportar a Excel'}</button>
                <button onClick={() => openCert(e)} className="text-[12px] text-text-secondary hover:text-text-primary px-1">Certificados</button>
              </div>

              {certEventId === e.id && (
                <div className="border-t-[0.5px] border-border px-4 py-4 bg-bg-primary/30">
                  <div className="text-[13px] font-medium mb-1">Enviar certificados</div>
                  <p className="text-[12px] text-text-tertiary mb-3">Se mandan por mail <strong>solo a los inscriptos con check-in</strong> (marcá “presente” en la lista de inscriptos). Completá el template:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                    <input value={cert.entity} onChange={ev => setCert(c => ({ ...c, entity: ev.target.value }))} placeholder="Entidad / organizador" className={inputCls} />
                    <input value={cert.signer} onChange={ev => setCert(c => ({ ...c, signer: ev.target.value }))} placeholder="Firma (nombre)" className={inputCls} />
                    <input value={cert.role} onChange={ev => setCert(c => ({ ...c, role: ev.target.value }))} placeholder="Cargo (ej. Director)" className={inputCls} />
                  </div>
                  {certMsg && <p className={`text-[13px] mb-2 ${certMsg.startsWith('✓') ? 'text-[#6FAE7E]' : 'text-red-400'}`}>{certMsg}</p>}
                  <button onClick={sendCerts} disabled={certSending} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40">{certSending ? 'Enviando…' : 'Enviar a los presentes'}</button>
                </div>
              )}
              {openRegs === e.id && (
                <div className="border-t-[0.5px] border-border px-4 py-3">
                  {loadingRegs ? (
                    <p className="text-[13px] text-text-secondary">Cargando…</p>
                  ) : regs.length === 0 ? (
                    <p className="text-[13px] text-text-secondary">Todavía no hay inscriptos.</p>
                  ) : (
                    <>
                      <div className="text-[11px] text-text-tertiary mb-2">{regs.filter(r => r.checked_in).length} presente{regs.filter(r => r.checked_in).length === 1 ? '' : 's'} de {regs.length}</div>
                      <ul className="flex flex-col gap-1.5">
                        {regs.map(r => (
                          <li key={r.id} className="flex items-center gap-2.5 text-[13px]">
                            <button
                              onClick={() => toggleCheckIn(r.id, !r.checked_in)}
                              title={r.checked_in ? 'Marcado como presente' : 'Marcar presente'}
                              className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border-[0.5px] transition-colors ${r.checked_in ? 'text-[#6FAE7E] border-[#6FAE7E]/30 bg-[#6FAE7E]/10' : 'text-text-tertiary border-border hover:text-text-primary'}`}
                            >
                              {r.checked_in ? '✓ Presente' : 'Marcar presente'}
                            </button>
                            <span className="text-text-primary truncate flex-1">{r.name} <span className="text-text-tertiary">· {r.email}</span></span>
                            <span className="text-[11px] text-text-tertiary shrink-0">{new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
