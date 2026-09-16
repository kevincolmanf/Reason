// Destinos del "Volver" cuando una página se alcanza desde varios lugares (la
// ficha del paciente, sobre todo). En vez de un destino fijo que te tira a una
// "home", el link de origen pasa ?from=<clave> y la página resuelve a dónde y con
// qué etiqueta volver. Se usan claves cortas (no rutas completas) para no abrir
// un redirect a cualquier URL y para mantener las etiquetas prolijas.

export type BackTarget = { href: string; label: string }

const TARGETS: Record<string, BackTarget> = {
  agenda:        { href: '/dashboard/agenda',               label: 'la agenda' },
  atencion:      { href: '/dashboard/agenda/atencion',      label: 'Atención de hoy' },
  seguimiento:   { href: '/dashboard/agenda/seguimiento',   label: 'Seguimiento' },
  recordatorios: { href: '/dashboard/agenda/recordatorios', label: 'Recordatorios' },
  dashboard:     { href: '/dashboard',                      label: 'el inicio' },
  pacientes:     { href: '/dashboard/pacientes',            label: 'Mis Pacientes' },
}

// Resuelve el destino de vuelta a partir del ?from. Si no viene o es desconocido,
// devuelve el fallback (el comportamiento de antes: sin regresión).
export function resolveBack(from: string | string[] | undefined, fallback: BackTarget): BackTarget {
  const key = Array.isArray(from) ? from[0] : from
  return (key && TARGETS[key]) || fallback
}
