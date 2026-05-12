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
  affected_side: 'left', diagnosis_type: '', surgery_date: '',
  pain_vas: '',
  er_rom_affected: '', er_rom_unaffected: '',
  ir_rom_affected: '', ir_rom_unaffected: '',
  er_strength_affected: '', er_strength_unaffected: '',
  ir_strength_affected: '', ir_strength_unaffected: '',
  strength_unit: 'kg',
  apprehension_negative: '',
  ue_ybal_affected: '', ue_ybal_unaffected: '',
  sport_specific_ok: '',
  wosi_score: '', rowe_score: '', dash_score: '',
  notes: '',
}
type FormData = typeof INIT

export default function ShoulderProtocol({ patient, userId, initialData, evalId, onSaved, onNewEval }: Props) {
  const [form, setForm] = useState<FormData>({ ...INIT, ...(initialData as Partial<FormData> ?? {}) })
  const [mode, setMode] = useState<'form' | 'results'>('form')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(evalId ?? null)
  const supabase = useRef(createClient())
  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }))

  const erLsi = lsi(n(form.er_strength_affected), n(form.er_strength_unaffected))
  const irLsi = lsi(n(form.ir_strength_affected), n(form.ir_strength_unaffected))
  const ybalLsi = lsi(n(form.ue_ybal_affected), n(form.ue_ybal_unaffected))

  const erIrRatio = (n(form.er_strength_affected) && n(form.ir_strength_affected) && n(form.ir_strength_affected)! > 0)
    ? n(form.er_strength_affected)! / n(form.ir_strength_affected)! : null

  const erRomDiff = (n(form.er_rom_affected) !== null && n(form.er_rom_unaffected) !== null)
    ? Math.abs(n(form.er_rom_unaffected)! - n(form.er_rom_affected)!) : null

  const isInstability = ['bankart', 'instability'].includes(form.diagnosis_type)
  const isRotatorCuff = ['rotator_cuff', 'impingement'].includes(form.diagnosis_type)

  const criteria: Criterion[] = [
    { label: 'Dolor ≤2/10', passed: form.pain_vas !== '' ? n(form.pain_vas)! <= 2 : null, detail: form.pain_vas !== '' ? `VAS ${form.pain_vas}/10` : undefined },
    { label: 'Déficit ROM rotación externa ≤5°', passed: erRomDiff !== null ? erRomDiff <= 5 : null, detail: erRomDiff !== null ? `Déficit ${erRomDiff.toFixed(0)}°` : undefined },
    { label: 'LSI fuerza rotadores externos ≥90%', passed: erLsi !== null ? erLsi >= 90 : null, detail: erLsi !== null ? `LSI ${erLsi.toFixed(1)}%` : undefined },
    { label: 'Ratio ER/IR ≥0.75', passed: erIrRatio !== null ? erIrRatio >= 0.75 : null, detail: erIrRatio !== null ? `Ratio ${erIrRatio.toFixed(2)}` : undefined },
    { label: 'Test de aprensión negativo', passed: form.apprehension_negative !== '' ? form.apprehension_negative === 'yes' : null },
    { label: 'UE Y-Balance LSI ≥90%', passed: ybalLsi !== null ? ybalLsi >= 90 : null, detail: ybalLsi !== null ? `LSI ${ybalLsi.toFixed(1)}%` : undefined },
    ...(isInstability ? [
      { label: 'WOSI ≥75% (inestabilidad / Bankart)', passed: form.wosi_score !== '' ? n(form.wosi_score)! >= 75 : null, detail: form.wosi_score !== '' ? `${form.wosi_score}%` : undefined } as Criterion,
      { label: 'ROWE score ≥75/100', passed: form.rowe_score !== '' ? n(form.rowe_score)! >= 75 : null, detail: form.rowe_score !== '' ? `${form.rowe_score}/100` : undefined } as Criterion,
    ] : []),
    ...(isRotatorCuff ? [
      { label: 'DASH ≤20/100 (manguito / impingement)', passed: form.dash_score !== '' ? n(form.dash_score)! <= 20 : null, detail: form.dash_score !== '' ? `${form.dash_score}/100` : undefined } as Criterion,
    ] : []),
    { label: 'Gesto deportivo específico sin dolor ni aprensión', passed: form.sport_specific_ok !== '' ? form.sport_specific_ok === 'yes' : null },
  ]

  const handleAnalyze = async () => {
    setSaving(true)
    const payload = { user_id: userId, patient_id: patient.id, protocol_type: 'shoulder', affected_side: form.affected_side, notes: form.notes || null, form_data: form }
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
          <h2 className="text-[20px] font-medium mb-1">Resultados — Hombro overhead</h2>
          <p className="text-[13px] text-text-secondary">{patient.name}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <LsiDisplay label="ER Fuerza LSI" val={erLsi} />
          <LsiDisplay label="IR Fuerza LSI" val={irLsi} />
          <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center">
            <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">ER/IR Ratio</div>
            <div className={`text-[18px] font-medium ${erIrRatio === null ? 'text-text-secondary' : erIrRatio >= 0.75 ? 'text-[#4ade80]' : 'text-red-400'}`}>{erIrRatio !== null ? erIrRatio.toFixed(2) : '—'}</div>
          </div>
          <LsiDisplay label="UE Y-Balance" val={ybalLsi} />
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
              { value: 'bankart', label: 'Bankart / Post-quirúrgico' },
              { value: 'instability', label: 'Inestabilidad glenohumeral' },
              { value: 'rotator_cuff', label: 'Manguito rotador' },
              { value: 'impingement', label: 'Impingement / SLAP' },
              { value: 'other', label: 'Otro' },
            ]} />
          </Field>
          <Field label="Fecha de cirugía (si aplica)">
            <input type="date" value={form.surgery_date} onChange={e => set('surgery_date', e.target.value)} className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] focus:border-accent outline-none" />
          </Field>
          <Field label="Dolor (VAS 0-10)">
            <NumInput value={form.pain_vas} onChange={v => set('pain_vas', v)} min="0" max="10" />
          </Field>
        </div>
      </div>

      <div>
        <SectionTitle>ROM (grados, a 90° abducción)</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="RE — lado afectado (°)"><NumInput value={form.er_rom_affected} onChange={v => set('er_rom_affected', v)} min="0" max="120" /></Field>
          <Field label="RE — lado sano (°)"><NumInput value={form.er_rom_unaffected} onChange={v => set('er_rom_unaffected', v)} min="0" max="120" /></Field>
          <Field label="RI — lado afectado (°)"><NumInput value={form.ir_rom_affected} onChange={v => set('ir_rom_affected', v)} min="0" max="90" /></Field>
          <Field label="RI — lado sano (°)"><NumInput value={form.ir_rom_unaffected} onChange={v => set('ir_rom_unaffected', v)} min="0" max="90" /></Field>
        </div>
        {erRomDiff !== null && (
          <div className="mt-3 bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center inline-block min-w-[140px]">
            <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">Déficit RE</div>
            <div className={`text-[18px] font-medium ${erRomDiff <= 5 ? 'text-[#4ade80]' : 'text-red-400'}`}>{erRomDiff.toFixed(0)}°</div>
          </div>
        )}
      </div>

      <div>
        <SectionTitle>Fuerza rotadores</SectionTitle>
        <div className="flex gap-2 mb-4">
          {(['kg', 'N'] as const).map(u => (
            <button key={u} type="button" onClick={() => set('strength_unit', u)}
              className={`px-3 py-1 rounded-full text-[12px] border-[0.5px] transition-colors ${form.strength_unit === u ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border text-text-secondary'}`}>{u}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label={`RE afectado (${form.strength_unit})`}><NumInput value={form.er_strength_affected} onChange={v => set('er_strength_affected', v)} /></Field>
          <Field label={`RE sano (${form.strength_unit})`}><NumInput value={form.er_strength_unaffected} onChange={v => set('er_strength_unaffected', v)} /></Field>
          <Field label={`RI afectado (${form.strength_unit})`}><NumInput value={form.ir_strength_affected} onChange={v => set('ir_strength_affected', v)} /></Field>
          <Field label={`RI sano (${form.strength_unit})`}><NumInput value={form.ir_strength_unaffected} onChange={v => set('ir_strength_unaffected', v)} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <LsiDisplay label="ER Fuerza LSI" val={erLsi} />
          <LsiDisplay label="IR Fuerza LSI" val={irLsi} />
          <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center">
            <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">ER/IR Ratio</div>
            <div className={`text-[18px] font-medium ${erIrRatio === null ? 'text-text-secondary' : erIrRatio >= 0.75 ? 'text-[#4ade80]' : 'text-red-400'}`}>{erIrRatio !== null ? erIrRatio.toFixed(2) : '—'}</div>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>Tests funcionales</SectionTitle>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="UE Y-Balance — afectado (cm)"><NumInput value={form.ue_ybal_affected} onChange={v => set('ue_ybal_affected', v)} /></Field>
          <Field label="UE Y-Balance — sano (cm)"><NumInput value={form.ue_ybal_unaffected} onChange={v => set('ue_ybal_unaffected', v)} /></Field>
        </div>
        {ybalLsi !== null && <div className="mb-4"><LsiDisplay label="UE Y-Balance LSI" val={ybalLsi} /></div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Test de aprensión — ¿negativo?"><YesNoInput value={form.apprehension_negative} onChange={v => set('apprehension_negative', v)} /></Field>
          <Field label="¿Gesto deportivo específico sin dolor/aprensión?"><YesNoInput value={form.sport_specific_ok} onChange={v => set('sport_specific_ok', v)} /></Field>
        </div>
      </div>

      <div>
        <SectionTitle>Cuestionarios</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(isInstability || !form.diagnosis_type) && (
            <>
              <Field label="WOSI (0–100%, inestabilidad)">
                <NumInput value={form.wosi_score} onChange={v => set('wosi_score', v)} min="0" max="100" placeholder="ej: 80" />
              </Field>
              <Field label="ROWE (0–100, inestabilidad)">
                <NumInput value={form.rowe_score} onChange={v => set('rowe_score', v)} min="0" max="100" placeholder="ej: 85" />
              </Field>
            </>
          )}
          {(isRotatorCuff || !form.diagnosis_type) && (
            <Field label="DASH (0–100, manguito)">
              <NumInput value={form.dash_score} onChange={v => set('dash_score', v)} min="0" max="100" placeholder="ej: 15" />
            </Field>
          )}
        </div>
        <p className="text-[12px] text-text-secondary mt-2">WOSI ≥75% · ROWE ≥75/100 · DASH ≤20/100.</p>
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
