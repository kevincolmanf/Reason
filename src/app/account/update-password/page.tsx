import { redirect } from 'next/navigation'

// Ruta vieja del flujo de recuperación. Se movió a /reset-password (pública, para
// que el middleware no rebote al usuario al login). Redirigimos para no romper
// los links de correos ya enviados.
export default function UpdatePasswordRedirect() {
  redirect('/reset-password')
}
