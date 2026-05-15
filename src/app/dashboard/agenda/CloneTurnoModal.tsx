'use client'

import { useState, useMemo, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { APPOINTMENT_TYPES } from './TurnoModal'

interface Turno {
  id: string
  patient_name: string
  patient_id: string | null
  professional_id: string | null
  professional_name: string | null
  start_time: string
  end_time: string
  area: string
  appointment_type: string | null
  org_id?: string | null
}

interface Props {
  turno: Turno
  userId: string
  orgId: string | null
  onClose: () => void
  onSaved: () => void
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatDatePreview(date: Date): string {
  return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function generateDates(selectedDays: number[], count: number, weeklyRepeat: boolean): Date[] {
  if (selectedDays.length === 0 || count === 0) return []
  const dates: Date[] = []
  // Start from tomorrow
  let pointer = addDays(new Date(), 1)
  pointer.setHours(0, 0, 0, 0)

  if (weeklyRepeat) {
    // Iterate day by day, collect matches until count reached
    let safety = 0
    while (dates.length < count && safety < 365) {
      const jsDay = pointer.getDay() // 0=Sun
      const esarDay = jsDay === 0 ? 6 : jsDay - 1 // 0=Mon
      if (selectedDays.includes(esarDay)) dates.push(new Date(pointer))
      pointer = addDays(pointer, 1)
      safety++
    }
  } else {
    // Just the next occurrence of each selected day
    const sorted = [...selectedDays].sort((a, b) => a - b)
    for (const day of sorted) {
      const jsDay = pointer.getDay()
      const esarDay = jsDay === 0 ? 6 : jsDay - 1
      let daysAhead = day - esarDay
      if (daysAhead <= 0) daysAhead += 7
      dates.push(addDays(pointer, daysAhead))
    }
    dates.sort((a, b) => a.getTime() - b.getTime())
    return dates.slice(0, count)
  }

  return dates
}

export default function CloneTurnoModal({ turno, userId, orgId, onClose, onSaved }: Props) {
  const originalStart   = new Date(turno.start_time)
  const originalEnd     = new Date(turno.end_time)
  const durationMinutes = Math.round((originalEnd.getTime() - originalStart.getTime()) / 60000)

  const [selectedDays, setSelectedDays]       = useState<number[]>([])
  const [count, setCount]                     = useState(4)
  const [startTime, setStartTime]             = useState(toTimeString(originalStart))
  const [weeklyRepeat, setWeeklyRepeat]       = useState(true)
  const [appointmentType, setAppointmentType] = useState(turno.appointment_type ?? 'turno_comun')
  const [asSobreturno, setAsSobreturno]       = useState(false)
  const [saving, setSaving]                   = useState(false)

  const supabaseRef = useRef(createClient())

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const previewDates = useMemo(
    () => generateDates(selectedDays, count, weeklyRepeat),
    [selectedDays, count, weeklyRepeat]
  )

  const handleCreate = async () => {
    if (previewDates.length === 0) return
    setSaving(true)

    const [hh, mm] = startTime.split(':').map(Number)
    const inserts = previewDates.map(date => {
      const start = new Date(date)
      start.setHours(hh, mm, 0, 0)
      const end = new Date(start.getTime() + durationMinutes * 60000)
      return {
        patient_name:     turno.patient_name,
        patient_id:       turno.patient_id,
        professional_id:  turno.professional_id,
        professional_name: turno.professional_name,
        start_time:       start.toISOString(),
        end_time:         end.toISOString(),
        area:             turno.area,
        status:           asSobreturno ? 'sobreturno' : 'programado',
        appointment_type: appointmentType,
        is_blocked:       false,
        org_id:           orgId,
        created_by:       userId,
      }
    })

    await supabaseRef.current.from('turnos').insert(inserts)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl p-6 w-full max-w-[440px] shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-[16px] font-medium">Clonar turno</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-[18px] leading-none">×</button>
        </div>
        <p className="text-[13px] text-text-secondary mb-5">{turno.patient_name}</p>

        <div className="space-y-5">
          {/* Days of week */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Días de la semana</label>
            <div className="flex gap-1.5">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-medium border-[0.5px] transition-colors ${
                    selectedDays.includes(i)
                      ? 'bg-accent text-bg-primary border-accent'
                      : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Start time + Count */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Horario de inicio</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent"
              />
              <p className="text-[11px] text-text-tertiary mt-1">Duración: {durationMinutes} min</p>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Cantidad de turnos</label>
              <input
                type="number"
                value={count}
                onChange={e => setCount(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                min={1}
                max={30}
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Weekly repeat */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-text-primary">Repetición semanal</p>
              <p className="text-[11px] text-text-tertiary">Repite los días seleccionados cada semana</p>
            </div>
            <button
              onClick={() => setWeeklyRepeat(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${weeklyRepeat ? 'bg-accent' : 'bg-border-strong'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${weeklyRepeat ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Appointment type */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Tipo de turno</label>
            <select
              value={appointmentType}
              onChange={e => setAppointmentType(e.target.value)}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[13px] focus:outline-none focus:border-accent"
            >
              {APPOINTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Sobreturno */}
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-text-primary">Marcar como sobreturno</p>
            <button
              onClick={() => setAsSobreturno(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${asSobreturno ? 'bg-purple-500' : 'bg-border-strong'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${asSobreturno ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Preview */}
          {previewDates.length > 0 && (
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-3">
              <p className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">
                Se crearán {previewDates.length} turno{previewDates.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {previewDates.slice(0, 12).map((d, i) => (
                  <span key={i} className="text-[11px] bg-bg-secondary border-[0.5px] border-border rounded-md px-2 py-1 text-text-secondary">
                    {formatDatePreview(d)}
                  </span>
                ))}
                {previewDates.length > 12 && (
                  <span className="text-[11px] text-text-tertiary px-2 py-1">+{previewDates.length - 12} más</span>
                )}
              </div>
            </div>
          )}

          {selectedDays.length === 0 && (
            <p className="text-[12px] text-text-tertiary text-center">Seleccioná al menos un día para generar la vista previa.</p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCreate}
            disabled={saving || previewDates.length === 0}
            className="bg-accent text-bg-primary px-5 py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving ? 'Creando...' : `Crear ${previewDates.length > 0 ? previewDates.length : ''} turno${previewDates.length !== 1 ? 's' : ''}`}
          </button>
          <button onClick={onClose} className="text-text-secondary px-4 py-2.5 text-[13px] hover:text-text-primary">Cancelar</button>
        </div>
      </div>
    </div>
  )
}
