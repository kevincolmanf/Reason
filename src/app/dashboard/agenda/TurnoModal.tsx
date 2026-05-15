'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

interface Turno {
  id: string
  patient_name: string
  patient_id: string | null
  patient_phone: string | null
  patient_email: string | null
  patient_age: number | null
  patient_obra_social: string | null
  professional_id: string | null
  professional_name: string | null
  start_time: string
  end_time: string
  area: string
  status: string
  notes: string | null
  appointment_type: string | null
  is_blocked: boolean | null
}

interface HistorialTurno {
  id: string
  start_time: string
  end_time: string
  area: string
  status: string
  appointment_type: string | null
}

interface Professional {
  id: string
  full_name: string | null
}

interface PatientResult {
  id: string
  name: string
  dni: string | null
  age: number | null
  occupation: string | null
}

interface Props {
  userId: string
  orgId: string | null
  professionals: Professional[]
  areas: string[]
  turno?: Turno
  defaultStart?: Date
  slotInterval?: number
  onClose: () => void
  onSaved: () => void
  onClone?: (turno: Turno) => void
}

const AREAS = [
  'Kinesiología', 'Entrenamiento adultos', 'Entrenamiento niños',
  'RPG', 'Pilates', 'Yoga', 'Nutrición', 'Traumatología', 'Análisis de la marcha',
]

const STATUSES = ['programado', 'confirmado', 'presente', 'ausente', 'cancelado', 'sobreturno']

export const APPOINTMENT_TYPES: { value: string; label: string }[] = [
  { value: 'turno_comun',   label: 'Turno común' },
  { value: 'primera_vez',   label: 'Primera vez' },
  { value: 'ingreso',       label: 'Ingreso' },
  { value: 'consulta',      label: 'Consulta' },
  { value: 'antropometria', label: 'Antropometría' },
  { value: 'controles',     label: 'Controles' },
]

const STATUS_LABEL: Record<string, string> = {
  programado: 'Programado', confirmado: 'Confirmado', presente: 'Presente',
  ausente: 'Ausente', cancelado: 'Cancelado', sobreturno: 'Sobreturno',
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export default function TurnoModal({ userId, orgId, professionals, areas, turno, defaultStart, slotInterval, onClose, onSaved, onClone }: Props) {
  const isEdit = !!turno
  const effectiveAreas = areas.length > 0 ? areas : AREAS
  const defaultDuration = slotInterval ?? 60
  const defaultEnd = defaultStart ? new Date(defaultStart.getTime() + defaultDuration * 60 * 1000) : null

  const [form, setForm] = useState({
    patient_name:        turno?.patient_name ?? '',
    patient_id:          turno?.patient_id ?? null as string | null,
    patient_phone:       turno?.patient_phone ?? '',
    patient_email:       turno?.patient_email ?? '',
    patient_age:         turno?.patient_age?.toString() ?? '',
    patient_obra_social: turno?.patient_obra_social ?? '',
    professional_id:     turno?.professional_id ?? (professionals[0]?.id ?? null) as string | null,
    start_time:          turno ? toLocalInputValue(new Date(turno.start_time)) : (defaultStart ? toLocalInputValue(defaultStart) : ''),
    end_time:            turno ? toLocalInputValue(new Date(turno.end_time))   : (defaultEnd   ? toLocalInputValue(defaultEnd)   : ''),
    area:                turno?.area             ?? (effectiveAreas[0] ?? AREAS[0]),
    status:              turno?.status           ?? 'programado',
    notes:               turno?.notes            ?? '',
    appointment_type:    turno?.appointment_type ?? 'turno_comun',
    is_blocked:          turno?.is_blocked       ?? false,
  })

  const [duration, setDuration] = useState(() => {
    if (turno) return Math.round((new Date(turno.end_time).getTime() - new Date(turno.start_time).getTime()) / 60000) || defaultDuration
    return defaultDuration
  })

  const [patientSearch, setPatientSearch]     = useState(turno?.patient_name ?? '')
  const [patientResults, setPatientResults]   = useState<PatientResult[]>([])
  const [searchOpen, setSearchOpen]           = useState(false)
  const [createPatient, setCreatePatient]     = useState(!isEdit)
  const [rescheduling, setRescheduling]       = useState(false)
  const [saving, setSaving]                   = useState(false)
  const [deleting, setDeleting]               = useState(false)
  const [historial, setHistorial]             = useState<HistorialTurno[]>([])
  const [historialLoaded, setHistorialLoaded] = useState(false)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [doubleBooking, setDoubleBooking]     = useState(false)

  const supabaseRef    = useRef(createClient())
  const searchTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const overlapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Patient search
  useEffect(() => {
    if (patientSearch.length < 2) { setPatientResults([]); return }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      let query = supabaseRef.current
        .from('patients')
        .select('id, name, dni, age, occupation')
        .ilike('name', `%${patientSearch}%`)
        .limit(6)
      if (orgId) query = query.eq('org_id', orgId)
      else       query = query.eq('user_id', userId)
      const { data } = await query
      setPatientResults(data ?? [])
    }, 250)
  }, [patientSearch, orgId, userId])

  // Double-booking check
  useEffect(() => {
    if (!form.start_time || !form.end_time || form.is_blocked) { setDoubleBooking(false); return }
    if (overlapTimeout.current) clearTimeout(overlapTimeout.current)
    overlapTimeout.current = setTimeout(async () => {
      const startISO = new Date(form.start_time).toISOString()
      const endISO   = new Date(form.end_time).toISOString()
      let query = supabaseRef.current
        .from('turnos')
        .select('id')
        .lt('start_time', endISO)
        .gt('end_time', startISO)
        .neq('status', 'cancelado')
        .eq('is_blocked', false)
      if (orgId) query = query.eq('org_id', orgId)
      else       query = query.eq('created_by', userId)
      if (form.professional_id) query = query.eq('professional_id', form.professional_id)
      if (isEdit) query = query.neq('id', turno!.id)
      const { data } = await query
      setDoubleBooking((data ?? []).length > 0)
    }, 400)
  }, [form.start_time, form.end_time, form.professional_id, form.is_blocked, orgId, userId, isEdit, turno])

  const loadHistorial = useCallback(async () => {
    if (!form.patient_id) return
    setLoadingHistorial(true)
    let query = supabaseRef.current
      .from('turnos')
      .select('id, start_time, end_time, area, status, appointment_type')
      .eq('patient_id', form.patient_id)
      .order('start_time', { ascending: false })
      .limit(50)
    if (orgId) query = query.eq('org_id', orgId)
    else       query = query.eq('created_by', userId)
    if (isEdit) query = query.neq('id', turno!.id)
    const { data } = await query
    setHistorial((data ?? []) as HistorialTurno[])
    setHistorialLoaded(true)
    setLoadingHistorial(false)
  }, [form.patient_id, orgId, userId, isEdit, turno])

  const selectPatient = (p: PatientResult) => {
    setForm(f => ({ ...f, patient_name: p.name, patient_id: p.id }))
    setPatientSearch(p.name)
    setSearchOpen(false)
    setPatientResults([])
    setHistorialLoaded(false)
    setHistorial([])
  }

  const clearPatient = () => {
    setForm(f => ({ ...f, patient_id: null }))
    setPatientSearch('')
    setPatientResults([])
    setHistorialLoaded(false)
    setHistorial([])
  }

  const handleSave = async () => {
    if (form.is_blocked) {
      if (!form.start_time || !form.end_time) return
    } else {
      if (!form.patient_name.trim() || !form.start_time || !form.end_time) return
    }
    setSaving(true)

    let patientId = form.patient_id
    if (!form.is_blocked && !patientId && createPatient && form.patient_name.trim()) {
      const { data: newPatient } = await supabaseRef.current
        .from('patients')
        .insert({ name: form.patient_name.trim(), age: form.patient_age ? parseInt(form.patient_age, 10) : null, user_id: userId, org_id: orgId })
        .select('id').single()
      if (newPatient) patientId = newPatient.id
    }

    const payload = {
      patient_name:        form.is_blocked ? '—' : form.patient_name.trim(),
      patient_id:          form.is_blocked ? null : patientId,
      patient_phone:       form.is_blocked ? null : (form.patient_phone.trim() || null),
      patient_email:       form.is_blocked ? null : (form.patient_email.trim() || null),
      patient_age:         form.is_blocked ? null : (form.patient_age ? parseInt(form.patient_age, 10) : null),
      patient_obra_social: form.is_blocked ? null : (form.patient_obra_social.trim() || null),
      professional_id:     form.professional_id,
      professional_name:   professionals.find(p => p.id === form.professional_id)?.full_name ?? null,
      start_time:          new Date(form.start_time).toISOString(),
      end_time:            new Date(form.end_time).toISOString(),
      area:                form.area,
      status:              form.is_blocked ? 'cancelado' : form.status,
      notes:               form.notes.trim() || null,
      appointment_type:    form.is_blocked ? null : form.appointment_type,
      is_blocked:          form.is_blocked,
      org_id:              orgId,
      created_by:          userId,
    }

    if (isEdit) {
      await supabaseRef.current.from('turnos').update(payload).eq('id', turno!.id)
    } else {
      await supabaseRef.current.from('turnos').insert(payload)
    }

    setSaving(false)
    onSaved()
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este turno?')) return
    setDeleting(true)
    await supabaseRef.current.from('turnos').delete().eq('id', turno!.id)
    setDeleting(false)
    onSaved()
  }

  const valid = form.is_blocked
    ? !!(form.start_time && form.end_time)
    : !!(form.patient_name.trim() && form.start_time && form.end_time)

  const now = new Date().toISOString()
  const pastTurnos   = historial.filter(t => t.start_time < now)
  const futureTurnos = historial.filter(t => t.start_time >= now).reverse()
  const ausentismoCount = pastTurnos.filter(t => t.status === 'ausente').length

  const inputCls = 'w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl p-6 w-full max-w-[480px] shadow-xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[16px] font-medium">
              {form.is_blocked ? 'Bloqueo de horario' : (isEdit ? 'Editar turno' : 'Nuevo turno')}
            </h2>
            {isEdit && !form.is_blocked && (
              <button
                onClick={() => setRescheduling(r => !r)}
                className={`text-[11px] px-2 py-1 rounded-md border-[0.5px] transition-colors ${rescheduling ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:text-text-primary'}`}
              >
                Reprogramar
              </button>
            )}
            {isEdit && !form.is_blocked && onClone && (
              <button
                onClick={() => onClone(turno!)}
                className="text-[11px] px-2 py-1 rounded-md border-[0.5px] border-border text-text-secondary hover:text-text-primary transition-colors"
              >
                Clonar
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setForm(f => ({ ...f, is_blocked: !f.is_blocked }))}
              title={form.is_blocked ? 'Cancelar bloqueo' : 'Bloquear este horario'}
              className={`text-[11px] px-2 py-1 rounded-md border-[0.5px] transition-colors ${form.is_blocked ? 'bg-red-500/15 border-red-500/35 text-red-400' : 'border-border text-text-secondary hover:text-text-primary'}`}
            >
              {form.is_blocked ? 'Bloqueado' : 'Bloquear'}
            </button>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-[18px] leading-none">×</button>
          </div>
        </div>

        {/* Double-booking warning */}
        {doubleBooking && (
          <div className="mb-4 bg-amber-500/10 border-[0.5px] border-amber-500/30 rounded-lg px-3 py-2 text-[12px] text-amber-400">
            Ya existe un turno en este horario para este profesional.
          </div>
        )}

        {form.is_blocked ? (
          /* Simplified blocked-slot form */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Inicio *</label>
                <input
                  type="datetime-local"
                  value={form.start_time}
                  onChange={e => {
                    const newStart = e.target.value
                    setForm(f => ({
                      ...f,
                      start_time: newStart,
                      end_time: newStart ? toLocalInputValue(new Date(new Date(newStart).getTime() + duration * 60 * 1000)) : f.end_time,
                    }))
                  }}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fin *</label>
                <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Duración</label>
              <div className="flex gap-1.5 flex-wrap">
                {[15, 20, 30, 40, 45, 60, 90, 120].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDuration(d)
                      if (form.start_time) {
                        const end = new Date(new Date(form.start_time).getTime() + d * 60 * 1000)
                        setForm(f => ({ ...f, end_time: toLocalInputValue(end) }))
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[12px] border-[0.5px] transition-colors ${
                      duration === d ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {d}min
                  </button>
                ))}
              </div>
            </div>
            {professionals.length > 0 && (
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Profesional</label>
                <select value={form.professional_id ?? ''} onChange={e => setForm(f => ({ ...f, professional_id: e.target.value || null }))} className={inputCls}>
                  <option value="">Sin asignar</option>
                  {professionals.map(p => <option key={p.id} value={p.id}>{p.full_name ?? p.id.slice(0, 8)}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Motivo (opcional)</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ej: Reunión, feriado, descanso..." rows={2} className={`${inputCls} resize-none`} />
            </div>
          </div>
        ) : (
          /* Normal appointment form */
          <div className="space-y-4">
            {/* Patient search */}
            <div className="relative">
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Paciente *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); setForm(f => ({ ...f, patient_name: e.target.value, patient_id: null })); setSearchOpen(true) }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Buscar o escribir nombre..."
                  autoFocus
                  className="flex-1 bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                />
                {form.patient_id && (
                  <Link href={`/dashboard/pacientes/${form.patient_id}`} className="bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[12px] text-text-secondary hover:text-accent no-underline flex items-center" target="_blank">
                    Ver →
                  </Link>
                )}
              </div>
              {searchOpen && patientResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden shadow-lg">
                  {patientResults.map(p => (
                    <button key={p.id} onClick={() => selectPatient(p)} className="w-full text-left px-4 py-3 text-[13px] hover:bg-bg-secondary transition-colors border-b-[0.5px] border-border last:border-b-0">
                      <span className="font-medium">{p.name}</span>
                      {p.dni && <span className="text-text-tertiary ml-2 text-[12px]">DNI {p.dni}</span>}
                      {(p.age || p.occupation) && (
                        <span className="text-text-secondary ml-2">{[p.age ? `${p.age} años` : null, p.occupation].filter(Boolean).join(' · ')}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {form.patient_id && (
                <p className="text-[11px] text-text-secondary mt-1">
                  Paciente vinculado.{' '}
                  <button onClick={clearPatient} className="underline hover:text-text-primary">Desvincular</button>
                </p>
              )}
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Teléfono</label>
                <input type="tel" value={form.patient_phone} onChange={e => setForm(f => ({ ...f, patient_phone: e.target.value }))} placeholder="11 1234-5678" className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Email</label>
                <input type="email" value={form.patient_email} onChange={e => setForm(f => ({ ...f, patient_email: e.target.value }))} placeholder="paciente@email.com" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Edad</label>
                <input type="number" value={form.patient_age} onChange={e => setForm(f => ({ ...f, patient_age: e.target.value }))} placeholder="Años" min={0} max={120} className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Obra social</label>
                <input type="text" value={form.patient_obra_social} onChange={e => setForm(f => ({ ...f, patient_obra_social: e.target.value }))} placeholder="Ej: OSDE, PAMI..." className={inputCls} />
              </div>
            </div>

            {/* Date/time */}
            <div className={`space-y-3 ${rescheduling ? 'ring-1 ring-accent/40 rounded-xl p-3 -mx-1' : ''}`}>
              {rescheduling && <p className="text-[11px] text-accent">Seleccioná el nuevo día y horario</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Inicio *</label>
                  <input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={e => {
                      const newStart = e.target.value
                      setForm(f => ({
                        ...f,
                        start_time: newStart,
                        end_time: newStart ? (() => { const d = new Date(new Date(newStart).getTime() + duration * 60 * 1000); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` })() : f.end_time,
                      }))
                    }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fin *</label>
                  <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Duración</label>
                <div className="flex gap-1.5 flex-wrap">
                  {[15, 20, 30, 40, 45, 60, 90, 120].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDuration(d)
                        if (form.start_time) {
                          const end = new Date(new Date(form.start_time).getTime() + d * 60 * 1000)
                          setForm(f => ({ ...f, end_time: toLocalInputValue(end) }))
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[12px] border-[0.5px] transition-colors ${
                        duration === d ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {d}min
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tipo de turno + Estado */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Tipo de turno</label>
                <select value={form.appointment_type} onChange={e => setForm(f => ({ ...f, appointment_type: e.target.value }))} className={inputCls}>
                  {APPOINTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Estado</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={`${inputCls} capitalize`}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Area */}
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Área</label>
              <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} className={inputCls}>
                {effectiveAreas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Professional */}
            {professionals.length > 0 && (
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Profesional</label>
                <select value={form.professional_id ?? ''} onChange={e => setForm(f => ({ ...f, professional_id: e.target.value || null }))} className={inputCls}>
                  <option value="">Sin asignar</option>
                  {professionals.map(p => <option key={p.id} value={p.id}>{p.full_name ?? p.id.slice(0, 8)}</option>)}
                </select>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Notas</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observaciones opcionales..." rows={2} className={`${inputCls} resize-none`} />
            </div>
          </div>
        )}

        {/* Auto-create patient */}
        {!form.is_blocked && !form.patient_id && form.patient_name.trim() && (
          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input type="checkbox" checked={createPatient} onChange={e => setCreatePatient(e.target.checked)} className="accent-accent w-4 h-4" />
            <span className="text-[12px] text-text-secondary">Registrar como paciente nuevo en el sistema</span>
          </label>
        )}

        {/* Historial del paciente */}
        {isEdit && form.patient_id && (
          <div className="mt-5 border-t-[0.5px] border-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] uppercase tracking-[0.05em] text-text-secondary">Historial del paciente</label>
              {!historialLoaded && (
                <button onClick={loadHistorial} disabled={loadingHistorial} className="text-[11px] text-accent hover:opacity-80 disabled:opacity-50">
                  {loadingHistorial ? 'Cargando...' : 'Ver historial'}
                </button>
              )}
            </div>
            {historialLoaded && (
              <div className="space-y-3">
                {pastTurnos.length > 0 && (
                  <div>
                    <p className="text-[11px] text-text-tertiary mb-2">
                      Pasados — {pastTurnos.length} turno{pastTurnos.length !== 1 ? 's' : ''}
                      {ausentismoCount > 0 && <span className="text-red-400 ml-1">· {ausentismoCount} ausencia{ausentismoCount !== 1 ? 's' : ''}</span>}
                    </p>
                    <div className="space-y-1">
                      {pastTurnos.slice(0, 20).map(h => (
                        <div key={h.id} className="flex items-center gap-2 text-[12px]">
                          <span className="text-text-secondary w-[96px] shrink-0 tabular-nums">{formatDateShort(new Date(h.start_time))}</span>
                          <span className="text-text-tertiary tabular-nums">{formatTime(new Date(h.start_time))}</span>
                          <span className="flex-1 truncate text-text-secondary">{h.area}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                            h.status === 'ausente'  ? 'bg-red-500/10 text-red-400' :
                            h.status === 'presente' ? 'bg-emerald-500/10 text-emerald-400' :
                            'text-text-tertiary'
                          }`}>
                            {STATUS_LABEL[h.status] ?? h.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {futureTurnos.length > 0 && (
                  <div>
                    <p className="text-[11px] text-text-tertiary mb-2">Próximos — {futureTurnos.length} turno{futureTurnos.length !== 1 ? 's' : ''}</p>
                    <div className="space-y-1">
                      {futureTurnos.slice(0, 10).map(h => (
                        <div key={h.id} className="flex items-center gap-2 text-[12px]">
                          <span className="text-text-secondary w-[96px] shrink-0 tabular-nums">{formatDateShort(new Date(h.start_time))}</span>
                          <span className="text-text-tertiary tabular-nums">{formatTime(new Date(h.start_time))}</span>
                          <span className="flex-1 truncate text-text-secondary">{h.area}</span>
                          <span className="text-[10px] text-text-tertiary">{STATUS_LABEL[h.status] ?? h.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {pastTurnos.length === 0 && futureTurnos.length === 0 && (
                  <p className="text-[12px] text-text-tertiary">Sin otros turnos registrados.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} disabled={saving || !valid} className="bg-accent text-bg-primary px-5 py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear turno'}
          </button>
          <button onClick={onClose} className="text-text-secondary px-4 py-2.5 text-[13px] hover:text-text-primary">Cancelar</button>
          {isEdit && (
            <button onClick={handleDelete} disabled={deleting} className="ml-auto text-[13px] text-text-secondary hover:text-red-400 transition-colors disabled:opacity-40">
              {deleting ? 'Eliminando...' : 'Eliminar turno'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
