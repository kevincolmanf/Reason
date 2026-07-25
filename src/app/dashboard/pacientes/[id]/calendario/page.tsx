import { redirect } from 'next/navigation'

// El Calendario del paciente se unificó dentro del Editor de Planes / Calendario.
// Esta ruta redirige ahí, por si quedó algún link o favorito viejo.
export default function CalendarioPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/ejercicios/plan?paciente=${params.id}`)
}
