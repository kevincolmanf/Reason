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

  useEffect(() => {
    let cancelled = false
    supabaseRef.current
      .from('training_intake_evaluations')
      .select('data')
      .eq('patient_id', patientId)
      .maybeSingle()
      .then(({ data: existing }) => {
        if (cancelled) return
        if (existing) setData((existing.data as IntakeData) ?? {})
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [patientId])

  const persist = (next: IntakeData) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSaveStatus('saving')
    timeoutRef.current = setTimeout(async () => {
      const { error } = await supabaseRef.current
        .from('training_intake_evaluations')
        .upsert({ patient_id: patientId, user_id: userId, data: next })
      setSaveStatus(error ? 'error' : 'saved')
    }, 1500)
  }

  const update = (key: string, value: string) => {
    const next = { ...data, [key]: value }
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
          {saveStatus === 'saved' && <span className="text-[12px] text-[#3b82f6]">✓ Guardado</span>}
          {!complete && <span className="text-[12px] text-warning">Incompleta</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(field => (
          <div key={field.key}>
            <label className="block text-[12px] text-text-secondary mb-1">{field.label}</label>
            {field.type === 'quality' ? (
              <select value={data[field.key] ?? ''} onChange={e => update(field.key, e.target.value)}
                className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent">
                <option value="">Sin evaluar</option>
                {QUALITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type="number" step="1" value={data[field.key] ?? ''} onChange={e => update(field.key, e.target.value)}
                className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
