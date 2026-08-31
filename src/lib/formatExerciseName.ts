// Presentación de los nombres de ejercicio: SIEMPRE en MAYÚSCULA, para que sean
// consistentes tanto al buscarlos como al ponerlos en un plan (los nombres se
// cargaron con mayúsculas/minúsculas mezcladas). Respeta acentos ("es").
export function formatExerciseName(name: string | null | undefined): string {
  const s = (name ?? '').trim()
  if (!s) return ''
  return s.toLocaleUpperCase('es')
}
