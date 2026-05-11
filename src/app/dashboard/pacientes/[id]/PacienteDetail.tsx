'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Patient {
  id: string
  name: string
  age: number | null
  occupation: string | null
  created_at: string
  load_share_token: string | null
}

export default function PacienteDetail({ patient: initialPatient }: { patient: Patient, userId: string }) {
  const [patient, setPatient] = useState<Patient>(initialPatient)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: initialPatient.name, age: initialPatient.age?.toString() || '', occupation: initialPatient.occupation || '' })
  const [saving, setSaving] = useState(false)
  const [generatingToken, setGeneratingToken] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const generatePortalToken = async () => {
    setGeneratingToken(true)
    const token = crypto.randomUUID()
    const { data, error } = await supabase
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
    const { data, error } = await supabase
      .from('patients')
      .update({ load_share_token: null })
      .eq('id', patient.id)
      .select()
      .single()
    if (!error && data) setPatient(data)
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('patients')
      .update({
        name: editForm.name.trim(),
        age: editForm.age ? parseInt(editForm.age) : null,
        occupation: editForm.occupation.trim() || null,
      })
      .eq('id', patient.id)
      .select()
      .single()
    if (!error && data) { setPatient(data); setEditing(false) }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar a ${patient.name}? Los planes asociados quedarán sin paciente asignado.`)) return
    const { error } = await supabase.from('patients').delete().eq('id', patient.id)
    if (!error) router.push('/dashboard/pacientes')
  }

  return (
    <div>
      {/* HEADER */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 mb-6">
        {editing ? (
          <div>
            <h2 className="text-[16px] font-medium mb-4">Editar datos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nombre *</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} autoFocus className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Edad</label>
                <input type="number" value={editForm.age} onChange={e => setEditForm(f => ({ ...f, age: e.target.value }))} min="1" max="120" className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Ocupación</label>
                <input type="text" value={editForm.occupation} onChange={e => setEditForm(f => ({ ...f, occupation: e.target.value }))} className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveEdit} disabled={saving || !editForm.name.trim()} className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40">
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
                {patient.age && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">{patient.age} años</span>}
                {patient.occupation && <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[13px] text-text-secondary">{patient.occupation}</span>}
                <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[12px] text-text-secondary">
                  Desde {new Date(patient.created_at).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setEditing(true)} className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary transition-colors">Editar</button>
              <button onClick={handleDelete} className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-warning transition-colors">Eliminar</button>
            </div>
          </div>
        )}
      </div>

      {/* 3 CARDS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Link href={`/dashboard/pacientes/${patient.id}/ficha`} className="block no-underline group">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full">
            <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Expediente clínico</div>
            <div className="text-[18px] font-medium mb-1">Ficha Clínica</div>
            <div className="text-[13px] text-text-secondary">Anamnesis, diagnóstico, goniometría, cuestionarios, dinamometría</div>
            <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Abrir →</div>
          </div>
        </Link>

        <Link href={`/dashboard/pacientes/${patient.id}/carga`} className="block no-underline group">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full">
            <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Seguimiento</div>
            <div className="text-[18px] font-medium mb-1">Monitoreo de Carga</div>
            <div className="text-[13px] text-text-secondary">Sesiones, ACWR, VAS, RPE y consejo semanal</div>
            <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Abrir →</div>
          </div>
        </Link>

        <Link href={`/dashboard/ejercicios/plan?paciente=${patient.id}`} className="block no-underline group">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full">
            <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Ejercicio</div>
            <div className="text-[18px] font-medium mb-1">Plan de Ejercicio</div>
            <div className="text-[13px] text-text-secondary">Planificación de ejercicios y bloques de entrenamiento</div>
            <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Abrir →</div>
          </div>
        </Link>

        <Link href={`/dashboard/pacientes/${patient.id}/calendario`} className="block no-underline group">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full">
            <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Planificación</div>
            <div className="text-[18px] font-medium mb-1">Calendario</div>
            <div className="text-[13px] text-text-secondary">Programá sesiones en fechas específicas para el paciente</div>
            <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Abrir →</div>
          </div>
        </Link>

        <Link href={`/dashboard/pacientes/${patient.id}/rts`} className="block no-underline group">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full">
            <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Protocolo LCA</div>
            <div className="text-[18px] font-medium mb-1">Retorno al Deporte</div>
            <div className="text-[13px] text-text-secondary">Evaluación de criterios RTS: fuerza, funcional, psicológico y médico</div>
            <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Abrir →</div>
          </div>
        </Link>
      </div>

      {/* PORTAL */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[14px] font-medium">Portal del Paciente</h2>
        </div>
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
