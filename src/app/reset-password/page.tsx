import Link from 'next/link'
import { cookies } from 'next/headers'
import { resetPasswordWithCode } from '../auth/actions'

// Pantalla pública donde el usuario ingresa el CÓDIGO de 6 dígitos que le llegó
// por mail y define su contraseña nueva. Reemplaza al viejo flujo por link (que
// los escáneres de correo consumían y llegaba "vencido").
export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { message?: string; sent?: string }
}) {
  const emailFromCookie = cookies().get('pw_reset_email')?.value ?? ''
  const justSent = searchParams?.sent === '1'

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col justify-center items-center p-4">
      <Link href="/" className="absolute top-8 left-8 text-[18px] font-medium tracking-[-0.01em] no-underline text-text-primary">
        reason<span className="text-accent">.</span>
      </Link>

      <div className="w-full max-w-[400px]">
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2 text-center">
          Ingresá el código
        </h1>
        <p className="text-[16px] text-text-secondary text-center mb-8">
          Te enviamos un código de 6 dígitos por mail. Escribilo acá y elegí tu contraseña nueva.
        </p>

        <form className="flex flex-col gap-5" action={resetPasswordWithCode}>
          {justSent && !searchParams?.message && (
            <div className="p-4 bg-accent/10 text-accent text-[14px] rounded-lg border-[0.5px] border-accent text-center">
              Si el email está registrado, te enviamos el código. Revisá también el spam.
            </div>
          )}
          {searchParams?.message && (
            <div className="p-4 bg-warning/10 text-warning text-[14px] rounded-lg border-[0.5px] border-warning text-center">
              {searchParams.message}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={emailFromCookie}
              placeholder="tu@email.com"
              required
              autoComplete="username"
              className="w-full p-4 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[15px] focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]" htmlFor="code">
              Código de 6 dígitos
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              required
              autoComplete="one-time-code"
              className="w-full p-4 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[20px] tracking-[0.4em] text-center font-medium focus:outline-none focus:border-accent transition-colors"
            />
          </div>

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
            Guardar contraseña
          </button>
        </form>

        <div className="text-center mt-8 text-[14px] text-text-secondary">
          ¿No te llegó?{' '}
          <Link href="/forgot-password" className="text-text-primary font-medium hover:text-accent transition-colors">
            Pedir un código nuevo
          </Link>
        </div>
      </div>
    </div>
  )
}
