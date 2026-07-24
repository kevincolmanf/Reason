import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { updatePassword } from '../auth/actions'

// Pantalla pública (fuera de /account, así el middleware no la protege) donde el
// usuario define su contraseña nueva tras el link de recuperación. Verifica que
// exista la sesión de recuperación; si no, muestra un estado claro para pedir
// otro link en vez de rebotar al login.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { message?: string; expired?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col justify-center items-center p-4">
      <Link href="/" className="absolute top-8 left-8 text-[18px] font-medium tracking-[-0.01em] no-underline text-text-primary">
        reason<span className="text-accent">.</span>
      </Link>

      <div className="w-full max-w-[400px]">
        {!user ? (
          <>
            <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2 text-center">
              Link vencido
            </h1>
            <p className="text-[16px] text-text-secondary text-center mb-8">
              {searchParams?.message || 'El link para recuperar la contraseña venció o ya se usó. Pedí uno nuevo para continuar.'}
            </p>
            <Link
              href="/forgot-password"
              className="block w-full py-4 bg-accent text-bg-primary rounded-lg text-[15px] font-medium hover:opacity-90 transition-opacity text-center no-underline"
            >
              Pedir un link nuevo
            </Link>
            <div className="text-center mt-8 text-[14px] text-text-secondary">
              <Link href="/login" className="text-text-primary font-medium hover:text-accent transition-colors">
                Volver a Iniciar sesión
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2 text-center">
              Nueva contraseña
            </h1>
            <p className="text-[16px] text-text-secondary text-center mb-8">
              Elegí una contraseña segura. Después vas a ingresar con ella.
            </p>

            <form className="flex flex-col gap-5" action={updatePassword}>
              {searchParams?.message && (
                <div className="p-4 bg-bg-secondary text-warning text-[14px] rounded-lg border-[0.5px] border-warning text-center">
                  {searchParams.message}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]" htmlFor="password">
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full p-4 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[15px] focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]" htmlFor="confirm">
                  Repetir contraseña
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  placeholder="Repetí la contraseña"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full p-4 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[15px] focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 mt-2 bg-accent text-bg-primary rounded-lg text-[15px] font-medium hover:opacity-90 transition-opacity"
              >
                Guardar y continuar
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
