import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import HeaderClient from './HeaderClient'

export default async function Header() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let contextLabel = 'Mi espacio'

  if (user) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organizations(name)')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    type MemberRow = { organizations: { name: string } | null }
    const orgName = (membership as unknown as MemberRow)?.organizations?.name
    if (orgName) contextLabel = orgName
  }

  return (
    <header className="py-6 border-b-[0.5px] border-border sticky top-0 bg-bg-primary/80 backdrop-blur-md z-10">
      <div className="w-full max-w-[1080px] mx-auto px-4 sm:px-8 flex justify-between items-center">
        <Link href="/dashboard" className="text-[20px] font-medium tracking-[-0.01em] no-underline text-text-primary">
          reason<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link href="/library" className="hidden sm:inline text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Biblioteca
          </Link>
          <Link href="/recursos" className="hidden sm:inline text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Recursos
          </Link>
          <Link href="/dashboard/ejercicios" className="text-[13px] sm:text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Ejercicios
          </Link>
          <Link href="/dashboard/pacientes" className="text-[13px] sm:text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Pacientes
          </Link>
          <Link href="/dashboard/agenda" className="hidden sm:inline text-[13px] sm:text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Agenda
          </Link>
          
          {user && (
            <span className="hidden sm:inline text-[11px] text-text-secondary bg-bg-secondary border-[0.5px] border-border rounded-md px-2 py-1 max-w-[140px] truncate">
              {contextLabel}
            </span>
          )}

          {user ? (
            <HeaderClient userMetadata={user.user_metadata} />
          ) : (
            <Link href="/login" className="text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
              Iniciar sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
