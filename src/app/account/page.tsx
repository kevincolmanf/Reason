import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'

export default async function AccountPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const joinDate = new Date(user.created_at).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />

      <main className="flex-grow w-full max-w-[720px] mx-auto px-8 py-12">
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-8">
          Mi Perfil
        </h1>

        <div className="bg-bg-secondary rounded-xl border-[0.5px] border-border overflow-hidden mb-8">
          <div className="p-8 border-b-[0.5px] border-border">
            <h2 className="text-[18px] font-medium mb-6">Datos personales</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="text-[11px] text-text-secondary uppercase tracking-[0.05em] mb-1">Nombre completo</div>
                <div className="text-[15px] font-medium">{userData?.full_name || 'No especificado'}</div>
              </div>
              <div>
                <div className="text-[11px] text-text-secondary uppercase tracking-[0.05em] mb-1">Correo electrónico</div>
                <div className="text-[15px] font-medium">{userData?.email}</div>
              </div>
              <div>
                <div className="text-[11px] text-text-secondary uppercase tracking-[0.05em] mb-1">Miembro desde</div>
                <div className="text-[15px] font-medium">{joinDate}</div>
              </div>
              <div>
                <div className="text-[11px] text-text-secondary uppercase tracking-[0.05em] mb-1">Rol actual</div>
                <div className="text-[15px] font-medium capitalize">{userData?.role}</div>
              </div>
            </div>
            
            <div className="mt-8">
              <button className="text-[14px] text-accent hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer">
                Editar perfil
              </button>
            </div>
          </div>
          
          <div className="p-8 bg-bg-primary flex justify-between items-center">
            <div>
              <h2 className="text-[16px] font-medium mb-1">Suscripción a Reason</h2>
              <p className="text-[13px] text-text-secondary">Gestioná tu plan y métodos de pago</p>
            </div>
            <Link 
              href="/account/subscription" 
              className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium no-underline hover:opacity-90 transition-opacity"
            >
              Ver suscripción
            </Link>
          </div>
        </div>

        <form action="/auth/signout" method="post">
          <button className="text-[14px] text-warning hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer">
            Cerrar sesión en todos los dispositivos
          </button>
        </form>
      </main>
    </div>
  )
}
