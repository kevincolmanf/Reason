'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  SPADI_PAIN,
  SPADI_DISABILITY,
  NDI_ITEMS,
  ROLAND_MORRIS_ITEMS,
  START_BACK_ITEMS,
  START_BACK_BOTHER,
  START_BACK_BOTHER_POSITIVE,
  TAMPA_ITEMS,
  PCS_ITEMS,
  PCS_LABELS,
  OSWESTRY_SECTIONS,
  DASH_ITEMS,
  LEFS_ITEMS,
  LEFS_OPTIONS,
  FABQ_ITEMS,
  ACL_RSI_ITEMS,
  KOOS_SECTIONS,
  KoosSubscale,
  WOSI_SECTIONS,
  WosiSection,
  FAAM_OPTIONS,
  FAAM_ADL_ITEMS,
  FAAM_SPORT_ITEMS,
  HAGOS_SECTIONS,
  HagosSubscale,
  AKPS_ITEMS,
  VISA_A_Q16,
  VISA_P_Q16,
  VISA_Q7_OPTIONS,
  VISA_Q8_SCENARIOS,
  VISA_Q8_DURATIONS,
  VisaSlider,
} from '@/lib/questionnaires'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Patient {
  id: string
  name: string
}

interface QuestionnaireResult {
  questionnaire_type: string
  score: number | null
  interpretation: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result_data: any
}

// ─── Questionnaire definitions ─────────────────────────────────────────────

const QUESTIONNAIRES = [
  {
    id: 'spadi',
    name: 'SPADI',
    fullName: 'Shoulder Pain and Disability Index',
    description: 'Evalúa dolor y discapacidad del hombro.',
    range: '0-100 · Mayor = peor',
    region: 'Hombro',
    color: '#0891B2',
  },
  {
    id: 'ndi',
    name: 'NDI',
    fullName: 'Neck Disability Index',
    description: 'Mide el impacto del dolor cervical en las actividades.',
    range: '0-50 · Mayor = peor',
    region: 'Cervical',
    color: '#7C3AED',
  },
  {
    id: 'roland_morris',
    name: 'Roland Morris',
    fullName: 'Roland Morris Disability Questionnaire',
    description: 'Discapacidad por dolor lumbar en actividades cotidianas.',
    range: '0-24 · Mayor = peor',
    region: 'Lumbar',
    color: '#D97706',
  },
  {
    id: 'start_back',
    name: 'Start Back',
    fullName: 'STarT Back Screening Tool',
    description: 'Estratifica el riesgo de cronicidad en lumbalgia.',
    range: 'Bajo / Medio / Alto riesgo',
    region: 'Lumbar',
    color: '#16A34A',
  },
  {
    id: 'tampa',
    name: 'Tampa (TSK)',
    fullName: 'Tampa Scale of Kinesiophobia',
    description: 'Mide el miedo al movimiento y re-lesión.',
    range: '17-68 · ≥37 = elevado',
    region: 'General',
    color: '#DC2626',
  },
  {
    id: 'catastrofismo',
    name: 'Catastrofismo (PCS)',
    fullName: 'Pain Catastrophizing Scale',
    description: 'Evalúa rumiación, magnificación y desesperanza ante el dolor.',
    range: '0-52 · ≥30 = clínicamente significativo',
    region: 'Psicosocial',
    color: '#9333EA',
  },
  {
    id: 'oswestry',
    name: 'Oswestry (ODI)',
    fullName: 'Oswestry Disability Index',
    description: 'Cuantifica la discapacidad por dolor lumbar.',
    range: '0-100% · Mayor = peor',
    region: 'Lumbar',
    color: '#EA580C',
  },
  {
    id: 'dash',
    name: 'DASH',
    fullName: 'Disabilities of the Arm, Shoulder and Hand',
    description: 'Discapacidad del miembro superior.',
    range: '0-100 · Mayor = peor',
    region: 'MMSS',
    color: '#0284C7',
  },
  {
    id: 'lefs',
    name: 'LEFS',
    fullName: 'Lower Extremity Functional Scale',
    description: 'Funcionalidad del miembro inferior.',
    range: '0-80 · Menor = peor',
    region: 'MMII',
    color: '#059669',
  },
  {
    id: 'psfs',
    name: 'PSFS',
    fullName: 'Patient-Specific Functional Scale',
    description: 'El paciente elige 3 actividades relevantes y las puntúa.',
    range: '0-10 · Menor = peor',
    region: 'General',
    color: '#2563EB',
  },
  {
    id: 'fabq',
    name: 'FABQ',
    fullName: 'Fear-Avoidance Beliefs Questionnaire',
    description: 'Creencias de miedo-evitación respecto a actividad física y trabajo.',
    range: 'PA ≥15 · Trabajo ≥29 = alto riesgo',
    region: 'Psicosocial',
    color: '#DB2777',
  },
  {
    id: 'acl_rsi',
    name: 'ACL-RSI',
    fullName: 'ACL Return to Sport after Injury',
    description: 'Disposición psicológica para volver al deporte tras lesión de LCA.',
    range: '0-100 · Mayor = mejor',
    region: 'Rodilla / LCA',
    color: '#C27B54',
  },
  {
    id: 'koos',
    name: 'KOOS',
    fullName: 'Knee injury and Osteoarthritis Outcome Score',
    description: 'Dolor, síntomas, función, deporte y calidad de vida de la rodilla. La subescala Deporte alimenta el RTS de LCA.',
    range: '0-100 por subescala · Mayor = mejor',
    region: 'Rodilla',
    color: '#0D9488',
  },
  {
    id: 'wosi',
    name: 'WOSI',
    fullName: 'Western Ontario Shoulder Instability Index',
    description: 'Calidad de vida en inestabilidad de hombro. Alimenta el RTS de hombro (corte ≥75%).',
    range: '0-100% · Mayor = mejor',
    region: 'Hombro',
    color: '#0369A1',
  },
  {
    id: 'faam',
    name: 'FAAM',
    fullName: 'Foot and Ankle Ability Measure',
    description: 'Función de pie y tobillo (AVD + Deporte). La subescala Deporte alimenta el RTS de tobillo (≥90%).',
    range: '0-100% por subescala · Mayor = mejor',
    region: 'Tobillo',
    color: '#0891B2',
  },
  {
    id: 'hagos',
    name: 'HAGOS',
    fullName: 'Copenhagen Hip and Groin Outcome Score',
    description: 'Dolor, síntomas, función y deporte de cadera/ingle. La subescala Deporte alimenta el RTS de ingle.',
    range: '0-100 por subescala · Mayor = mejor',
    region: 'Ingle / Cadera',
    color: '#65A30D',
  },
  {
    id: 'akps',
    name: 'AKPS (Kujala)',
    fullName: 'Anterior Knee Pain Scale',
    description: 'Dolor y función femoropatelar. Alimenta el RTS de PFP (corte ≥90/100).',
    range: '0-100 · Mayor = mejor',
    region: 'Rodilla / PFP',
    color: '#7C3AED',
  },
  {
    id: 'visa_a',
    name: 'VISA-A',
    fullName: 'Victorian Institute of Sport Assessment — Aquíleo',
    description: 'Severidad clínica de la tendinopatía aquílea. Alimenta el RTS de tendinopatía.',
    range: '0-100 · Mayor = mejor',
    region: 'Tendinopatía aquílea',
    color: '#DC2626',
  },
  {
    id: 'visa_p',
    name: 'VISA-P',
    fullName: 'Victorian Institute of Sport Assessment — Rotuliano',
    description: 'Severidad clínica de la tendinopatía rotuliana. Alimenta el RTS de tendinopatía.',
    range: '0-100 · Mayor = mejor',
    region: 'Tendinopatía rotuliana',
    color: '#EA580C',
  },
]

// ─── Scoring helpers ──────────────────────────────────────────────────────

function scoreSPADI(pain: number[], disability: number[]): { score: number; interpretation: string; color: string } {
  const painMean = pain.reduce((a, b) => a + b, 0) / pain.length
  const disabilityMean = disability.reduce((a, b) => a + b, 0) / disability.length
  const score = Math.round((painMean * 10 + disabilityMean * 10) / 2)
  let interpretation: string, color: string
  if (score <= 20) { interpretation = 'Leve'; color = 'green' }
  else if (score <= 40) { interpretation = 'Moderado'; color = 'yellow' }
  else if (score <= 60) { interpretation = 'Moderado-Severo'; color = 'orange' }
  else { interpretation = 'Severo'; color = 'red' }
  return { score, interpretation, color }
}

function scoreNDI(answers: number[]): { score: number; interpretation: string; color: string } {
  const score = answers.reduce((a, b) => a + b, 0)
  let interpretation: string, color: string
  if (score <= 4) { interpretation = 'Sin discapacidad'; color = 'green' }
  else if (score <= 14) { interpretation = 'Discapacidad leve'; color = 'green' }
  else if (score <= 24) { interpretation = 'Discapacidad moderada'; color = 'yellow' }
  else if (score <= 34) { interpretation = 'Discapacidad severa'; color = 'orange' }
  else { interpretation = 'Discapacidad completa'; color = 'red' }
  return { score, interpretation, color }
}

function scoreRolandMorris(answers: boolean[]): { score: number; interpretation: string; color: string } {
  const score = answers.filter(Boolean).length
  let interpretation: string, color: string
  if (score <= 7) { interpretation = 'Discapacidad leve'; color = 'green' }
  else if (score <= 15) { interpretation = 'Discapacidad moderada'; color = 'yellow' }
  else { interpretation = 'Discapacidad severa'; color = 'red' }
  return { score, interpretation, color }
}

function scoreStartBack(answers: boolean[], bother: number): { score: number; psychosocial: number; interpretation: string; color: string } {
  // answers son los ítems 1-8 (booleanos); el ítem 9 es la escala de molestia (bother, 0-4).
  // El ítem 9 puntúa positivo solo si es "Muy molesto" o "Extremadamente".
  const item9Positive = bother >= START_BACK_BOTHER_POSITIVE
  const total = answers.filter(Boolean).length + (item9Positive ? 1 : 0)
  // Subescala psicosocial: ítems 5-8 (0-indexed 4-7) + ítem 9
  const psychosocial = answers.slice(4).filter(Boolean).length + (item9Positive ? 1 : 0)
  let interpretation: string, color: string
  if (psychosocial >= 4) { interpretation = 'Alto riesgo de cronicidad'; color = 'red' }
  else if (total >= 4) { interpretation = 'Riesgo medio de cronicidad'; color = 'yellow' }
  else { interpretation = 'Bajo riesgo de cronicidad'; color = 'green' }
  return { score: total, psychosocial, interpretation, color }
}

function scoreTampa(answers: number[]): { score: number; interpretation: string; color: string } {
  // Items 4,8,12,16 are reverse-scored (1-indexed → 0-indexed: 3,7,11,15)
  const reverseItems = new Set([3, 7, 11, 15])
  const score = answers.reduce((sum, val, i) => {
    const adjusted = reverseItems.has(i) ? (5 - val) : val
    return sum + adjusted
  }, 0)
  const interpretation = score >= 37 ? 'Kinesiofobia elevada' : 'Sin kinesiofobia clínicamente relevante'
  const color = score >= 37 ? 'red' : 'green'
  return { score, interpretation, color }
}

function scorePCS(answers: number[]): { score: number; rumination: number; magnification: number; helplessness: number; interpretation: string; color: string } {
  // Rumiación: items 8,9,10,11 → 0-indexed 7,8,9,10
  // Magnificación: items 6,7,13 → 0-indexed 5,6,12
  // Desesperanza: items 1,2,3,4,5,12 → 0-indexed 0,1,2,3,4,11
  const rumination = [7, 8, 9, 10].reduce((s, i) => s + (answers[i] ?? 0), 0)
  const magnification = [5, 6, 12].reduce((s, i) => s + (answers[i] ?? 0), 0)
  const helplessness = [0, 1, 2, 3, 4, 11].reduce((s, i) => s + (answers[i] ?? 0), 0)
  const score = answers.reduce((a, b) => a + b, 0)
  const interpretation = score >= 30 ? 'Catastrofismo clínicamente significativo (≥30)' : 'Sin catastrofismo clínicamente significativo'
  const color = score >= 30 ? 'red' : score >= 20 ? 'yellow' : 'green'
  return { score, rumination, magnification, helplessness, interpretation, color }
}

function scoreOswestry(answers: number[]): { score: number; interpretation: string; color: string } {
  const total = answers.reduce((a, b) => a + b, 0)
  const score = Math.round((total / 50) * 100)
  let interpretation: string, color: string
  if (score <= 20) { interpretation = 'Discapacidad mínima'; color = 'green' }
  else if (score <= 40) { interpretation = 'Discapacidad moderada'; color = 'yellow' }
  else if (score <= 60) { interpretation = 'Discapacidad severa'; color = 'orange' }
  else if (score <= 80) { interpretation = 'Discapacidad inhabilitante'; color = 'red' }
  else { interpretation = 'Postrado en cama'; color = 'red' }
  return { score, interpretation, color }
}

function scoreDASH(answers: number[]): { score: number; interpretation: string; color: string } {
  const sum = answers.reduce((a, b) => a + b, 0)
  const score = Math.round(((sum - 30) / 1.2) * 10) / 10
  let interpretation: string, color: string
  if (score < 10) { interpretation = 'Discapacidad leve'; color = 'green' }
  else if (score <= 30) { interpretation = 'Discapacidad moderada'; color = 'yellow' }
  else { interpretation = 'Discapacidad severa'; color = 'red' }
  return { score, interpretation, color }
}

function scoreLEFS(answers: number[]): { score: number; interpretation: string; color: string } {
  const score = answers.reduce((a, b) => a + b, 0)
  let interpretation: string, color: string
  if (score >= 60) { interpretation = 'Limitación leve'; color = 'green' }
  else if (score >= 40) { interpretation = 'Limitación moderada'; color = 'yellow' }
  else { interpretation = 'Limitación severa'; color = 'red' }
  return { score, interpretation, color }
}

function scorePSFS(activities: Array<{ name: string; score: number }>): { score: number; interpretation: string; color: string } {
  const valid = activities.filter(a => a.name.trim() !== '')
  const avg = valid.length > 0 ? valid.reduce((s, a) => s + a.score, 0) / valid.length : 0
  const score = Math.round(avg * 10) / 10
  const interpretation = score < 5 ? 'Función deficiente (< 5)' : score < 7 ? 'Función moderada' : 'Función adecuada'
  const color = score < 5 ? 'red' : score < 7 ? 'yellow' : 'green'
  return { score, interpretation, color }
}

function scoreFABQ(answers: number[]): { pa_score: number; work_score: number; interpretation: string; color: string } {
  // PA: items 2,3,4,5 → 0-indexed 1,2,3,4
  const pa_score = [1, 2, 3, 4].reduce((s, i) => s + (answers[i] ?? 0), 0)
  // Work: items 6,7,9,10,12,15,16 → 0-indexed 5,6,8,9,11,14,15
  const work_score = [5, 6, 8, 9, 11, 14, 15].reduce((s, i) => s + (answers[i] ?? 0), 0)
  const paHigh = pa_score >= 15
  const workHigh = work_score >= 29
  let interpretation: string, color: string
  if (paHigh && workHigh) { interpretation = 'Alta kinesiofobia: actividad física y laboral'; color = 'red' }
  else if (paHigh) { interpretation = 'Alta kinesiofobia: actividad física (PA ≥ 15)'; color = 'orange' }
  else if (workHigh) { interpretation = 'Alta kinesiofobia laboral (Trabajo ≥ 29)'; color = 'orange' }
  else { interpretation = 'Kinesiofobia sin umbral clínico'; color = 'green' }
  return { pa_score, work_score, interpretation, color }
}

function scoreACLRSI(answers: number[]): { score: number; interpretation: string; color: string } {
  // Cada ítem 0-10; los invertidos (miedo/nerviosismo) se puntúan 10 - v.
  // Promedio × 10 → 0-100. Mayor = mejor disposición psicológica.
  const sum = answers.reduce((s, v, i) => s + (ACL_RSI_ITEMS[i]?.reverse ? 10 - v : v), 0)
  const score = Math.round((sum / answers.length) * 10)
  let interpretation: string, color: string
  if (score >= 65) { interpretation = 'Buena disposición psicológica para volver al deporte'; color = 'green' }
  else if (score >= 45) { interpretation = 'Disposición psicológica moderada'; color = 'yellow' }
  else { interpretation = 'Baja disposición psicológica (barreras a trabajar)'; color = 'red' }
  return { score, interpretation, color }
}

// KOOS: cada subescala se transforma a 0-100 (100 = sin problemas).
// score_subescala = 100 - (media de los ítems × 25). El puntaje elegido (índice
// 0-4) ya es el valor del ítem. El resultado destaca la subescala Deporte, que
// es la que usa el RTS de LCA (corte ≥89).
type KoosAnswers = Record<KoosSubscale, number[]>
function scoreKOOS(answers: KoosAnswers): { subscales: Record<KoosSubscale, number>; sport: number; interpretation: string; color: string } {
  const subscales = {} as Record<KoosSubscale, number>
  for (const sec of KOOS_SECTIONS) {
    const vals = answers[sec.key]
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    subscales[sec.key] = Math.round(100 - mean * 25)
  }
  const sport = subscales.sport
  let interpretation: string, color: string
  if (sport >= 89) { interpretation = 'KOOS-Sport ≥89: predice retorno al nivel previo'; color = 'green' }
  else if (sport >= 70) { interpretation = 'KOOS-Sport moderado: función deportiva en progreso'; color = 'yellow' }
  else { interpretation = 'KOOS-Sport bajo: función deportiva limitada'; color = 'red' }
  return { subscales, sport, interpretation, color }
}

// WOSI: 21 ítems VAS 0-100 (100 = peor). Crudo 0-2100. Se reporta como % de
// calidad de vida = (2100 - crudo) / 2100 × 100 (mayor = mejor). Corte RTS ≥75%.
type WosiAnswers = Record<WosiSection['key'], number[]>
function scoreWOSI(answers: WosiAnswers): { score: number; raw: number; interpretation: string; color: string } {
  const raw = WOSI_SECTIONS.reduce((sum, sec) => sum + answers[sec.key].reduce((a, b) => a + b, 0), 0)
  const score = Math.round(((2100 - raw) / 2100) * 100)
  let interpretation: string, color: string
  if (score >= 75) { interpretation = 'WOSI ≥75%: buena calidad de vida del hombro para retorno'; color = 'green' }
  else if (score >= 60) { interpretation = 'WOSI moderado: calidad de vida del hombro en progreso'; color = 'yellow' }
  else { interpretation = 'WOSI bajo: impacto marcado de la inestabilidad'; color = 'red' }
  return { score, raw, interpretation, color }
}

// FAAM: cada subescala % = (suma de ítems respondidos / (4 × n)) × 100.
// index del ítem: 0 = Sin dificultad (4 pts) … 4 = Incapaz (0 pts); 5 = No corresponde (excluido).
// -1 = sin responder. El RTS de tobillo usa FAAM Deporte ≥90%.
function faamSubscale(answers: number[]): number | null {
  const valid = answers.filter(v => v >= 0 && v <= 4) // excluye No corresponde (5) y sin responder (-1)
  if (valid.length === 0) return null
  const sum = valid.reduce((acc, v) => acc + (4 - v), 0) // 4 - index = puntaje
  return Math.round((sum / (4 * valid.length)) * 100)
}
function scoreFAAM(adl: number[], sport: number[]): { adl: number | null; sport: number | null; interpretation: string; color: string } {
  const adlScore = faamSubscale(adl)
  const sportScore = faamSubscale(sport)
  let interpretation: string, color: string
  if (sportScore === null) { interpretation = 'Completá la subescala Deporte para la lectura de RTS'; color = 'yellow' }
  else if (sportScore >= 90) { interpretation = 'FAAM Deporte ≥90%: función de tobillo apta para retorno'; color = 'green' }
  else if (sportScore >= 75) { interpretation = 'FAAM Deporte moderado: función en progreso'; color = 'yellow' }
  else { interpretation = 'FAAM Deporte bajo: función deportiva limitada'; color = 'red' }
  return { adl: adlScore, sport: sportScore, interpretation, color }
}

// HAGOS: cada subescala = 100 - (media de ítems 0-4 × 25). Mayor = mejor.
// El RTS de ingle usa la subescala Deporte.
type HagosAnswers = Record<HagosSubscale, number[]>
function scoreHAGOS(answers: HagosAnswers): { subscales: Record<HagosSubscale, number>; sport: number; interpretation: string; color: string } {
  const subscales = {} as Record<HagosSubscale, number>
  for (const sec of HAGOS_SECTIONS) {
    const vals = answers[sec.key]
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    subscales[sec.key] = Math.round(100 - mean * 25)
  }
  const sport = subscales.sport
  let interpretation: string, color: string
  if (sport >= 90) { interpretation = 'HAGOS Deporte alto: función de cadera/ingle apta para retorno'; color = 'green' }
  else if (sport >= 75) { interpretation = 'HAGOS Deporte moderado: función en progreso'; color = 'yellow' }
  else { interpretation = 'HAGOS Deporte bajo: función deportiva limitada'; color = 'red' }
  return { subscales, sport, interpretation, color }
}

// AKPS (Kujala): suma de puntajes de la opción elegida en cada ítem (0-100).
// answers = índice de opción elegida por ítem. RTS PFP usa ≥90.
function scoreAKPS(answers: number[]): { score: number; interpretation: string; color: string } {
  const score = answers.reduce((sum, optIdx, i) => sum + (AKPS_ITEMS[i]?.options[optIdx]?.points ?? 0), 0)
  let interpretation: string, color: string
  if (score >= 90) { interpretation = 'AKPS ≥90: función femoropatelar apta para retorno'; color = 'green' }
  else if (score >= 70) { interpretation = 'AKPS moderado: función en progreso'; color = 'yellow' }
  else { interpretation = 'AKPS bajo: dolor/disfunción femoropatelar marcada'; color = 'red' }
  return { score, interpretation, color }
}

// VISA (Aquíleo/Rotuliano): Q1-6 (0-10) + Q7 (0/4/7/10) + Q8 (duración 0/7/14/21/30) = 0-100.
function scoreVISA(q16: number[], q7: number, q8Duration: number): { score: number; interpretation: string; color: string } {
  const sum16 = q16.reduce((a, b) => a + b, 0)
  const q7pts = VISA_Q7_OPTIONS[q7]?.points ?? 0
  const q8pts = VISA_Q8_DURATIONS[q8Duration]?.points ?? 0
  const score = sum16 + q7pts + q8pts
  let interpretation: string, color: string
  if (score >= 80) { interpretation = 'VISA alto: baja severidad clínica'; color = 'green' }
  else if (score >= 60) { interpretation = 'VISA moderado: severidad clínica intermedia'; color = 'yellow' }
  else { interpretation = 'VISA bajo: severidad clínica marcada'; color = 'red' }
  return { score, interpretation, color }
}

// ─── Color helpers ─────────────────────────────────────────────────────────

function colorClass(c: string) {
  if (c === 'green') return 'text-[#16a34a] bg-[#16a34a]/10 border-[#16a34a]/30'
  if (c === 'yellow') return 'text-[#d97706] bg-[#d97706]/10 border-[#d97706]/30'
  if (c === 'orange') return 'text-[#ea580c] bg-[#ea580c]/10 border-[#ea580c]/30'
  return 'text-[#dc2626] bg-[#dc2626]/10 border-[#dc2626]/30'
}

// ─── NRS Slider ───────────────────────────────────────────────────────────

function NRSInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1.5">
        <span className="text-[13px] text-text-primary">{label}</span>
        <span className="text-[13px] font-medium text-text-primary w-6 text-right">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
      <div className="flex justify-between text-[10px] text-text-secondary mt-0.5">
        <span>0 — Sin dolor</span>
        <span>10 — Máximo dolor</span>
      </div>
    </div>
  )
}

// ─── Likert Radio ─────────────────────────────────────────────────────────

function LikertItem({
  label,
  options,
  value,
  onChange,
  index,
}: {
  label: string
  options: string[]
  value: number
  onChange: (v: number) => void
  index: number
}) {
  return (
    <div className="mb-5 p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl">
      <p className="text-[13px] font-medium text-text-primary mb-3">
        <span className="text-text-secondary mr-1">{index + 1}.</span> {label}
      </p>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <label key={i} className="flex items-start gap-3 cursor-pointer group">
            <div className={`mt-0.5 w-4 h-4 rounded-full border-[1.5px] shrink-0 transition-colors ${value === i ? 'border-accent bg-accent' : 'border-border group-hover:border-text-secondary'}`} onClick={() => onChange(i)} />
            <span className="text-[13px] text-text-secondary group-hover:text-text-primary transition-colors leading-snug" onClick={() => onChange(i)}>
              {opt}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function QuestionariosClient({ userId, lockedPatient, initialDate, initialType, returnTo }: { userId: string; lockedPatient?: { id: string; name: string } | null; initialDate?: string | null; initialType?: string | null; returnTo?: string | null }) {
  const router = useRouter()
  // Si viene un ?type= válido (p. ej. desde una evaluación programada), arranca
  // con ese cuestionario ya seleccionado.
  const [selected, setSelected] = useState<string | null>(
    initialType && QUESTIONNAIRES.some(q => q.id === initialType) ? initialType : null
  )
  const [result, setResult] = useState<QuestionnaireResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  // Si venimos desde la ficha de un paciente, arranca fijado en ese paciente.
  const [selectedPatient, setSelectedPatient] = useState<string>(lockedPatient?.id ?? '')
  const [patientsLoaded, setPatientsLoaded] = useState(false)

  // SPADI state
  const [spadiPain, setSpadiPain] = useState<number[]>(Array(5).fill(0))
  const [spadiDisability, setSpadiDisability] = useState<number[]>(Array(8).fill(0))

  // NDI state
  const [ndiAnswers, setNdiAnswers] = useState<number[]>(Array(10).fill(-1))

  // Roland Morris state
  const [rolandAnswers, setRolandAnswers] = useState<boolean[]>(Array(24).fill(false))

  // Start Back state — ítems 1-8 booleanos (Sí/No) + ítem 9 escala de molestia (0-4, -1 = sin responder)
  const [startBackAnswers, setStartBackAnswers] = useState<boolean[]>(Array(8).fill(false))
  const [startBackBother, setStartBackBother] = useState<number>(-1)

  // Tampa state
  const [tampaAnswers, setTampaAnswers] = useState<number[]>(Array(17).fill(1))

  // PCS state
  const [pcsAnswers, setPcsAnswers] = useState<number[]>(Array(13).fill(0))

  // Oswestry state
  const [oswestryAnswers, setOswestryAnswers] = useState<number[]>(Array(10).fill(-1))

  // DASH state
  const [dashAnswers, setDashAnswers] = useState<number[]>(Array(30).fill(1))

  // LEFS state
  const [lefsAnswers, setLefsAnswers] = useState<number[]>(Array(20).fill(0))

  // PSFS state
  const [psfsActivities, setPsfsActivities] = useState([
    { name: '', score: 0 },
    { name: '', score: 0 },
    { name: '', score: 0 },
  ])

  // FABQ state
  const [fabqAnswers, setFabqAnswers] = useState<number[]>(Array(16).fill(0))

  // ACL-RSI: 12 ítems 0-10, arrancan en 5 (punto medio neutro)
  const [aclRsiAnswers, setAclRsiAnswers] = useState<number[]>(Array(12).fill(5))

  // KOOS: respuestas por subescala, -1 = sin responder (requiere completar todo)
  const [koosAnswers, setKoosAnswers] = useState<KoosAnswers>(() =>
    KOOS_SECTIONS.reduce((acc, sec) => { acc[sec.key] = Array(sec.items.length).fill(-1); return acc }, {} as KoosAnswers)
  )

  // WOSI: 21 ítems VAS 0-100 por sección, arrancan en 0
  const [wosiAnswers, setWosiAnswers] = useState<WosiAnswers>(() =>
    WOSI_SECTIONS.reduce((acc, sec) => { acc[sec.key] = Array(sec.items.length).fill(0); return acc }, {} as WosiAnswers)
  )

  // FAAM: AVD (21) + Deporte (8), -1 = sin responder, 5 = No corresponde
  const [faamAdl, setFaamAdl] = useState<number[]>(Array(FAAM_ADL_ITEMS.length).fill(-1))
  const [faamSport, setFaamSport] = useState<number[]>(Array(FAAM_SPORT_ITEMS.length).fill(-1))

  // HAGOS: respuestas por subescala, -1 = sin responder
  const [hagosAnswers, setHagosAnswers] = useState<HagosAnswers>(() =>
    HAGOS_SECTIONS.reduce((acc, sec) => { acc[sec.key] = Array(sec.items.length).fill(-1); return acc }, {} as HagosAnswers)
  )

  // AKPS: índice de opción elegida por ítem, -1 = sin responder
  const [akpsAnswers, setAkpsAnswers] = useState<number[]>(Array(AKPS_ITEMS.length).fill(-1))

  // VISA (A y P comparten estado): Q1-6 sliders 0-10, Q7 y Q8 con índices (-1 = sin responder)
  const [visaQ16, setVisaQ16] = useState<number[]>(Array(6).fill(0))
  const [visaQ7, setVisaQ7] = useState<number>(-1)
  const [visaQ8Scenario, setVisaQ8Scenario] = useState<number>(-1)
  const [visaQ8Duration, setVisaQ8Duration] = useState<number>(-1)

  useEffect(() => {
    if (!patientsLoaded) {
      const supabase = createClient()
      supabase.from('patients').select('id, name').eq('user_id', userId).order('name')
        .then(({ data }) => {
          if (data) setPatients(data)
          setPatientsLoaded(true)
        })
    }
  }, [patientsLoaded, userId])

  const handleSelect = (id: string) => {
    setSelected(id)
    setResult(null)
    setSaveSuccess(false)
  }

  const handleBack = () => {
    setSelected(null)
    setResult(null)
    setSaveSuccess(false)
  }

  // ── Compute score ─────────────────────────────────────────────────────────

  const computeResult = (): QuestionnaireResult | null => {
    switch (selected) {
      case 'spadi': {
        const { score, interpretation, color } = scoreSPADI(spadiPain, spadiDisability)
        const painMean = spadiPain.reduce((a, b) => a + b, 0) / spadiPain.length
        const disabilityMean = spadiDisability.reduce((a, b) => a + b, 0) / spadiDisability.length
        return { questionnaire_type: 'spadi', score, interpretation, result_data: { pain_items: spadiPain, disability_items: spadiDisability, pain_subscale: Math.round(painMean * 10), disability_subscale: Math.round(disabilityMean * 10), color } }
      }
      case 'ndi': {
        if (ndiAnswers.some(a => a === -1)) return null
        const { score, interpretation, color } = scoreNDI(ndiAnswers)
        return { questionnaire_type: 'ndi', score, interpretation, result_data: { answers: ndiAnswers, color } }
      }
      case 'roland_morris': {
        const { score, interpretation, color } = scoreRolandMorris(rolandAnswers)
        return { questionnaire_type: 'roland_morris', score, interpretation, result_data: { answers: rolandAnswers, color } }
      }
      case 'start_back': {
        if (startBackBother === -1) return null
        const { score, psychosocial, interpretation, color } = scoreStartBack(startBackAnswers, startBackBother)
        return { questionnaire_type: 'start_back', score, interpretation, result_data: { answers: startBackAnswers, bother: startBackBother, psychosocial_score: psychosocial, total_score: score, color } }
      }
      case 'tampa': {
        const { score, interpretation, color } = scoreTampa(tampaAnswers)
        return { questionnaire_type: 'tampa', score, interpretation, result_data: { answers: tampaAnswers, color } }
      }
      case 'catastrofismo': {
        const { score, rumination, magnification, helplessness, interpretation, color } = scorePCS(pcsAnswers)
        return { questionnaire_type: 'catastrofismo', score, interpretation, result_data: { answers: pcsAnswers, rumination, magnification, helplessness, color } }
      }
      case 'oswestry': {
        if (oswestryAnswers.some(a => a === -1)) return null
        const { score, interpretation, color } = scoreOswestry(oswestryAnswers)
        return { questionnaire_type: 'oswestry', score, interpretation, result_data: { answers: oswestryAnswers, color } }
      }
      case 'dash': {
        const { score, interpretation, color } = scoreDASH(dashAnswers)
        return { questionnaire_type: 'dash', score, interpretation, result_data: { answers: dashAnswers, color } }
      }
      case 'lefs': {
        const { score, interpretation, color } = scoreLEFS(lefsAnswers)
        return { questionnaire_type: 'lefs', score, interpretation, result_data: { answers: lefsAnswers, color } }
      }
      case 'psfs': {
        const valid = psfsActivities.filter(a => a.name.trim() !== '')
        if (valid.length === 0) return null
        const { score, interpretation, color } = scorePSFS(psfsActivities)
        return { questionnaire_type: 'psfs', score, interpretation, result_data: { activities: psfsActivities, color } }
      }
      case 'fabq': {
        const { pa_score, work_score, interpretation, color } = scoreFABQ(fabqAnswers)
        return { questionnaire_type: 'fabq', score: null, interpretation, result_data: { pa_score, work_score, answers: fabqAnswers, color } }
      }
      case 'acl_rsi': {
        const { score, interpretation, color } = scoreACLRSI(aclRsiAnswers)
        return { questionnaire_type: 'acl_rsi', score, interpretation, result_data: { answers: aclRsiAnswers, color } }
      }
      case 'koos': {
        if (KOOS_SECTIONS.some(sec => koosAnswers[sec.key].some(a => a === -1))) return null
        const { subscales, sport, interpretation, color } = scoreKOOS(koosAnswers)
        // El score de cabecera es KOOS-Sport (lo que importa el RTS de LCA vía
        // result_data.sport). Las 5 subescalas quedan en result_data.
        return { questionnaire_type: 'koos', score: sport, interpretation, result_data: { answers: koosAnswers, ...subscales, sport, color } }
      }
      case 'wosi': {
        const { score, raw, interpretation, color } = scoreWOSI(wosiAnswers)
        return { questionnaire_type: 'wosi', score, interpretation, result_data: { answers: wosiAnswers, raw, color } }
      }
      case 'faam': {
        if (faamAdl.some(a => a === -1) || faamSport.some(a => a === -1)) return null
        const { adl, sport, interpretation, color } = scoreFAAM(faamAdl, faamSport)
        // Score de cabecera = FAAM Deporte (lo que mira el RTS de tobillo).
        return { questionnaire_type: 'faam', score: sport, interpretation, result_data: { adl_answers: faamAdl, sport_answers: faamSport, adl, sport, color } }
      }
      case 'hagos': {
        if (HAGOS_SECTIONS.some(sec => hagosAnswers[sec.key].some(a => a === -1))) return null
        const { subscales, sport, interpretation, color } = scoreHAGOS(hagosAnswers)
        return { questionnaire_type: 'hagos', score: sport, interpretation, result_data: { answers: hagosAnswers, ...subscales, sport, color } }
      }
      case 'akps': {
        if (akpsAnswers.some(a => a === -1)) return null
        const { score, interpretation, color } = scoreAKPS(akpsAnswers)
        return { questionnaire_type: 'akps', score, interpretation, result_data: { answers: akpsAnswers, color } }
      }
      case 'visa_a':
      case 'visa_p': {
        if (visaQ7 === -1 || visaQ8Scenario === -1 || visaQ8Duration === -1) return null
        const { score, interpretation, color } = scoreVISA(visaQ16, visaQ7, visaQ8Duration)
        return { questionnaire_type: selected, score, interpretation, result_data: { q16: visaQ16, q7: visaQ7, q8_scenario: visaQ8Scenario, q8_duration: visaQ8Duration, color } }
      }
      default:
        return null
    }
  }

  const handleSubmit = () => {
    const r = computeResult()
    if (r) { setResult(r); setSaveSuccess(false) }
  }

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('questionnaire_results').insert({
        user_id: userId,
        patient_id: selectedPatient || null,
        questionnaire_type: result.questionnaire_type,
        score: result.score,
        interpretation: result.interpretation,
        result_data: result.result_data,
        ...(initialDate ? { evaluation_date: initialDate } : {}),
      })
      if (error) throw error
      setSaveSuccess(true)
      // Si vino del calendario del plan, volver ahí (el marcador aparece en ese día).
      if (returnTo) { router.push(returnTo); router.refresh() }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // ── Render questionnaire form ─────────────────────────────────────────────

  const renderForm = () => {
    switch (selected) {
      case 'spadi':
        return (
          <div>
            <h3 className="text-[15px] font-medium mb-1 text-text-secondary uppercase tracking-[0.05em]">Subescala de Dolor (5 ítems, 0-10)</h3>
            <p className="text-[13px] text-text-secondary mb-4">0 = sin dolor · 10 = el peor dolor posible</p>
            {SPADI_PAIN.map((q, i) => (
              <NRSInput key={i} value={spadiPain[i]} label={q} onChange={v => { const n = [...spadiPain]; n[i] = v; setSpadiPain(n) }} />
            ))}
            <h3 className="text-[15px] font-medium mb-1 mt-6 text-text-secondary uppercase tracking-[0.05em]">Subescala de Discapacidad (8 ítems, 0-10)</h3>
            <p className="text-[13px] text-text-secondary mb-4">0 = sin dificultad · 10 = no puedo hacerlo</p>
            {SPADI_DISABILITY.map((q, i) => (
              <NRSInput key={i} value={spadiDisability[i]} label={q} onChange={v => { const n = [...spadiDisability]; n[i] = v; setSpadiDisability(n) }} />
            ))}
          </div>
        )

      case 'ndi':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">Seleccioná la opción que mejor describe tu situación en el día de hoy.</p>
            {NDI_ITEMS.map((item, i) => (
              <LikertItem key={i} index={i} label={item.label} options={item.options} value={ndiAnswers[i]} onChange={v => { const n = [...ndiAnswers]; n[i] = v; setNdiAnswers(n) }} />
            ))}
          </div>
        )

      case 'roland_morris':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">Marcá cada frase que describa cómo te sentís <strong>hoy</strong> por tu dolor de espalda.</p>
            <div className="space-y-2">
              {ROLAND_MORRIS_ITEMS.map((item, i) => (
                <label key={i} className="flex items-start gap-3 p-3 bg-bg-secondary border-[0.5px] border-border rounded-xl cursor-pointer hover:border-accent/40 transition-colors">
                  <input type="checkbox" checked={rolandAnswers[i]} onChange={e => { const n = [...rolandAnswers]; n[i] = e.target.checked; setRolandAnswers(n) }} className="mt-0.5 w-4 h-4 accent-accent shrink-0" />
                  <span className="text-[13px] text-text-primary leading-snug">{item}</span>
                </label>
              ))}
            </div>
          </div>
        )

      case 'start_back':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">Respondé pensando en las últimas 2 semanas. Los ítems 1 a 8 son <strong>Sí / No</strong>; el ítem 9 pregunta qué tan molesto fue el dolor.</p>
            <div className="space-y-3">
              {START_BACK_ITEMS.map((item, i) => (
                <div key={i} className="p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl">
                  <p className="text-[13px] text-text-primary mb-3">
                    <span className="text-text-secondary mr-1">{i + 1}.</span> {item.text}
                    {item.psychosocial && <span className="ml-2 text-[10px] text-[#9333ea] uppercase tracking-[0.05em] font-medium">Psicosocial</span>}
                  </p>
                  {'isLast' in item && item.isLast ? (
                    <div className="flex flex-col gap-1.5">
                      {START_BACK_BOTHER.map((label, v) => (
                        <button key={v} onClick={() => setStartBackBother(v)}
                          className={`text-left px-4 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${startBackBother === v ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:border-accent/50'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      {['No', 'Sí'].map((opt, j) => (
                        <button key={j} onClick={() => { const n = [...startBackAnswers]; n[i] = j === 1; setStartBackAnswers(n) }}
                          className={`px-5 py-1.5 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${startBackAnswers[i] === (j === 1) ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:border-accent/50'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {startBackBother === -1 && (
              <p className="text-[12px] text-warning mt-3">Respondé el ítem 9 para calcular el resultado.</p>
            )}
          </div>
        )

      case 'tampa':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">
              Indicá en qué medida estás de acuerdo con cada afirmación.<br />
              <span className="text-[12px]">1 = muy en desacuerdo · 2 = en desacuerdo · 3 = de acuerdo · 4 = muy de acuerdo</span>
            </p>
            {TAMPA_ITEMS.map((item, i) => (
              <div key={i} className="mb-4 p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl">
                <p className="text-[13px] font-medium text-text-primary mb-3">
                  <span className="text-text-secondary mr-1">{i + 1}.</span> {item.text}
                  {item.reverse && <span className="ml-2 text-[10px] text-text-secondary">(ítem invertido)</span>}
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(v => (
                    <button key={v} onClick={() => { const n = [...tampaAnswers]; n[i] = v; setTampaAnswers(n) }}
                      className={`flex-1 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${tampaAnswers[i] === v ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:border-accent/50'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )

      case 'catastrofismo':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">
              Las siguientes afirmaciones describen diferentes pensamientos y emociones que pueden asociarse al dolor.
              Indicá el grado en que estos pensamientos o emociones aparecen <strong>cuando sentís dolor</strong>.
            </p>
            {PCS_ITEMS.map((item, i) => (
              <div key={i} className="mb-4 p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl">
                <p className="text-[13px] font-medium text-text-primary mb-3">
                  <span className="text-text-secondary mr-1">{i + 1}.</span> {item.text}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {PCS_LABELS.map((label, v) => (
                    <button key={v} onClick={() => { const n = [...pcsAnswers]; n[i] = v; setPcsAnswers(n) }}
                      className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-lg text-[11px] border-[0.5px] transition-colors text-center ${pcsAnswers[i] === v ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:border-accent/50'}`}>
                      {v} — {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )

      case 'oswestry':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">Este cuestionario evalúa cómo el dolor de espalda afecta tu capacidad para funcionar. Seleccioná la opción que mejor describe tu situación <strong>hoy</strong>.</p>
            {OSWESTRY_SECTIONS.map((section, i) => (
              <LikertItem key={i} index={i} label={section.label} options={section.options} value={oswestryAnswers[i]} onChange={v => { const n = [...oswestryAnswers]; n[i] = v; setOswestryAnswers(n) }} />
            ))}
          </div>
        )

      case 'dash':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">
              Indicá tu capacidad para realizar las siguientes actividades durante la <strong>última semana</strong> usando la escala:<br />
              <span className="text-[12px]">1 = sin dificultad · 2 = dificultad leve · 3 = dificultad moderada · 4 = dificultad bastante grande · 5 = incapaz</span>
            </p>
            {DASH_ITEMS.map((item, i) => (
              <div key={i} className="mb-4 p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl">
                <p className="text-[13px] font-medium text-text-primary mb-3">
                  <span className="text-text-secondary mr-1">{i + 1}.</span> {item}
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button key={v} onClick={() => { const n = [...dashAnswers]; n[i] = v; setDashAnswers(n) }}
                      className={`flex-1 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${dashAnswers[i] === v ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:border-accent/50'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )

      case 'lefs':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">
              Indicá tu capacidad para realizar las siguientes actividades <strong>hoy</strong> debido a tu condición de miembro inferior:<br />
              <span className="text-[12px]">0 = extrema dificultad/incapaz · 1 = bastante grande · 2 = moderada · 3 = poca · 4 = ninguna</span>
            </p>
            {LEFS_ITEMS.map((item, i) => (
              <div key={i} className="mb-4 p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl">
                <p className="text-[13px] font-medium text-text-primary mb-3">
                  <span className="text-text-secondary mr-1">{i + 1}.</span> {item}
                </p>
                <div className="flex gap-2">
                  {LEFS_OPTIONS.map((opt, v) => (
                    <button key={v} onClick={() => { const n = [...lefsAnswers]; n[i] = v; setLefsAnswers(n) }}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium border-[0.5px] transition-colors text-center leading-tight px-1 ${lefsAnswers[i] === v ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:border-accent/50'}`}>
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex mt-1">
                  {LEFS_OPTIONS.map((opt, v) => (
                    <span key={v} className="flex-1 text-[9px] text-text-secondary text-center leading-tight px-0.5">{v === 0 ? opt : v === 4 ? opt : ''}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )

      case 'psfs':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">
              Nombrá hasta 3 actividades que son importantes para vos pero que tenés dificultad para realizar por tu condición.
              Puntuá cada actividad del 0 al 10.<br />
              <span className="text-[12px]">0 = incapaz de realizar · 10 = al mismo nivel que antes de la lesión</span>
            </p>
            {psfsActivities.map((act, i) => (
              <div key={i} className="mb-4 p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl">
                <p className="text-[13px] font-medium text-text-primary mb-3">Actividad {i + 1}</p>
                <input
                  type="text"
                  value={act.name}
                  onChange={e => { const n = [...psfsActivities]; n[i] = { ...n[i], name: e.target.value }; setPsfsActivities(n) }}
                  placeholder={`Ej: ${i === 0 ? 'Subir escaleras' : i === 1 ? 'Correr 30 minutos' : 'Sentarme a trabajar'}`}
                  className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent mb-3"
                />
                <div className="flex justify-between mb-1.5">
                  <span className="text-[12px] text-text-secondary">Puntaje actual</span>
                  <span className="text-[13px] font-medium">{act.score}</span>
                </div>
                <input type="range" min={0} max={10} value={act.score}
                  onChange={e => { const n = [...psfsActivities]; n[i] = { ...n[i], score: Number(e.target.value) }; setPsfsActivities(n) }}
                  className="w-full accent-accent" />
                <div className="flex justify-between text-[10px] text-text-secondary mt-0.5">
                  <span>0 — Incapaz</span>
                  <span>10 — Sin limitación</span>
                </div>
              </div>
            ))}
          </div>
        )

      case 'fabq':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">
              A continuación hay algunas afirmaciones sobre el trabajo y la actividad física. Para cada una,
              indicá cuánto estás de acuerdo usando la escala del 0 al 6.<br />
              <span className="text-[12px]">0 = totalmente en desacuerdo · 6 = totalmente de acuerdo</span>
            </p>
            {FABQ_ITEMS.map((item, i) => (
              <div key={i} className="mb-4 p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl">
                <p className="text-[13px] font-medium text-text-primary mb-3">
                  <span className="text-text-secondary mr-1">{i + 1}.</span> {item.text}
                  {item.subscale === 'pa' && <span className="ml-2 text-[10px] text-[#0891b2] uppercase tracking-[0.05em]">AF</span>}
                  {item.subscale === 'work' && <span className="ml-2 text-[10px] text-[#7c3aed] uppercase tracking-[0.05em]">Trabajo</span>}
                </p>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map(v => (
                    <button key={v} onClick={() => { const n = [...fabqAnswers]; n[i] = v; setFabqAnswers(n) }}
                      className={`flex-1 py-2 rounded-lg text-[12px] font-medium border-[0.5px] transition-colors ${fabqAnswers[i] === v ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:border-accent/50'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )

      case 'acl_rsi':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">
              Pensando en volver a tu deporte, indicá del <strong>0 al 10</strong> cuánto refleja tu situación cada afirmación.<br />
              <span className="text-[12px]">0 = nada / totalmente en desacuerdo · 10 = totalmente / completamente</span>
            </p>
            {ACL_RSI_ITEMS.map((item, i) => (
              <div key={i} className="mb-4 p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl">
                <div className="flex justify-between items-start gap-3 mb-3">
                  <p className="text-[13px] font-medium text-text-primary">
                    <span className="text-text-secondary mr-1">{i + 1}.</span> {item.text}
                  </p>
                  <span className="text-[13px] font-medium text-text-primary shrink-0">{aclRsiAnswers[i]}</span>
                </div>
                <input type="range" min={0} max={10} value={aclRsiAnswers[i]}
                  onChange={e => { const n = [...aclRsiAnswers]; n[i] = Number(e.target.value); setAclRsiAnswers(n) }}
                  className="w-full accent-accent" />
                <div className="flex justify-between text-[10px] text-text-secondary mt-0.5">
                  <span>0</span>
                  <span>10</span>
                </div>
              </div>
            ))}
          </div>
        )

      case 'koos':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">
              Respondé pensando en tu rodilla durante la <strong>última semana</strong>. Cada subescala se puntúa por separado de 0 a 100 (mayor = mejor).
            </p>
            {KOOS_SECTIONS.map(sec => (
              <div key={sec.key} className="mb-8">
                <h3 className="text-[15px] font-medium mb-1 text-text-secondary uppercase tracking-[0.05em]">{sec.title}</h3>
                {sec.hint && <p className="text-[13px] text-text-secondary mb-4">{sec.hint}</p>}
                {sec.items.map((item, i) => (
                  <LikertItem
                    key={i}
                    index={i}
                    label={item.text}
                    options={item.options}
                    value={koosAnswers[sec.key][i]}
                    onChange={v => setKoosAnswers(prev => {
                      const next = { ...prev, [sec.key]: [...prev[sec.key]] }
                      next[sec.key][i] = v
                      return next
                    })}
                  />
                ))}
              </div>
            ))}
          </div>
        )

      case 'wosi':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">
              Marcá en cada línea cuánto te afectó tu hombro en la <strong>última semana</strong>. 0 = sin problema · 100 = el peor posible. El resultado se expresa como % de calidad de vida (mayor = mejor).
            </p>
            {WOSI_SECTIONS.map(sec => (
              <div key={sec.key} className="mb-8">
                <h3 className="text-[15px] font-medium mb-4 text-text-secondary uppercase tracking-[0.05em]">{sec.title}</h3>
                {sec.items.map((item, i) => (
                  <div key={i} className="mb-4">
                    <div className="flex justify-between mb-1.5 gap-3">
                      <span className="text-[13px] text-text-primary">{item}</span>
                      <span className="text-[13px] font-medium text-text-primary w-8 text-right shrink-0">{wosiAnswers[sec.key][i]}</span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={wosiAnswers[sec.key][i]}
                      onChange={e => setWosiAnswers(prev => {
                        const next = { ...prev, [sec.key]: [...prev[sec.key]] }
                        next[sec.key][i] = Number(e.target.value)
                        return next
                      })}
                      className="w-full accent-accent"
                    />
                    <div className="flex justify-between text-[10px] text-text-secondary mt-0.5">
                      <span>0 — Sin problema</span>
                      <span>100 — El peor posible</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )

      case 'faam':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">
              Indicá tu nivel de dificultad actual por tu condición de pie/tobillo. Elegí <strong>No corresponde</strong> si no realizás esa actividad por otras razones. Cada subescala se puntúa 0–100% (mayor = mejor).
            </p>
            <div className="mb-8">
              <h3 className="text-[15px] font-medium mb-4 text-text-secondary uppercase tracking-[0.05em]">Actividades de la vida diaria (AVD)</h3>
              {FAAM_ADL_ITEMS.map((item, i) => (
                <LikertItem key={i} index={i} label={item} options={FAAM_OPTIONS} value={faamAdl[i]}
                  onChange={v => { const n = [...faamAdl]; n[i] = v; setFaamAdl(n) }} />
              ))}
            </div>
            <div className="mb-8">
              <h3 className="text-[15px] font-medium mb-4 text-text-secondary uppercase tracking-[0.05em]">Deporte</h3>
              {FAAM_SPORT_ITEMS.map((item, i) => (
                <LikertItem key={i} index={i} label={item} options={FAAM_OPTIONS} value={faamSport[i]}
                  onChange={v => { const n = [...faamSport]; n[i] = v; setFaamSport(n) }} />
              ))}
            </div>
          </div>
        )

      case 'hagos':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">
              Respondé pensando en tu cadera/ingle durante la <strong>última semana</strong>. Cada subescala se puntúa por separado de 0 a 100 (mayor = mejor).
            </p>
            {HAGOS_SECTIONS.map(sec => (
              <div key={sec.key} className="mb-8">
                <h3 className="text-[15px] font-medium mb-1 text-text-secondary uppercase tracking-[0.05em]">{sec.title}</h3>
                {sec.hint && <p className="text-[13px] text-text-secondary mb-4">{sec.hint}</p>}
                {sec.items.map((item, i) => (
                  <LikertItem key={i} index={i} label={item.text} options={item.options} value={hagosAnswers[sec.key][i]}
                    onChange={v => setHagosAnswers(prev => {
                      const next = { ...prev, [sec.key]: [...prev[sec.key]] }
                      next[sec.key][i] = v
                      return next
                    })} />
                ))}
              </div>
            ))}
          </div>
        )

      case 'akps':
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">Elegí en cada ítem la opción que mejor describe tu rodilla. Puntaje total 0–100 (mayor = mejor).</p>
            {AKPS_ITEMS.map((item, i) => (
              <div key={i} className="mb-4 p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl">
                <p className="text-[13px] font-medium text-text-primary mb-3"><span className="text-text-secondary mr-1">{i + 1}.</span> {item.label}</p>
                <div className="flex flex-col gap-1.5">
                  {item.options.map((opt, j) => (
                    <button key={j} onClick={() => { const n = [...akpsAnswers]; n[i] = j; setAkpsAnswers(n) }}
                      className={`text-left px-4 py-2 rounded-lg text-[13px] border-[0.5px] transition-colors ${akpsAnswers[i] === j ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:border-accent/50'}`}>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )

      case 'visa_a':
      case 'visa_p': {
        const sliders: VisaSlider[] = selected === 'visa_a' ? VISA_A_Q16 : VISA_P_Q16
        return (
          <div>
            <p className="text-[13px] text-text-secondary mb-5">Respondé según cómo estuviste esta semana. Puntaje total 0–100 (mayor = mejor / menos síntomas).</p>
            {sliders.map((s, i) => (
              <div key={i} className="mb-4">
                <div className="flex justify-between mb-1.5 gap-3">
                  <span className="text-[13px] text-text-primary">{i + 1}. {s.label}</span>
                  <span className="text-[13px] font-medium text-text-primary w-6 text-right shrink-0">{visaQ16[i]}</span>
                </div>
                <input type="range" min={0} max={10} value={visaQ16[i]}
                  onChange={e => { const n = [...visaQ16]; n[i] = Number(e.target.value); setVisaQ16(n) }}
                  className="w-full accent-accent" />
                <div className="flex justify-between text-[10px] text-text-secondary mt-0.5">
                  <span>{s.low}</span>
                  <span>{s.high}</span>
                </div>
              </div>
            ))}
            {/* Q7 */}
            <div className="mb-4 p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl">
              <p className="text-[13px] font-medium text-text-primary mb-3"><span className="text-text-secondary mr-1">7.</span> ¿Estás haciendo deporte u otra actividad física?</p>
              <div className="flex flex-col gap-1.5">
                {VISA_Q7_OPTIONS.map((opt, j) => (
                  <button key={j} onClick={() => setVisaQ7(j)}
                    className={`text-left px-4 py-2 rounded-lg text-[13px] border-[0.5px] transition-colors ${visaQ7 === j ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:border-accent/50'}`}>
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
            {/* Q8 */}
            <div className="mb-4 p-4 bg-bg-secondary border-[0.5px] border-border rounded-xl">
              <p className="text-[13px] font-medium text-text-primary mb-3"><span className="text-text-secondary mr-1">8.</span> Si estás entrenando/compitiendo, elegí tu situación de dolor y por cuánto tiempo podés hacerlo:</p>
              <div className="flex flex-col gap-1.5 mb-3">
                {VISA_Q8_SCENARIOS.map((scen, j) => (
                  <button key={j} onClick={() => setVisaQ8Scenario(j)}
                    className={`text-left px-4 py-2 rounded-lg text-[13px] border-[0.5px] transition-colors ${visaQ8Scenario === j ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:border-accent/50'}`}>
                    {scen}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-text-secondary mb-2">Tiempo que podés entrenar/competir:</p>
              <div className="flex flex-wrap gap-1.5">
                {VISA_Q8_DURATIONS.map((opt, j) => (
                  <button key={j} onClick={() => setVisaQ8Duration(j)}
                    className={`px-3 py-2 rounded-lg text-[12px] border-[0.5px] transition-colors ${visaQ8Duration === j ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:border-accent/50'}`}>
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
            {(visaQ7 === -1 || visaQ8Scenario === -1 || visaQ8Duration === -1) && (
              <p className="text-[12px] text-warning">Respondé las preguntas 7 y 8 para calcular el resultado.</p>
            )}
          </div>
        )
      }

      default:
        return null
    }
  }

  // ── Grid view ──────────────────────────────────────────────────────────────

  if (!selected) {
    return (
      <div>
        {returnTo && (
          <div className="flex items-center justify-between gap-3 bg-bg-secondary border-[0.5px] border-accent/40 rounded-xl px-4 py-3 mb-4">
            <span className="text-[13px] text-text-secondary">
              Elegí un cuestionario para cargarlo
              {initialDate ? ` el ${new Date(initialDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}` : ''}
              {' '}en el calendario del paciente.
            </span>
            <button onClick={() => router.push(returnTo)} className="text-[13px] text-accent hover:opacity-80 whitespace-nowrap">← Volver al calendario</button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {QUESTIONNAIRES.map(q => (
          <button
            key={q.id}
            onClick={() => handleSelect(q.id)}
            className="text-left bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 hover:border-accent/50 hover:bg-bg-secondary/80 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-[0.06em] mb-1 block" style={{ color: q.color }}>{q.region}</span>
                <h3 className="text-[16px] font-medium text-text-primary">{q.name}</h3>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: q.color + '20', border: `1px solid ${q.color}40` }}>
                <span className="text-[14px]" style={{ color: q.color }}>→</span>
              </div>
            </div>
            <p className="text-[12px] text-text-secondary leading-[1.5] mb-3">{q.description}</p>
            <div className="text-[11px] text-text-secondary border-t-[0.5px] border-border pt-2.5 mt-auto font-mono">
              {q.range}
            </div>
          </button>
        ))}
        </div>
      </div>
    )
  }

  const qInfo = QUESTIONNAIRES.find(q => q.id === selected)!

  // ── Questionnaire form view ────────────────────────────────────────────────

  return (
    <div className="max-w-[800px]">
      <div className="mb-6">
        <button onClick={handleBack} className="text-[13px] text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 mb-4">
          ← Volver a cuestionarios
        </button>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em]" style={{ color: qInfo.color }}>{qInfo.region}</span>
        </div>
        <h2 className="text-[24px] font-medium tracking-[-0.02em]">{qInfo.name}</h2>
        <p className="text-[14px] text-text-secondary mt-1">{qInfo.fullName}</p>
      </div>

      {/* Form */}
      <div className="mb-6">
        {renderForm()}
      </div>

      {/* Submit */}
      {!result && (
        <button
          onClick={handleSubmit}
          className="bg-accent text-bg-primary px-6 py-2.5 rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity"
        >
          Calcular resultado
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 p-6 bg-bg-secondary border-[0.5px] border-border rounded-xl">
          <h3 className="text-[13px] uppercase tracking-[0.05em] text-text-secondary font-medium mb-4">Resultado</h3>

          <div className="flex items-center gap-4 mb-4">
            {result.score !== null && (
              <div className="text-center">
                <div className="text-[40px] font-light tracking-[-0.03em] leading-none">
                  {result.questionnaire_type === 'oswestry' || result.questionnaire_type === 'wosi' || result.questionnaire_type === 'faam' ? `${result.score}%` : result.score}
                </div>
                <div className="text-[11px] text-text-secondary mt-1">Puntuación</div>
              </div>
            )}
            {result.questionnaire_type === 'fabq' && (
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-[32px] font-light tracking-[-0.03em]">{result.result_data.pa_score}</div>
                  <div className="text-[11px] text-text-secondary">PA / 24</div>
                </div>
                <div className="text-center">
                  <div className="text-[32px] font-light tracking-[-0.03em]">{result.result_data.work_score}</div>
                  <div className="text-[11px] text-text-secondary">Trabajo / 42</div>
                </div>
              </div>
            )}
            <div className={`px-4 py-2 rounded-xl border-[0.5px] text-[14px] font-medium ${colorClass(result.result_data.color)}`}>
              {result.interpretation}
            </div>
          </div>

          {/* Subscores */}
          {result.questionnaire_type === 'catastrofismo' && (
            <div className="flex gap-3 mb-4 flex-wrap">
              {[
                { label: 'Rumiación', value: result.result_data.rumination, max: 16 },
                { label: 'Magnificación', value: result.result_data.magnification, max: 12 },
                { label: 'Desesperanza', value: result.result_data.helplessness, max: 24 },
              ].map(sub => (
                <div key={sub.label} className="bg-bg-primary border-[0.5px] border-border rounded-lg px-4 py-2">
                  <div className="text-[11px] text-text-secondary">{sub.label}</div>
                  <div className="text-[18px] font-medium">{sub.value}<span className="text-[12px] text-text-secondary"> / {sub.max}</span></div>
                </div>
              ))}
            </div>
          )}
          {result.questionnaire_type === 'start_back' && (
            <div className="flex gap-3 mb-4">
              <div className="bg-bg-primary border-[0.5px] border-border rounded-lg px-4 py-2">
                <div className="text-[11px] text-text-secondary">Total</div>
                <div className="text-[18px] font-medium">{result.result_data.total_score} / 9</div>
              </div>
              <div className="bg-bg-primary border-[0.5px] border-border rounded-lg px-4 py-2">
                <div className="text-[11px] text-text-secondary">Subescala psicosocial</div>
                <div className="text-[18px] font-medium">{result.result_data.psychosocial_score} / 5</div>
              </div>
            </div>
          )}
          {result.questionnaire_type === 'spadi' && (
            <div className="flex gap-3 mb-4">
              <div className="bg-bg-primary border-[0.5px] border-border rounded-lg px-4 py-2">
                <div className="text-[11px] text-text-secondary">Subescala dolor</div>
                <div className="text-[18px] font-medium">{result.result_data.pain_subscale}<span className="text-[12px] text-text-secondary"> / 100</span></div>
              </div>
              <div className="bg-bg-primary border-[0.5px] border-border rounded-lg px-4 py-2">
                <div className="text-[11px] text-text-secondary">Subescala discapacidad</div>
                <div className="text-[18px] font-medium">{result.result_data.disability_subscale}<span className="text-[12px] text-text-secondary"> / 100</span></div>
              </div>
            </div>
          )}
          {result.questionnaire_type === 'koos' && (
            <div className="flex gap-3 mb-4 flex-wrap">
              {[
                { label: 'Síntomas', key: 'symptoms' },
                { label: 'Dolor', key: 'pain' },
                { label: 'Vida diaria (AVD)', key: 'adl' },
                { label: 'Deporte', key: 'sport' },
                { label: 'Calidad de vida', key: 'qol' },
              ].map(sub => (
                <div key={sub.key} className={`bg-bg-primary border-[0.5px] rounded-lg px-4 py-2 ${sub.key === 'sport' ? 'border-accent/50' : 'border-border'}`}>
                  <div className="text-[11px] text-text-secondary">{sub.label}</div>
                  <div className="text-[18px] font-medium">{result.result_data[sub.key]}<span className="text-[12px] text-text-secondary"> / 100</span></div>
                </div>
              ))}
            </div>
          )}
          {result.questionnaire_type === 'faam' && (
            <div className="flex gap-3 mb-4 flex-wrap">
              {[
                { label: 'Vida diaria (AVD)', key: 'adl', unit: '%' },
                { label: 'Deporte', key: 'sport', unit: '%' },
              ].map(sub => (
                <div key={sub.key} className={`bg-bg-primary border-[0.5px] rounded-lg px-4 py-2 ${sub.key === 'sport' ? 'border-accent/50' : 'border-border'}`}>
                  <div className="text-[11px] text-text-secondary">{sub.label}</div>
                  <div className="text-[18px] font-medium">{result.result_data[sub.key] ?? '—'}<span className="text-[12px] text-text-secondary">{result.result_data[sub.key] != null ? '%' : ''}</span></div>
                </div>
              ))}
            </div>
          )}
          {result.questionnaire_type === 'hagos' && (
            <div className="flex gap-3 mb-4 flex-wrap">
              {[
                { label: 'Síntomas', key: 'symptoms' },
                { label: 'Dolor', key: 'pain' },
                { label: 'Vida diaria (AVD)', key: 'adl' },
                { label: 'Deporte', key: 'sport' },
                { label: 'Actividad física', key: 'physical' },
                { label: 'Calidad de vida', key: 'qol' },
              ].map(sub => (
                <div key={sub.key} className={`bg-bg-primary border-[0.5px] rounded-lg px-4 py-2 ${sub.key === 'sport' ? 'border-accent/50' : 'border-border'}`}>
                  <div className="text-[11px] text-text-secondary">{sub.label}</div>
                  <div className="text-[18px] font-medium">{result.result_data[sub.key]}<span className="text-[12px] text-text-secondary"> / 100</span></div>
                </div>
              ))}
            </div>
          )}

          {/* Recalculate */}
          <button onClick={() => setResult(null)} className="text-[13px] text-text-secondary hover:text-text-primary transition-colors mr-4">
            Modificar respuestas
          </button>

          {/* Save section */}
          {!saveSuccess ? (
            <div className="mt-5 pt-5 border-t-[0.5px] border-border">
              {lockedPatient ? (
                // Fijado al paciente de la ficha: sin volver a seleccionar.
                <div className="flex gap-3 items-center flex-wrap">
                  <p className="text-[13px] text-text-primary">
                    Se guarda en la ficha de <strong>{lockedPatient.name}</strong>
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {saving ? 'Guardando...' : `Guardar en ${lockedPatient.name}`}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[13px] font-medium text-text-primary mb-3">Guardar resultado en ficha de paciente</p>
                  <div className="flex gap-3 items-center flex-wrap">
                    <select
                      value={selectedPatient}
                      onChange={e => setSelectedPatient(e.target.value)}
                      className="bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent min-w-[200px]"
                    >
                      <option value="">Sin paciente (guardar de todos modos)</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {saving ? 'Guardando...' : 'Guardar resultado'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="mt-5 pt-5 border-t-[0.5px] border-border flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-2 text-[#16a34a]">
                <span className="text-[16px]">✓</span>
                <span className="text-[13px] font-medium">
                  {lockedPatient ? `Guardado en la ficha de ${lockedPatient.name}` : 'Resultado guardado correctamente'}
                </span>
              </span>
              {lockedPatient && (
                <a href={`/dashboard/pacientes/${lockedPatient.id}/ficha`} className="text-[13px] text-accent hover:underline">
                  Volver a la ficha →
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
