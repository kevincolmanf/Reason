import Link from 'next/link'
import { updatePassword } from '@/app/auth/actions'

export default function UpdatePasswordPage({
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
          Nueva contraseña
        </h1>
        <p className="text-[16px] text-text-secondary text-center mb-8">
          Elegí una contraseña segura para tu cuenta
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
            Guardar nueva contraseña
          </button>
        </form>
      </div>
    </div>
  )
}
