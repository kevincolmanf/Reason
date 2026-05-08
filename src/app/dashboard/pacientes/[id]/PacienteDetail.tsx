'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Patient {
  id: string
  name: string
  age: number | null
  occupation: string | null
  created_at: string
}

interface Plan {
  id: string
  name: string
  updated_at: string
  share_token: string | null
  start_date: string | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function PacienteDetail({ patient: initialPatient, userId: _userId }: { patient: Patient, userId: string }) {
  const [patient, setPatient] = useState<Patient>(initialPatient)
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: initialPatient.name, age: initialPatient.age?.toString() || '', occupation: initialPatient.occupation || '' })
  const [saving, setSaving] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true)
    const { data, error } = await supabase
      .from('exercise_plans')
      .select('id, name, updated_at, share_token, start_date')
      .eq('patient_id', patient.id)
      .order('updated_at', { ascending: false })

    if (!error && data) setPlans(data)
    setPlansLoading(false)
  }, [supabase, patient.id])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

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

    if (!error && data) {
      setPatient(data)
      setEditing(false)
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar a ${patient.name}? Los planes asociados quedarán sin paciente asignado.`)) return
    const { error } = await supabase.from('patients').delete().eq('id', patient.id)
    if (!error) router.push('/dashboard/pacientes')
  }

  return (
    <div>
      {/* HEADER PACIENTE */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 mb-8">
        {editing ? (
          <div>
            <h2 className="text-[16px] font-medium mb-4">Editar datos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nombre *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Edad</label>
                <input
                  type="number"
                  value={editForm.age}
                  onChange={e => setEditForm(f => ({ ...f, age: e.target.value }))}
                  min="1" max="120"
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Ocupación</label>
                <input
                  type="text"
                  value={editForm.occupation}
                  onChange={e => setEditForm(f => ({ ...f, occupation: e.target.value }))}
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editForm.name.trim()}
                className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-[28px] font-medium tracking-[-0.01em] mb-3">{patient.name}</h1>
              <div className="flex flex-wrap gap-4 text-[14px] text-text-secondary">
                {patient.age && (
                  <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1">
                    {patient.age} años
                  </span>
                )}
                {patient.occupation && (
                  <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1">
                    {patient.occupation}
                  </span>
                )}
                <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[12px]">
                  Desde {new Date(patient.created_at).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary transition-colors"
              >
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-warning transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PLANES ASOCIADOS */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[20px] font-medium">Planes de Ejercicio</h2>
          <Link
            href="/dashboard/ejercicios/plan"
            className="text-accent text-[13px] font-medium hover:opacity-80 no-underline"
          >
            Ir a Mis Planes →
          </Link>
        </div>

        {plansLoading ? (
          <div className="text-text-secondary text-[14px]">Cargando planes...</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-12 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
            <p className="text-[15px] font-medium text-text-primary mb-2">Sin planes asociados</p>
            <p className="text-[13px] text-text-secondary max-w-[400px] mx-auto">
              Abrí un plan desde Mis Planes y seleccioná a {patient.name} en el campo Paciente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => (
              <Link key={plan.id} href={`/dashboard/ejercicios/plan/${plan.id}`} className="block no-underline">
                <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-[16px] font-medium text-text-primary leading-[1.3] pr-4">{plan.name}</h3>
                    {plan.share_token && (
                      <span className="text-accent flex-shrink-0" title="Compartido">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-text-secondary space-y-1">
                    {plan.start_date && <p>Inicio: {new Date(plan.start_date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
                    <p>Modificado: {new Date(plan.updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t-[0.5px] border-border opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-accent text-[13px] font-medium">Editar →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
