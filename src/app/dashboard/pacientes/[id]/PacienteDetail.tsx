'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import QuickSessionSheet from '@/components/QuickSessionSheet'

interface PatientEvent {
  id: string
  event_date: string
  type: string
  title: string | null
  note: string | null
}

// Tipos de hito del tratamiento, con su color.
const EVENT_TYPES: { value: string; label: string; color: string }[] = [
  { value: 'evaluacion',   label: 'Evaluación',   color: '#2F6FB0' },
  { value: 'reevaluacion', label: 'Reevaluación', color: '#7A5AB8' },
  { value: 'rtp',          label: 'RTP',          color: '#C27B54' },
  { value: 'control',      label: 'Control',      color: '#A66A11' },
  { value: 'alta',         label: 'Alta',         color: '#1E9E74' },
  { value: 'objetivo',     label: 'Objetivo',     color: '#5B6B78' },
  { value: 'competencia',  label: 'Competencia',  color: '#B23A2E' },
  { value: 'otro',         label: 'Otro',         color: '#8A9691' },
]
const eventMeta = (type: string) => EVENT_TYPES.find(e => e.value === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1]

interface Patient {
  id: string
  name: string
  dni: string | null
  age: number | null
  birth_date: string | null
  phone: string | null
  email: string | null
  obra_social: string | null
  occupation: string | null
  source: string | null
  created_at: string
  org_id: string | null
  load_share_token: string | null
  follow_up_mode?: string | null
  user_id: string
}

function calcAge(birth_date: string | null): number | null {
  if (!birth_date) return null
  const today = new Date()
  const dob = new Date(birth_date)
  let age = today.getFullYear() - dob.getFullYear()
  if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--
  return age
}

interface PatientSource { id: string; label: string }

export default function PacienteDetail({ patient: initialPatient, userId, initialEvents = [] }: { patient: Patient; userId: string; initialEvents?: PatientEvent[] }) {
  const isOwner = initialPatient.user_id === userId
  const [patient, setPatient] = useState<Patient>(initialPatient)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: initialPatient.name,
    dni: initialPatient.dni || '',
    birth_date: initialPatient.birth_date || '',
    phone: initialPatient.phone || '',
    email: initialPatient.email || '',
    obra_social: initialPatient.obra_social || '',
    occupation: initialPatient.occupation || '',
    source: initialPatient.source || '',
  })
  const [sources, setSources] = useState<PatientSource[]>([])
  const [saving, setSaving] = useState(false)
  const [dniError, setDniError] = useState<string | null>(null)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [modeSaving, setModeSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [sessionSheet, setSessionSheet] = useState(false)
  const [sessionSaved, setSessionSaved] = useState(false)

  // ── Hitos del tratamiento ──────────────────────────────────────────────────
  const [events, setEvents] = useState<PatientEvent[]>(initialEvents)
  const [showEventForm, setShowEventForm] = useState(false)
  const [evType, setEvType] = useState('evaluacion')
  const [evDate, setEvDate] = useState(() => new Date().toISOString().split('T')[0])
  const [evTitle, setEvTitle] = useState('')
  const [evNote, setEvNote] = useState('')
  const [evSaving, setEvSaving] = useState(false)

  const addEvent = async () => {
    if (!evDate) return
    setEvSaving(true)
    const { data, error } = await supabaseRef.current
      .from('patient_events')
      .insert({ patient_id: patient.id, user_id: userId, event_date: evDate, type: evType, title: evTitle.trim() || null, note: evNote.trim() || null })
      .select('id, event_date, type, title, note')
      .single()
    if (!error && data) {
      setEvents(prev => [...prev, data as PatientEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)))
      setEvTitle(''); setEvNote(''); setShowEventForm(false)
    }
    setEvSaving(false)
  }

  const deleteEvent = async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    await supabaseRef.current.from('patient_events').delete().eq('id', id)
  }

  const router = useRouter()
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const url = initialPatient.org_id
      ? `/api/pacientes/fuentes?orgId=${initialPatient.org_id}`
      : '/api/pacientes/fuentes'
    fetch(url).then(r => r.ok ? r.json() : []).then(setSources)
  }, [initialPatient.org_id])

  const generatePortalToken = async () => {
    setGeneratingToken(true)
    const token = crypto.randomUUID()
    const { data, error } = await supabaseRef.current
      .from('patients')
      .update({ load_share_token: token })
      .eq('id', patient.id)
      .select()
      .single()
    if (!error && data) setPatient(data)
    setGeneratingToken(false)
  }

  const revokePortalToken = async () => {
    if (!confirm('¿Revocar el link del portal? El paciente ya no podrá acceder.')) return
    const { data, error } = await supabaseRef.current
      .from('patients')
      .update({ load_share_token: null })
      .eq('id', patient.id)
      .select()
      .single()
    if (!error && data) setPatient(data)
  }

  const setFollowUpMode = async (mode: 'presencial' | 'online' | 'hibrido') => {
    const prev = patient.follow_up_mode ?? 'presencial'
    if (mode === prev) return
    setPatient(p => ({ ...p, follow_up_mode: mode })) // optimista
    setModeSaving('saving')
    try {
      const res = await fetch('/api/pacientes/modalidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, mode }),
      })
      if (!res.ok) throw new Error()
      setModeSaving('saved')
      setTimeout(() => setModeSaving('idle'), 2500)
    } catch {
      setPatient(p => ({ ...p, follow_up_mode: prev }))
      setModeSaving('error')
    }
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.dni.trim()) return
    setDniError(null)
    setSaving(true)

    // Check for duplicate DNI (exclude current patient)
    if (editForm.dni.trim() !== (patient.dni ?? '')) {
      const { data: existing } = await supabaseRef.current
        .from('patients')
        .select('id')
        .eq('dni', editForm.dni.trim())
        .neq('id', patient.id)
        .maybeSingle()
      if (existing) {
        setDniError('Ya existe un paciente registrado con ese DNI.')
        setSaving(false)
        return
      }
    }

    const { data, error } = await supabaseRef.current
      .from('patients')
      .update({
        name: editForm.name.trim(),
        dni: editForm.dni.trim(),
        birth_date: editForm.birth_date || null,
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        obra_social: editForm.obra_social.trim() || null,
        occupation: editForm.occupation.trim() || null,
        source: editForm.source || null,
      })
      .eq('id', patient.id)
      .select()
      .single()
    if (!error && data) { setPatient(data); setEditing(false) }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar a ${patient.name}? Los planes asociados quedarán sin paciente asignado.`)) return
    const { error } = await supabaseRef.current.from('patients').delete().eq('id', patient.id)
    if (!error) router.push('/dashboard/pacientes')
  }

  return (
    <div>
      {/* HEADER */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 mb-6">
        {editing ? (
          <div>
            <h2 className="text-[16px] font-medium mb-4">Editar datos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nombre *</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} autoFocus className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">DNI *</label>
                <input
                  type="text"
                  value={editForm.dni}
                  onChange={e => { setEditForm(f => ({ ...f, dni: e.target.value.replace(/\D/g, '') })); setDniError(null) }}
                  inputMode="numeric"
                  placeholder="Ej: 12345678"
                  className={`w-full bg-bg-secondary border-[0.5px] rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent ${dniError ? 'border-red-500/60' : 'border-border-strong'}`}
                />
                {dniError && <p className="text-[11px] text-red-400 mt-1">{dniError}</p>}
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha de nacimiento</label>
                <input type="date" value={editForm.birth_date} onChange={e => setEditForm(f => ({ ...f, birth_date: e.target.value }))} className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Ocupación</label>
                <input type="text" value={editForm.occupation} onChange={e => setEditForm(f => ({ ...f, occupation: e.target.value }))} className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Teléfono</label>
                <input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="11 1234-5678" className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="paciente@email.com" className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Obra social</label>
                <input type="text" value={editForm.obra_social} onChange={e => setEditForm(f => ({ ...f, obra_social: e.target.value }))} placeholder="Ej: OSDE, PAMI, IOMA..." className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
              </div>
              {sources.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">¿Cómo llegó?</label>
                  <select value={editForm.source} onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))} className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent">
                    <option value="">Sin especificar</option>
                    {sources.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveEdit} disabled={saving || !editForm.name.trim() || !editForm.dni.trim()} className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setEditing(false)} className="text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-[24px] sm:text-[28px] font-medium tracking-[-0.01em] mb-3">{patient.name}</h1>
              <div className="flex flex-wrap gap-2">
                {patient.dni && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">DNI {patient.dni}</span>}
                {(() => { const age = calcAge(patient.birth_date) ?? patient.age; return age ? <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">{age} años</span> : null })()}
                {patient.birth_date && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">{new Date(patient.birth_date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                {patient.occupation && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">{patient.occupation}</span>}
                {patient.phone && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">📞 {patient.phone}</span>}
                {patient.email && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">✉ {patient.email}</span>}
                {patient.obra_social && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">{patient.obra_social}</span>}
                {patient.source && <span className="bg-accent/10 border-[0.5px] border-accent/30 rounded-full px-3 py-1 text-[12px] text-accent">Vía: {patient.source}</span>}
                <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[12px] text-text-secondary">
                  Desde {new Date(patient.created_at).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 items-center flex-wrap">
              {sessionSaved && <span className="text-[12px] text-[#4ade80]">✓ Sesión registrada</span>}
              <button onClick={() => setSessionSheet(true)} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">
                + Registrar sesión
              </button>
              <button onClick={() => setEditing(true)} className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary transition-colors">Editar</button>
              {isOwner && <button onClick={handleDelete} className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-warning transition-colors">Eliminar</button>}
            </div>
          </div>
        )}
      </div>

      {sessionSheet && (
        <QuickSessionSheet
          patientId={patient.id}
          patientName={patient.name}
          onClose={() => setSessionSheet(false)}
          onSaved={() => { setSessionSaved(true); setTimeout(() => setSessionSaved(false), 3000) }}
        />
      )}

      {/* 3 CARDS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Link href={`/dashboard/pacientes/${patient.id}/ficha`} className="block no-underline group">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full">
            <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Expediente clínico</div>
            <div className="text-[18px] font-medium mb-1">Ficha Clínica</div>
            <div className="text-[13px] text-text-secondary">Anamnesis, diagnóstico, goniometría, cuestionarios, dinamometría</div>
            <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">Abrir →</div>
          </div>
        </Link>

        <Link href={`/dashboard/pacientes/${patient.id}/carga`} className="block no-underline group">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full">
            <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Seguimiento</div>
            <div className="text-[18px] font-medium mb-1">Monitoreo de Carga</div>
            <div className="text-[13px] text-text-secondary">Sesiones, ACWR, VAS, RPE y consejo semanal</div>
            <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">Abrir →</div>
          </div>
        </Link>

        <Link href={`/dashboard/ejercicios/plan?paciente=${patient.id}`} className="block no-underline group">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full">
            <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Ejercicio</div>
            <div className="text-[18px] font-medium mb-1">Plan de Ejercicio</div>
            <div className="text-[13px] text-text-secondary">Planificación de ejercicios y bloques de entrenamiento</div>
            <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">Abrir →</div>
          </div>
        </Link>

        <Link href={`/dashboard/pacientes/${patient.id}/calendario`} className="block no-underline group">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full">
            <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Planificación</div>
            <div className="text-[18px] font-medium mb-1">Calendario</div>
            <div className="text-[13px] text-text-secondary">Programá sesiones en fechas específicas para el paciente</div>
            <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">Abrir →</div>
          </div>
        </Link>

        <Link href={`/dashboard/pacientes/${patient.id}/rts`} className="block no-underline group">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full">
            <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Protocolos RTS</div>
            <div className="text-[18px] font-medium mb-1">Retorno al Deporte</div>
            <div className="text-[13px] text-text-secondary">LCA, isquiotibiales, tobillo, femoropatelar, tendinopatía, inguinal, hombro</div>
            <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">Abrir →</div>
          </div>
        </Link>
      </div>

      {/* HITOS DEL TRATAMIENTO */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-medium">Hitos del tratamiento</h2>
          <button onClick={() => setShowEventForm(v => !v)} className="text-[13px] font-medium text-accent hover:opacity-80">
            {showEventForm ? 'Cerrar' : '+ Agregar hito'}
          </button>
        </div>

        {showEventForm && (
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4 mb-4 space-y-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Tipo</label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.map(t => (
                  <button key={t.value} onClick={() => setEvType(t.value)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium border-[0.5px] transition-colors ${evType === t.value ? 'text-white' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'}`}
                    style={evType === t.value ? { backgroundColor: t.color, borderColor: t.color } : {}}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: evType === t.value ? '#fff' : t.color }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha</label>
                <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Título (opcional)</label>
                <input type="text" value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Ej: Reeval. LCA, torneo regional…" className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nota (opcional)</label>
              <input type="text" value={evNote} onChange={e => setEvNote(e.target.value)} placeholder="Detalle del hito…" className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
            </div>
            <button onClick={addEvent} disabled={evSaving || !evDate}
              className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
              {evSaving ? 'Guardando…' : 'Agregar hito'}
            </button>
          </div>
        )}

        {events.length === 0 ? (
          <p className="text-[13px] text-text-secondary bg-bg-secondary border-[0.5px] border-dashed border-border rounded-xl px-4 py-5 text-center">
            Sin hitos todavía. Marcá evaluaciones, RTP, altas o competencias para ver el proceso completo del paciente.
          </p>
        ) : (
          <div className="border-[0.5px] border-border rounded-xl overflow-hidden divide-y-[0.5px] divide-border">
            {events.map(ev => {
              const meta = eventMeta(ev.type)
              const past = ev.event_date < new Date().toISOString().split('T')[0]
              return (
                <div key={ev.id} className={`flex items-center gap-3 px-4 py-3 ${past ? 'opacity-60' : ''}`}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                  <div className="w-[92px] shrink-0 text-[12px] text-text-secondary tabular-nums">
                    {new Date(ev.event_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-medium" style={{ color: meta.color }}>{meta.label}</span>
                    {ev.title && <span className="text-[13px] text-text-primary"> · {ev.title}</span>}
                    {ev.note && <p className="text-[12px] text-text-secondary truncate">{ev.note}</p>}
                  </div>
                  <button onClick={() => deleteEvent(ev.id)} className="text-text-secondary hover:text-warning text-[14px] shrink-0 transition-colors" title="Eliminar hito">×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* PORTAL */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[14px] font-medium">Portal del Paciente</h2>
        </div>

        {/* Modalidad de seguimiento: define qué se le pide al paciente. Se muestra
            igual que el resto de la sección Portal (sin exigir ser el creador del
            registro): en un equipo, cualquiera que gestiona al paciente la ve. */}
        {(() => {
          const mode = patient.follow_up_mode ?? 'presencial'
          const opts: { value: 'presencial' | 'online' | 'hibrido'; label: string; desc: string }[] = [
            { value: 'presencial', label: 'Presencial', desc: 'Lo ves en el centro. El registro lo llevás vos con notas — al paciente no se le pide cargar sesiones.' },
            { value: 'online',     label: 'Online',     desc: 'Se entrena a distancia. Registra un check-in corto desde su portal.' },
            { value: 'hibrido',    label: 'Híbrido',    desc: 'Combina presencial y a distancia. Registra el check-in corto los días que no viene.' },
          ]
          return (
            <div className="mb-4 pb-4 border-b-[0.5px] border-border">
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary">Modalidad de seguimiento</label>
                {modeSaving === 'saving' && <span className="text-[11px] text-text-secondary">Guardando…</span>}
                {modeSaving === 'saved' && <span className="text-[11px] text-[#4ade80]">✓ Guardado</span>}
                {modeSaving === 'error' && <span className="text-[11px] text-warning">Error al guardar — reintentá</span>}
              </div>
              <div className="flex gap-1.5 mb-2">
                {opts.map(o => (
                  <button key={o.value} onClick={() => setFollowUpMode(o.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${mode === o.value ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-text-secondary">{opts.find(o => o.value === mode)?.desc}</p>
            </div>
          )
        })()}
        {patient.load_share_token ? (
          <div>
            <p className="text-[13px] text-text-secondary mb-3">
              Compartí este link con {patient.name} para que vea sus ejercicios y registre sesiones desde el celular.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/paciente/${patient.load_share_token}`); alert('Link copiado') }}
                className="bg-[#24342A] border-[0.5px] border-[#34D399]/50 text-[#34D399] px-4 py-2 rounded-lg text-[13px] font-medium flex-grow truncate"
              >
                Enviar link al paciente
              </button>
              <button onClick={revokePortalToken} className="bg-bg-secondary border-[0.5px] border-border px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-warning" title="Revocar">
                X
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[13px] text-text-secondary mb-3">
              Generá un link único para que {patient.name} pueda ver sus ejercicios y registrar sus sesiones desde el celular.
            </p>
            <button onClick={generatePortalToken} disabled={generatingToken} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40">
              {generatingToken ? 'Generando...' : 'Generar link para el paciente'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
