// Hitos del tratamiento del paciente (evaluación, RTP, alta, competencia, etc.).
// Config compartida entre la ficha del paciente y el calendario del plan.

export interface PatientEvent {
  id: string
  event_date: string
  type: string
  title: string | null
  note: string | null
}

export const EVENT_TYPES: { value: string; label: string; color: string }[] = [
  { value: 'evaluacion',   label: 'Evaluación',   color: '#2F6FB0' },
  { value: 'reevaluacion', label: 'Reevaluación', color: '#7A5AB8' },
  { value: 'rtp',          label: 'RTP',          color: '#C27B54' },
  { value: 'control',      label: 'Control',      color: '#A66A11' },
  { value: 'alta',         label: 'Alta',         color: '#1E9E74' },
  { value: 'objetivo',     label: 'Objetivo',     color: '#5B6B78' },
  { value: 'competencia',  label: 'Competencia',  color: '#B23A2E' },
  { value: 'otro',         label: 'Otro',         color: '#8A9691' },
]

export function eventMeta(type: string) {
  return EVENT_TYPES.find(e => e.value === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1]
}
