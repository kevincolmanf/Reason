export interface RtsEvaluation {
  id: string
  created_at: string
  surgery_date: string | null
  graft_type: string | null
  affected_side: string
  effusion: number | null
  rom_extension: number | null
  rom_flexion: number | null
  pain_vas: number | null
  quad_affected: number | null
  quad_unaffected: number | null
  hamstring_affected: number | null
  hamstring_unaffected: number | null
  patient_body_weight: number | null
  patient_age: number | null
  patient_sex: string | null
  single_hop_affected: number | null
  single_hop_unaffected: number | null
  triple_hop_affected: number | null
  triple_hop_unaffected: number | null
  crossover_hop_affected: number | null
  crossover_hop_unaffected: number | null
  timed_hop_affected: number | null
  timed_hop_unaffected: number | null
  cmj_bilateral: number | null
  slcmj_affected: number | null
  slcmj_unaffected: number | null
  drop_jump_quality: string | null
  koos_sport: number | null
  acl_rsi: number | null
  grs: number | null
  notes: string | null
  [key: string]: unknown
}

export interface RtsMetrics {
  monthsSince: number | null
  quadLSI: number | null
  hamstringLSI: number | null
  hqRatio: number | null
  singleHopLSI: number | null
  tripleHopLSI: number | null
  crossoverLSI: number | null
  timedHopLSI: number | null
  slcmjLSI: number | null
  passedCriteria: number
  totalCriteria: number
}

export function computeLSI(affected: number | null | undefined, unaffected: number | null | undefined): number | null {
  if (!affected || !unaffected || unaffected === 0) return null
  return (affected / unaffected) * 100
}

export function computeTimedHopLSI(affected: number | null | undefined, unaffected: number | null | undefined): number | null {
  // For timed hop: lower time = better, so LSI = (unaffected / affected) * 100
  if (!affected || !unaffected || affected === 0) return null
  return (unaffected / affected) * 100
}

export function computeMetrics(ev: RtsEvaluation): RtsMetrics {
  // Time
  let monthsSince: number | null = null
  if (ev.surgery_date) {
    const surgery = new Date(ev.surgery_date)
    const evalDate = ev.created_at ? new Date(ev.created_at) : new Date()
    const diffMs = evalDate.getTime() - surgery.getTime()
    monthsSince = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))
  }

  const quadLSI = computeLSI(ev.quad_affected, ev.quad_unaffected)
  const hamstringLSI = computeLSI(ev.hamstring_affected, ev.hamstring_unaffected)
  const hqRatio =
    ev.hamstring_affected && ev.quad_affected && ev.quad_affected > 0
      ? ev.hamstring_affected / ev.quad_affected
      : null

  const singleHopLSI = computeLSI(ev.single_hop_affected, ev.single_hop_unaffected)
  const tripleHopLSI = computeLSI(ev.triple_hop_affected, ev.triple_hop_unaffected)
  const crossoverLSI = computeLSI(ev.crossover_hop_affected, ev.crossover_hop_unaffected)
  const timedHopLSI = computeTimedHopLSI(ev.timed_hop_affected, ev.timed_hop_unaffected)
  const slcmjLSI = computeLSI(ev.slcmj_affected, ev.slcmj_unaffected)

  // Count criteria
  let passed = 0
  let total = 0

  // Time (counted if surgery_date provided)
  if (monthsSince !== null) {
    total++
    if (monthsSince >= 9) passed++
  }

  // Phase criteria
  if (ev.effusion !== null && ev.effusion !== undefined) { total++; if (ev.effusion <= 1) passed++ }
  if (ev.rom_extension !== null && ev.rom_extension !== undefined) { total++; if (ev.rom_extension === 0) passed++ }
  if (ev.rom_flexion !== null && ev.rom_flexion !== undefined) { total++; if (ev.rom_flexion >= 120) passed++ }
  if (ev.pain_vas !== null && ev.pain_vas !== undefined) { total++; if (ev.pain_vas <= 2) passed++ }

  // Strength
  if (quadLSI !== null) { total++; if (quadLSI >= 90) passed++ }
  if (hamstringLSI !== null) { total++; if (hamstringLSI >= 90) passed++ }
  if (hqRatio !== null) { total++; if (hqRatio >= 0.60) passed++ }

  // Hop tests
  if (singleHopLSI !== null) { total++; if (singleHopLSI >= 90) passed++ }
  if (tripleHopLSI !== null) { total++; if (tripleHopLSI >= 90) passed++ }
  if (crossoverLSI !== null) { total++; if (crossoverLSI >= 90) passed++ }
  if (timedHopLSI !== null) { total++; if (timedHopLSI >= 90) passed++ }

  // Vertical
  if (slcmjLSI !== null) { total++; if (slcmjLSI >= 90) passed++ }
  if (ev.drop_jump_quality) { total++; if (ev.drop_jump_quality === 'good') passed++ }

  // Questionnaires
  if (ev.koos_sport !== null && ev.koos_sport !== undefined) { total++; if (ev.koos_sport >= 89) passed++ }
  if (ev.acl_rsi !== null && ev.acl_rsi !== undefined) { total++; if (ev.acl_rsi >= 65) passed++ }
  if (ev.grs !== null && ev.grs !== undefined) { total++; if (ev.grs >= 90) passed++ }

  return {
    monthsSince,
    quadLSI,
    hamstringLSI,
    hqRatio,
    singleHopLSI,
    tripleHopLSI,
    crossoverLSI,
    timedHopLSI,
    slcmjLSI,
    passedCriteria: passed,
    totalCriteria: total,
  }
}

export function getLSIColor(value: number): 'green' | 'orange' | 'red' {
  if (value >= 90) return 'green'
  if (value >= 80) return 'orange'
  return 'red'
}

export function getStatusIcon(value: number, cutoff: number, lowerIsBetter = false): string {
  const passes = lowerIsBetter ? value <= cutoff : value >= cutoff
  if (passes) return '✓'
  return '✗'
}

export const QUAD_NORMS: Record<string, Record<string, number>> = {
  male: { '18-29': 0.68, '30-39': 0.64, '40-49': 0.58, '50-59': 0.52 },
  female: { '18-29': 0.52, '30-39': 0.48, '40-49': 0.44, '50-59': 0.38 },
}

export const HAMSTRING_NORMS: Record<string, Record<string, number>> = {
  male: { '18-29': 0.42, '30-39': 0.40, '40-49': 0.36, '50-59': 0.32 },
  female: { '18-29': 0.32, '30-39': 0.30, '40-49': 0.27, '50-59': 0.24 },
}

export const CMJ_NORMS: Record<string, Record<string, number>> = {
  male: { '18-25': 42, '26-35': 38, '36-45': 33, '46-55': 28 },
  female: { '18-25': 28, '26-35': 25, '36-45': 22, '46-55': 18 },
}

export function getAgeGroup(age: number, norms: Record<string, number>): string {
  const keys = Object.keys(norms)
  for (const key of keys) {
    const [minStr, maxStr] = key.split('-')
    const min = parseInt(minStr)
    const max = parseInt(maxStr)
    if (age >= min && age <= max) return key
  }
  return keys[keys.length - 1]
}

export function getCmjAgeGroup(age: number, norms: Record<string, number>): string {
  const keys = Object.keys(norms)
  for (const key of keys) {
    const [minStr, maxStr] = key.split('-')
    const min = parseInt(minStr)
    const max = parseInt(maxStr)
    if (age >= min && age <= max) return key
  }
  return keys[keys.length - 1]
}
