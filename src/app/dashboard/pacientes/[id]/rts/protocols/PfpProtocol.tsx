'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { lsi, n, Criterion } from './shared'
import { Field, NumInput, YesNoInput, SelectInput, LsiDisplay, SectionTitle, CriteriaResults } from './ProtocolUI'

interface Props {
  patient: { id: string; name: string; age: number | null }
  userId: string
  initialData?: Record<string, string>
  evalId?: string
  onSaved: (id: string) => void
  onNewEval: () => void
}

const INIT = {
  affected_side: 'left',
  symptom_months: '',
  pain_vas_rest: '', pain_vas_squat: '', pain_vas_stairs: '', pain_vas_running: '',
  step_down_quality: '', step_down_pain: '',
  squat_full_depth: '', squat_pain: '',
  quad_affected: '', quad_unaffected: '',
  single_hop_affected: '', single_hop_unaffected: '',
  akps_score: '', notes: '',
}
type FormData = typeof INIT

export default function PfpProtocol({ patient, userId, initialData, evalId, onSaved, onNewEval }: Props) {
  const [form, setForm] = useState<FormData>({ ...INIT, ...(initialData as Partial<FormData> ?? {}) })
  const [mode, setMode] = useState<'form' | 'results'>('form')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(evalId ?? null)
  const supabase = useRef(createClient())
  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }))

  const quadLsi = lsi(n(form.quad_affected), n(form.quad_unaffected))
  const hopLsi = lsi(n(form.single_hop_affected), n(form.single_hop_unaffected))

  const maxVas = Math.max(
    n(form.pain_vas_rest) ?? 0,
    n(form.pain_vas_squat) ?? 0,
    n(form.pain_vas_stairs) ?? 0,
    n(form.pain_vas_running) ?? 0,
  )
  const anyVas = [form.pain_vas_rest, form.pain_vas_squat, form.pain_vas_stairs, form.pain_vas_running].some(v => v !== '')

  const criteria: Criterion[] = [
    { label: 'VAS ≤2/10 en todas las actividades', passed: anyVas ? maxVas <= 2 : null, detail: anyVas ? `Máximo registrado: ${maxVas}/10` : undefined },
    { label: 'Step-down sin dolor', passed: form.step_down_pain !== '' ? form.step_down_pain === 'no' : null },
    { label: 'Step-down sin compensación (calidad buena)', passed: form.step_down_quality !== '' ? form.step_down_quality === 'good' : null, detail: form.step_down_quality || undefined },
    { label: 'Squat profundo sin dolor', passed: form.squat_pain !== '' ? form.squat_pain === 'no' : null },
    { label: 'LSI fuerza cuádriceps ≥80%', passed: quadLsi !== null ? quadLsi >= 80 : null, detail: quadLsi !== null ? `LSI ${quadLsi.toFixed(1)}%` : undefined },
    { label: 'Single hop LSI ≥85%', passed: hopLsi !== null ? hopLsi >= 85 : null, detail: hopLsi !== null ? `LSI ${hopLsi.toFixed(1)}%` : undefined },
    { label: 'AKPS ≥90/100', passed: form.akps_score !== '' ? n(form.akps_score)! >= 90 : null, detail: form.akps_score !== '' ? `${form.akps_score}/100` : undefined },
  ]

  const handleAnalyze = async () => {
    setSaving(true)
    const payload = { user_id: userId, patient_id: patient.id, protocol_type: 'pfp', affected_side: form.affected_side, notes: form.notes || null, form_data: form }
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
          <h2 className="text-[20px] font-medium mb-1">Resultados — Dolor femoropatelar</h2>
          <p className="text-[13px] text-text-secondary">{patient.name}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center">
            <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">VAS máx.</div>
            <div className={`text-[18px] font-medium ${maxVas <= 2 ? 'text-[#4ade80]' : maxVas <= 5 ? 'text-[#fb923c]' : 'text-red-400'}`}>{anyVas ? `${maxVas}/10` : '—'}</div>
          </div>
          <LsiDisplay label="LSI Cuádriceps" val={quadLsi} />
          <LsiDisplay label="Single Hop LSI" val={hopLsi} />
          <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center">
            <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">AKPS</div>
            <div className={`text-[18px] font-medium ${form.akps_score === '' ? 'text-text-secondary' : n(form.akps_score)! >= 90 ? 'text-[#4ade80]' : 'text-[#fb923c]'}`}>{form.akps_score || '—'}/100</div>
          </div>
        </div>
        <CriteriaResults criteria={criteria} notes={form.notes} onNewEval={onNewEval} />
        <button onClick={() => setMode('form')} className="mt-3 text-[13px] text-accent hover:underline">← Editar datos</button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Contexto</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Lado afectado">
            <SelectInput value={form.affected_side} onChange={v => set('affected_side', v)} options={[{ value: 'left', label: 'Izquierdo' }, { value: 'right', label: 'Derecho' }, { value: 'bilateral', label: 'Bilateral' }]} />
          </Field>
          <Field label="Tiempo de síntomas (meses)">
            <NumInput value={form.symptom_months} onChange={v => set('symptom_months', v)} min="0" placeholder="ej: 4" />
          </Field>
        </div>
      </div>

      <div>
        <SectionTitle>Dolor (VAS 0–10)</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Reposo"><NumInput value={form.pain_vas_rest} onChange={v => set('pain_vas_rest', v)} min="0" max="10" /></Field>
          <Field label="Sentadilla"><NumInput value={form.pain_vas_squat} onChange={v => set('pain_vas_squat', v)} min="0" max="10" /></Field>
          <Field label="Escaleras"><NumInput value={form.pain_vas_stairs} onChange={v => set('pain_vas_stairs', v)} min="0" max="10" /></Field>
          <Field label="Correr"><NumInput value={form.pain_vas_running} onChange={v => set('pain_vas_running', v)} min="0" max="10" /></Field>
        </div>
      </div>

      <div>
        <SectionTitle>Evaluación funcional</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Step-down — calidad">
            <SelectInput value={form.step_down_quality} onChange={v => set('step_down_quality', v)} options={[
              { value: 'good', label: 'Buena (sin compensación)' },
              { value: 'compensated', label: 'Compensada' },
              { value: 'poor', label: 'Deficiente' },
            ]} />
          </Field>
          <Field label="¿Dolor durante step-down?">
            <YesNoInput value={form.step_down_pain} onChange={v => set('step_down_pain', v)} />
          </Field>
          <Field label="¿Squat profundo completo?">
            <YesNoInput value={form.squat_full_depth} onChange={v => set('squat_full_depth', v)} />
          </Field>
          <Field label="¿Dolor durante squat?">
            <YesNoInput value={form.squat_pain} onChange={v => set('squat_pain', v)} />
          </Field>
        </div>
      </div>

      <div>
        <SectionTitle>Fuerza cuádriceps (kg o N)</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lado afectado"><NumInput value={form.quad_affected} onChange={v => set('quad_affected', v)} /></Field>
          <Field label="Lado sano"><NumInput value={form.quad_unaffected} onChange={v => set('quad_unaffected', v)} /></Field>
        </div>
        {quadLsi !== null && <div className="mt-3"><LsiDisplay label="LSI Cuádriceps" val={quadLsi} /></div>}
      </div>

      <div>
        <SectionTitle>Single hop (cm)</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lado afectado"><NumInput value={form.single_hop_affected} onChange={v => set('single_hop_affected', v)} /></Field>
          <Field label="Lado sano"><NumInput value={form.single_hop_unaffected} onChange={v => set('single_hop_unaffected', v)} /></Field>
        </div>
        {hopLsi !== null && <div className="mt-3"><LsiDisplay label="Single Hop LSI" val={hopLsi} /></div>}
      </div>

      <div>
        <SectionTitle>Cuestionario — AKPS (Anterior Knee Pain Scale)</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Puntaje AKPS (0–100)">
            <NumInput value={form.akps_score} onChange={v => set('akps_score', v)} min="0" max="100" placeholder="ej: 92" />
          </Field>
        </div>
        <p className="text-[12px] text-text-secondary mt-2">Umbral de retorno al deporte: ≥90/100.</p>
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
