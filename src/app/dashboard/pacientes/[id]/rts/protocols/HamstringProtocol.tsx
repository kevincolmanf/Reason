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
  affected_side: 'left', muscle: '', grade: '',
  weeks_since_injury: '', pain_vas: '', palpation_pain: '', rom_full: '',
  strength_unit: 'kg',
  ham_eccentric_affected: '', ham_eccentric_unaffected: '',
  quad_affected: '', quad_unaffected: '',
  single_hop_affected: '', single_hop_unaffected: '',
  sprint_pain_free: '', agility_pain_free: '',
  bddq_score: '', notes: '',
}

type FormData = typeof INIT

export default function HamstringProtocol({ patient, userId, initialData, evalId, onSaved, onNewEval }: Props) {
  const [form, setForm] = useState<FormData>({ ...INIT, ...(initialData as Partial<FormData> ?? {}) })
  const [mode, setMode] = useState<'form' | 'results'>('form')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(evalId ?? null)
  const supabase = useRef(createClient())

  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }))

  const hamLsi = lsi(n(form.ham_eccentric_affected), n(form.ham_eccentric_unaffected))
  const hopLsi = lsi(n(form.single_hop_affected), n(form.single_hop_unaffected))
  const hqRatio = (n(form.ham_eccentric_affected) && n(form.quad_affected) && n(form.quad_affected)! > 0)
    ? n(form.ham_eccentric_affected)! / n(form.quad_affected)! : null

  const criteria: Criterion[] = [
    {
      label: 'Tiempo desde lesión ≥6 semanas',
      passed: form.weeks_since_injury ? n(form.weeks_since_injury)! >= 6 : null,
      detail: form.weeks_since_injury ? `${form.weeks_since_injury} semanas` : undefined,
    },
    {
      label: 'Dolor durante testing ≤2/10',
      passed: form.pain_vas !== '' ? n(form.pain_vas)! <= 2 : null,
      detail: form.pain_vas !== '' ? `VAS ${form.pain_vas}/10` : undefined,
    },
    {
      label: 'Sin dolor a la palpación',
      passed: form.palpation_pain !== '' ? form.palpation_pain === 'no' : null,
    },
    {
      label: 'ROM completo de cadera y rodilla',
      passed: form.rom_full !== '' ? form.rom_full === 'yes' : null,
    },
    {
      label: 'LSI fuerza excéntrica isquiotibiales ≥90%',
      passed: hamLsi !== null ? hamLsi >= 90 : null,
      detail: hamLsi !== null ? `LSI ${hamLsi.toFixed(1)}%` : undefined,
    },
    {
      label: 'Ratio H/Q ≥0.60',
      passed: hqRatio !== null ? hqRatio >= 0.60 : null,
      detail: hqRatio !== null ? `H/Q ${hqRatio.toFixed(2)}` : undefined,
    },
    {
      label: 'Single hop LSI ≥90%',
      passed: hopLsi !== null ? hopLsi >= 90 : null,
      detail: hopLsi !== null ? `LSI ${hopLsi.toFixed(1)}%` : undefined,
    },
    {
      label: 'Sprint máximo sin dolor',
      passed: form.sprint_pain_free !== '' ? form.sprint_pain_free === 'yes' : null,
    },
    {
      label: 'Agilidad sin dolor',
      passed: form.agility_pain_free !== '' ? form.agility_pain_free === 'yes' : null,
    },
    {
      label: 'BDDQ ≥70%',
      passed: form.bddq_score !== '' ? n(form.bddq_score)! >= 70 : null,
      detail: form.bddq_score !== '' ? `${form.bddq_score}%` : undefined,
    },
  ]

  const handleAnalyze = async () => {
    setSaving(true)
    const payload = {
      user_id: userId,
      patient_id: patient.id,
      protocol_type: 'hamstring',
      affected_side: form.affected_side,
      notes: form.notes || null,
      form_data: form,
    }
    let id = savedId
    if (savedId) {
      await supabase.current.from('rts_evaluations').update(payload).eq('id', savedId)
    } else {
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
          <h2 className="text-[20px] font-medium mb-1">Resultados — Isquiotibiales</h2>
          <p className="text-[13px] text-text-secondary">{patient.name}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <LsiDisplay label="LSI Excéntrico" val={hamLsi} />
          <LsiDisplay label="Single Hop LSI" val={hopLsi} />
          <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center">
            <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">H/Q Ratio</div>
            <div className={`text-[18px] font-medium ${hqRatio === null ? 'text-text-secondary' : hqRatio >= 0.6 ? 'text-[#4ade80]' : 'text-red-400'}`}>
              {hqRatio !== null ? hqRatio.toFixed(2) : '—'}
            </div>
          </div>
          <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center">
            <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">VAS</div>
            <div className="text-[18px] font-medium">{form.pain_vas || '—'}/10</div>
          </div>
        </div>

        <CriteriaResults criteria={criteria} notes={form.notes} onNewEval={onNewEval} />

        <button onClick={() => setMode('form')} className="mt-3 text-[13px] text-accent hover:underline">
          ← Editar datos
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Contexto */}
      <div>
        <SectionTitle>Contexto de la lesión</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Lado afectado">
            <SelectInput value={form.affected_side} onChange={v => set('affected_side', v)} options={[{ value: 'left', label: 'Izquierdo' }, { value: 'right', label: 'Derecho' }]} />
          </Field>
          <Field label="Músculo">
            <SelectInput value={form.muscle} onChange={v => set('muscle', v)} options={[
              { value: 'bf', label: 'Bíceps femoral (BF)' },
              { value: 'st', label: 'Semitendinoso (ST)' },
              { value: 'sm', label: 'Semimembranoso (SM)' },
              { value: 'multiple', label: 'Múltiples' },
            ]} />
          </Field>
          <Field label="Grado">
            <SelectInput value={form.grade} onChange={v => set('grade', v)} options={[
              { value: '1', label: 'Grado I' },
              { value: '2', label: 'Grado II' },
              { value: '3', label: 'Grado III' },
            ]} />
          </Field>
          <Field label="Semanas desde la lesión">
            <NumInput value={form.weeks_since_injury} onChange={v => set('weeks_since_injury', v)} min="0" max="104" placeholder="ej: 8" />
          </Field>
          <Field label="Dolor durante evaluación (VAS 0-10)">
            <NumInput value={form.pain_vas} onChange={v => set('pain_vas', v)} min="0" max="10" placeholder="0" />
          </Field>
        </div>
      </div>

      {/* Clínica */}
      <div>
        <SectionTitle>Evaluación clínica</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="¿Dolor a la palpación del vientre muscular?">
            <YesNoInput value={form.palpation_pain} onChange={v => set('palpation_pain', v)} />
          </Field>
          <Field label="¿ROM completo de cadera y rodilla?">
            <YesNoInput value={form.rom_full} onChange={v => set('rom_full', v)} />
          </Field>
        </div>
      </div>

      {/* Fuerza */}
      <div>
        <SectionTitle>Fuerza muscular</SectionTitle>
        <div className="flex gap-2 mb-4">
          {(['kg', 'N'] as const).map(u => (
            <button key={u} type="button" onClick={() => set('strength_unit', u)}
              className={`px-3 py-1 rounded-full text-[12px] border-[0.5px] transition-colors ${form.strength_unit === u ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border text-text-secondary'}`}
            >{u}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label={`Isq. excéntrico — lado afectado (${form.strength_unit})`}>
            <NumInput value={form.ham_eccentric_affected} onChange={v => set('ham_eccentric_affected', v)} />
          </Field>
          <Field label={`Isq. excéntrico — lado sano (${form.strength_unit})`}>
            <NumInput value={form.ham_eccentric_unaffected} onChange={v => set('ham_eccentric_unaffected', v)} />
          </Field>
          <Field label={`Cuád. — lado afectado (${form.strength_unit})`}>
            <NumInput value={form.quad_affected} onChange={v => set('quad_affected', v)} />
          </Field>
          <Field label={`Cuád. — lado sano (${form.strength_unit})`}>
            <NumInput value={form.quad_unaffected} onChange={v => set('quad_unaffected', v)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          <LsiDisplay label="LSI Excéntrico" val={hamLsi} />
          <LsiDisplay label="LSI Cuádriceps" val={lsi(n(form.quad_affected), n(form.quad_unaffected))} />
          <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center">
            <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">H/Q Ratio</div>
            <div className={`text-[18px] font-medium ${hqRatio === null ? 'text-text-secondary' : hqRatio >= 0.6 ? 'text-[#4ade80]' : 'text-red-400'}`}>
              {hqRatio !== null ? hqRatio.toFixed(2) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Tests funcionales */}
      <div>
        <SectionTitle>Tests funcionales</SectionTitle>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Single hop — lado afectado (cm)">
            <NumInput value={form.single_hop_affected} onChange={v => set('single_hop_affected', v)} />
          </Field>
          <Field label="Single hop — lado sano (cm)">
            <NumInput value={form.single_hop_unaffected} onChange={v => set('single_hop_unaffected', v)} />
          </Field>
        </div>
        {hopLsi !== null && <div className="mb-4"><LsiDisplay label="Single Hop LSI" val={hopLsi} /></div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="¿Sprint máximo sin dolor?">
            <YesNoInput value={form.sprint_pain_free} onChange={v => set('sprint_pain_free', v)} />
          </Field>
          <Field label="¿Agilidad (T-test / figure-8) sin dolor?">
            <YesNoInput value={form.agility_pain_free} onChange={v => set('agility_pain_free', v)} />
          </Field>
        </div>
      </div>

      {/* Cuestionario */}
      <div>
        <SectionTitle>Cuestionario — BDDQ</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Puntaje BDDQ (0–100%)">
            <NumInput value={form.bddq_score} onChange={v => set('bddq_score', v)} min="0" max="100" placeholder="ej: 85" />
          </Field>
        </div>
        <p className="text-[12px] text-text-secondary mt-2">Bayesian Decision framework for Diagnostics Questionnaire. Umbral de retorno: ≥70%.</p>
      </div>

      {/* Notas */}
      <div>
        <SectionTitle>Observaciones</SectionTitle>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Observaciones clínicas..."
          rows={3}
          className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] focus:border-accent outline-none resize-none"
        />
      </div>

      <button
        onClick={handleAnalyze}
        disabled={saving}
        className="bg-accent text-bg-primary px-6 py-3 rounded-lg text-[14px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {saving ? 'Guardando...' : 'Ver análisis y guardar'}
      </button>
    </div>
  )
}
