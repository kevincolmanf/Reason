'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  region: string
  examenTestText: string
}

export default function SaveRedFlagsToFicha({ region, examenTestText }: Props) {
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('patients')
      .select('id, name')
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setPatients(data)
          if (data.length > 0) setSelectedPatientId(data[0].id)
        }
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    if (!selectedPatientId) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('No autenticado.'); setSaving(false); return }

    const { data, error: insertError } = await supabase
      .from('patient_fichas')
      .insert({
        patient_id: selectedPatientId,
        user_id: user.id,
        fecha: new Date().toISOString().split('T')[0],
        ficha_data: { examenTest: examenTestText },
      })
      .select()
      .single()

    if (insertError || !data) {
      setError('Error al guardar. Intentá de nuevo.')
      setSaving(false)
      return
    }

    router.push(`/dashboard/pacientes/${selectedPatientId}/fichas/${data.id}`)
  }

  if (loading) return null

  return (
    <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 mt-6">
      <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-3">
        Guardar en ficha kinésica — Banderas Rojas {region}
      </div>
      {patients.length === 0 ? (
        <p className="text-[13px] text-text-secondary">
          Creá un paciente en{' '}
          <Link href="/dashboard/pacientes" className="text-accent hover:underline">
            Pacientes
          </Link>{' '}
          para poder guardar el resultado en una ficha.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedPatientId}
            onChange={e => setSelectedPatientId(e.target.value)}
            className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-accent min-w-[180px]"
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={saving || !selectedPatientId}
            className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving ? 'Guardando...' : 'Crear ficha con resultado'}
          </button>
          {error && <span className="text-[12px] text-warning">{error}</span>}
        </div>
      )}
    </div>
  )
}
