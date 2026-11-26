'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { INTAKE_FIELD_CATALOG, QUALITY_OPTIONS, isIntakeComplete } from '@/lib/qualityStandards/intakeFields'

type IntakeData = Record<string, string>

export default function EvaluacionIngresoEntrenamiento({
  patientId, userId, requiredFields,
}: {
  patientId: string
  userId: string
  requiredFields: string[]
}) {
  const [data, setData] = useState<IntakeData>({})
  const [loaded, setLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const supabaseRef = useRef(createClient())
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Última copia conocida de los datos, actualizada de forma síncrona en cada
  // update() — evita perder un campo cuando dos onChange (p. ej. tabulando
  // rápido entre los dos lados de dorsiflexión) caen en el mismo batch de
  // React: calcular `next` a partir del estado `data` del render (en vez de
  // este ref) perdía el cambio anterior porque ambos leían el mismo `data`
  // desactualizado.
  const dataRef = useRef<IntakeData>({})

  useEffect(() => {
    let cancelled = false
    supabaseRef.current
      .from('training_intake_evaluations')
      .select('data')
      .eq('patient_id', patientId)
      .maybeSingle()
      .then(({ data: existing }) => {
        if (cancelled) return
        const loadedData = (existing?.data as IntakeData) ?? {}
        dataRef.current = loadedData
        setData(loadedData)
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [patientId])

  const persist = (next: IntakeData) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSaveStatus('saving')
    timeoutRef.current = setTimeout(async () => {
      // onConflict explícito: el conflicto real es la unicidad de patient_id,
      // no la primary key (id) — sin esto Postgres no resuelve el choque con
      // el UPDATE y devuelve 409 en cada upsert después del primero.
      const { error } = await supabaseRef.current
        .from('training_intake_evaluations')
        .upsert({ patient_id: patientId, user_id: userId, data: next }, { onConflict: 'patient_id' })
      setSaveStatus(error ? 'error' : 'saved')
    }, 1500)
  }

  const update = (key: string, value: string) => {
    const next = { ...dataRef.current, [key]: value }
    dataRef.current = next
    setData(next)
    persist(next)
  }

  if (!loaded || requiredFields.length === 0) return null

  const fields = INTAKE_FIELD_CATALOG.filter(f => requiredFields.includes(f.key))
  const complete = isIntakeComplete(data, requiredFields)

  return (
    <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[15px] font-medium tracking-[-0.01em] inline">Evaluación de ingreso</h2>
          <span className="text-[11px] text-text-tertiary ml-2">entrenamiento</span>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && <span className="text-[12px] text-text-secondary">Guardando…</span>}
          {saveStatus === 'error' && <span className="text-[12px] text-warning">Error al guardar</span>}
          {saveStatus === 'saved' && <span className="text-[12px] text-[#3b82f6]">✓ Guardado</span>}
          {!complete && <span className="text-[12px] text-warning">Incompleta</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(field => {
          const inputId = `intake-${field.key}`
          return (
            <div key={field.key}>
              <label htmlFor={inputId} className="block text-[12px] text-text-secondary mb-1">{field.label}</label>
              {field.type === 'quality' ? (
                <select id={inputId} value={data[field.key] ?? ''} onChange={e => update(field.key, e.target.value)}
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent">
                  <option value="">Sin evaluar</option>
                  {QUALITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input id={inputId} type="number" step="1" value={data[field.key] ?? ''} onChange={e => update(field.key, e.target.value)}
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
