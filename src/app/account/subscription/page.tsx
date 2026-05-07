import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cancelSubscription } from './actions'
import Header from '@/components/Header'

export default async function SubscriptionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch subscription from database (placeholder since we don't have subscriptions yet)
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Valores por defecto si no hay suscripción
  const status = subscription?.status || 'free'
  const planName = subscription?.mp_plan_id === 'annual' ? 'Anual' : 'Mensual'
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />

      <main className="flex-grow w-full max-w-[720px] mx-auto px-8 py-12">
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-8">
          Suscripción a Reason
        </h1>

        <div className="bg-bg-secondary rounded-xl border-[0.5px] border-border overflow-hidden mb-8">
          <div className="p-8 border-b-[0.5px] border-border">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[11px] text-text-secondary uppercase tracking-[0.05em] mb-1">Estado de tu cuenta</div>
                <div className="text-[20px] font-medium flex items-center gap-2">
                  {status === 'active' && <span className="w-2 h-2 rounded-full bg-[#2E7D32]"></span>}
                  {status === 'pending' && <span className="w-2 h-2 rounded-full bg-warning"></span>}
                  {status === 'cancelled' && <span className="w-2 h-2 rounded-full bg-text-secondary"></span>}
                  {status === 'free' && <span className="w-2 h-2 rounded-full bg-text-secondary"></span>}
                  <span className="capitalize">{status === 'free' ? 'Plan Gratuito' : status}</span>
                </div>
              </div>
              
              {status === 'active' && (
                <div className="text-right">
                  <div className="text-[11px] text-text-secondary uppercase tracking-[0.05em] mb-1">Plan contratado</div>
                  <div className="text-[15px] font-medium">{planName}</div>
                </div>
              )}
            </div>

            {status === 'active' && subscription?.expires_at && (
              <div className="bg-bg-primary border-[0.5px] border-border rounded-lg p-4 mb-2">
                <div className="flex justify-between items-center">
                  <span className="text-[14px] text-text-secondary">Próxima fecha de cobro / vencimiento:</span>
                  <span className="text-[14px] font-medium">{formatDate(subscription.expires_at)}</span>
                </div>
              </div>
            )}

            {status === 'cancelled' && subscription?.expires_at && (
              <div className="bg-bg-primary border-[0.5px] border-border rounded-lg p-4 mb-2">
                <div className="flex justify-between items-center">
                  <span className="text-[14px] text-warning">Acceso válido hasta:</span>
                  <span className="text-[14px] font-medium">{formatDate(subscription.expires_at)}</span>
                </div>
              </div>
            )}
            
            {status === 'free' && (
              <p className="text-[14px] text-text-secondary mb-6 mt-4">
                Actualmente no tenés ninguna suscripción activa. Suscribite para acceder a todo el contenido de Reason.
              </p>
            )}
          </div>
          
          <div className="p-8 bg-bg-primary flex justify-end gap-4">
            {status === 'active' && (
              <form action={async () => {
                'use server'
                await cancelSubscription()
              }}>
                <button 
                  type="submit" 
                  className="text-[13px] text-text-secondary hover:text-warning transition-colors bg-transparent border-none cursor-pointer"
                >
                  Cancelar suscripción
                </button>
              </form>
            )}
            
            {(status === 'free' || status === 'expired' || status === 'cancelled') && (
              <Link 
                href="/checkout?plan=monthly"
                className="bg-accent text-bg-primary px-5 py-[10px] rounded-lg text-[13px] font-medium no-underline hover:opacity-90 transition-opacity border-none cursor-pointer"
              >
                Suscribirme a Reason
              </Link>
            )}
          </div>
        </div>
        
        <p className="text-[13px] text-text-tertiary">
          Si tenés problemas con tu pago o suscripción, contactá a soporte.
        </p>
      </main>
    </div>
  )
}
