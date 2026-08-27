// Normaliza la presentación de los nombres de ejercicio, que se cargaron con
// mayúsculas/minúsculas inconsistentes (algunos TODO EN MAYÚSCULA, otros
// empezando en minúscula). Heurística conservadora para no romper siglas:
//
//  - Si el nombre está TODO en mayúsculas → "sentence case"
//    ("FLEXOEXTENSIÓN DE CODO" → "Flexoextensión de codo").
//  - Si tiene minúsculas pero empieza en minúscula → solo capitaliza la
//    primera letra, el resto queda igual ("remo serrucho" → "Remo serrucho").
//  - Si ya viene en mayúscula/minúscula mezclada → se deja tal cual, para
//    preservar siglas y nombres propios ("Push Up [ECC Only]" queda igual).
export function formatExerciseName(name: string | null | undefined): string {
  const s = (name ?? '').trim()
  if (!s) return ''

  const hasLower = /[a-záéíóúñü]/.test(s)
  if (!hasLower) {
    // Todo en mayúsculas: pasar a minúsculas y capitalizar la primera letra.
    const lower = s.toLocaleLowerCase('es')
    return lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1)
  }

  // Tiene minúsculas: solo aseguramos que arranque en mayúscula.
  return s.charAt(0).toLocaleUpperCase('es') + s.slice(1)
}
