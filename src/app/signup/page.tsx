import Link from 'next/link'
import { signup } from '../auth/actions'

export default function SignupPage({
  searchParams,
}: {
  searchParams: { message?: string; returnUrl?: string }
}) {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col justify-center items-center p-4">
      <Link href="/" className="absolute top-8 left-8 text-[18px] font-medium tracking-[-0.01em] no-underline text-text-primary">
        reason<span className="text-accent">.</span>
      </Link>
      
      <div className="w-full max-w-[400px]">
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2 text-center">
          Crear cuenta
        </h1>
        <p className="text-[16px] text-text-secondary text-center mb-8">
          Empezá a decidir mejor desde el lunes
        </p>

        <form className="flex flex-col gap-5" action={signup}>
          {searchParams?.returnUrl && (
            <input type="hidden" name="returnUrl" value={searchParams.returnUrl} />
          )}
          {searchParams?.message && (
            <div className="p-4 bg-bg-secondary text-warning text-[14px] rounded-lg border-[0.5px] border-warning text-center">
              {searchParams.message}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]" htmlFor="fullName">
              Nombre completo
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Ej: Kevin Colman"
              required
              className="w-full p-4 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[15px] focus:outline-none focus:border-accent transition-colors"
            />
          </div>

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
              className="w-full p-4 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[15px] focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              className="w-full p-4 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[15px] focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 mt-2 bg-accent text-bg-primary rounded-lg text-[15px] font-medium hover:opacity-90 transition-opacity"
          >
            Crear cuenta y suscribirme
          </button>
        </form>

        <div className="text-center mt-8 text-[14px] text-text-secondary">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-text-primary font-medium hover:text-accent transition-colors">
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
