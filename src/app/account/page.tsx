import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import ProfileEditor from './ProfileEditor'

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

  // Las métricas del centro son solo del dueño real de una organización (o admin).
  // No alcanza con role === 'pro': un integrante mal promovido lo tendría.
  const { data: ownedOrgs } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
  const canSeeMetrics = userData?.role === 'admin' || (ownedOrgs?.length ?? 0) > 0

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
            <ProfileEditor
              fullName={userData?.full_name || ''}
              email={userData?.email || user.email || ''}
              joinDate={joinDate}
              role={userData?.role || ''}
            />
          </div>
          
          <div className="p-8 bg-bg-primary flex justify-between items-center border-b-[0.5px] border-border">
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

          {(userData?.role === 'pro' || userData?.role === 'admin') && (
            <div className="p-8 bg-bg-primary flex justify-between items-center border-b-[0.5px] border-border">
              <div>
                <h2 className="text-[16px] font-medium mb-1">Mi Equipo</h2>
                <p className="text-[13px] text-text-secondary">Administrá los integrantes de tu centro</p>
              </div>
              <Link
                href="/account/equipo"
                className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium no-underline hover:opacity-90 transition-opacity"
              >
                Ver equipo
              </Link>
            </div>
          )}
          {canSeeMetrics && (
            <div className="p-8 bg-bg-primary flex justify-between items-center">
              <div>
                <h2 className="text-[16px] font-medium mb-1">Panel de gestión</h2>
                <p className="text-[13px] text-text-secondary">CRM de pacientes, analítica y métricas del centro</p>
              </div>
              <Link
                href="/account/crm"
                className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium no-underline hover:opacity-90 transition-opacity"
              >
                Ver panel
              </Link>
            </div>
          )}
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
