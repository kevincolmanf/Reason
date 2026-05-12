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
  tendon_type: 'patellar', affected_side: 'left',
  symptom_months: '',
  pain_vas_loading: '', pain_vas_24h: '',
  visa_score: '',
  decline_squat_reps: '', decline_squat_pain: '',
  heel_raise_reps: '', heel_raise_pain: '',
  single_hop_affected: '', single_hop_unaffected: '',
  full_training_weeks: '', notes: '',
}
type FormData = typeof INIT

export default function TendinopathyProtocol({ patient, userId, initialData, evalId, onSaved, onNewEval }: Props) {
  const [form, setForm] = useState<FormData>({ ...INIT, ...(initialData as Partial<FormData> ?? {}) })
  const [mode, setMode] = useState<'form' | 'results'>('form')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(evalId ?? null)
  const supabase = useRef(createClient())
  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }))

  const hopLsi = lsi(n(form.single_hop_affected), n(form.single_hop_unaffected))
  const isPatellar = form.tendon_type === 'patellar'
  const visaThreshold = isPatellar ? 80 : 90
  const visaLabel = isPatellar ? 'VISA-P' : 'VISA-A'

  const criteria: Criterion[] = [
    { label: `${visaLabel} ≥${visaThreshold}/100`, passed: form.visa_score !== '' ? n(form.visa_score)! >= visaThreshold : null, detail: form.visa_score !== '' ? `${form.visa_score}/100` : undefined },
    { label: 'Dolor durante carga ≤3/10', passed: form.pain_vas_loading !== '' ? n(form.pain_vas_loading)! <= 3 : null, detail: form.pain_vas_loading !== '' ? `VAS ${form.pain_vas_loading}/10` : undefined },
    { label: 'Dolor 24h post-actividad ≤3/10', passed: form.pain_vas_24h !== '' ? n(form.pain_vas_24h)! <= 3 : null, detail: form.pain_vas_24h !== '' ? `VAS ${form.pain_vas_24h}/10` : undefined },
    isPatellar
      ? { label: 'Decline squat 3×15 sin aumento de dolor', passed: form.decline_squat_pain !== '' ? form.decline_squat_pain === 'no' : null }
      : { label: 'Single leg heel raise ≥25 repeticiones sin dolor', passed: (form.heel_raise_reps !== '' && form.heel_raise_pain !== '') ? (n(form.heel_raise_reps)! >= 25 && form.heel_raise_pain === 'no') : null, detail: form.heel_raise_reps !== '' ? `${form.heel_raise_reps} reps` : undefined },
    { label: 'Single hop LSI ≥90%', passed: hopLsi !== null ? hopLsi >= 90 : null, detail: hopLsi !== null ? `LSI ${hopLsi.toFixed(1)}%` : undefined },
    { label: '≥2 semanas de entrenamiento completo', passed: form.full_training_weeks !== '' ? n(form.full_training_weeks)! >= 2 : null, detail: form.full_training_weeks !== '' ? `${form.full_training_weeks} semanas` : undefined },
  ]

  const handleAnalyze = async () => {
    setSaving(true)
    const payload = { user_id: userId, patient_id: patient.id, protocol_type: 'tendinopathy', affected_side: form.affected_side, notes: form.notes || null, form_data: form }
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
          <h2 className="text-[20px] font-medium mb-1">Resultados — Tendinopatía {isPatellar ? 'rotuliana' : 'aquílea'}</h2>
          <p className="text-[13px] text-text-secondary">{patient.name}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center">
            <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">{visaLabel}</div>
            <div className={`text-[18px] font-medium ${form.visa_score === '' ? 'text-text-secondary' : n(form.visa_score)! >= visaThreshold ? 'text-[#4ade80]' : 'text-[#fb923c]'}`}>{form.visa_score || '—'}/100</div>
          </div>
          <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center">
            <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">Dolor carga</div>
            <div className={`text-[18px] font-medium ${form.pain_vas_loading === '' ? 'text-text-secondary' : n(form.pain_vas_loading)! <= 3 ? 'text-[#4ade80]' : 'text-red-400'}`}>{form.pain_vas_loading || '—'}/10</div>
          </div>
          <LsiDisplay label="Single Hop LSI" val={hopLsi} />
          <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center">
            <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">Semanas carga</div>
            <div className={`text-[18px] font-medium ${form.full_training_weeks === '' ? 'text-text-secondary' : n(form.full_training_weeks)! >= 2 ? 'text-[#4ade80]' : 'text-[#fb923c]'}`}>{form.full_training_weeks || '—'}</div>
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
        <SectionTitle>Tipo y contexto</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Tendón afectado">
            <SelectInput value={form.tendon_type} onChange={v => set('tendon_type', v)} options={[{ value: 'patellar', label: 'Rotuliano' }, { value: 'achilles', label: 'Aquíleo' }]} />
          </Field>
          <Field label="Lado afectado">
            <SelectInput value={form.affected_side} onChange={v => set('affected_side', v)} options={[{ value: 'left', label: 'Izquierdo' }, { value: 'right', label: 'Derecho' }]} />
          </Field>
          <Field label="Tiempo de síntomas (meses)">
            <NumInput value={form.symptom_months} onChange={v => set('symptom_months', v)} min="0" placeholder="ej: 6" />
          </Field>
        </div>
      </div>

      <div>
        <SectionTitle>Dolor</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Dolor durante carga/actividad (VAS 0-10)">
            <NumInput value={form.pain_vas_loading} onChange={v => set('pain_vas_loading', v)} min="0" max="10" />
          </Field>
          <Field label="Dolor 24h post-actividad (VAS 0-10)">
            <NumInput value={form.pain_vas_24h} onChange={v => set('pain_vas_24h', v)} min="0" max="10" />
          </Field>
        </div>
      </div>

      <div>
        <SectionTitle>Cuestionario — {visaLabel}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={`Puntaje ${visaLabel} (0–100)`}>
            <NumInput value={form.visa_score} onChange={v => set('visa_score', v)} min="0" max="100" placeholder="ej: 85" />
          </Field>
        </div>
        <p className="text-[12px] text-text-secondary mt-2">Umbral: VISA-P ≥80 / VISA-A ≥90.</p>
      </div>

      {isPatellar ? (
        <div>
          <SectionTitle>Test de carga — Decline squat (3×15)</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Repeticiones completadas"><NumInput value={form.decline_squat_reps} onChange={v => set('decline_squat_reps', v)} min="0" max="45" placeholder="ej: 45" /></Field>
            <Field label="¿Aumento de dolor durante el test?"><YesNoInput value={form.decline_squat_pain} onChange={v => set('decline_squat_pain', v)} /></Field>
          </div>
        </div>
      ) : (
        <div>
          <SectionTitle>Test de carga — Single leg heel raise</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Repeticiones completadas"><NumInput value={form.heel_raise_reps} onChange={v => set('heel_raise_reps', v)} min="0" max="100" placeholder="ej: 25" /></Field>
            <Field label="¿Dolor durante el test?"><YesNoInput value={form.heel_raise_pain} onChange={v => set('heel_raise_pain', v)} /></Field>
          </div>
        </div>
      )}

      <div>
        <SectionTitle>Test funcional — Single hop (cm)</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lado afectado"><NumInput value={form.single_hop_affected} onChange={v => set('single_hop_affected', v)} /></Field>
          <Field label="Lado sano"><NumInput value={form.single_hop_unaffected} onChange={v => set('single_hop_unaffected', v)} /></Field>
        </div>
        {hopLsi !== null && <div className="mt-3"><LsiDisplay label="Single Hop LSI" val={hopLsi} /></div>}
      </div>

      <div>
        <SectionTitle>Tolerancia a la carga</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Semanas consecutivas de entrenamiento completo">
            <NumInput value={form.full_training_weeks} onChange={v => set('full_training_weeks', v)} min="0" max="52" placeholder="ej: 3" />
          </Field>
        </div>
        <p className="text-[12px] text-text-secondary mt-2">Se requieren al menos 2 semanas de entrenamiento completo sin reacción del tendón.</p>
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
