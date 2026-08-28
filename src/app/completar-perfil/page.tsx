import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { completarPerfil } from '../auth/actions'

export const metadata = { title: 'Completá tu perfil | Reason' }

export default async function CompletarPerfilPage({
  searchParams,
}: {
  searchParams: { next?: string; message?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const next = searchParams?.next && searchParams.next.startsWith('/') ? searchParams.next : '/dashboard'
  // Sugerencia: lo que haya traído Google (puede ser un apodo). El usuario lo confirma o corrige.
  const suggested =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    ''

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col justify-center items-center p-4">
      <Link href="/dashboard" className="absolute top-8 left-8 text-[18px] font-medium tracking-[-0.01em] no-underline text-text-primary">
        reason<span className="text-accent">.</span>
      </Link>

      <div className="w-full max-w-[400px]">
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2 text-center">
          ¿Cómo te llamás?
        </h1>
        <p className="text-[16px] text-text-secondary text-center mb-8">
          Usamos tu nombre para identificarte en la plataforma y con tu equipo.
        </p>

        {searchParams?.message && (
          <div className="p-4 mb-5 bg-bg-secondary text-warning text-[14px] rounded-lg border-[0.5px] border-warning text-center">
            {searchParams.message}
          </div>
        )}

        <form className="flex flex-col gap-5" action={completarPerfil}>
          <input type="hidden" name="next" value={next} />

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]" htmlFor="fullName">
              Nombre y apellido
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              defaultValue={suggested}
              placeholder="Ej: Hernán Álvarez"
              required
              autoFocus
              autoComplete="name"
              className="w-full p-4 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[15px] focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 mt-2 bg-accent text-bg-primary rounded-lg text-[15px] font-medium hover:opacity-90 transition-opacity"
          >
            Continuar
          </button>
        </form>
      </div>
    </div>
  )
}
