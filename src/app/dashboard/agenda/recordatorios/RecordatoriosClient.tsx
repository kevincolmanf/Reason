'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/components/Dialogs'
import { buildWhatsAppUrl, buildConfirmUrl } from '../whatsapp'

interface Turno {
  id: string
  patient_name: string
  patient_id: string | null
  patient_phone: string | null
  professional_id: string | null
  professional_name: string | null
  start_time: string
  area: string
  status: string
  is_blocked: boolean | null
  confirm_token: string | null
  reminder_sent_at: string | null
}

interface Props {
  userId: string
  orgId: string | null
  orgName: string | null
  areas: string[]
  professionals: { id: string; full_name: string | null }[]
  initialDay: string | null
  initialArea: string | null
}

// YYYY-MM-DD (hora local) → Date local al inicio del día.
function parseDayParam(s: string | null): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function toInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function formatDayLong(date: Date): string {
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function RecordatoriosClient({ userId, orgId, orgName, areas, professionals, initialDay, initialArea }: Props) {
  const { notify, toast } = useToast()
  const supabaseRef = useRef(createClient())

  const [selectedDay, setSelectedDay] = useState<Date>(() => parseDayParam(initialDay))
  const [filterArea, setFilterArea] = useState<string>(() => initialArea ?? 'all')
  const [filterProf, setFilterProf] = useState<string>('all')
  const [showSent, setShowSent] = useState(false)

  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)
  // Respaldo local del marcador anterior (para navegadores que ya lo usaban).
  const [localReminded, setLocalReminded] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try { return new Set(JSON.parse(localStorage.getItem('wa_reminded') ?? '[]')) }
    catch { return new Set() }
  })

  const fetchTurnos = useCallback(async () => {
    setLoading(true)
    const from = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate()).toISOString()
    const toDate = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate() + 1).toISOString()

    let query = supabaseRef.current
      .from('turnos')
      .select('*')
      .gte('start_time', from)
      .lt('start_time', toDate)
      .order('start_time')

    if (orgId) query = query.eq('org_id', orgId)
    else       query = query.eq('created_by', userId)

    const { data, error } = await query
    if (error) { setLoading(false); return }
    const list: Turno[] = data ?? []

    // Respaldo de teléfono: para los turnos sin teléfono copiado, buscamos el de la
    // ficha del paciente (mismo patrón que la agenda). Aditivo y no bloqueante.
    const missingIds = Array.from(new Set(
      list.filter(t => t.patient_id && !t.patient_phone).map(t => t.patient_id as string),
    ))
    if (missingIds.length > 0) {
      const { data: pts } = await supabaseRef.current
        .from('patients')
        .select('id, phone')
        .in('id', missingIds)
      if (pts && pts.length > 0) {
        const phoneById = new Map(pts.map(p => [p.id as string, (p.phone as string | null) ?? null]))
        for (const t of list) {
          if (t.patient_id && !t.patient_phone) t.patient_phone = phoneById.get(t.patient_id) ?? null
        }
      }
    }

    setTurnos(list)
    setLoading(false)
  }, [selectedDay, orgId, userId])

  useEffect(() => { fetchTurnos() }, [fetchTurnos])

  const isSent = useCallback((t: Turno) => t.reminder_sent_at != null || localReminded.has(t.id), [localReminded])

  // Turnos elegibles para recordar: no bloqueados, no cancelados. Los que no tienen
  // teléfono se cuentan aparte (no se les puede mandar WhatsApp).
  const eligible = useMemo(() => turnos.filter(t =>
    !t.is_blocked &&
    t.status !== 'cancelado' &&
    (filterArea === 'all' || t.area === filterArea) &&
    (filterProf === 'all' || t.professional_id === filterProf),
  ), [turnos, filterArea, filterProf])

  const withPhone = useMemo(() => eligible.filter(t => t.patient_phone), [eligible])
  const noPhoneCount = eligible.length - withPhone.length

  const pending = useMemo(() => withPhone.filter(t => !isSent(t)), [withPhone, isSent])
  const sent    = useMemo(() => withPhone.filter(t =>  isSent(t)), [withPhone, isSent])

  const visible = showSent ? withPhone : pending

  const markReminded = useCallback((id: string) => {
    const now = new Date().toISOString()
    setTurnos(prev => prev.map(t => t.id === id ? { ...t, reminder_sent_at: now } : t))
    supabaseRef.current.from('turnos').update({ reminder_sent_at: now }).eq('id', id).then(({ error }) => {
      if (error) notify('No se pudo guardar el estado del recordatorio', 'error')
    })
    setLocalReminded(prev => {
      const next = new Set(prev)
      next.add(id)
      try { localStorage.setItem('wa_reminded', JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }, [notify])

  const unmarkReminded = useCallback((id: string) => {
    setTurnos(prev => prev.map(t => t.id === id ? { ...t, reminder_sent_at: null } : t))
    supabaseRef.current.from('turnos').update({ reminder_sent_at: null }).eq('id', id).then(() => {})
    setLocalReminded(prev => {
      const next = new Set(prev)
      next.delete(id)
      try { localStorage.setItem('wa_reminded', JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }, [])

  const isToday = toInputValue(selectedDay) === toInputValue(new Date())

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-[22px] font-semibold text-text-primary flex items-center gap-2">
          <span>🔔</span> Recordatorios
        </h1>
        <Link
          href="/dashboard/agenda"
          className="text-[13px] text-text-secondary hover:text-text-primary transition-colors"
        >
          ← Volver a la agenda
        </Link>
      </div>
      <p className="text-[13px] text-text-secondary mb-5 capitalize">{formatDayLong(selectedDay)}{isToday ? ' · hoy' : ''}</p>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <input
          type="date"
          value={toInputValue(selectedDay)}
          onChange={e => { const v = e.target.value; if (v) setSelectedDay(parseDayParam(v)) }}
          className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-primary"
        />
        <button
          onClick={() => setSelectedDay(parseDayParam(null))}
          className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors"
        >
          Hoy
        </button>

        <select
          value={filterArea}
          onChange={e => setFilterArea(e.target.value)}
          className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-primary"
        >
          <option value="all">Todas las áreas</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {orgId && professionals.length > 1 && (
          <select
            value={filterProf}
            onChange={e => setFilterProf(e.target.value)}
            className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-primary"
          >
            <option value="all">Todos los profesionales</option>
            {professionals.map(p => <option key={p.id} value={p.id}>{p.full_name ?? 'Sin nombre'}</option>)}
          </select>
        )}
      </div>

      {/* Contador */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-[13px] text-text-secondary">
          <span className="text-text-primary font-medium">{pending.length}</span> {pending.length === 1 ? 'pendiente' : 'pendientes'}
          <span className="mx-1.5 text-border">·</span>
          <span className="text-green-400 font-medium">{sent.length}</span> {sent.length === 1 ? 'enviado' : 'enviados'}
        </div>
        {sent.length > 0 && (
          <button
            onClick={() => setShowSent(s => !s)}
            className="text-[12px] text-text-secondary hover:text-text-primary transition-colors"
          >
            {showSent ? 'Ocultar enviados' : 'Ver enviados'}
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => <div key={i} className="h-[64px] rounded-xl bg-bg-secondary/60 animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-text-secondary text-[14px]">
          {pending.length === 0 && sent.length > 0
            ? '✅ ¡Listo! No quedan recordatorios pendientes para este día.'
            : 'No hay turnos con teléfono para recordar en este día.'}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(t => {
            const done = isSent(t)
            const waUrl = buildWhatsAppUrl(t.patient_phone!, t.patient_name, new Date(t.start_time), t.area, orgName, buildConfirmUrl(t.confirm_token))
            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 rounded-xl border-[0.5px] px-4 py-3 transition-colors ${done ? 'bg-bg-secondary/40 border-border/60' : 'bg-bg-secondary border-border'}`}
              >
                <div className="shrink-0 w-[52px] text-center">
                  <div className={`text-[15px] font-semibold tabular-nums ${done ? 'text-text-tertiary' : 'text-text-primary'}`}>{formatTime(t.start_time)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-medium truncate flex items-center gap-1.5 ${done ? 'text-text-secondary line-through decoration-1' : 'text-text-primary'}`}>
                    {done && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-400" />}
                    {t.patient_name}
                  </p>
                  <p className="text-[12px] text-text-tertiary truncate">
                    {t.area}{t.professional_name ? ` · ${t.professional_name}` : ''}
                  </p>
                </div>
                {done ? (
                  <button
                    onClick={() => unmarkReminded(t.id)}
                    className="shrink-0 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors px-2 py-1"
                    title="Marcar como no enviado"
                  >
                    Deshacer
                  </button>
                ) : (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markReminded(t.id)}
                    className="shrink-0 bg-green-500/15 border-[0.5px] border-green-500/40 text-green-300 hover:bg-green-500/25 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    Enviar
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {noPhoneCount > 0 && (
        <p className="text-[12px] text-text-tertiary mt-4 text-center">
          {noPhoneCount} {noPhoneCount === 1 ? 'turno' : 'turnos'} sin teléfono cargado (no se puede enviar recordatorio).
        </p>
      )}

      {toast}
    </div>
  )
}
