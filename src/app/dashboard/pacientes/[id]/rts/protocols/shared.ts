export const PROTOCOL_OPTIONS = [
  { value: 'lca',          label: 'LCA — Ligamento Cruzado Anterior' },
  { value: 'hamstring',    label: 'Isquiotibiales — Lesión muscular' },
  { value: 'ankle',        label: 'Tobillo — Esguince lateral' },
  { value: 'pfp',          label: 'Dolor femoropatelar / patelofemoral' },
  { value: 'tendinopathy', label: 'Tendinopatía (rotuliana / aquílea)' },
  { value: 'groin',        label: 'Inguinal — Dolor relacionado al deporte' },
  { value: 'shoulder',     label: 'Hombro overhead (luxación / manguito / inestabilidad)' },
]

export interface Criterion {
  label: string
  passed: boolean | null  // null = datos insuficientes
  detail?: string
}

export function lsi(affected: number | null | undefined, unaffected: number | null | undefined): number | null {
  if (affected == null || unaffected == null || unaffected === 0) return null
  return (affected / unaffected) * 100
}

export function timedLsi(affected: number | null | undefined, unaffected: number | null | undefined): number | null {
  if (affected == null || unaffected == null || affected === 0) return null
  return (unaffected / affected) * 100
}

export function n(v: string): number | null {
  const f = parseFloat(v)
  return isNaN(f) ? null : f
}

export function lsiColor(val: number | null): string {
  if (val === null) return 'text-text-secondary'
  if (val >= 90) return 'text-[#4ade80]'
  if (val >= 80) return 'text-[#fb923c]'
  return 'text-red-400'
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
