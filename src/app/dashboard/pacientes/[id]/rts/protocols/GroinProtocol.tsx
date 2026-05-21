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
  affected_side: 'left', diagnosis_type: '',
  symptom_months: '',
  pain_vas_rest: '', pain_vas_activity: '',
  squeeze_affected: '', squeeze_unaffected: '',
  hip_abd_affected: '', hip_abd_unaffected: '',
  sprint_pain_free: '', coc_pain_free: '',
  weeks_full_training: '',
  hagos_sport_score: '', notes: '',
}
type FormData = typeof INIT

export default function GroinProtocol({ patient, userId, initialData, evalId, onSaved, onNewEval }: Props) {
  const [form, setForm] = useState<FormData>({ ...INIT, ...(initialData as Partial<FormData> ?? {}) })
  const [mode, setMode] = useState<'form' | 'results'>('form')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(evalId ?? null)
  const supabase = useRef(createClient())
  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }))

  const squeezeLsi = lsi(n(form.squeeze_affected), n(form.squeeze_unaffected))
  const abdLsi = lsi(n(form.hip_abd_affected), n(form.hip_abd_unaffected))

  const addAbdRatio = (n(form.squeeze_affected) && n(form.hip_abd_affected) && n(form.hip_abd_affected)! > 0)
    ? n(form.squeeze_affected)! / n(form.hip_abd_affected)! : null

  const criteria: Criterion[] = [
    { label: 'Dolor en actividad ≤2/10', passed: form.pain_vas_activity !== '' ? n(form.pain_vas_activity)! <= 2 : null, detail: form.pain_vas_activity !== '' ? `VAS ${form.pain_vas_activity}/10` : undefined },
    { label: 'LSI squeeze test (aductores) ≥90%', passed: squeezeLsi !== null ? squeezeLsi >= 90 : null, detail: squeezeLsi !== null ? `LSI ${squeezeLsi.toFixed(1)}%` : undefined },
    { label: 'Ratio aductores/abductores ≥0.90', passed: addAbdRatio !== null ? addAbdRatio >= 0.90 : null, detail: addAbdRatio !== null ? `Ratio ${addAbdRatio.toFixed(2)}` : undefined },
    { label: 'Sprint máximo sin dolor', passed: form.sprint_pain_free !== '' ? form.sprint_pain_free === 'yes' : null },
    { label: 'Cambio de dirección sin dolor', passed: form.coc_pain_free !== '' ? form.coc_pain_free === 'yes' : null },
    { label: 'HAGOS Sport ≥85%', passed: form.hagos_sport_score !== '' ? n(form.hagos_sport_score)! >= 85 : null, detail: form.hagos_sport_score !== '' ? `${form.hagos_sport_score}%` : undefined },
    { label: '≥12 semanas de entrenamiento progresivo completo', passed: form.weeks_full_training !== '' ? n(form.weeks_full_training)! >= 12 : null, detail: form.weeks_full_training !== '' ? `${form.weeks_full_training} semanas` : undefined },
  ]

  const handleAnalyze = async () => {
    setSaving(true)
    const payload = { user_id: userId, patient_id: patient.id, protocol_type: 'groin', affected_side: form.affected_side, notes: form.notes || null, form_data: form }
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
          <h2 className="text-[20px] font-medium mb-1">Resultados — Dolor inguinal</h2>
          <p className="text-[13px] text-text-secondary">{patient.name}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <LsiDisplay label="Squeeze LSI" val={squeezeLsi} />
          <LsiDisplay label="Abductores LSI" val={abdLsi} />
          <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center">
            <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">Add/Abd Ratio</div>
            <div className={`text-[18px] font-medium ${addAbdRatio === null ? 'text-text-secondary' : addAbdRatio >= 0.9 ? 'text-[#4ade80]' : 'text-red-400'}`}>{addAbdRatio !== null ? addAbdRatio.toFixed(2) : '—'}</div>
          </div>
          <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center">
            <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">HAGOS Sport</div>
            <div className={`text-[18px] font-medium ${form.hagos_sport_score === '' ? 'text-text-secondary' : n(form.hagos_sport_score)! >= 85 ? 'text-[#4ade80]' : 'text-[#fb923c]'}`}>{form.hagos_sport_score || '—'}%</div>
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
            <SelectInput value={form.affected_side} onChange={v => set('affected_side', v)} options={[{ value: 'left', label: 'Izquierdo' }, { value: 'right', label: 'Derecho' }]} />
          </Field>
          <Field label="Diagnóstico">
            <SelectInput value={form.diagnosis_type} onChange={v => set('diagnosis_type', v)} options={[
              { value: 'adductor', label: 'Relacionado con aductor' },
              { value: 'iliopsoas', label: 'Relacionado con iliopsoas' },
              { value: 'inguinal', label: 'Inguinal' },
              { value: 'pubic', label: 'Relacionado con pubis' },
            ]} />
          </Field>
          <Field label="Tiempo de síntomas (meses)">
            <NumInput value={form.symptom_months} onChange={v => set('symptom_months', v)} min="0" placeholder="ej: 5" />
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
        <SectionTitle>Fuerza — Squeeze test isométrico (kg o N)</SectionTitle>
        <p className="text-[12px] text-text-secondary mb-3">Squeeze test a 0°, 45° o 90°. Registrar el valor máximo obtenido bilateralmente.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lado afectado"><NumInput value={form.squeeze_affected} onChange={v => set('squeeze_affected', v)} /></Field>
          <Field label="Lado sano"><NumInput value={form.squeeze_unaffected} onChange={v => set('squeeze_unaffected', v)} /></Field>
        </div>
        {squeezeLsi !== null && <div className="mt-3"><LsiDisplay label="Squeeze LSI" val={squeezeLsi} /></div>}
      </div>

      <div>
        <SectionTitle>Fuerza — Abductores de cadera (kg o N)</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lado afectado"><NumInput value={form.hip_abd_affected} onChange={v => set('hip_abd_affected', v)} /></Field>
          <Field label="Lado sano"><NumInput value={form.hip_abd_unaffected} onChange={v => set('hip_abd_unaffected', v)} /></Field>
        </div>
        {addAbdRatio !== null && (
          <div className="mt-3 bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center inline-block min-w-[140px]">
            <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">Ratio Add/Abd</div>
            <div className={`text-[18px] font-medium ${addAbdRatio >= 0.9 ? 'text-[#4ade80]' : 'text-red-400'}`}>{addAbdRatio.toFixed(2)}</div>
          </div>
        )}
      </div>

      <div>
        <SectionTitle>Tests funcionales</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="¿Sprint máximo sin dolor?"><YesNoInput value={form.sprint_pain_free} onChange={v => set('sprint_pain_free', v)} /></Field>
          <Field label="¿Cambio de dirección sin dolor?"><YesNoInput value={form.coc_pain_free} onChange={v => set('coc_pain_free', v)} /></Field>
        </div>
      </div>

      <div>
        <SectionTitle>Tolerancia a la carga</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Semanas de entrenamiento progresivo completo">
            <NumInput value={form.weeks_full_training} onChange={v => set('weeks_full_training', v)} min="0" max="52" placeholder="ej: 12" />
          </Field>
        </div>
        <p className="text-[12px] text-text-secondary mt-2">El dolor inguinal requiere al menos 12 semanas de carga progresiva sin síntomas antes del retorno completo.</p>
      </div>

      <div>
        <SectionTitle>Cuestionario — HAGOS Sport</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Subescala Sport/Recreación (0–100%)">
            <NumInput value={form.hagos_sport_score} onChange={v => set('hagos_sport_score', v)} min="0" max="100" placeholder="ej: 88" />
          </Field>
        </div>
        <p className="text-[12px] text-text-secondary mt-2">Hip and Groin Outcome Score. Umbral retorno: ≥85%.</p>
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
