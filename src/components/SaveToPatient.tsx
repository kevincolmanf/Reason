'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

interface Patient {
  id: string
  name: string
}

interface SaveToPatientProps {
  questionnaireType: string
  questionnaireName: string
  score: number
  interpretation: string
  resultData: Record<string, unknown>
}

export default function SaveToPatient({
  questionnaireType,
  questionnaireName,
  score,
  interpretation,
  resultData,
}: SaveToPatientProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [savedPatientName, setSavedPatientName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPatients = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('patients')
        .select('id, name')
        .order('name', { ascending: true })
      if (data) {
        setPatients(data)
        if (data.length > 0) setSelectedPatientId(data[0].id)
      }
      setLoadingPatients(false)
    }
    fetchPatients()
  }, [])

  const handleSave = async () => {
    if (!selectedPatientId) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('No autenticado.')
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from('questionnaire_results').insert({
      user_id: user.id,
      patient_id: selectedPatientId,
      questionnaire_type: questionnaireType,
      score,
      interpretation,
      result_data: resultData,
    })

    if (insertError) {
      setError('Error al guardar. Intentá de nuevo.')
    } else {
      const patient = patients.find(p => p.id === selectedPatientId)
      setSavedPatientName(patient?.name ?? 'el paciente')
    }
    setSaving(false)
  }

  if (loadingPatients) return null

  return (
    <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 mt-6">
      <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-3">
        Guardar resultado — {questionnaireName}
      </div>

      {patients.length === 0 ? (
        <p className="text-[13px] text-text-secondary">
          Creá un paciente en la sección{' '}
          <Link href="/dashboard/pacientes" className="text-accent hover:underline">
            Pacientes
          </Link>{' '}
          para guardar resultados.
        </p>
      ) : savedPatientName ? (
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-medium text-accent">✓ Guardado en {savedPatientName}</span>
          <Link
            href="/dashboard/pacientes"
            className="text-[13px] text-text-secondary hover:text-accent underline"
          >
            Ver pacientes →
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedPatientId}
            onChange={e => setSelectedPatientId(e.target.value)}
            className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-accent min-w-[180px]"
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={saving || !selectedPatientId}
            className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving ? 'Guardando...' : 'Guardar en paciente'}
          </button>
          {error && <span className="text-[12px] text-warning">{error}</span>}
        </div>
      )}
    </div>
  )
}
