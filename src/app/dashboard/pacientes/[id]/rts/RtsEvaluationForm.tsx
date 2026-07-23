'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  RtsEvaluation,
  computeLSI,
  computeTimedHopLSI,
  getLSIColor,
  QUAD_NORMS,
  HAMSTRING_NORMS,
  CMJ_NORMS,
  getAgeGroup,
  getCmjAgeGroup,
} from './rtsUtils'
import RtsDashboard from './RtsDashboard'

interface RtsEvaluationFormProps {
  patient: { id: string; name: string; age: number | null }
  userId: string
  lastDynamo: { muscle_results: Record<string, { right: string; left: string }>; unit: string; created_at: string } | null
  lastKoos: { score: number | null; result_data: unknown; created_at: string } | null
  lastAclRsi: { score: number | null; created_at: string } | null
  previousEvals: RtsEvaluation[]
  initialEval?: RtsEvaluation
  onSaved?: (id: string) => void
  onNewEval?: () => void
}

type FormData = {
  surgery_date: string
  graft_type: string
  affected_side: string
  patient_body_weight: string
  patient_sex: string
  effusion: string
  rom_extension: string           // legacy
  rom_flexion: string             // legacy
  rom_extension_passive: string
  rom_extension_active: string
  rom_flexion_passive: string
  rom_flexion_active: string
  pain_vas: string
  quad_affected: string
  quad_unaffected: string
  hamstring_affected: string
  hamstring_unaffected: string
  single_hop_affected: string
  single_hop_unaffected: string
  triple_hop_affected: string
  triple_hop_unaffected: string
  crossover_hop_affected: string
  crossover_hop_unaffected: string
  timed_hop_affected: string
  timed_hop_unaffected: string
  cmj_bilateral: string
  slcmj_affected: string
  slcmj_unaffected: string
  drop_jump_quality: string
  sl_bridge_affected: string
  sl_bridge_unaffected: string
  sl_bridge_quality: string
  slsquat_reps_affected: string
  slsquat_reps_unaffected: string
  slsquat_quality: string
  koos_sport: string
  acl_rsi: string
  grs: string
  notes: string
}

const initialForm: FormData = {
  surgery_date: '',
  graft_type: '',
  affected_side: 'left',
  patient_body_weight: '',
  patient_sex: '',
  effusion: '',
  rom_extension: '',
  rom_flexion: '',
  rom_extension_passive: '',
  rom_extension_active: '',
  rom_flexion_passive: '',
  rom_flexion_active: '',
  pain_vas: '',
  quad_affected: '',
  quad_unaffected: '',
  hamstring_affected: '',
  hamstring_unaffected: '',
  single_hop_affected: '',
  single_hop_unaffected: '',
  triple_hop_affected: '',
  triple_hop_unaffected: '',
  crossover_hop_affected: '',
  crossover_hop_unaffected: '',
  timed_hop_affected: '',
  timed_hop_unaffected: '',
  cmj_bilateral: '',
  slcmj_affected: '',
  slcmj_unaffected: '',
  drop_jump_quality: '',
  sl_bridge_affected: '',
  sl_bridge_unaffected: '',
  sl_bridge_quality: '',
  slsquat_reps_affected: '',
  slsquat_reps_unaffected: '',
  slsquat_quality: '',
  koos_sport: '',
  acl_rsi: '',
  grs: '',
  notes: '',
}

function n(v: string): number | null {
  const f = parseFloat(v)
  return isNaN(f) ? null : f
}

function lsiColorClass(lsi: number | null): string {
  if (lsi === null) return 'text-text-secondary'
  const c = getLSIColor(lsi)
  if (c === 'green') return 'text-[#4ade80]'
  if (c === 'orange') return 'text-[#fb923c]'
  return 'text-[#f87171]'
}

function lsiIcon(lsi: number | null): string {
  if (lsi === null) return ''
  if (lsi >= 90) return ' ✓'
  if (lsi >= 80) return ' ⚠'
  return ' ✗'
}

function MonthsBadge({ surgeryDate }: { surgeryDate: string }) {
  if (!surgeryDate) return null
  const surgery = new Date(surgeryDate)
  const now = new Date()
  const diffMs = now.getTime() - surgery.getTime()
  const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 0) return null
  const isOk = months >= 9
  return (
    <span className={`text-[13px] font-medium px-3 py-1 rounded-full border-[0.5px] ${isOk ? 'text-[#4ade80] border-[#4ade8040] bg-[#4ade8010]' : 'text-[#f87171] border-[#f8717140] bg-[#f8717110]'}`}>
      {months} meses desde la cirugía {isOk ? '✓' : '⚠ < 9 meses'}
    </span>
  )
}

function InputField({
  label, value, onChange, type = 'number', min, max, step, placeholder, unit
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  min?: string
  max?: string
  step?: string
  placeholder?: string
  unit?: string
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min}
          max={max}
          step={step ?? '0.1'}
          placeholder={placeholder}
          className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent pr-10"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-text-secondary pointer-events-none">{unit}</span>
        )}
      </div>
    </div>
  )
}

function LSIDisplay({ label, lsi, extra }: { label: string; lsi: number | null; extra?: string }) {
  if (lsi === null) return null
  return (
    <div className="text-[13px]">
      <span className="text-text-secondary">{label}: </span>
      <span className={`font-medium ${lsiColorClass(lsi)}`}>{lsi.toFixed(1)}%{lsiIcon(lsi)}</span>
      {extra && <span className="text-text-secondary ml-2 text-[11px]">{extra}</span>}
    </div>
  )
}

function EffusionSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { val: '0', label: 'Ninguno', ok: true },
    { val: '1', label: 'Traza', ok: true },
    { val: '2', label: 'Moderado', ok: false },
    { val: '3', label: 'Severo', ok: false },
  ]
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Derrame articular</label>
      <div className="flex gap-2 flex-wrap">
        {options.map(o => (
          <button
            key={o.val}
            type="button"
            onClick={() => onChange(o.val)}
            className={`px-4 py-2 rounded-lg text-[13px] border-[0.5px] transition-colors ${
              value === o.val
                ? o.ok
                  ? 'bg-[#4ade8020] border-[#4ade80] text-[#4ade80]'
                  : 'bg-[#f8717120] border-[#f87171] text-[#f87171]'
                : 'bg-bg-secondary border-border text-text-secondary hover:border-border-strong'
            }`}
          >
            {o.ok ? '✓' : '✗'} {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function PhaseStatus({ value, label, check }: { value: string; label: string; check: (v: number) => 'pass' | 'warn' | 'fail' | null }) {
  const num = n(value)
  if (num === null) return null
  const status = check(num)
  if (!status) return null
  return (
    <div className={`text-[12px] mt-1 ${status === 'pass' ? 'text-[#4ade80]' : status === 'warn' ? 'text-[#fb923c]' : 'text-[#f87171]'}`}>
      {status === 'pass' ? '✓' : status === 'warn' ? '⚠' : '✗'} {label}
    </div>
  )
}

export default function RtsEvaluationForm({
  patient,
  userId,
  lastDynamo,
  lastKoos,
  lastAclRsi,
  previousEvals,
  initialEval,
  onSaved,
  onNewEval,
}: RtsEvaluationFormProps) {
  const [form, setForm] = useState<FormData>(() => {
    const base = { ...initialForm }
    if (patient.age) {
      // no field for age in form, but we use it for norms display
    }
    return base
  })
  const [mode, setMode] = useState<'form' | 'dashboard'>('form')
  const [savedEval, setSavedEval] = useState<RtsEvaluation | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dynamoMode, setDynamoMode] = useState<'imported' | 'manual'>('imported')
  const [koosMode, setKoosMode] = useState<'imported' | 'manual'>('imported')
  const [aclRsiMode, setAclRsiMode] = useState<'imported' | 'manual'>('imported')
  const [forceUnit, setForceUnit] = useState<'kg' | 'N'>('kg')

  // Conversion helpers — form state always stores kg internally
  const N_PER_KG = 9.80665
  const toDisplay = (kgVal: string): string => {
    if (forceUnit === 'kg' || kgVal === '') return kgVal
    const num = parseFloat(kgVal)
    if (isNaN(num)) return kgVal
    return (num * N_PER_KG).toFixed(1)
  }
  const switchForceUnit = (newUnit: 'kg' | 'N') => {
    if (newUnit === forceUnit) return
    const forceKeys: (keyof FormData)[] = ['quad_affected', 'quad_unaffected', 'hamstring_affected', 'hamstring_unaffected']
    setForm(prev => {
      const updated = { ...prev }
      forceKeys.forEach(key => {
        const val = prev[key]
        if (!val) return
        const num = parseFloat(val)
        if (isNaN(num)) return
        updated[key] = newUnit === 'N'
          ? (num * N_PER_KG).toFixed(1)
          : (num / N_PER_KG).toFixed(3)
      })
      return updated
    })
    setForceUnit(newUnit)
  }

  const supabaseRef = useRef(createClient())

  // Load initialEval if provided (editing a previous evaluation)
  useEffect(() => {
    if (!initialEval) return
    setForm({
      surgery_date: initialEval.surgery_date || '',
      graft_type: initialEval.graft_type || '',
      affected_side: initialEval.affected_side || 'left',
      patient_body_weight: initialEval.patient_body_weight != null ? String(initialEval.patient_body_weight) : '',
      patient_sex: initialEval.patient_sex || '',
      effusion: initialEval.effusion != null ? String(initialEval.effusion) : '',
      rom_extension: initialEval.rom_extension != null ? String(initialEval.rom_extension) : '',
      rom_flexion: initialEval.rom_flexion != null ? String(initialEval.rom_flexion) : '',
      rom_extension_passive: initialEval.rom_extension_passive != null ? String(initialEval.rom_extension_passive) : (initialEval.rom_extension != null ? String(initialEval.rom_extension) : ''),
      rom_extension_active:  initialEval.rom_extension_active  != null ? String(initialEval.rom_extension_active)  : (initialEval.rom_extension != null ? String(initialEval.rom_extension) : ''),
      rom_flexion_passive:   initialEval.rom_flexion_passive   != null ? String(initialEval.rom_flexion_passive)   : (initialEval.rom_flexion != null ? String(initialEval.rom_flexion) : ''),
      rom_flexion_active:    initialEval.rom_flexion_active    != null ? String(initialEval.rom_flexion_active)    : (initialEval.rom_flexion != null ? String(initialEval.rom_flexion) : ''),
      pain_vas: initialEval.pain_vas != null ? String(initialEval.pain_vas) : '',
      quad_affected: initialEval.quad_affected != null ? toDisplay(String(initialEval.quad_affected)) : '',
      quad_unaffected: initialEval.quad_unaffected != null ? toDisplay(String(initialEval.quad_unaffected)) : '',
      hamstring_affected: initialEval.hamstring_affected != null ? toDisplay(String(initialEval.hamstring_affected)) : '',
      hamstring_unaffected: initialEval.hamstring_unaffected != null ? toDisplay(String(initialEval.hamstring_unaffected)) : '',
      single_hop_affected: initialEval.single_hop_affected != null ? String(initialEval.single_hop_affected) : '',
      single_hop_unaffected: initialEval.single_hop_unaffected != null ? String(initialEval.single_hop_unaffected) : '',
      triple_hop_affected: initialEval.triple_hop_affected != null ? String(initialEval.triple_hop_affected) : '',
      triple_hop_unaffected: initialEval.triple_hop_unaffected != null ? String(initialEval.triple_hop_unaffected) : '',
      crossover_hop_affected: initialEval.crossover_hop_affected != null ? String(initialEval.crossover_hop_affected) : '',
      crossover_hop_unaffected: initialEval.crossover_hop_unaffected != null ? String(initialEval.crossover_hop_unaffected) : '',
      timed_hop_affected: initialEval.timed_hop_affected != null ? String(initialEval.timed_hop_affected) : '',
      timed_hop_unaffected: initialEval.timed_hop_unaffected != null ? String(initialEval.timed_hop_unaffected) : '',
      cmj_bilateral: initialEval.cmj_bilateral != null ? String(initialEval.cmj_bilateral) : '',
      slcmj_affected: initialEval.slcmj_affected != null ? String(initialEval.slcmj_affected) : '',
      slcmj_unaffected: initialEval.slcmj_unaffected != null ? String(initialEval.slcmj_unaffected) : '',
      drop_jump_quality: initialEval.drop_jump_quality || '',
      sl_bridge_affected:   initialEval.sl_bridge_affected   != null ? String(initialEval.sl_bridge_affected)   : '',
      sl_bridge_unaffected: initialEval.sl_bridge_unaffected != null ? String(initialEval.sl_bridge_unaffected) : '',
      sl_bridge_quality:    initialEval.sl_bridge_quality    || '',
      slsquat_reps_affected:   initialEval.slsquat_reps_affected   != null ? String(initialEval.slsquat_reps_affected)   : '',
      slsquat_reps_unaffected: initialEval.slsquat_reps_unaffected != null ? String(initialEval.slsquat_reps_unaffected) : '',
      slsquat_quality:      initialEval.slsquat_quality      || '',
      koos_sport: initialEval.koos_sport != null ? String(initialEval.koos_sport) : '',
      acl_rsi: initialEval.acl_rsi != null ? String(initialEval.acl_rsi) : '',
      grs: initialEval.grs != null ? String(initialEval.grs) : '',
      notes: initialEval.notes || '',
    })
    setSavedEval(initialEval)
    setIsSaved(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEval?.id])

  const set = useCallback((key: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  const importDynamoData = useCallback(() => {
    if (!lastDynamo) return
    const side = form.affected_side
    const muscles = lastDynamo.muscle_results
    const dynamoUnit = lastDynamo.unit ?? 'kg'

    const convertToFormUnit = (rawStr: string | undefined): string => {
      if (!rawStr) return ''
      const raw = parseFloat(rawStr)
      if (isNaN(raw)) return rawStr
      // Convert from dynamo unit → kg → form unit
      const inKg = dynamoUnit === 'N' ? raw / N_PER_KG : raw
      if (forceUnit === 'N') return (inKg * N_PER_KG).toFixed(1)
      return inKg.toFixed(3)
    }

    const quadAff = convertToFormUnit(side === 'right' ? muscles?.quad?.right : muscles?.quad?.left)
    const quadUnaff = convertToFormUnit(side === 'right' ? muscles?.quad?.left : muscles?.quad?.right)
    const hamAff = convertToFormUnit(side === 'right' ? muscles?.hamstring?.right : muscles?.hamstring?.left)
    const hamUnaff = convertToFormUnit(side === 'right' ? muscles?.hamstring?.left : muscles?.hamstring?.right)

    setForm(prev => ({
      ...prev,
      quad_affected: quadAff || prev.quad_affected,
      quad_unaffected: quadUnaff || prev.quad_unaffected,
      hamstring_affected: hamAff || prev.hamstring_affected,
      hamstring_unaffected: hamUnaff || prev.hamstring_unaffected,
    }))
    setDynamoMode('manual')
  }, [lastDynamo, form.affected_side, forceUnit, N_PER_KG])

  const importKoosData = useCallback(() => {
    if (!lastKoos?.score) return
    // Try to get KOOS sport sub-score from result_data
    const rd = lastKoos.result_data as Record<string, unknown> | null
    const sportScore = rd && typeof rd === 'object' && 'sport' in rd ? rd.sport : lastKoos.score
    setForm(prev => ({ ...prev, koos_sport: String(sportScore) }))
    setKoosMode('manual')
  }, [lastKoos])

  const importAclRsiData = useCallback(() => {
    if (!lastAclRsi?.score) return
    setForm(prev => ({ ...prev, acl_rsi: String(lastAclRsi.score) }))
    setAclRsiMode('manual')
  }, [lastAclRsi])

  const buildEvalObject = useCallback((): Omit<RtsEvaluation, 'id' | 'created_at'> => {
    return {
      surgery_date: form.surgery_date || null,
      graft_type: form.graft_type || null,
      affected_side: form.affected_side,
      effusion: form.effusion !== '' ? parseInt(form.effusion) : null,
      rom_extension: n(form.rom_extension),
      rom_flexion: n(form.rom_flexion),
      rom_extension_passive: n(form.rom_extension_passive),
      rom_extension_active:  n(form.rom_extension_active),
      rom_flexion_passive:   n(form.rom_flexion_passive),
      rom_flexion_active:    n(form.rom_flexion_active),
      pain_vas: n(form.pain_vas),
      quad_affected: forceUnit === 'N' ? (n(form.quad_affected) != null ? n(form.quad_affected)! / N_PER_KG : null) : n(form.quad_affected),
      quad_unaffected: forceUnit === 'N' ? (n(form.quad_unaffected) != null ? n(form.quad_unaffected)! / N_PER_KG : null) : n(form.quad_unaffected),
      hamstring_affected: forceUnit === 'N' ? (n(form.hamstring_affected) != null ? n(form.hamstring_affected)! / N_PER_KG : null) : n(form.hamstring_affected),
      hamstring_unaffected: forceUnit === 'N' ? (n(form.hamstring_unaffected) != null ? n(form.hamstring_unaffected)! / N_PER_KG : null) : n(form.hamstring_unaffected),
      patient_body_weight: n(form.patient_body_weight),
      patient_age: patient.age,
      patient_sex: form.patient_sex || null,
      single_hop_affected: n(form.single_hop_affected),
      single_hop_unaffected: n(form.single_hop_unaffected),
      triple_hop_affected: n(form.triple_hop_affected),
      triple_hop_unaffected: n(form.triple_hop_unaffected),
      crossover_hop_affected: n(form.crossover_hop_affected),
      crossover_hop_unaffected: n(form.crossover_hop_unaffected),
      timed_hop_affected: n(form.timed_hop_affected),
      timed_hop_unaffected: n(form.timed_hop_unaffected),
      cmj_bilateral: n(form.cmj_bilateral),
      slcmj_affected: n(form.slcmj_affected),
      slcmj_unaffected: n(form.slcmj_unaffected),
      drop_jump_quality:    form.drop_jump_quality    || null,
      sl_bridge_affected:   n(form.sl_bridge_affected),
      sl_bridge_unaffected: n(form.sl_bridge_unaffected),
      sl_bridge_quality:    form.sl_bridge_quality    || null,
      slsquat_reps_affected:   n(form.slsquat_reps_affected),
      slsquat_reps_unaffected: n(form.slsquat_reps_unaffected),
      slsquat_quality:      form.slsquat_quality      || null,
      koos_sport: n(form.koos_sport),
      acl_rsi: n(form.acl_rsi),
      grs: n(form.grs),
      notes: form.notes || null,
    }
  }, [form, patient.age, forceUnit, N_PER_KG])

  const handleViewAnalysis = useCallback(async () => {
    const evalData = buildEvalObject()
    setMode('dashboard')
    setIsSaving(true)
    const currentId = savedEval && savedEval.id !== 'temp' ? savedEval.id : null
    let result: RtsEvaluation | null = null
    if (currentId) {
      const { data } = await supabaseRef.current
        .from('rts_evaluations')
        .update({ ...evalData, protocol_type: 'lca' })
        .eq('id', currentId)
        .select()
        .single()
      result = data as RtsEvaluation
      if (result?.id) onSaved?.(result.id)
    } else {
      const { data } = await supabaseRef.current
        .from('rts_evaluations')
        .insert({ ...evalData, user_id: userId, patient_id: patient.id, protocol_type: 'lca' })
        .select()
        .single()
      result = data as RtsEvaluation
      if (result?.id) onSaved?.(result.id)
    }
    if (result) { setSavedEval(result); setIsSaved(true) }
    else { setSavedEval({ id: 'temp', created_at: new Date().toISOString(), ...evalData } as RtsEvaluation) }
    setIsSaving(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildEvalObject, savedEval, userId, patient.id, onSaved])

  const handleSave = useCallback(async () => {
    if (!savedEval) return
    setIsSaving(true)
    const evalData = buildEvalObject()
    const { data, error } = await supabaseRef.current
      .from('rts_evaluations')
      .insert({
        ...evalData,
        user_id: userId,
        patient_id: patient.id,
        protocol_type: 'lca',
      })
      .select()
      .single()

    if (!error && data) {
      setSavedEval(data as RtsEvaluation)
      setIsSaved(true)
    }
    setIsSaving(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedEval, buildEvalObject, userId, patient.id])

  const handleNewEvaluation = useCallback(() => {
    if (onNewEval) { onNewEval(); return }
    setForm(initialForm)
    setSavedEval(null)
    setIsSaved(false)
    setDynamoMode('imported')
    setKoosMode('imported')
    setAclRsiMode('imported')
    setMode('form')
  }, [onNewEval])

  // Real-time calculations — always in kg regardless of display unit
  const toKgNum = (val: string): number | null => {
    const raw = n(val)
    if (raw === null) return null
    return forceUnit === 'N' ? raw / N_PER_KG : raw
  }
  const quadKgAff = toKgNum(form.quad_affected)
  const quadKgUnaff = toKgNum(form.quad_unaffected)
  const hamKgAff = toKgNum(form.hamstring_affected)
  const hamKgUnaff = toKgNum(form.hamstring_unaffected)

  const quadLSI = computeLSI(quadKgAff, quadKgUnaff)
  const hamstringLSI = computeLSI(hamKgAff, hamKgUnaff)
  const hqRatio = (hamKgAff && quadKgAff && quadKgAff > 0)
    ? hamKgAff / quadKgAff
    : null

  const singleHopLSI = computeLSI(n(form.single_hop_affected), n(form.single_hop_unaffected))
  const tripleHopLSI = computeLSI(n(form.triple_hop_affected), n(form.triple_hop_unaffected))
  const crossoverLSI = computeLSI(n(form.crossover_hop_affected), n(form.crossover_hop_unaffected))
  const timedHopLSI = computeTimedHopLSI(n(form.timed_hop_affected), n(form.timed_hop_unaffected))
  const slcmjLSI = computeLSI(n(form.slcmj_affected), n(form.slcmj_unaffected))
  const slBridgeLSI = computeLSI(n(form.sl_bridge_affected), n(form.sl_bridge_unaffected))
  const slSquatLSI  = computeLSI(n(form.slsquat_reps_affected), n(form.slsquat_reps_unaffected))

  // Normative strength comparison
  const getStrengthNorm = (muscle: 'quad' | 'hamstring', side: 'affected' | 'unaffected') => {
    const sex = form.patient_sex as 'male' | 'female' | ''
    const age = patient.age
    if (!sex || !age || !form.patient_body_weight) return null
    const weight = n(form.patient_body_weight)
    if (!weight || weight === 0) return null
    const forceStr = side === 'affected'
      ? muscle === 'quad' ? form.quad_affected : form.hamstring_affected
      : muscle === 'quad' ? form.quad_unaffected : form.hamstring_unaffected
    const forceRaw = n(forceStr)
    if (forceRaw === null) return null
    const force = forceUnit === 'N' ? forceRaw / N_PER_KG : forceRaw
    const norms = muscle === 'quad' ? QUAD_NORMS : HAMSTRING_NORMS
    const sexNorms = norms[sex]
    if (!sexNorms) return null
    const ageGroup = getAgeGroup(age, sexNorms)
    const normValue = sexNorms[ageGroup]
    if (!normValue) return null
    const ratio = force / weight
    const pct = (ratio / normValue) * 100
    return { ratio: ratio.toFixed(2), normValue, pct, ageGroup }
  }

  // CMJ normative
  const getCmjNorm = () => {
    const sex = form.patient_sex as 'male' | 'female' | ''
    const age = patient.age
    if (!sex || !age || !form.cmj_bilateral) return null
    const val = n(form.cmj_bilateral)
    if (val === null) return null
    const sexNorms = CMJ_NORMS[sex]
    if (!sexNorms) return null
    const ageGroup = getCmjAgeGroup(age, sexNorms)
    const normValue = sexNorms[ageGroup]
    if (!normValue) return null
    const pct = (val / normValue) * 100
    const rel = pct >= 100 ? 'por encima' : pct >= 90 ? 'dentro' : 'por debajo'
    return { normValue, pct, rel, ageGroup }
  }

  const cmjNorm = getCmjNorm()
  const quadAffNorm = getStrengthNorm('quad', 'affected')
  const quadUnaffNorm = getStrengthNorm('quad', 'unaffected')
  const hamAffNorm = getStrengthNorm('hamstring', 'affected')
  const hamUnaffNorm = getStrengthNorm('hamstring', 'unaffected')

  if (mode === 'dashboard' && savedEval) {
    return (
      <RtsDashboard
        evaluation={savedEval}
        previousEvals={previousEvals}
        onNewEvaluation={handleNewEvaluation}
        onSave={handleSave}
        isSaved={isSaved}
        isSaving={isSaving}
      />
    )
  }

  return (
    <div className="space-y-12">

      {/* ============ SECCIÓN 0: DATOS DE LA CIRUGÍA ============ */}
      <section>
        <h2 className="text-[20px] font-medium mb-1">Datos de la Cirugía</h2>
        <p className="text-text-secondary text-[14px] mb-5">Información base del procedimiento quirúrgico</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <InputField
            label="Fecha de cirugía"
            type="date"
            value={form.surgery_date}
            onChange={v => set('surgery_date', v)}
          />
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Tipo de injerto</label>
            <select
              value={form.graft_type}
              onChange={e => set('graft_type', e.target.value)}
              className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
            >
              <option value="">— Seleccionar —</option>
              <option value="htb">HTB (hueso-tendón-hueso)</option>
              <option value="stg">ST+G (semitendinoso/gracilis)</option>
              <option value="qt">Tendón cuadricipital</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Lado afectado</label>
            <div className="flex gap-2 mt-1">
              {['left', 'right'].map(side => (
                <button
                  key={side}
                  type="button"
                  onClick={() => set('affected_side', side)}
                  className={`flex-1 py-3 rounded-lg text-[14px] border-[0.5px] transition-colors ${
                    form.affected_side === side
                      ? 'bg-accent text-bg-primary border-accent'
                      : 'bg-bg-secondary border-border text-text-secondary hover:border-border-strong'
                  }`}
                >
                  {side === 'left' ? 'Izquierdo' : 'Derecho'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <InputField
            label="Peso corporal"
            value={form.patient_body_weight}
            onChange={v => set('patient_body_weight', v)}
            unit="kg"
            placeholder="70"
          />
          <div>
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Sexo</label>
            <div className="flex gap-2 mt-1">
              {[
                { val: 'male', label: 'Masculino' },
                { val: 'female', label: 'Femenino' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => set('patient_sex', opt.val)}
                  className={`flex-1 py-3 rounded-lg text-[14px] border-[0.5px] transition-colors ${
                    form.patient_sex === opt.val
                      ? 'bg-accent text-bg-primary border-accent'
                      : 'bg-bg-secondary border-border text-text-secondary hover:border-border-strong'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {form.surgery_date && <MonthsBadge surgeryDate={form.surgery_date} />}
      </section>

      {/* ============ SECCIÓN 1: CRITERIOS DE FASE PREVIA ============ */}
      <section>
        <h2 className="text-[20px] font-medium mb-1">Criterios de Fase Previa</h2>
        <p className="text-text-secondary text-[14px] mb-5">Deben cumplirse antes de la evaluación funcional</p>

        <div className="space-y-5">
          <EffusionSelector
            value={form.effusion}
            onChange={v => set('effusion', v)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Extensión */}
            <div className="space-y-3">
              <p className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Déficit de extensión</p>
              <div>
                <InputField
                  label="Pasivo"
                  value={form.rom_extension_passive}
                  onChange={v => set('rom_extension_passive', v)}
                  unit="°"
                  placeholder="0"
                  min="0"
                />
                <PhaseStatus
                  value={form.rom_extension_passive}
                  label={n(form.rom_extension_passive) === 0 ? 'Extensión completa ✓' : form.rom_extension_passive ? `Déficit ${form.rom_extension_passive}°` : ''}
                  check={v => v === 0 ? 'pass' : 'fail'}
                />
              </div>
              <div>
                <InputField
                  label="Activo"
                  value={form.rom_extension_active}
                  onChange={v => set('rom_extension_active', v)}
                  unit="°"
                  placeholder="0"
                  min="0"
                />
                <PhaseStatus
                  value={form.rom_extension_active}
                  label={n(form.rom_extension_active) === 0 ? 'Extensión completa ✓' : form.rom_extension_active ? `Déficit ${form.rom_extension_active}°` : ''}
                  check={v => v === 0 ? 'pass' : 'fail'}
                />
              </div>
            </div>

            {/* Flexión */}
            <div className="space-y-3">
              <p className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Flexión alcanzada</p>
              <div>
                <InputField
                  label="Pasivo"
                  value={form.rom_flexion_passive}
                  onChange={v => set('rom_flexion_passive', v)}
                  unit="°"
                  placeholder="130"
                  min="0"
                  max="160"
                />
                <PhaseStatus
                  value={form.rom_flexion_passive}
                  label={n(form.rom_flexion_passive) !== null ? n(form.rom_flexion_passive)! >= 120 ? '≥ 120° ✓' : n(form.rom_flexion_passive)! >= 100 ? '100-119°' : '< 100°' : ''}
                  check={v => v >= 120 ? 'pass' : v >= 100 ? 'warn' : 'fail'}
                />
              </div>
              <div>
                <InputField
                  label="Activo"
                  value={form.rom_flexion_active}
                  onChange={v => set('rom_flexion_active', v)}
                  unit="°"
                  placeholder="125"
                  min="0"
                  max="160"
                />
                <PhaseStatus
                  value={form.rom_flexion_active}
                  label={n(form.rom_flexion_active) !== null ? n(form.rom_flexion_active)! >= 120 ? '≥ 120° ✓' : n(form.rom_flexion_active)! >= 100 ? '100-119°' : '< 100°' : ''}
                  check={v => v >= 120 ? 'pass' : v >= 100 ? 'warn' : 'fail'}
                />
              </div>
            </div>

            <div>
              <InputField
                label="Dolor en reposo (EVA)"
                value={form.pain_vas}
                onChange={v => set('pain_vas', v)}
                unit="/10"
                placeholder="0"
                min="0"
                max="10"
                step="0.5"
              />
              <PhaseStatus
                value={form.pain_vas}
                label={
                  n(form.pain_vas) !== null
                    ? n(form.pain_vas)! <= 2 ? '≤ 2/10 ✓' : n(form.pain_vas)! <= 4 ? '3-4/10 — leve, monitorear' : '≥ 5/10 — no apto para pruebas funcionales'
                    : ''
                }
                check={v => v <= 2 ? 'pass' : v <= 4 ? 'warn' : 'fail'}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============ SECCIÓN 2: EVALUACIÓN DE FUERZA ============ */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[20px] font-medium">Evaluación de Fuerza Muscular</h2>
          <div className="flex items-center gap-1 bg-bg-secondary border-[0.5px] border-border rounded-lg p-1">
            <button
              type="button"
              onClick={() => switchForceUnit('kg')}
              className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${forceUnit === 'kg' ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              kg
            </button>
            <button
              type="button"
              onClick={() => switchForceUnit('N')}
              className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${forceUnit === 'N' ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              N
            </button>
          </div>
        </div>

        {lastDynamo && dynamoMode === 'imported' && (
          <div className="mb-5 p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl flex items-center justify-between flex-wrap gap-3">
            <div className="text-[13px] text-text-secondary">
              <span className="mr-2">📊</span>
              Datos disponibles del dinamómetro —{' '}
              {new Date(lastDynamo.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={importDynamoData}
                className="px-4 py-1.5 text-[13px] bg-accent text-bg-primary rounded-lg hover:opacity-90"
              >
                Usar estos datos
              </button>
              <button
                type="button"
                onClick={() => setDynamoMode('manual')}
                className="px-4 py-1.5 text-[13px] bg-bg-primary border-[0.5px] border-border text-text-secondary rounded-lg hover:text-text-primary"
              >
                Ingresar manualmente
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-2">
          <InputField label={`Cuádriceps lado afectado (${form.affected_side === 'left' ? 'Izq' : 'Der'})`} value={form.quad_affected} onChange={v => set('quad_affected', v)} unit={forceUnit} />
          <InputField label={`Cuádriceps lado sano (${form.affected_side === 'left' ? 'Der' : 'Izq'})`} value={form.quad_unaffected} onChange={v => set('quad_unaffected', v)} unit={forceUnit} />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <InputField label={`Isquiotibiales lado afectado (${form.affected_side === 'left' ? 'Izq' : 'Der'})`} value={form.hamstring_affected} onChange={v => set('hamstring_affected', v)} unit={forceUnit} />
          <InputField label={`Isquiotibiales lado sano (${form.affected_side === 'left' ? 'Der' : 'Izq'})`} value={form.hamstring_unaffected} onChange={v => set('hamstring_unaffected', v)} unit={forceUnit} />
        </div>

        {/* LSI en tiempo real */}
        <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4 space-y-3 mb-4">
          <LSIDisplay label="LSI Cuádriceps" lsi={quadLSI} extra="Objetivo óptimo ≥ 95%" />
          <LSIDisplay label="LSI Isquiotibiales" lsi={hamstringLSI} extra="Objetivo óptimo ≥ 95%" />
          {hqRatio !== null && (
            <div className="text-[13px]">
              <span className="text-text-secondary">Ratio H:Q: </span>
              <span className={`font-medium ${hqRatio >= 0.60 ? 'text-[#4ade80]' : hqRatio >= 0.50 ? 'text-[#fb923c]' : 'text-[#f87171]'}`}>
                {hqRatio.toFixed(2)} {hqRatio >= 0.60 ? '✓' : hqRatio >= 0.50 ? '⚠' : '✗'}
              </span>
              <span className="text-text-secondary text-[11px] ml-2">Corte ≥ 0.60 (Kyritsis 2016)</span>
            </div>
          )}
        </div>

        {/* Comparación normativa */}
        {(quadAffNorm || quadUnaffNorm || hamAffNorm || hamUnaffNorm) && (
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4 mb-4">
            <div className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-3">Comparación con normativo poblacional (Mentiplay et al.)</div>
            <div className="space-y-2">
              {quadAffNorm && (
                <div className="text-[13px]">
                  <span className="text-text-secondary">Cuád. afectado: </span>
                  <span className="text-text-primary">{quadAffNorm.ratio} kg/kg pc</span>
                  <span className={`ml-2 font-medium ${quadAffNorm.pct >= 90 ? 'text-[#4ade80]' : quadAffNorm.pct >= 75 ? 'text-[#fb923c]' : 'text-[#f87171]'}`}>
                    ({quadAffNorm.pct.toFixed(0)}% del esperado para {form.patient_sex === 'male' ? 'hombre' : 'mujer'}, {patient.age} años)
                  </span>
                </div>
              )}
              {quadUnaffNorm && (
                <div className="text-[13px]">
                  <span className="text-text-secondary">Cuád. sano: </span>
                  <span className="text-text-primary">{quadUnaffNorm.ratio} kg/kg pc</span>
                  <span className={`ml-2 font-medium ${quadUnaffNorm.pct >= 90 ? 'text-[#4ade80]' : quadUnaffNorm.pct >= 75 ? 'text-[#fb923c]' : 'text-[#f87171]'}`}>
                    ({quadUnaffNorm.pct.toFixed(0)}%)
                  </span>
                </div>
              )}
              {hamAffNorm && (
                <div className="text-[13px]">
                  <span className="text-text-secondary">Isquio. afectado: </span>
                  <span className="text-text-primary">{hamAffNorm.ratio} kg/kg pc</span>
                  <span className={`ml-2 font-medium ${hamAffNorm.pct >= 90 ? 'text-[#4ade80]' : hamAffNorm.pct >= 75 ? 'text-[#fb923c]' : 'text-[#f87171]'}`}>
                    ({hamAffNorm.pct.toFixed(0)}%)
                  </span>
                </div>
              )}
              {hamUnaffNorm && (
                <div className="text-[13px]">
                  <span className="text-text-secondary">Isquio. sano: </span>
                  <span className="text-text-primary">{hamUnaffNorm.ratio} kg/kg pc</span>
                  <span className={`ml-2 font-medium ${hamUnaffNorm.pct >= 90 ? 'text-[#4ade80]' : hamUnaffNorm.pct >= 75 ? 'text-[#fb923c]' : 'text-[#f87171]'}`}>
                    ({hamUnaffNorm.pct.toFixed(0)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aviso Wellsandt */}
        <div className="border-[0.5px] border-[#fb923c40] bg-[#fb923c08] rounded-xl p-4 text-[13px] text-[#fb923c]">
          ⚠ El LSI puede sobreestimar la recuperación si el miembro sano también perdió fuerza durante la rehabilitación. Comparar con valores preoperatorios cuando estén disponibles. (Wellsandt et al., 2017)
        </div>
      </section>

      {/* ============ SECCIÓN 3: HOP TESTS ============ */}
      <section>
        <h2 className="text-[20px] font-medium mb-1">Hop Tests Horizontales</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Single Hop */}
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4">
            <div className="text-[14px] font-medium mb-3">Single Hop for Distance</div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <InputField label={`Afectado (${form.affected_side === 'left' ? 'Izq' : 'Der'})`} value={form.single_hop_affected} onChange={v => set('single_hop_affected', v)} unit="cm" />
              <InputField label="Sano" value={form.single_hop_unaffected} onChange={v => set('single_hop_unaffected', v)} unit="cm" />
            </div>
            <LSIDisplay label="LSI" lsi={singleHopLSI} />
          </div>

          {/* Triple Hop */}
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4">
            <div className="text-[14px] font-medium mb-3">Triple Hop for Distance</div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <InputField label={`Afectado (${form.affected_side === 'left' ? 'Izq' : 'Der'})`} value={form.triple_hop_affected} onChange={v => set('triple_hop_affected', v)} unit="cm" />
              <InputField label="Sano" value={form.triple_hop_unaffected} onChange={v => set('triple_hop_unaffected', v)} unit="cm" />
            </div>
            <LSIDisplay label="LSI" lsi={tripleHopLSI} />
          </div>

          {/* Crossover */}
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4">
            <div className="text-[14px] font-medium mb-3">Triple Crossover Hop</div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <InputField label={`Afectado (${form.affected_side === 'left' ? 'Izq' : 'Der'})`} value={form.crossover_hop_affected} onChange={v => set('crossover_hop_affected', v)} unit="cm" />
              <InputField label="Sano" value={form.crossover_hop_unaffected} onChange={v => set('crossover_hop_unaffected', v)} unit="cm" />
            </div>
            <LSIDisplay label="LSI" lsi={crossoverLSI} />
          </div>

          {/* Timed Hop */}
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4">
            <div className="text-[14px] font-medium mb-3">6-Meter Timed Hop</div>
            <p className="text-[11px] text-text-secondary mb-2">Menor tiempo = mejor. LSI invertido: sano/afectado</p>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <InputField label={`Afectado (${form.affected_side === 'left' ? 'Izq' : 'Der'})`} value={form.timed_hop_affected} onChange={v => set('timed_hop_affected', v)} unit="seg" step="0.01" />
              <InputField label="Sano" value={form.timed_hop_unaffected} onChange={v => set('timed_hop_unaffected', v)} unit="seg" step="0.01" />
            </div>
            <LSIDisplay label="LSI" lsi={timedHopLSI} />
          </div>
        </div>
      </section>

      {/* ============ SECCIÓN 4: SALTOS VERTICALES ============ */}
      <section>
        <h2 className="text-[20px] font-medium mb-5">Saltos Verticales</h2>

        <div className="space-y-5">
          {/* CMJ Bilateral */}
          <div>
            <InputField
              label="CMJ Bilateral"
              value={form.cmj_bilateral}
              onChange={v => set('cmj_bilateral', v)}
              unit="cm"
              placeholder="35"
            />
            {cmjNorm && (
              <div className="mt-1 text-[13px]">
                <span className="text-text-secondary">{n(form.cmj_bilateral)} cm — </span>
                <span className={`font-medium ${cmjNorm.pct >= 100 ? 'text-[#4ade80]' : cmjNorm.pct >= 90 ? 'text-[#fb923c]' : 'text-[#f87171]'}`}>
                  {cmjNorm.rel} del esperado
                </span>
                <span className="text-text-secondary text-[11px] ml-1">
                  para {form.patient_sex === 'male' ? 'hombre' : 'mujer'} {patient.age} años (normativa: {cmjNorm.normValue} cm)
                </span>
              </div>
            )}
          </div>

          {/* Single Leg CMJ */}
          <div>
            <div className="text-[14px] font-medium mb-2">Single Leg CMJ (SL-CMJ)</div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label={`Afectado (${form.affected_side === 'left' ? 'Izq' : 'Der'})`} value={form.slcmj_affected} onChange={v => set('slcmj_affected', v)} unit="cm" />
              <InputField label="Sano" value={form.slcmj_unaffected} onChange={v => set('slcmj_unaffected', v)} unit="cm" />
            </div>
            {slcmjLSI !== null && (
              <div className="mt-2">
                <LSIDisplay label="LSI SL-CMJ" lsi={slcmjLSI} />
              </div>
            )}
          </div>

          {/* Drop Jump */}
          <div>
            <label className="block text-[14px] font-medium mb-2">Drop Jump — Calidad de aterrizaje</label>
            <div className="space-y-2">
              {[
                { val: 'good', icon: '✓', label: 'Buena calidad', desc: 'Rodillas sobre pies, sin colapso en valgo', color: 'green' },
                { val: 'moderate', icon: '⚠', label: 'Moderada', desc: 'Ligero valgo dinámico controlable', color: 'orange' },
                { val: 'poor', icon: '✗', label: 'Pobre', desc: 'Valgo dinámico marcado, estrategia de tronco compensatoria', color: 'red' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => set('drop_jump_quality', opt.val)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-[0.5px] transition-colors ${
                    form.drop_jump_quality === opt.val
                      ? opt.color === 'green'
                        ? 'bg-[#4ade8020] border-[#4ade80]'
                        : opt.color === 'orange'
                        ? 'bg-[#fb923c20] border-[#fb923c]'
                        : 'bg-[#f8717120] border-[#f87171]'
                      : 'bg-bg-secondary border-border hover:border-border-strong'
                  }`}
                >
                  <span className={`text-[14px] font-medium mr-2 ${
                    form.drop_jump_quality === opt.val
                      ? opt.color === 'green' ? 'text-[#4ade80]' : opt.color === 'orange' ? 'text-[#fb923c]' : 'text-[#f87171]'
                      : 'text-text-primary'
                  }`}>{opt.icon} {opt.label}</span>
                  <span className="text-[13px] text-text-secondary">{opt.desc}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 text-[12px] text-text-secondary">
              El colapso en valgo durante el aterrizaje se asocia a OR 3.3 de relesión (Kyritsis, 2016)
            </div>
          </div>
        </div>
      </section>

      {/* ============ SECCIÓN 5: TESTS FUNCIONALES COMPLEMENTARIOS ============ */}
      <section>
        <h2 className="text-[20px] font-medium mb-5">Tests Funcionales Complementarios</h2>
        <div className="space-y-6">

          {/* SL Bridge */}
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5">
            <div className="text-[15px] font-medium mb-1">Single Leg Bridge Test</div>
            <p className="text-[12px] text-text-secondary mb-4">Evalúa control neuromuscular de glúteo y estabilidad pélvica en cadena cerrada.</p>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <InputField label={`Reps lado afectado (${form.affected_side === 'left' ? 'Izq' : 'Der'})`} value={form.sl_bridge_affected} onChange={v => set('sl_bridge_affected', v)} unit="reps" placeholder="20" />
              <InputField label="Reps lado sano" value={form.sl_bridge_unaffected} onChange={v => set('sl_bridge_unaffected', v)} unit="reps" placeholder="25" />
            </div>
            {slBridgeLSI !== null && (
              <div className="mb-4"><LSIDisplay label="LSI SL Bridge" lsi={slBridgeLSI} /></div>
            )}
            <label className="block text-[12px] text-text-secondary uppercase tracking-[0.05em] mb-2">Calidad de ejecución</label>
            <div className="space-y-2">
              {[
                { val: 'good',       icon: '✓', label: 'Buena',       desc: 'Pelvis nivelada, sin rotación ni drop contralateral' },
                { val: 'acceptable', icon: '⚠', label: 'Aceptable',   desc: 'Leve drop pélvico o asimetría compensable' },
                { val: 'poor',       icon: '✗', label: 'Deficiente',  desc: 'Drop pélvico marcado, rotación o dolor' },
              ].map(opt => (
                <button key={opt.val} type="button" onClick={() => set('sl_bridge_quality', opt.val)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-[0.5px] transition-colors ${
                    form.sl_bridge_quality === opt.val
                      ? opt.val === 'good' ? 'bg-[#4ade8020] border-[#4ade80]' : opt.val === 'acceptable' ? 'bg-[#fb923c20] border-[#fb923c]' : 'bg-[#f8717120] border-[#f87171]'
                      : 'bg-bg-primary border-border hover:border-border-strong'
                  }`}>
                  <span className={`text-[13px] font-medium mr-2 ${form.sl_bridge_quality === opt.val ? opt.val === 'good' ? 'text-[#4ade80]' : opt.val === 'acceptable' ? 'text-[#fb923c]' : 'text-[#f87171]' : 'text-text-primary'}`}>{opt.icon} {opt.label}</span>
                  <span className="text-[12px] text-text-secondary">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Single Leg Squat */}
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5">
            <div className="text-[15px] font-medium mb-1">Single Leg Squat (Unipodal)</div>
            <p className="text-[12px] text-text-secondary mb-4">Máximas repeticiones a profundidad controlada en cada pierna. Observar valgo dinámico, inclinación de tronco y control pélvico.</p>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <InputField label={`Reps lado afectado (${form.affected_side === 'left' ? 'Izq' : 'Der'})`} value={form.slsquat_reps_affected} onChange={v => set('slsquat_reps_affected', v)} unit="reps" placeholder="5" />
              <InputField label="Reps lado sano" value={form.slsquat_reps_unaffected} onChange={v => set('slsquat_reps_unaffected', v)} unit="reps" placeholder="5" />
            </div>
            {slSquatLSI !== null && (
              <div className="mb-4"><LSIDisplay label="LSI Single Leg Squat" lsi={slSquatLSI} /></div>
            )}
            <label className="block text-[12px] text-text-secondary uppercase tracking-[0.05em] mb-2">Calidad — lado afectado</label>
            <div className="space-y-2">
              {[
                { val: 'good',       icon: '✓', label: 'Buena',       desc: 'Rodilla sobre el pie, tronco erguido, pelvis estable' },
                { val: 'acceptable', icon: '⚠', label: 'Aceptable',   desc: 'Leve valgo o inclinación de tronco compensables' },
                { val: 'poor',       icon: '✗', label: 'Deficiente',  desc: 'Valgo marcado, caída pélvica o inclinación excesiva de tronco' },
              ].map(opt => (
                <button key={opt.val} type="button" onClick={() => set('slsquat_quality', opt.val)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-[0.5px] transition-colors ${
                    form.slsquat_quality === opt.val
                      ? opt.val === 'good' ? 'bg-[#4ade8020] border-[#4ade80]' : opt.val === 'acceptable' ? 'bg-[#fb923c20] border-[#fb923c]' : 'bg-[#f8717120] border-[#f87171]'
                      : 'bg-bg-primary border-border hover:border-border-strong'
                  }`}>
                  <span className={`text-[13px] font-medium mr-2 ${form.slsquat_quality === opt.val ? opt.val === 'good' ? 'text-[#4ade80]' : opt.val === 'acceptable' ? 'text-[#fb923c]' : 'text-[#f87171]' : 'text-text-primary'}`}>{opt.icon} {opt.label}</span>
                  <span className="text-[12px] text-text-secondary">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ============ SECCIÓN 6: CUESTIONARIOS ============ */}
      <section>
        <h2 className="text-[20px] font-medium mb-5">Cuestionarios Validados</h2>

        {/* KOOS import banner */}
        {lastKoos && koosMode === 'imported' && (
          <div className="mb-4 p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl flex items-center justify-between flex-wrap gap-3">
            <div className="text-[13px] text-text-secondary">
              <span className="mr-2">📊</span>
              KOOS importado del historial —{' '}
              {new Date(lastKoos.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
              {lastKoos.score !== null && <span className="ml-1">· score {lastKoos.score}</span>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={importKoosData} className="px-4 py-1.5 text-[13px] bg-accent text-bg-primary rounded-lg hover:opacity-90">Usar</button>
              <button type="button" onClick={() => setKoosMode('manual')} className="px-4 py-1.5 text-[13px] bg-bg-primary border-[0.5px] border-border text-text-secondary rounded-lg hover:text-text-primary">Ingresar manualmente</button>
            </div>
          </div>
        )}

        {/* ACL-RSI import banner */}
        {lastAclRsi && aclRsiMode === 'imported' && (
          <div className="mb-4 p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl flex items-center justify-between flex-wrap gap-3">
            <div className="text-[13px] text-text-secondary">
              <span className="mr-2">📊</span>
              ACL-RSI importado del historial —{' '}
              {new Date(lastAclRsi.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
              {lastAclRsi.score !== null && <span className="ml-1">· score {lastAclRsi.score}</span>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={importAclRsiData} className="px-4 py-1.5 text-[13px] bg-accent text-bg-primary rounded-lg hover:opacity-90">Usar</button>
              <button type="button" onClick={() => setAclRsiMode('manual')} className="px-4 py-1.5 text-[13px] bg-bg-primary border-[0.5px] border-border text-text-secondary rounded-lg hover:text-text-primary">Ingresar manualmente</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* KOOS-Sport */}
          <div>
            <InputField
              label="KOOS-Sport"
              value={form.koos_sport}
              onChange={v => set('koos_sport', v)}
              unit="/100"
              min="0"
              max="100"
              step="1"
            />
            {n(form.koos_sport) !== null && (
              <div className={`mt-1 text-[12px] font-medium ${n(form.koos_sport)! >= 89 ? 'text-[#4ade80]' : n(form.koos_sport)! >= 70 ? 'text-[#fb923c]' : 'text-[#f87171]'}`}>
                {n(form.koos_sport)! >= 89 ? '✓' : n(form.koos_sport)! >= 70 ? '⚠' : '✗'} Corte ≥ 89
              </div>
            )}
            <div className="mt-1 text-[11px] text-text-secondary">≥ 89 predice retorno al nivel previo</div>
          </div>

          {/* ACL-RSI */}
          <div>
            <InputField
              label="ACL-RSI"
              value={form.acl_rsi}
              onChange={v => set('acl_rsi', v)}
              unit="/100"
              min="0"
              max="100"
              step="1"
            />
            {n(form.acl_rsi) !== null && (
              <div className={`mt-1 text-[12px] font-medium ${n(form.acl_rsi)! >= 65 ? 'text-[#4ade80]' : n(form.acl_rsi)! >= 50 ? 'text-[#fb923c]' : 'text-[#f87171]'}`}>
                {n(form.acl_rsi)! >= 65 ? '✓' : n(form.acl_rsi)! >= 50 ? '⚠' : '✗'} Corte ≥ 65
              </div>
            )}
            <div className="mt-1 text-[11px] text-text-secondary">≥ 80 → 3-4× más probabilidad de éxito</div>
          </div>

          {/* GRS */}
          <div>
            <InputField
              label="GRS (Global Rating Scale)"
              value={form.grs}
              onChange={v => set('grs', v)}
              unit="/100"
              min="0"
              max="100"
              step="1"
            />
            {n(form.grs) !== null && (
              <div className={`mt-1 text-[12px] font-medium ${n(form.grs)! >= 90 ? 'text-[#4ade80]' : n(form.grs)! >= 75 ? 'text-[#fb923c]' : 'text-[#f87171]'}`}>
                {n(form.grs)! >= 90 ? '✓' : n(form.grs)! >= 75 ? '⚠' : '✗'} Corte ≥ 90
              </div>
            )}
          </div>
        </div>
      </section>

      {/* NOTAS */}
      <section>
        <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Notas clínicas (opcional)</label>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          placeholder="Observaciones clínicas, contexto del paciente, precauciones..."
          className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-none"
        />
      </section>

      {/* SUBMIT */}
      <div className="pb-8">
        <button
          type="button"
          onClick={handleViewAnalysis}
          className="bg-accent text-bg-primary px-8 py-3 rounded-xl text-[15px] font-medium hover:opacity-90 transition-opacity"
        >
          Ver Análisis Completo →
        </button>
      </div>
    </div>
  )
}
