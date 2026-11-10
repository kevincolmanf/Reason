'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import ObraSocialField from '@/components/ObraSocialField'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import QuickSessionSheet from '@/components/QuickSessionSheet'
import AtencionDeHoy, { type Attention, type KineSession } from './AtencionDeHoy'
import { useConfirm, useToast } from '@/components/Dialogs'

interface Patient {
  id: string
  name: string
  dni: string | null
  age: number | null
  birth_date: string | null
  phone: string | null
  email: string | null
  obra_social: string | null
  affiliate_number: string | null
  occupation: string | null
  source: string | null
  created_at: string
  org_id: string | null
  load_share_token: string | null
  follow_up_mode?: string | null
  plan_mode?: string | null
  kine_mode?: boolean | null
  advanced_load_mode?: boolean | null
  habitual_professional_id?: string | null
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

// Tiempo de tratamiento desde el día en que se cargó el primer plan. Contamos
// desde el día 1: recién cargado muestra "Semana 1 · Mes 1".
function treatmentDuration(start: string | null): string | null {
  if (!start) return null
  const from = new Date(start)
  const now = new Date()
  const days = Math.floor((now.getTime() - from.getTime()) / 86400000)
  if (days < 0) return null
  const week = Math.floor(days / 7) + 1
  let months = (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth())
  if (now.getDate() < from.getDate()) months--
  const month = Math.max(0, months) + 1
  return `Semana ${week} · Mes ${month} de tratamiento`
}

export default function PacienteDetail({ patient: initialPatient, userId, treatmentStart = null, professionals = [], hasFicha = false, patientHasTurnos = false, initialAttentions = [], kineSession = null }: { patient: Patient; userId: string; treatmentStart?: string | null; professionals?: { id: string; full_name: string | null }[]; hasFicha?: boolean; patientHasTurnos?: boolean; initialAttentions?: Attention[]; kineSession?: KineSession | null }) {
  const isOwner = initialPatient.user_id === userId
  // Sugerencia del Modo Kinesiología: el paciente tiene turnos en la agenda.
  const hasTurnos = patientHasTurnos
  // Señal para el bloque "primeros pasos" de un paciente recién creado.
  // hasPlan se infiere de treatmentStart (fecha del primer plan cargado).
  const hasPlan = !!treatmentStart
  const { confirm, confirmDialog } = useConfirm()
  const { notify, toast } = useToast()
  const [patient, setPatient] = useState<Patient>(initialPatient)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: initialPatient.name,
    dni: initialPatient.dni || '',
    birth_date: initialPatient.birth_date || '',
    phone: initialPatient.phone || '',
    email: initialPatient.email || '',
    obra_social: initialPatient.obra_social || '',
    affiliate_number: initialPatient.affiliate_number || '',
    occupation: initialPatient.occupation || '',
    source: initialPatient.source || '',
    habitual_professional_id: initialPatient.habitual_professional_id || '',
  })
  const [sources, setSources] = useState<PatientSource[]>([])
  const [saving, setSaving] = useState(false)
  const [dniError, setDniError] = useState<string | null>(null)
  const [sessionSheet, setSessionSheet] = useState(false)
  const [sessionSaved, setSessionSaved] = useState(false)

  const router = useRouter()
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const url = initialPatient.org_id
      ? `/api/pacientes/fuentes?orgId=${initialPatient.org_id}`
      : '/api/pacientes/fuentes'
    fetch(url).then(r => r.ok ? r.json() : []).then(setSources)
  }, [initialPatient.org_id])

  // Modo Kinesiología: enciende la capa "Atención de hoy" para este paciente.
  // No afecta a nadie más — es un flag por paciente, default apagado.
  const [kineSaving, setKineSaving] = useState(false)
  const setKineMode = async (enabled: boolean) => {
    if ((patient.kine_mode ?? false) === enabled) return
    setPatient(p => ({ ...p, kine_mode: enabled })) // optimista
    setKineSaving(true)
    try {
      const res = await fetch('/api/pacientes/kine-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, enabled }),
      })
      if (!res.ok) throw new Error()
      notify(enabled ? 'Modo kinesiología activado' : 'Modo kinesiología desactivado')
    } catch {
      setPatient(p => ({ ...p, kine_mode: !enabled }))
      notify('No se pudo cambiar el modo kinesiología.', 'error')
    } finally {
      setKineSaving(false)
    }
  }

  // Monitoreo de carga avanzado: enciende la card de Carga, el botón "+
  // Registrar sesión" (ficha y agenda) y el acceso a RPE/VAS/ACWR para este
  // paciente. Pensado para deportistas — el default es false, así que el flujo
  // diario con pacientes comunes no muestra nada de esto.
  const [advLoadSaving, setAdvLoadSaving] = useState(false)
  const setAdvancedLoadMode = async (enabled: boolean) => {
    if ((patient.advanced_load_mode ?? false) === enabled) return
    setPatient(p => ({ ...p, advanced_load_mode: enabled })) // optimista
    setAdvLoadSaving(true)
    try {
      const res = await fetch('/api/pacientes/advanced-load-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, enabled }),
      })
      if (!res.ok) throw new Error()
      notify(enabled ? 'Monitoreo de carga avanzado activado' : 'Monitoreo de carga avanzado desactivado')
    } catch {
      setPatient(p => ({ ...p, advanced_load_mode: !enabled }))
      notify('No se pudo cambiar el monitoreo de carga avanzado.', 'error')
    } finally {
      setAdvLoadSaving(false)
    }
  }

  const setPlanMode = async (mode: 'detallado' | 'simple') => {
    const prev = patient.plan_mode ?? 'detallado'
    if (mode === prev) return
    setPatient(p => ({ ...p, plan_mode: mode })) // optimista
    try {
      const res = await fetch('/api/pacientes/plan-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, mode }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setPatient(p => ({ ...p, plan_mode: prev }))
      notify('No se pudo cambiar el modo de planificación.', 'error')
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
        affiliate_number: editForm.affiliate_number.trim() || null,
        occupation: editForm.occupation.trim() || null,
        source: editForm.source || null,
        habitual_professional_id: editForm.habitual_professional_id || null,
      })
      .eq('id', patient.id)
      .select()
      .single()
    if (!error && data) { setPatient(data); setEditing(false) }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!(await confirm({ title: 'Eliminar paciente', message: `¿Eliminar a ${patient.name}? Los planes asociados quedarán sin paciente asignado.`, danger: true, confirmLabel: 'Eliminar' }))) return
    const { error } = await supabaseRef.current.from('patients').delete().eq('id', patient.id)
    if (!error) router.push('/dashboard/pacientes')
  }

  return (
    <div>
      {confirmDialog}
      {toast}
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
                <ObraSocialField
                  value={editForm.obra_social}
                  onChange={v => setEditForm(f => ({ ...f, obra_social: v }))}
                  orgId={patient.org_id}
                  userId={userId}
                  inputClassName="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">N° de afiliado</label>
                <input type="text" value={editForm.affiliate_number} onChange={e => setEditForm(f => ({ ...f, affiliate_number: e.target.value }))} placeholder="Ej: 123456789" className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
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
              {professionals.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Profesional habitual</label>
                  <select value={editForm.habitual_professional_id} onChange={e => setEditForm(f => ({ ...f, habitual_professional_id: e.target.value }))} className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent">
                    <option value="">Sin asignar</option>
                    {professionals.map(p => <option key={p.id} value={p.id}>{p.full_name ?? p.id}</option>)}
                  </select>
                  <p className="text-[11px] text-text-secondary mt-1">Se cargará por defecto al darle turno a este paciente.</p>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Modo de planificación</label>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setPlanMode('detallado')}
                    className={`px-3 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${(patient.plan_mode ?? 'detallado') !== 'simple' ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}>
                    Detallado
                  </button>
                  <button type="button" onClick={() => setPlanMode('simple')}
                    className={`px-3 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${(patient.plan_mode ?? 'detallado') === 'simple' ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}>
                    Simple
                  </button>
                </div>
                <p className="text-[11px] text-text-secondary mt-1">Detallado: plan de ejercicio con series/reps en el calendario. Simple: bitácora de actividad, sin dosificación.</p>
              </div>
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
              <h1 data-tour="ficha-header" className="text-[24px] sm:text-[28px] font-medium tracking-[-0.01em] mb-3">{patient.name}</h1>
              <div className="flex flex-wrap gap-2">
                {patient.dni && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">DNI {patient.dni}</span>}
                {(() => { const age = calcAge(patient.birth_date) ?? patient.age; return age ? <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">{age} años</span> : null })()}
                {patient.birth_date && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">{new Date(patient.birth_date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                {patient.occupation && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">{patient.occupation}</span>}
                {patient.phone && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">{patient.phone}</span>}
                {patient.email && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">{patient.email}</span>}
                {patient.obra_social && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">{patient.obra_social}{patient.affiliate_number ? ` · Nº ${patient.affiliate_number}` : ''}</span>}
                {patient.source && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">Vía: {patient.source}</span>}
                <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">
                  Desde {new Date(patient.created_at).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                </span>
                {treatmentDuration(treatmentStart) && (
                  <span className="bg-accent/10 border-[0.5px] border-accent/30 rounded-full px-3 py-1 text-[13px] text-accent font-medium">
                    {treatmentDuration(treatmentStart)}
                  </span>
                )}
                {patient.kine_mode && (
                  <span className="bg-accent/10 border-[0.5px] border-accent/30 rounded-full px-3 py-1 text-[13px] text-accent font-medium">
                    Modo kinesiología
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0 items-center flex-wrap">
              {sessionSaved && <span className="text-[12px] text-[#4ade80]">✓ Sesión registrada</span>}
              {(patient.advanced_load_mode ?? false) && (
                <button onClick={() => setSessionSheet(true)} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">
                  + Registrar sesión
                </button>
              )}
              <button
                data-tour="ficha-modo-kine"
                onClick={() => setKineMode(!(patient.kine_mode ?? false))}
                disabled={kineSaving}
                title="El modo kinesiología agrega la capa &quot;Atención de hoy&quot; (check de síntoma, sugerencia y continuidad) a este paciente. No afecta a los demás."
                className={`px-4 py-2 rounded-lg text-[13px] border-[0.5px] transition-colors disabled:opacity-50 ${
                  patient.kine_mode
                    ? 'bg-accent/10 border-accent/40 text-accent hover:bg-accent/15'
                    : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {patient.kine_mode
                  ? 'Modo kine activo'
                  : (hasTurnos ? 'Activar modo kine · sugerido' : 'Activar modo kine')}
              </button>
              <button
                onClick={() => setAdvancedLoadMode(!(patient.advanced_load_mode ?? false))}
                disabled={advLoadSaving}
                title="Monitoreo de carga avanzado: RPE, dolor y ACWR por sesión. Pensado para deportistas — no afecta a los demás pacientes."
                className={`px-4 py-2 rounded-lg text-[13px] border-[0.5px] transition-colors disabled:opacity-50 ${
                  patient.advanced_load_mode
                    ? 'bg-accent/10 border-accent/40 text-accent hover:bg-accent/15'
                    : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {patient.advanced_load_mode ? 'Carga avanzada activa' : 'Activar carga avanzada'}
              </button>
              <button onClick={() => setEditing(true)} className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary transition-colors">Editar</button>
              {isOwner && <button onClick={handleDelete} className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-warning transition-colors">Eliminar</button>}
            </div>
          </div>
        )}
      </div>

      {/* BARRA DE ACCESOS — compacta, siempre arriba de "Atención de hoy" para
          que nunca quede escondida por el tamaño de esa sección. Links de
          salida (no hay "activo": cada uno lleva a una página distinta). */}
      <nav className="inline-flex items-center gap-0.5 bg-bg-tertiary border-[0.5px] border-border-strong rounded-2xl p-1 mb-6 shadow-sm overflow-x-auto max-w-full">
        <Link href={`/dashboard/pacientes/${patient.id}/ficha`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-5-5h-3"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>
          Ficha
        </Link>
        {patient.kine_mode && (
          <Link href={`/dashboard/pacientes/${patient.id}#atencion-de-hoy`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="m9 14 2 2 4-4"/></svg>
            Atención
          </Link>
        )}
        {(patient.plan_mode ?? 'detallado') === 'simple' ? (
          <Link href={`/dashboard/pacientes/${patient.id}/bitacora`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/></svg>
            Bitácora
          </Link>
        ) : (
          <Link href={`/dashboard/ejercicios/plan?paciente=${patient.id}`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/></svg>
            Plan
          </Link>
        )}
        <Link href={`/dashboard/pacientes/${patient.id}/hitos`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h12l-3 4 3 4H4"/><line x1="4" y1="2" x2="4" y2="22"/></svg>
          Hitos
        </Link>
        <Link href={`/dashboard/pacientes/${patient.id}/historial`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
          Historial
        </Link>
        <Link href={`/dashboard/pacientes/${patient.id}/portal`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          Portal
        </Link>
        <Link href={`/dashboard/pacientes/${patient.id}/rts`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
          RTS
        </Link>
        {(patient.advanced_load_mode ?? false) && (
          <Link href={`/dashboard/pacientes/${patient.id}/carga`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18M7 15l3-4 3 2 4-6"/></svg>
            Carga
          </Link>
        )}
      </nav>

      {/* ATENCIÓN DE HOY — solo en pacientes en modo kinesiología. */}
      {patient.kine_mode && (
        <AtencionDeHoy patientId={patient.id} userId={userId} initialAttentions={initialAttentions} kineSession={kineSession} planMode={patient.plan_mode} />
      )}

      {sessionSheet && (
        <QuickSessionSheet
          patientId={patient.id}
          patientName={patient.name}
          onClose={() => setSessionSheet(false)}
          onSaved={() => { setSessionSaved(true); setTimeout(() => setSessionSaved(false), 3000) }}
        />
      )}

      {/* PRIMEROS PASOS — solo mientras el paciente está "vacío" (sin ficha ni plan).
          Desaparece solo en cuanto arranca el trabajo, para no molestar después. */}
      {!hasFicha && !hasPlan && (
        <div className="bg-accent/5 border-[0.5px] border-accent/30 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-[15px] font-medium">Primeros pasos con {patient.name.split(/\s+/)[0]}</h2>
          </div>
          <p className="text-[13px] text-text-secondary mb-4">Paciente recién creado. El camino habitual: completar la ficha y armar el plan.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/dashboard/pacientes/${patient.id}/ficha`} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity no-underline">
              1 · Completar la ficha kinésica
            </Link>
            <Link
              href={(patient.plan_mode ?? 'detallado') === 'simple'
                ? `/dashboard/pacientes/${patient.id}/bitacora`
                : `/dashboard/ejercicios/plan?paciente=${patient.id}`}
              className="bg-bg-secondary border-[0.5px] border-border text-text-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:border-border-strong transition-colors no-underline"
            >
              2 · Armar el plan de ejercicio
            </Link>
          </div>
        </div>
      )}

      {/* Siguiente paso cuando ya hay ficha pero todavía no hay plan. */}
      {hasFicha && !hasPlan && (
        <div className="bg-bg-primary border-[0.5px] border-border rounded-xl px-5 py-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-text-secondary">
            <span className="text-text-primary font-medium">Siguiente paso:</span> armá el plan de ejercicio para {patient.name.split(/\s+/)[0]}.
          </p>
          <Link
            href={(patient.plan_mode ?? 'detallado') === 'simple'
              ? `/dashboard/pacientes/${patient.id}/bitacora`
              : `/dashboard/ejercicios/plan?paciente=${patient.id}`}
            className="shrink-0 bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity no-underline"
          >
            Armar el plan →
          </Link>
        </div>
      )}

    </div>
  )
}
