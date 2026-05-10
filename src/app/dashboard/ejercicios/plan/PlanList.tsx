'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ExercisePlan {
  id: string
  name: string
  updated_at: string
  share_token: string | null
  patient_id: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patients: any
}

const initialPlanData = {
  sessions: [1, 2, 3, 4, 5, 6, 7].map(s => ({
    id: `session_${s}`,
    name: `Sesión ${s}`,
    blocks: [
      { id: 'movilidad', name: 'Movilidad', exercises: [] },
      { id: 'activacion', name: 'Activación', exercises: [] },
      { id: 'principal', name: 'Principal', exercises: [] }
    ]
  }))
}

export default function PlanList({ userId, patientId }: { userId: string; patientId: string | null }) {
  const [plans, setPlans] = useState<ExercisePlan[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('exercise_plans')
      .select('id, name, updated_at, share_token, patient_id, patients(name)')
      .order('updated_at', { ascending: false })

    if (patientId) query = query.eq('patient_id', patientId)

    const { data, error } = await query
    if (!error && data) setPlans(data)
    setLoading(false)
  }, [supabase, patientId])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const handleCreatePlan = async () => {
    const name = prompt('Nombre del nuevo plan (ej: Plan Rodilla Post-quirúrgico):')
    if (!name) return

    const { data, error } = await supabase
      .from('exercise_plans')
      .insert({
        user_id: userId,
        name,
        plan_data: initialPlanData,
        ...(patientId ? { patient_id: patientId } : {}),
      })
      .select()
      .single()

    if (error) {
      alert('Error al crear el plan')
      console.error(error)
    } else if (data) {
      router.push(`/dashboard/ejercicios/plan/${data.id}`)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    if (!confirm('¿Estás seguro de eliminar este plan? Esta acción no se puede deshacer.')) return

    const { error } = await supabase.from('exercise_plans').delete().eq('id', id)
    if (error) {
      alert('Error al eliminar')
    } else {
      fetchPlans()
    }
  }

  const handleDuplicate = async (e: React.MouseEvent, plan: ExercisePlan) => {
    e.preventDefault()
    
    // Fetch full plan data to duplicate
    const { data: fullPlan, error: fetchError } = await supabase
      .from('exercise_plans')
      .select('plan_data, notes')
      .eq('id', plan.id)
      .single()
      
    if (fetchError || !fullPlan) {
      alert('Error al recuperar datos para duplicar')
      return
    }

    const newName = `${plan.name} (Copia)`
    
    const { data, error } = await supabase
      .from('exercise_plans')
      .insert({
        user_id: userId,
        name: newName,
        plan_data: fullPlan.plan_data,
        notes: fullPlan.notes,
        // No copiamos el share_token
      })
      .select()
      .single()

    if (error) {
      alert('Error al duplicar el plan')
    } else if (data) {
      fetchPlans()
    }
  }

  if (loading) {
    return <div className="text-text-secondary">Cargando planes...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[20px] font-medium">{patientId ? 'Planes asignados' : 'Tus Planes Guardados'}</h2>
        <button 
          onClick={handleCreatePlan}
          className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          + Crear Nuevo Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16 text-text-secondary bg-bg-secondary rounded-xl border-[0.5px] border-border">
          <p className="text-[16px] mb-2">{patientId ? 'Este paciente no tiene planes asignados' : 'Aún no creaste ningún plan'}</p>
          <p className="text-[14px]">Hacé clic en Crear Nuevo Plan para empezar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <Link key={plan.id} href={`/dashboard/ejercicios/plan/${plan.id}`} className="block no-underline">
              <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full flex flex-col group">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-[18px] font-medium text-text-primary leading-[1.3] pr-4">{plan.name}</h3>
                  {plan.share_token && (
                    <span title="Compartido con paciente" className="text-accent flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>
                      </svg>
                    </span>
                  )}
                </div>
                
                {plan.patients && (
                  <p className="text-[12px] text-accent mb-1">{plan.patients.name}</p>
                )}
                <p className="text-[12px] text-text-secondary mb-6">
                  Modificado: {new Date(plan.updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                
                <div className="mt-auto pt-4 border-t-[0.5px] border-border flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-accent text-[13px] font-medium">Editar →</span>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={(e) => handleDuplicate(e, plan)}
                      className="text-text-secondary hover:text-text-primary text-[12px]"
                      title="Duplicar"
                    >
                      Copiar
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, plan.id)}
                      className="text-text-secondary hover:text-warning text-[12px]"
                      title="Eliminar"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
