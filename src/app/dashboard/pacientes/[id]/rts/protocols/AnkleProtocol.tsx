'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { lsi, n, Criterion } from './shared'
import { Field, NumInput, SelectInput, LsiDisplay, SectionTitle, CriteriaResults } from './ProtocolUI'

interface Props {
  patient: { id: string; name: string; age: number | null }
  userId: string
  initialData?: Record<string, string>
  evalId?: string
  onSaved: (id: string) => void
  onNewEval: () => void
}

const INIT = {
  affected_side: 'left', ligament: '', grade: '',
  pain_vas_rest: '', pain_vas_activity: '',
  dorsiflexion_affected: '', dorsiflexion_unaffected: '',
  evertor_affected: '', evertor_unaffected: '',
  ybal_ant_affected: '', ybal_ant_unaffected: '',
  ybal_pm_affected: '', ybal_pm_unaffected: '',
  ybal_pl_affected: '', ybal_pl_unaffected: '',
  single_hop_affected: '', single_hop_unaffected: '',
  faam_sport_score: '', cait_score: '', notes: '',
}
type FormData = typeof INIT

export default function AnkleProtocol({ patient, userId, initialData, evalId, onSaved, onNewEval }: Props) {
  const [form, setForm] = useState<FormData>({ ...INIT, ...(initialData as Partial<FormData> ?? {}) })
  const [mode, setMode] = useState<'form' | 'results'>('form')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(evalId ?? null)
  const supabase = useRef(createClient())
  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }))

  const dfLsi = lsi(n(form.dorsiflexion_affected), n(form.dorsiflexion_unaffected))
  const evLsi = lsi(n(form.evertor_affected), n(form.evertor_unaffected))
  const hopLsi = lsi(n(form.single_hop_affected), n(form.single_hop_unaffected))

  const ybalAff = [n(form.ybal_ant_affected), n(form.ybal_pm_affected), n(form.ybal_pl_affected)]
  const ybalUnaff = [n(form.ybal_ant_unaffected), n(form.ybal_pm_unaffected), n(form.ybal_pl_unaffected)]
  const ybalLsi = (ybalAff.every(v => v !== null) && ybalUnaff.every(v => v !== null))
    ? lsi(ybalAff.reduce((a, b) => a! + b!, 0), ybalUnaff.reduce((a, b) => a! + b!, 0))
    : null

  const criteria: Criterion[] = [
    { label: 'Dolor en reposo 0/10', passed: form.pain_vas_rest !== '' ? n(form.pain_vas_rest) === 0 : null, detail: form.pain_vas_rest !== '' ? `VAS ${form.pain_vas_rest}/10` : undefined },
    { label: 'Dolor en actividad ≤2/10', passed: form.pain_vas_activity !== '' ? n(form.pain_vas_activity)! <= 2 : null, detail: form.pain_vas_activity !== '' ? `VAS ${form.pain_vas_activity}/10` : undefined },
    { label: 'LSI dorsiflexión (wall lunge) ≥90%', passed: dfLsi !== null ? dfLsi >= 90 : null, detail: dfLsi !== null ? `LSI ${dfLsi.toFixed(1)}%` : undefined },
    { label: 'LSI fuerza eversores ≥90%', passed: evLsi !== null ? evLsi >= 90 : null, detail: evLsi !== null ? `LSI ${evLsi.toFixed(1)}%` : undefined },
    { label: 'Y-Balance composite LSI ≥90%', passed: ybalLsi !== null ? ybalLsi >= 90 : null, detail: ybalLsi !== null ? `LSI ${ybalLsi.toFixed(1)}%` : undefined },
    { label: 'Single hop LSI ≥90%', passed: hopLsi !== null ? hopLsi >= 90 : null, detail: hopLsi !== null ? `LSI ${hopLsi.toFixed(1)}%` : undefined },
    { label: 'FAAM Sport ≥90%', passed: form.faam_sport_score !== '' ? n(form.faam_sport_score)! >= 90 : null, detail: form.faam_sport_score !== '' ? `${form.faam_sport_score}%` : undefined },
    { label: 'CAIT ≥28/30', passed: form.cait_score !== '' ? n(form.cait_score)! >= 28 : null, detail: form.cait_score !== '' ? `${form.cait_score}/30` : undefined },
  ]

  const handleAnalyze = async () => {
    setSaving(true)
    const payload = { user_id: userId, patient_id: patient.id, protocol_type: 'ankle', affected_side: form.affected_side, notes: form.notes || null, form_data: form }
    let id = savedId
    if (savedId) { await supabase.current.from('rts_evaluations').update(payload).eq('id', savedId) }
    else {
      const { data } = await supabase.current.from('rts_evaluations').insert(payload).select('id').single()
      if (data?.id) { id = data.id; setSavedId(data.id); onSaved(data.id) }
    }
    setSaving(false)
    if (id) setMode('results')
  }

  if (mode === 'results') {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-[20px] font-medium mb-1">Resultados — Esguince lateral de tobillo</h2>
          <p className="text-[13px] text-text-secondary">{patient.name}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <LsiDisplay label="Dorsiflexión" val={dfLsi} />
          <LsiDisplay label="Eversores" val={evLsi} />
          <LsiDisplay label="Y-Balance" val={ybalLsi} />
          <LsiDisplay label="Single Hop" val={hopLsi} />
        </div>
        <CriteriaResults criteria={criteria} notes={form.notes} onNewEval={onNewEval} />
        <button onClick={() => setMode('form')} className="mt-3 text-[13px] text-accent hover:underline">← Editar datos</button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Contexto de la lesión</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Lado afectado">
            <SelectInput value={form.affected_side} onChange={v => set('affected_side', v)} options={[{ value: 'left', label: 'Izquierdo' }, { value: 'right', label: 'Derecho' }]} />
          </Field>
          <Field label="Ligamento(s)">
            <SelectInput value={form.ligament} onChange={v => set('ligament', v)} options={[
              { value: 'atfl', label: 'ATFL' },
              { value: 'atfl_cfl', label: 'ATFL + CFL' },
              { value: 'atfl_cfl_ptfl', label: 'ATFL + CFL + PTFL' },
            ]} />
          </Field>
          <Field label="Grado">
            <SelectInput value={form.grade} onChange={v => set('grade', v)} options={[{ value: '1', label: 'Grado I' }, { value: '2', label: 'Grado II' }, { value: '3', label: 'Grado III' }]} />
          </Field>
          <Field label="Dolor en reposo (VAS 0-10)">
            <NumInput value={form.pain_vas_rest} onChange={v => set('pain_vas_rest', v)} min="0" max="10" />
          </Field>
          <Field label="Dolor en actividad (VAS 0-10)">
            <NumInput value={form.pain_vas_activity} onChange={v => set('pain_vas_activity', v)} min="0" max="10" />
          </Field>
        </div>
      </div>

      <div>
        <SectionTitle>ROM — Dorsiflexión (Wall lunge test, cm)</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lado afectado (cm)"><NumInput value={form.dorsiflexion_affected} onChange={v => set('dorsiflexion_affected', v)} /></Field>
          <Field label="Lado sano (cm)"><NumInput value={form.dorsiflexion_unaffected} onChange={v => set('dorsiflexion_unaffected', v)} /></Field>
        </div>
        {dfLsi !== null && <div className="mt-3"><LsiDisplay label="LSI Dorsiflexión" val={dfLsi} /></div>}
      </div>

      <div>
        <SectionTitle>Fuerza eversores (kg o N)</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lado afectado"><NumInput value={form.evertor_affected} onChange={v => set('evertor_affected', v)} /></Field>
          <Field label="Lado sano"><NumInput value={form.evertor_unaffected} onChange={v => set('evertor_unaffected', v)} /></Field>
        </div>
        {evLsi !== null && <div className="mt-3"><LsiDisplay label="LSI Eversores" val={evLsi} /></div>}
      </div>

      <div>
        <SectionTitle>Y-Balance Test (cm)</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Anterior — afectado"><NumInput value={form.ybal_ant_affected} onChange={v => set('ybal_ant_affected', v)} /></Field>
          <Field label="Anterior — sano"><NumInput value={form.ybal_ant_unaffected} onChange={v => set('ybal_ant_unaffected', v)} /></Field>
          <Field label="Posteromedial — afectado"><NumInput value={form.ybal_pm_affected} onChange={v => set('ybal_pm_affected', v)} /></Field>
          <Field label="Posteromedial — sano"><NumInput value={form.ybal_pm_unaffected} onChange={v => set('ybal_pm_unaffected', v)} /></Field>
          <Field label="Posterolateral — afectado"><NumInput value={form.ybal_pl_affected} onChange={v => set('ybal_pl_affected', v)} /></Field>
          <Field label="Posterolateral — sano"><NumInput value={form.ybal_pl_unaffected} onChange={v => set('ybal_pl_unaffected', v)} /></Field>
        </div>
        {ybalLsi !== null && <div className="mt-3"><LsiDisplay label="Y-Balance Composite LSI" val={ybalLsi} /></div>}
      </div>

      <div>
        <SectionTitle>Test funcional — Single hop (cm)</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lado afectado"><NumInput value={form.single_hop_affected} onChange={v => set('single_hop_affected', v)} /></Field>
          <Field label="Lado sano"><NumInput value={form.single_hop_unaffected} onChange={v => set('single_hop_unaffected', v)} /></Field>
        </div>
        {hopLsi !== null && <div className="mt-3"><LsiDisplay label="Single Hop LSI" val={hopLsi} /></div>}
      </div>

      <div>
        <SectionTitle>Cuestionarios</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="FAAM Sport (0–100%)">
            <NumInput value={form.faam_sport_score} onChange={v => set('faam_sport_score', v)} min="0" max="100" placeholder="ej: 92" />
          </Field>
          <Field label="CAIT (0–30)">
            <NumInput value={form.cait_score} onChange={v => set('cait_score', v)} min="0" max="30" placeholder="ej: 28" />
          </Field>
        </div>
        <p className="text-[12px] text-text-secondary mt-2">FAAM Sport umbral ≥90% · CAIT umbral ≥28/30.</p>
      </div>

      <div>
        <SectionTitle>Observaciones</SectionTitle>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Observaciones clínicas..." className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] focus:border-accent outline-none resize-none" />
      </div>

      <button onClick={handleAnalyze} disabled={saving} className="bg-accent text-bg-primary px-6 py-3 rounded-lg text-[14px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
        {saving ? 'Guardando...' : 'Ver análisis y guardar'}
      </button>
    </div>
  )
}
