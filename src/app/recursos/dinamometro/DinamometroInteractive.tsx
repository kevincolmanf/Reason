'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface DinamometroProps {
  patients: { id: string, name: string }[]
  userId: string | null
}

const MUSCLE_GROUPS = [
  {
    key: 'quad',
    label: 'Cuádriceps',
    region: 'Miembro Inferior',
    position: 'Sentado, rodilla a 90°',
    hqPair: 'hamstring',
  },
  {
    key: 'hamstring',
    label: 'Isquiotibiales',
    region: 'Miembro Inferior',
    position: 'Prono, rodilla a 90°',
    hqPair: 'quad',
  },
  {
    key: 'hip_abductor',
    label: 'Abductores de Cadera',
    region: 'Miembro Inferior',
    position: 'Decúbito lateral, cadera neutra',
    hqPair: null,
  },
  {
    key: 'hip_adductor',
    label: 'Aductores de Cadera',
    region: 'Miembro Inferior',
    position: 'Decúbito lateral, cadera neutra',
    hqPair: null,
  },
  {
    key: 'hip_ext_rotator',
    label: 'Rotadores Externos de Cadera',
    region: 'Miembro Inferior',
    position: 'Sentado, rodilla a 90°, resistencia sobre tobillo',
    hqPair: null,
  },
  {
    key: 'shoulder_ext_rotator',
    label: 'Rotadores Externos de Hombro',
    region: 'Miembro Superior',
    position: 'Decúbito supino, hombro a 0°, codo a 90°',
    hqPair: null,
  },
  {
    key: 'shoulder_abductor',
    label: 'Abductores de Hombro',
    region: 'Miembro Superior',
    position: 'Sentado, hombro a 90° abducción',
    hqPair: null,
  },
  {
    key: 'elbow_flexor',
    label: 'Flexores de Codo (Bíceps)',
    region: 'Miembro Superior',
    position: 'Sentado, codo a 90°',
    hqPair: null,
  },
]

type Results = Record<string, { right: string, left: string }>

export default function DinamometroInteractive({ patients, userId }: DinamometroProps) {
  const [unit, setUnit] = useState<'kg' | 'N'>('kg')
  const [results, setResults] = useState<Results>({})
  const [affectedSide, setAffectedSide] = useState<'right' | 'left'>('left')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id ?? '')

  const setResult = (key: string, side: 'right' | 'left', value: string) => {
    setResults(prev => ({
      ...prev,
      [key]: { ...prev[key], [side]: value }
    }))
    setSavedId(null)
  }

  const getLSI = (key: string): number | null => {
    const r = parseFloat(results[key]?.right || '')
    const l = parseFloat(results[key]?.left || '')
    if (!r || !l || r <= 0 || l <= 0) return null
    const affected = affectedSide === 'left' ? l : r
    const unaffected = affectedSide === 'left' ? r : l
    return Math.round((affected / unaffected) * 100)
  }

  const lsiColor = (lsi: number) => {
    if (lsi >= 90) return '#22c55e'
    if (lsi >= 80) return '#f59e0b'
    return '#ef4444'
  }

  const getHQRatio = (side: 'right' | 'left'): number | null => {
    const ham = parseFloat(results['hamstring']?.[side] || '')
    const quad = parseFloat(results['quad']?.[side] || '')
    if (!ham || !quad || ham <= 0 || quad <= 0) return null
    return Math.round((ham / quad) * 100) / 100
  }

  const hqColor = (ratio: number) => {
    if (ratio >= 0.50 && ratio <= 0.70) return '#22c55e'
    if ((ratio >= 0.40 && ratio < 0.50) || (ratio > 0.70 && ratio <= 0.80)) return '#f59e0b'
    return '#ef4444'
  }

  const hasAnyResult = Object.values(results).some(v => v?.right || v?.left)
  const showHQ = (results['quad']?.right || results['quad']?.left || results['hamstring']?.right || results['hamstring']?.left)

  const completedMuscles = MUSCLE_GROUPS.filter(mg => results[mg.key]?.right || results[mg.key]?.left)

  const handleSave = async () => {
    if (!userId || !selectedPatientId) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('dynamometer_results').insert({
      user_id: userId,
      patient_id: selectedPatientId,
      unit,
      muscle_results: results,
      notes: notes.trim() || null,
    }).select('id').single()
    if (!error && data) setSavedId(data.id)
    setSaving(false)
  }

  const lowerMuscles = MUSCLE_GROUPS.filter(mg => mg.region === 'Miembro Inferior')
  const upperMuscles = MUSCLE_GROUPS.filter(mg => mg.region === 'Miembro Superior')

  return (
    <div>
      {/* Top controls */}
      <div className="flex flex-wrap gap-6 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Unidad</div>
          <div className="flex gap-2">
            {(['kg', 'N'] as const).map(u => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${unit === u ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Lado afectado</div>
          <div className="flex gap-2">
            {([['right', 'Derecho'], ['left', 'Izquierdo']] as const).map(([side, label]) => (
              <button
                key={side}
                onClick={() => setAffectedSide(side)}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${affectedSide === side ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Miembro Inferior */}
      <div className="mb-8">
        <h2 className="text-[16px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-4">Miembro Inferior</h2>
        <div className="space-y-3">
          {lowerMuscles.map(mg => {
            const lsi = getLSI(mg.key)
            return (
              <div key={mg.key} className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[15px] font-medium">{mg.label}</div>
                    <div className="text-[12px] text-text-secondary mt-0.5">{mg.position}</div>
                  </div>
                  {lsi !== null && (
                    <span
                      className="text-[12px] font-medium px-3 py-1 rounded-full border-[0.5px]"
                      style={{ color: lsiColor(lsi), borderColor: lsiColor(lsi) + '40', background: lsiColor(lsi) + '15' }}
                    >
                      LSI: {lsi}%
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">
                      Derecho ({unit}) {affectedSide === 'right' ? '· afectado' : ''}
                    </label>
                    <input
                      type="number"
                      value={results[mg.key]?.right || ''}
                      onChange={e => setResult(mg.key, 'right', e.target.value)}
                      placeholder="—"
                      className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-2.5 text-[15px] focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">
                      Izquierdo ({unit}) {affectedSide === 'left' ? '· afectado' : ''}
                    </label>
                    <input
                      type="number"
                      value={results[mg.key]?.left || ''}
                      onChange={e => setResult(mg.key, 'left', e.target.value)}
                      placeholder="—"
                      className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-2.5 text-[15px] focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Miembro Superior */}
      <div className="mb-8">
        <h2 className="text-[16px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-4">Miembro Superior</h2>
        <div className="space-y-3">
          {upperMuscles.map(mg => {
            const lsi = getLSI(mg.key)
            return (
              <div key={mg.key} className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[15px] font-medium">{mg.label}</div>
                    <div className="text-[12px] text-text-secondary mt-0.5">{mg.position}</div>
                  </div>
                  {lsi !== null && (
                    <span
                      className="text-[12px] font-medium px-3 py-1 rounded-full border-[0.5px]"
                      style={{ color: lsiColor(lsi), borderColor: lsiColor(lsi) + '40', background: lsiColor(lsi) + '15' }}
                    >
                      LSI: {lsi}%
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">
                      Derecho ({unit}) {affectedSide === 'right' ? '· afectado' : ''}
                    </label>
                    <input
                      type="number"
                      value={results[mg.key]?.right || ''}
                      onChange={e => setResult(mg.key, 'right', e.target.value)}
                      placeholder="—"
                      className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-2.5 text-[15px] focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">
                      Izquierdo ({unit}) {affectedSide === 'left' ? '· afectado' : ''}
                    </label>
                    <input
                      type="number"
                      value={results[mg.key]?.left || ''}
                      onChange={e => setResult(mg.key, 'left', e.target.value)}
                      placeholder="—"
                      className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg p-2.5 text-[15px] focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* H:Q Ratio */}
      {showHQ && (
        <div className="mb-8 bg-bg-primary border-[0.5px] border-border rounded-xl p-5">
          <h3 className="text-[15px] font-medium mb-1">Ratio H:Q (Isquiotibiales / Cuádriceps)</h3>
          <p className="text-[12px] text-text-secondary mb-4">Normal: 0.50–0.65</p>
          <div className="grid grid-cols-2 gap-4">
            {(['right', 'left'] as const).map(side => {
              const ratio = getHQRatio(side)
              const label = side === 'right' ? 'Derecho' : 'Izquierdo'
              return (
                <div key={side} className="bg-bg-secondary rounded-lg p-4">
                  <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">{label}</div>
                  {ratio !== null ? (
                    <div className="text-[22px] font-medium" style={{ color: hqColor(ratio) }}>
                      {ratio.toFixed(2)}
                    </div>
                  ) : (
                    <div className="text-[14px] text-text-secondary">—</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      {completedMuscles.length > 0 && (
        <div className="mb-8 bg-bg-primary border-[0.5px] border-border rounded-xl p-5">
          <h3 className="text-[15px] font-medium mb-4">Resumen LSI</h3>
          <div className="space-y-2">
            {completedMuscles.map(mg => {
              const lsi = getLSI(mg.key)
              const r = results[mg.key]?.right
              const l = results[mg.key]?.left
              return (
                <div key={mg.key} className="flex items-center justify-between py-2 border-b-[0.5px] border-border/30 last:border-0">
                  <span className="text-[13px] text-text-secondary">{mg.label}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[12px] text-text-secondary tabular-nums">D: {r || '—'} / I: {l || '—'}</span>
                    {lsi !== null ? (
                      <span className="text-[13px] font-medium tabular-nums" style={{ color: lsiColor(lsi) }}>
                        LSI {lsi}%
                      </span>
                    ) : (
                      <span className="text-[13px] text-text-secondary">LSI —</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Save section */}
      {userId !== null && hasAnyResult && (
        <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 mt-8">
          <h3 className="text-[14px] font-medium mb-3">Guardar en paciente</h3>
          {patients.length === 0 ? (
            <p className="text-text-secondary text-[13px]">Creá un paciente en la sección Pacientes para guardar resultados.</p>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <select
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                  className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent w-full sm:w-auto"
                >
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notas opcionales (ej. contexto clínico, observaciones...)"
                  rows={2}
                  className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent resize-none"
                />
                <button
                  onClick={handleSave}
                  disabled={saving || !selectedPatientId}
                  className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 w-fit"
                >
                  {saving ? 'Guardando...' : 'Guardar resultado'}
                </button>
              </div>
              {savedId && (
                <p className="text-[#22c55e] text-[13px] mt-2">✓ Guardado correctamente</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
