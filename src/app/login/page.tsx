import Link from 'next/link'
import { cookies } from 'next/headers'
import { login, sendLoginCode, verifyLoginCode } from '../auth/actions'
import PasswordField from './PasswordField'
import GoogleButton from '@/components/GoogleButton'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message?: string; returnUrl?: string; metodo?: string; sent?: string }
}) {
  const returnUrl = searchParams?.returnUrl
  const isCode = searchParams?.metodo === 'codigo'
  const codeSent = isCode && searchParams?.sent === '1'
  const codeEmail = codeSent ? cookies().get('login_code_email')?.value : undefined
  const qs = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col justify-center items-center p-4">
      <Link href="/" className="absolute top-8 left-8 text-[18px] font-medium tracking-[-0.01em] no-underline text-text-primary">
        reason<span className="text-accent">.</span>
      </Link>

      <div className="w-full max-w-[400px]">
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2 text-center">
          Iniciar sesión
        </h1>
        <p className="text-[16px] text-text-secondary text-center mb-8">
          {isCode
            ? (codeSent ? 'Revisá tu correo y pegá el código' : 'Te enviamos un código, sin contraseña')
            : 'Ingresá a tu cuenta de Reason'}
        </p>

        {searchParams?.message && (
          <div className="p-4 mb-5 bg-bg-secondary text-warning text-[14px] rounded-lg border-[0.5px] border-warning text-center">
            {searchParams.message}
          </div>
        )}

        {isCode ? (
          /* ── Login por código de 6 dígitos ── */
          codeSent ? (
            <form className="flex flex-col gap-5" action={verifyLoginCode}>
              {returnUrl && <input type="hidden" name="returnUrl" value={returnUrl} />}
              <p className="text-[14px] text-text-secondary text-center -mt-2">
                Enviamos un código a{' '}
                <span className="text-text-primary font-medium">{codeEmail ?? 'tu email'}</span>.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]" htmlFor="code">
                  Código
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  required
                  autoFocus
                  className="w-full p-4 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[20px] tracking-[0.3em] text-center font-mono focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 mt-1 bg-accent text-bg-primary rounded-lg text-[15px] font-medium hover:opacity-90 transition-opacity"
              >
                Entrar
              </button>
              <Link href={`/login?metodo=codigo${qs}`} className="text-[13px] text-text-secondary hover:text-text-primary transition-colors text-center">
                No me llegó — enviar de nuevo
              </Link>
            </form>
          ) : (
            <form className="flex flex-col gap-5" action={sendLoginCode}>
              {returnUrl && <input type="hidden" name="returnUrl" value={returnUrl} />}
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full p-4 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[15px] focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 mt-1 bg-accent text-bg-primary rounded-lg text-[15px] font-medium hover:opacity-90 transition-opacity"
              >
                Enviarme el código
              </button>
            </form>
          )
        ) : (
          /* ── Login clásico: Google + contraseña ── */
          <>
            <GoogleButton returnUrl={returnUrl ?? null} />

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[12px] text-text-tertiary uppercase tracking-[0.05em]">o</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form className="flex flex-col gap-5" action={login}>
              {returnUrl && <input type="hidden" name="returnUrl" value={returnUrl} />}

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  required
                  autoComplete="username"
                  className="w-full p-4 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[15px] focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]" htmlFor="password">
                    Contraseña
                  </label>
                  <Link href="/forgot-password" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors">
                    ¿Te olvidaste?
                  </Link>
                </div>
                <PasswordField />
              </div>

              <button
                type="submit"
                className="w-full py-4 mt-2 bg-accent text-bg-primary rounded-lg text-[15px] font-medium hover:opacity-90 transition-opacity"
              >
                Entrar
              </button>
            </form>
          </>
        )}

        {/* Alternar entre métodos */}
        <div className="text-center mt-6 text-[14px]">
          {isCode ? (
            <Link href={returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login'} className="text-text-secondary hover:text-text-primary transition-colors">
              ← Entrar con contraseña o Google
            </Link>
          ) : (
            <Link href={`/login?metodo=codigo${qs}`} className="text-text-secondary hover:text-text-primary transition-colors">
              Prefiero un código por email
            </Link>
          )}
        </div>

        <div className="text-center mt-6 text-[14px] text-text-secondary">
          ¿No tenés cuenta?{' '}
          <Link href={returnUrl ? `/signup?returnUrl=${encodeURIComponent(returnUrl)}` : '/signup'} className="text-text-primary font-medium hover:text-accent transition-colors">
            Crear cuenta gratis
          </Link>
        </div>
      </div>
    </div>
  )
}
