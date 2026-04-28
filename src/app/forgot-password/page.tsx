import Link from 'next/link'
import { resetPassword } from '../auth/actions'

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col justify-center items-center p-4">
      <Link href="/" className="absolute top-8 left-8 text-[18px] font-medium tracking-[-0.01em] no-underline text-text-primary">
        reason<span className="text-accent">.</span>
      </Link>
      
      <div className="w-full max-w-[400px]">
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2 text-center">
          Recuperar contraseña
        </h1>
        <p className="text-[16px] text-text-secondary text-center mb-8">
          Te enviaremos un link para crear una nueva
        </p>

        <form className="flex flex-col gap-5" action={resetPassword}>
          {searchParams?.message && (
            <div className="p-4 bg-bg-secondary text-text-primary text-[14px] rounded-lg border-[0.5px] border-border-strong text-center">
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
              placeholder="tu@email.com"
              required
              className="w-full p-4 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[15px] focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 mt-2 bg-accent text-bg-primary rounded-lg text-[15px] font-medium hover:opacity-90 transition-opacity"
          >
            Enviar link de recuperación
          </button>
        </form>

        <div className="text-center mt-8 text-[14px] text-text-secondary">
          <Link href="/login" className="text-text-primary font-medium hover:text-accent transition-colors">
            Volver a Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
