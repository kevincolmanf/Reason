import { redirect } from 'next/navigation'

// "Ejercicios" va directo a la biblioteca (ver y agregar ejercicios). Antes esta
// pantalla era un hub con dos tarjetas, pero una ("Pacientes") duplicaba el link
// del nav y el hub en sí no se usaba. La biblioteca ya cubre ver + agregar.
export default function EjerciciosPage() {
  redirect('/dashboard/ejercicios/biblioteca')
}
