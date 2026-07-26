// Color por superserie. Todos los ejercicios de un mismo número (1, 1A, 1B…)
// comparten color, para distinguir de un vistazo qué va con qué.
// Compartido entre el editor del entrenador y el portal del paciente para que
// la diferenciación visual de bloques sea la misma en ambos lados.

export const GROUP_PALETTE = ['#2563EB', '#059669', '#D97706', '#7C3AED', '#DB2777', '#0891B2']

export function groupColor(group?: string): string | null {
  if (!group) return null
  const n = parseInt(group, 10)
  if (isNaN(n) || n < 1) return null
  return GROUP_PALETTE[(n - 1) % GROUP_PALETTE.length]
}
