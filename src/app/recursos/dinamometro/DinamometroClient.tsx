'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Patient {
  id: string
  name: string
}

interface MuscleValues {
  right: string
  left: string
}

type MuscleKey = 'quad' | 'hamstring' | 'hip_abductor' | 'hip_adductor' | 'shoulder_ext_rotator' | 'shoulder_abductor' | 'elbow_flexor'

// ─── Muscle config ─────────────────────────────────────────────────────────

const MUSCLE_LABELS: Record<MuscleKey, string> = {
  quad: 'Cuádriceps',
  hamstring: 'Isquiotibiales',
  hip_abductor: 'Abd. Cadera',
  hip_adductor: 'Aductores',
  shoulder_ext_rotator: 'RE Hombro',
  shoulder_abductor: 'Abd. Hombro',
  elbow_flexor: 'Flex. Codo',
}

const MUSCLE_KEYS: MuscleKey[] = ['quad', 'hamstring', 'hip_abductor', 'hip_adductor', 'shoulder_ext_rotator', 'shoulder_abductor', 'elbow_flexor']

// ─── LSI helpers ───────────────────────────────────────────────────────────

function calcLSI(a: string, b: string): number | null {
  const va = parseFloat(a)
  const vb = parseFloat(b)
  if (isNaN(va) || isNaN(vb) || va === 0 || vb === 0) return null
  const weaker = Math.min(va, vb)
  const stronger = Math.max(va, vb)
  return Math.round((weaker / stronger) * 1000) / 10
}

function lsiColor(lsi: number | null): string {
  if (lsi === null) return ''
  if (lsi >= 90) return 'text-[#16a34a]'
  if (lsi >= 75) return 'text-[#d97706]'
  return 'text-[#dc2626]'
}

function lsiBg(lsi: number | null): string {
  if (lsi === null) return ''
  if (lsi >= 90) return 'bg-[#16a34a]/10 border-[#16a34a]/30'
  if (lsi >= 75) return 'bg-[#d97706]/10 border-[#d97706]/30'
  return 'bg-[#dc2626]/10 border-[#dc2626]/30'
}

function calcHQ(hamstring: string, quad: string): number | null {
  const h = parseFloat(hamstring)
  const q = parseFloat(quad)
  if (isNaN(h) || isNaN(q) || q === 0) return null
  return Math.round((h / q) * 100) / 100
}

function hqColor(hq: number | null): string {
  if (hq === null) return ''
  if (hq >= 0.50 && hq <= 0.65) return 'text-[#16a34a]'
  if (hq >= 0.45 && hq < 0.50) return 'text-[#d97706]'
  if (hq > 0.65 && hq <= 0.75) return 'text-[#d97706]'
  return 'text-[#dc2626]'
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DinamometroClient({ userId }: { userId: string }) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [unit, setUnit] = useState<'kg' | 'N' | 'lbs'>('kg')
  const [notes, setNotes] = useState('')
  const [muscleResults, setMuscleResults] = useState<Record<MuscleKey, MuscleValues>>(
    Object.fromEntries(MUSCLE_KEYS.map(k => [k, { right: '', left: '' }])) as Record<MuscleKey, MuscleValues>
  )
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('patients').select('id, name').eq('user_id', userId).order('name')
      .then(({ data }) => { if (data) setPatients(data) })
  }, [userId])

  const updateMuscle = (key: MuscleKey, side: 'right' | 'left', value: string) => {
    // Allow only numbers and decimal point
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return
    setMuscleResults(prev => ({ ...prev, [key]: { ...prev[key], [side]: value } }))
  }

  const hqRight = calcHQ(muscleResults.hamstring.right, muscleResults.quad.right)
  const hqLeft = calcHQ(muscleResults.hamstring.left, muscleResults.quad.left)

  const hasAnyData = MUSCLE_KEYS.some(k => muscleResults[k].right !== '' || muscleResults[k].left !== '')

  const handleSave = async () => {
    if (!hasAnyData) return
    setSaving(true)
    setSaveStatus('idle')
    try {
      const supabase = createClient()
      const { error } = await supabase.from('dynamometer_results').insert({
        user_id: userId,
        patient_id: selectedPatient || null,
        unit,
        notes: notes || null,
        muscle_results: muscleResults,
      })
      if (error) throw error
      setSaveStatus('saved')
    } catch (e) {
      console.error(e)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!confirm('¿Limpiar todos los valores?')) return
    setMuscleResults(Object.fromEntries(MUSCLE_KEYS.map(k => [k, { right: '', left: '' }])) as Record<MuscleKey, MuscleValues>)
    setNotes('')
    setSaveStatus('idle')
  }

  return (
    <div className="max-w-[900px] space-y-6">

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center bg-bg-secondary border-[0.5px] border-border rounded-xl p-4">
        <div>
          <label className="text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium block mb-1.5">Paciente</label>
          <select
            value={selectedPatient}
            onChange={e => setSelectedPatient(e.target.value)}
            className="bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent min-w-[200px]"
          >
            <option value="">Sin paciente asignado</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium block mb-1.5">Unidad</label>
          <div className="flex bg-bg-primary rounded-lg p-1 border-[0.5px] border-border">
            {(['kg', 'N', 'lbs'] as const).map(u => (
              <button key={u} onClick={() => setUnit(u)}
                className={`px-4 py-1.5 text-[12px] rounded-md font-medium transition-colors ${unit === u ? 'bg-bg-secondary text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[12px] text-text-secondary">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#16a34a]" /> LSI ≥ 90% — objetivo alcanzado</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#d97706]" /> LSI 75-89% — zona de precaución</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#dc2626]" /> LSI &lt; 75% — asimetría significativa</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#0891b2]" /> H:Q 0.50-0.65 — ratio óptimo</div>
      </div>

      {/* Muscle table */}
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-0 bg-bg-primary border-b-[0.5px] border-border px-5 py-3">
          <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium">Músculo</div>
          <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium text-center">Derecho ({unit})</div>
          <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium text-center">Izquierdo ({unit})</div>
          <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium text-center w-[100px]">LSI</div>
        </div>

        {MUSCLE_KEYS.map((key, idx) => {
          const lsi = calcLSI(muscleResults[key].right, muscleResults[key].left)
          return (
            <div key={key} className={`grid grid-cols-[1fr_1fr_1fr_auto] gap-0 items-center px-5 py-3 ${idx % 2 === 0 ? '' : 'bg-bg-primary/30'} border-b-[0.5px] border-border last:border-0`}>
              <div className="text-[14px] font-medium text-text-primary">{MUSCLE_LABELS[key]}</div>
              <div className="px-3">
                <input
                  type="text"
                  inputMode="decimal"
                  value={muscleResults[key].right}
                  onChange={e => updateMuscle(key, 'right', e.target.value)}
                  placeholder="—"
                  className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[14px] text-center focus:outline-none focus:border-accent"
                />
              </div>
              <div className="px-3">
                <input
                  type="text"
                  inputMode="decimal"
                  value={muscleResults[key].left}
                  onChange={e => updateMuscle(key, 'left', e.target.value)}
                  placeholder="—"
                  className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[14px] text-center focus:outline-none focus:border-accent"
                />
              </div>
              <div className="w-[100px] text-center">
                {lsi !== null ? (
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[13px] font-medium border-[0.5px] ${lsiBg(lsi)} ${lsiColor(lsi)}`}>
                    {lsi}%
                  </span>
                ) : (
                  <span className="text-[13px] text-text-secondary">—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* H:Q Ratio */}
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5">
        <h3 className="text-[13px] uppercase tracking-[0.05em] text-text-secondary font-medium mb-4">Ratio Isquiotibiales / Cuádriceps (H:Q)</h3>
        <p className="text-[12px] text-text-secondary mb-4">Objetivo: 0.50 – 0.65 por lado. Valores fuera de este rango pueden indicar desequilibrio muscular o riesgo de lesión.</p>
        <div className="flex gap-6 flex-wrap">
          {[
            { side: 'Derecho', hq: hqRight },
            { side: 'Izquierdo', hq: hqLeft },
          ].map(({ side, hq }) => (
            <div key={side} className="bg-bg-primary border-[0.5px] border-border rounded-xl px-6 py-4 text-center min-w-[130px]">
              <div className="text-[11px] text-text-secondary mb-1">{side}</div>
              {hq !== null ? (
                <>
                  <div className={`text-[28px] font-light tracking-[-0.02em] ${hqColor(hq)}`}>{hq}</div>
                  <div className={`text-[11px] font-medium mt-0.5 ${hqColor(hq)}`}>
                    {hq >= 0.50 && hq <= 0.65 ? 'Ratio óptimo' : hq < 0.50 ? 'Bajo objetivo' : 'Sobre objetivo'}
                  </div>
                </>
              ) : (
                <div className="text-[24px] text-text-secondary">—</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium block mb-1.5">Notas clínicas (opcional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Observaciones sobre la evaluación, posición de prueba, protocolo utilizado..."
          rows={3}
          className="w-full bg-bg-secondary border-[0.5px] border-border rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:border-accent resize-none"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={handleReset} className="text-[13px] text-text-secondary hover:text-warning transition-colors">
          Limpiar evaluación
        </button>
        <div className="flex items-center gap-4">
          {saveStatus === 'saved' && <span className="text-[13px] text-[#16a34a]">✓ Guardado correctamente</span>}
          {saveStatus === 'error' && <span className="text-[13px] text-warning">Error al guardar — intentá de nuevo</span>}
          <button
            onClick={handleSave}
            disabled={saving || !hasAnyData}
            className="bg-accent text-bg-primary px-6 py-2.5 rounded-lg text-[14px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving ? 'Guardando...' : 'Guardar evaluación'}
          </button>
        </div>
      </div>
    </div>
  )
}
