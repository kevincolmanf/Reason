'use client'

import { useState, useRef, useEffect } from 'react'
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
}

interface Professional {
  id: string
  full_name: string | null
}

interface PatientResult {
  id: string
  name: string
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
  onClose: () => void
  onSaved: () => void
}

const AREAS = [
  'Kinesiología',
  'Entrenamiento adultos',
  'Entrenamiento niños',
  'RPG',
  'Pilates',
  'Yoga',
  'Nutrición',
  'Traumatología',
  'Análisis de la marcha',
]

const STATUSES = ['programado', 'confirmado', 'presente', 'ausente', 'cancelado', 'sobreturno']

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function TurnoModal({ userId, orgId, professionals, areas, turno, defaultStart, onClose, onSaved }: Props) {
  const isEdit = !!turno
  const effectiveAreas = areas.length > 0 ? areas : AREAS

  const defaultEnd = defaultStart ? new Date(defaultStart.getTime() + 60 * 60 * 1000) : null

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
    area:                turno?.area   ?? AREAS[0],
    status:              turno?.status ?? 'programado',
    notes:               turno?.notes  ?? '',
  })

  const [patientSearch, setPatientSearch]   = useState(turno?.patient_name ?? '')
  const [patientResults, setPatientResults] = useState<PatientResult[]>([])
  const [searchOpen, setSearchOpen]         = useState(false)
  const [createPatient, setCreatePatient]   = useState(!isEdit)
  const [rescheduling, setRescheduling]     = useState(false)
  const [saving, setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)

  const supabaseRef = useRef(createClient())
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Patient search
  useEffect(() => {
    if (patientSearch.length < 2) { setPatientResults([]); return }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      let query = supabaseRef.current
        .from('patients')
        .select('id, name, age, occupation')
        .ilike('name', `%${patientSearch}%`)
        .limit(6)

      if (orgId) query = query.eq('org_id', orgId)
      else       query = query.eq('user_id', userId)

      const { data } = await query
      setPatientResults(data ?? [])
    }, 250)
  }, [patientSearch, orgId, userId])

  const selectPatient = (p: PatientResult) => {
    setForm(f => ({ ...f, patient_name: p.name, patient_id: p.id }))
    setPatientSearch(p.name)
    setSearchOpen(false)
    setPatientResults([])
  }

  const clearPatient = () => {
    setForm(f => ({ ...f, patient_id: null }))
    setPatientSearch('')
    setPatientResults([])
  }

  const handleSave = async () => {
    if (!form.patient_name.trim() || !form.start_time || !form.end_time) return
    setSaving(true)

    let patientId = form.patient_id

    // Auto-create patient if requested and not already linked
    if (!patientId && createPatient && form.patient_name.trim()) {
      const { data: newPatient } = await supabaseRef.current
        .from('patients')
        .insert({
          name:       form.patient_name.trim(),
          age:        form.patient_age ? parseInt(form.patient_age, 10) : null,
          user_id:    userId,
          org_id:     orgId,
        })
        .select('id')
        .single()
      if (newPatient) patientId = newPatient.id
    }

    const payload = {
      patient_name:        form.patient_name.trim(),
      patient_id:          patientId,
      patient_phone:       form.patient_phone.trim() || null,
      patient_email:       form.patient_email.trim() || null,
      patient_age:         form.patient_age ? parseInt(form.patient_age, 10) : null,
      patient_obra_social: form.patient_obra_social.trim() || null,
      professional_id:     form.professional_id,
      professional_name:   professionals.find(p => p.id === form.professional_id)?.full_name ?? null,
      start_time:          new Date(form.start_time).toISOString(),
      end_time:            new Date(form.end_time).toISOString(),
      area:                form.area,
      status:              form.status,
      notes:               form.notes.trim() || null,
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

  const valid = form.patient_name.trim() && form.start_time && form.end_time

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl p-6 w-full max-w-[480px] shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-[16px] font-medium">{isEdit ? 'Editar turno' : 'Nuevo turno'}</h2>
            {isEdit && (
              <button
                onClick={() => setRescheduling(r => !r)}
                className={`text-[11px] px-2 py-1 rounded-md border-[0.5px] transition-colors ${rescheduling ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:text-text-primary'}`}
              >
                Reprogramar
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-[18px] leading-none">×</button>
        </div>

        <div className="space-y-4">
          {/* Patient */}
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
                <Link
                  href={`/dashboard/pacientes/${form.patient_id}`}
                  className="bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[12px] text-text-secondary hover:text-accent no-underline flex items-center"
                  target="_blank"
                >
                  Ver →
                </Link>
              )}
            </div>

            {/* Autocomplete dropdown */}
            {searchOpen && patientResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden shadow-lg">
                {patientResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectPatient(p)}
                    className="w-full text-left px-4 py-3 text-[13px] hover:bg-bg-secondary transition-colors border-b-[0.5px] border-border last:border-b-0"
                  >
                    <span className="font-medium">{p.name}</span>
                    {(p.age || p.occupation) && (
                      <span className="text-text-secondary ml-2">
                        {[p.age ? `${p.age} años` : null, p.occupation].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {form.patient_id && (
              <p className="text-[11px] text-text-secondary mt-1">
                Paciente vinculado.{' '}
                <button onClick={clearPatient} className="underline text-text-secondary hover:text-text-primary">Desvincular</button>
              </p>
            )}
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Teléfono</label>
              <input
                type="tel"
                value={form.patient_phone}
                onChange={e => setForm(f => ({ ...f, patient_phone: e.target.value }))}
                placeholder="Ej: 11 1234-5678"
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Email</label>
              <input
                type="email"
                value={form.patient_email}
                onChange={e => setForm(f => ({ ...f, patient_email: e.target.value }))}
                placeholder="paciente@email.com"
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Edad</label>
              <input
                type="number"
                value={form.patient_age}
                onChange={e => setForm(f => ({ ...f, patient_age: e.target.value }))}
                placeholder="Años"
                min={0}
                max={120}
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Obra social</label>
              <input
                type="text"
                value={form.patient_obra_social}
                onChange={e => setForm(f => ({ ...f, patient_obra_social: e.target.value }))}
                placeholder="Ej: OSDE, PAMI..."
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Date/time — highlighted when rescheduling */}
          <div className={`grid grid-cols-2 gap-3 ${rescheduling ? 'ring-1 ring-accent/40 rounded-xl p-3 -mx-1' : ''}`}>
            {rescheduling && (
              <p className="col-span-2 text-[11px] text-accent mb-1">Seleccioná el nuevo día y horario</p>
            )}
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Inicio *</label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fin *</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Area + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Área</label>
              <select
                value={form.area}
                onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent"
              >
                {effectiveAreas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Estado</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent capitalize"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Professional */}
          {professionals.length > 0 && (
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Profesional</label>
              <select
                value={form.professional_id ?? ''}
                onChange={e => setForm(f => ({ ...f, professional_id: e.target.value || null }))}
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent"
              >
                <option value="">Sin asignar</option>
                {professionals.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name ?? p.id.slice(0, 8)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Observaciones opcionales..."
              rows={2}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent resize-none"
            />
          </div>
        </div>

        {/* Auto-create patient (only when no patient is linked yet) */}
        {!form.patient_id && form.patient_name.trim() && (
          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={createPatient}
              onChange={e => setCreatePatient(e.target.checked)}
              className="accent-accent w-4 h-4"
            />
            <span className="text-[12px] text-text-secondary">Registrar como paciente nuevo en el sistema</span>
          </label>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving || !valid}
            className="bg-accent text-bg-primary px-5 py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear turno'}
          </button>
          <button onClick={onClose} className="text-text-secondary px-4 py-2.5 text-[13px] hover:text-text-primary">
            Cancelar
          </button>
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto text-[13px] text-text-secondary hover:text-red-400 transition-colors disabled:opacity-40"
            >
              {deleting ? 'Eliminando...' : 'Eliminar turno'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
