'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Ficha {
  id: string
  fecha: string | null
  ficha_data: Record<string, unknown>
}

interface Props {
  region: string
  examenTestText: string
}

export default function SaveRedFlagsToFicha({ region, examenTestText }: Props) {
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [loadingFichas, setLoadingFichas] = useState(false)
  const [selectedFichaId, setSelectedFichaId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
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
        setLoadingPatients(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedPatientId) { setFichas([]); return }
    setLoadingFichas(true)
    setSelectedFichaId('')
    const supabase = createClient()
    supabase
      .from('patient_fichas')
      .select('id, fecha, ficha_data')
      .eq('patient_id', selectedPatientId)
      .order('fecha', { ascending: false })
      .then(({ data }) => {
        const list = data ?? []
        setFichas(list)
        if (list.length > 0) setSelectedFichaId(list[0].id)
        setLoadingFichas(false)
      })
  }, [selectedPatientId])

  const handleSave = async () => {
    if (!selectedPatientId || !selectedFichaId) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const ficha = fichas.find(f => f.id === selectedFichaId)
    if (!ficha) { setError('Ficha no encontrada.'); setSaving(false); return }

    const existing = (ficha.ficha_data?.examenTest as string) || ''
    const separator = existing.trim() ? '\n\n' : ''
    const updatedExamenTest = existing + separator + examenTestText

    const { error: updateError } = await supabase
      .from('patient_fichas')
      .update({ ficha_data: { ...ficha.ficha_data, examenTest: updatedExamenTest } })
      .eq('id', selectedFichaId)

    if (updateError) {
      setError('Error al guardar. Intentá de nuevo.')
      setSaving(false)
      return
    }

    setSaved(true)
    setTimeout(() => {
      router.push(`/dashboard/pacientes/${selectedPatientId}/fichas/${selectedFichaId}`)
    }, 800)
  }

  if (loadingPatients) return null

  const formatFichaLabel = (f: Ficha) => {
    if (!f.fecha) return 'Sin fecha'
    return new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 mt-6">
      <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-3">
        Agregar a ficha kinésica — Banderas Rojas {region}
      </div>

      {patients.length === 0 ? (
        <p className="text-[13px] text-text-secondary">
          Creá un paciente en{' '}
          <Link href="/dashboard/pacientes" className="text-accent hover:underline">Pacientes</Link>{' '}
          para poder guardar el resultado en una ficha.
        </p>
      ) : saved ? (
        <p className="text-[14px] font-medium text-accent">✓ Guardado. Abriendo ficha...</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value)}
              className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-accent min-w-[160px]"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {loadingFichas ? (
              <span className="text-[13px] text-text-secondary py-2">Cargando fichas...</span>
            ) : fichas.length === 0 ? (
              <span className="text-[13px] text-text-secondary py-2">
                Este paciente no tiene fichas.{' '}
                <Link href={`/dashboard/pacientes/${selectedPatientId}`} className="text-accent hover:underline">
                  Crear una →
                </Link>
              </span>
            ) : (
              <select
                value={selectedFichaId}
                onChange={e => setSelectedFichaId(e.target.value)}
                className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-accent min-w-[160px]"
              >
                {fichas.map(f => (
                  <option key={f.id} value={f.id}>Ficha {formatFichaLabel(f)}</option>
                ))}
              </select>
            )}
          </div>

          {fichas.length > 0 && (
            <div>
              <button
                onClick={handleSave}
                disabled={saving || !selectedFichaId}
                className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {saving ? 'Guardando...' : 'Agregar a esta ficha'}
              </button>
              {error && <span className="text-[12px] text-warning ml-3">{error}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
