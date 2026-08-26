import { redirect } from 'next/navigation'

// La ficha ahora vive dentro de cada paciente (/dashboard/pacientes/[id]/ficha).
// Esta ruta antigua (ficha local que no guardaba nada) quedó obsoleta; la
// redirigimos para no tener "dos fichas" ni mensajería contradictoria sobre
// almacenamiento de datos. Se conserva la ruta por si hay enlaces viejos.
export default function FichaRedirectPage() {
  redirect('/dashboard/pacientes')
}
