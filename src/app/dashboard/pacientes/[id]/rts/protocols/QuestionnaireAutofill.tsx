'use client'

import { useState } from 'react'
import { n } from './shared'
import { Field, NumInput, SectionTitle } from './ProtocolUI'

// Un resultado de cuestionario traído del historial del paciente (tabla
// questionnaire_results). result_data es opcional porque algunos importadores
// leen subescalas de ahí (p. ej. KOOS-Sport).
export interface QResult {
  score: number | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result_data?: any
  created_at: string
}

// Mapa "último resultado por tipo de cuestionario" (la clave es questionnaire_type).
export type LatestQuestionnaires = Record<string, QResult>

// Describe cómo un cuestionario de Recursos se vuelca en un campo del RTS.
export interface AutofillSpec {
  type: string // questionnaire_type en la base (ej: 'spadi', 'dash')
  label: string // nombre visible (ej: 'SPADI')
  formKey: string // campo del formulario del protocolo a completar
  // Cómo derivar el valor a cargar. Por defecto usa el score redondeado.
  extract?: (r: QResult) => string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// Banner que ofrece autocompletar los campos de cuestionario del RTS con el
// último resultado cargado en Recursos para ese paciente. Un renglón por
// cuestionario disponible, con "Usar" (vuelca el valor) u "Ocultar".
export function QuestionnaireAutofill({
  available,
  specs,
  onApply,
}: {
  available: LatestQuestionnaires
  specs: AutofillSpec[]
  onApply: (formKey: string, value: string) => void
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = specs.filter(
    s => available[s.type]?.score != null && !dismissed.has(s.type),
  )
  if (visible.length === 0) return null

  const dismiss = (type: string) => setDismissed(prev => new Set(prev).add(type))

  return (
    <div className="mb-4 space-y-2">
      {visible.map(spec => {
        const r = available[spec.type]
        const value = spec.extract ? spec.extract(r) : String(Math.round(r.score as number))
        return (
          <div
            key={spec.type}
            className="p-3 bg-bg-secondary border-[0.5px] border-border rounded-xl flex items-center justify-between flex-wrap gap-3"
          >
            <div className="text-[13px] text-text-secondary">
              <span className="mr-2">📊</span>
              {spec.label} cargado en Recursos — {fmtDate(r.created_at)}
              {r.score !== null && <span className="ml-1">· score {Math.round(r.score)}</span>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { onApply(spec.formKey, value); dismiss(spec.type) }}
                className="px-4 py-1.5 text-[13px] bg-accent text-bg-primary rounded-lg hover:opacity-90"
              >
                Usar
              </button>
              <button
                type="button"
                onClick={() => dismiss(spec.type)}
                className="px-4 py-1.5 text-[13px] bg-bg-primary border-[0.5px] border-border text-text-secondary rounded-lg hover:text-text-primary"
              >
                Ocultar
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Cuestionarios generales de RTS ──────────────────────────────────────────
// Recursos que ya existen en Reason y aplican de forma transversal a los
// protocolos de retorno al deporte: LEFS (función de miembro inferior) y Tampa
// (kinesiofobia / disposición psicológica). Son referenciales y autocargables;
// no imponen un corte de decisión, igual que SPADI en hombro.

// Banda interpretativa de LEFS (0–80, mayor = mejor).
function lefsBand(v: number): { label: string; cls: string } {
  if (v >= 60) return { label: 'Limitación leve', cls: 'text-[#4ade80]' }
  if (v >= 40) return { label: 'Limitación moderada', cls: 'text-[#fb923c]' }
  return { label: 'Limitación severa', cls: 'text-red-400' }
}

// Banda interpretativa de Tampa/TSK (17–68, ≥37 = kinesiofobia elevada).
function tampaBand(v: number): { label: string; cls: string } {
  return v >= 37
    ? { label: 'Kinesiofobia elevada', cls: 'text-red-400' }
    : { label: 'Sin kinesiofobia clínicamente relevante', cls: 'text-[#4ade80]' }
}

export function GeneralQuestionnaires({
  latest,
  includeLefs,
  values,
  set,
}: {
  latest?: LatestQuestionnaires
  includeLefs: boolean
  values: { lefs_score: string; tampa_score: string }
  set: (formKey: string, value: string) => void
}) {
  const specs: AutofillSpec[] = []
  if (includeLefs) specs.push({ type: 'lefs', label: 'LEFS', formKey: 'lefs_score' })
  specs.push({ type: 'tampa', label: 'Tampa (kinesiofobia)', formKey: 'tampa_score' })

  const lefsVal = n(values.lefs_score)
  const tampaVal = n(values.tampa_score)

  return (
    <div>
      <SectionTitle>Cuestionarios generales</SectionTitle>
      {latest && <QuestionnaireAutofill available={latest} specs={specs} onApply={set} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {includeLefs && (
          <div>
            <Field label="LEFS (0–80, función miembro inferior)">
              <NumInput value={values.lefs_score} onChange={v => set('lefs_score', v)} min="0" max="80" placeholder="ej: 62" />
            </Field>
            {lefsVal !== null && (
              <div className={`mt-1 text-[12px] font-medium ${lefsBand(lefsVal).cls}`}>{lefsBand(lefsVal).label}</div>
            )}
          </div>
        )}
        <div>
          <Field label="Tampa / TSK (17–68, kinesiofobia)">
            <NumInput value={values.tampa_score} onChange={v => set('tampa_score', v)} min="17" max="68" placeholder="ej: 30" />
          </Field>
          {tampaVal !== null && (
            <div className={`mt-1 text-[12px] font-medium ${tampaBand(tampaVal).cls}`}>{tampaBand(tampaVal).label}</div>
          )}
        </div>
      </div>
      <p className="text-[12px] text-text-secondary mt-2">
        LEFS mayor = mejor · Tampa ≥37 = kinesiofobia elevada. Referenciales y autocargables desde Recursos.
      </p>
    </div>
  )
}
