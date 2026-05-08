import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import HeaderClient from './HeaderClient'

export default async function Header() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="py-6 border-b-[0.5px] border-border sticky top-0 bg-bg-primary/80 backdrop-blur-md z-10">
      <div className="w-full max-w-[1080px] mx-auto px-8 flex justify-between items-center">
        <Link href="/dashboard" className="text-[20px] font-medium tracking-[-0.01em] no-underline text-text-primary">
          reason<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/library" className="text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Biblioteca
          </Link>
          <Link href="/recursos" className="text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Recursos
          </Link>
          <Link href="/ficha" className="text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Ficha Kinésica
          </Link>
          <Link href="/dashboard/ejercicios" className="text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Ejercicios
          </Link>
          <Link href="/dashboard/pacientes" className="text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            Pacientes
          </Link>
          
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
