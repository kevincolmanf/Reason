import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSubscriptionPreference } from './actions'

type PlanType = 'monthly' | 'annual' | 'pro_monthly' | 'pro_annual'

const PLAN_META: Record<PlanType, { name: string; price: string; interval: string; features: string[] }> = {
  monthly: {
    name: 'Plan Mensual',
    price: '$18.000',
    interval: 'por mes',
    features: [
      'Hasta 20 pacientes',
      'Acceso ilimitado a todos los módulos',
      'Renovación automática',
      'Cancelá en cualquier momento',
    ],
  },
  annual: {
    name: 'Plan Anual',
    price: '$150.000',
    interval: 'por año',
    features: [
      'Hasta 20 pacientes',
      'Acceso ilimitado a todos los módulos',
      'Ahorrás $66.000 vs el plan mensual',
      'Cancelá en cualquier momento',
    ],
  },
  pro_monthly: {
    name: 'Plan Pro — Mensual',
    price: '$150.000',
    interval: 'por mes',
    features: [
      'Pacientes ilimitados',
      'Acceso ilimitado a todos los módulos',
      'Comunicación interdisciplinar',
      'Renovación automática',
      'Cancelá en cualquier momento',
    ],
  },
  pro_annual: {
    name: 'Plan Pro — Anual',
    price: '$1.350.000',
    interval: 'por año',
    features: [
      'Pacientes ilimitados',
      'Acceso ilimitado a todos los módulos',
      'Comunicación interdisciplinar',
      'Ahorrás $450.000 vs el plan Pro mensual',
      'Cancelá en cualquier momento',
    ],
  },
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { plan?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/signup?returnUrl=${encodeURIComponent(`/checkout?plan=${searchParams.plan || 'monthly'}`)}`)
  }

  const rawPlan = searchParams.plan || 'monthly'
  const plan: PlanType = (rawPlan in PLAN_META) ? rawPlan as PlanType : 'monthly'
  const meta = PLAN_META[plan]

  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col">
      <header className="py-6 bg-bg-primary border-b-[0.5px] border-border">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <Link href="/dashboard" className="text-[20px] font-medium tracking-[-0.01em] no-underline text-text-primary">
            reason<span className="text-accent">.</span> <span className="text-text-tertiary font-mono text-[11px] ml-2 uppercase">Checkout</span>
          </Link>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[480px] mx-auto px-8 py-16 flex flex-col justify-center">
        <div className="bg-bg-primary rounded-2xl border-[0.5px] border-border overflow-hidden shadow-sm">

          <div className="p-8 border-b-[0.5px] border-border text-center">
            <h1 className="text-[24px] font-medium tracking-[-0.01em] mb-2">Completar suscripción</h1>
            <p className="text-[14px] text-text-secondary">Estás a un paso de acceder a toda la biblioteca clínica.</p>
          </div>

          <div className="p-8 bg-bg-secondary">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[15px] font-medium text-text-primary">{meta.name}</span>
              <div className="text-right">
                <span className="text-[18px] font-medium block text-text-primary">{meta.price}</span>
                <span className="text-[12px] text-text-tertiary">{meta.interval}</span>
              </div>
            </div>

            <ul className="list-none text-[13px] text-text-secondary mb-8 space-y-2 mt-6">
              {meta.features.map(f => (
                <li key={f} className="flex items-center gap-2">✓ {f}</li>
              ))}
            </ul>

            <form action={createSubscriptionPreference}>
              <input type="hidden" name="planType" value={plan} />
              <button
                type="submit"
                className="w-full bg-[#009EE3] text-white py-[14px] rounded-lg text-[15px] font-medium no-underline hover:opacity-90 transition-opacity flex justify-center items-center gap-2 border-none cursor-pointer"
              >
                Pagar con Mercado Pago
              </button>
            </form>

            <p className="text-[11px] text-text-tertiary text-center mt-6">
              Serás redirigido a la plataforma segura de Mercado Pago para completar tu transacción.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
