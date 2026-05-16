import Link from 'next/link'

const FEATURES_INDIVIDUAL = [
  'Hasta 20 pacientes activos',
  'Constructor de planes con 1800+ ejercicios en video',
  'Monitoreo de carga sesión a sesión',
  'Protocolo RTS integrado al historial del paciente',
  'Ficha kinésica digital exportable a PDF',
  'Calendario de sesiones por paciente',
  'Cuestionarios validados (NDI, DASH, Oswestry y más)',
  'Biblioteca clínica completa',
]

const FEATURES_PRO_BASE = [
  'Todo lo del plan individual incluido',
  'Pacientes ilimitados con historial permanente',
]

const FEATURES_PRO_AGENDA = [
  'Agenda de turnos integrada',
  'Recordatorios por WhatsApp con un click',
  'Vista semanal de agenda por profesional',
]

const FEATURES_PRO_TEAM = [
  'Pacientes y planes compartidos entre profesionales',
  'Historial permanente del equipo',
  'Control de acceso por profesional',
]

export default function PaywallPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="py-6 border-b-[0.5px] border-border">
        <div className="w-full max-w-[1080px] mx-auto px-8 flex justify-between items-center">
          <Link href="/dashboard" className="text-[20px] font-medium tracking-[-0.01em] no-underline text-text-primary">
            reason<span className="text-accent">.</span>
          </Link>
          <Link href="/dashboard" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline">
            ← Volver al dashboard
          </Link>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-[36px] font-medium tracking-[-0.02em] mb-3">
            Elegí tu plan
          </h1>
          <p className="text-[17px] text-text-secondary max-w-[560px] mx-auto leading-[1.5]">
            Acceso completo a todas las herramientas clínicas. El Plan Pro agrega equipo y historial ilimitado — nunca perdés datos de un paciente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

          {/* MENSUAL */}
          <div className="bg-bg-primary border-[0.5px] border-border rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-[12px] uppercase tracking-[0.08em] text-text-secondary mb-3">Mensual</p>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-[42px] font-medium tracking-[-0.02em] leading-none">$18.000</span>
                <span className="text-[14px] text-text-secondary mb-1">/ mes</span>
              </div>
              <p className="text-[13px] text-text-secondary">Renovación automática mensual</p>
            </div>

            <Link
              href="/checkout?plan=monthly"
              className="block w-full text-center bg-bg-secondary border-[0.5px] border-border text-text-primary py-3 rounded-xl text-[14px] font-medium no-underline hover:border-accent hover:text-accent transition-colors mb-8"
            >
              Suscribirme
            </Link>

            <ul className="space-y-3 flex-grow">
              {FEATURES_INDIVIDUAL.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-[13px] text-text-secondary">
                  <span className="text-accent mt-0.5 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* ANUAL */}
          <div className="bg-accent/5 border-[0.5px] border-accent/40 rounded-2xl p-8 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-accent text-bg-primary text-[11px] font-medium px-3 py-1 rounded-full uppercase tracking-[0.05em]">
                Mejor valor
              </span>
            </div>

            <div className="mb-6">
              <p className="text-[12px] uppercase tracking-[0.08em] text-text-secondary mb-3">Anual</p>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-[42px] font-medium tracking-[-0.02em] leading-none">$150.000</span>
                <span className="text-[14px] text-text-secondary mb-1">/ año</span>
              </div>
              <p className="text-[13px] text-accent font-medium">Ahorrás $66.000 vs el plan mensual</p>
            </div>

            <Link
              href="/checkout?plan=annual"
              className="block w-full text-center bg-accent text-bg-primary py-3 rounded-xl text-[14px] font-medium no-underline hover:opacity-90 transition-opacity mb-8"
            >
              Suscribirme
            </Link>

            <ul className="space-y-3 flex-grow">
              {FEATURES_INDIVIDUAL.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-[13px] text-text-secondary">
                  <span className="text-accent mt-0.5 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* PRO */}
          <div className="bg-bg-primary border-[0.5px] border-border rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-[12px] uppercase tracking-[0.08em] text-text-secondary mb-3">Pro · Equipos y Centros</p>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-[42px] font-medium tracking-[-0.02em] leading-none">$150.000</span>
                <span className="text-[14px] text-text-secondary mb-1">/ mes</span>
              </div>
              <p className="text-[13px] text-text-secondary">Usuarios ilimitados · $1.350.000 / año</p>
            </div>

            <div className="flex flex-col gap-2 mb-8">
              <Link
                href="/checkout?plan=pro_monthly"
                className="block w-full text-center bg-bg-secondary border-[0.5px] border-border text-text-primary py-3 rounded-xl text-[14px] font-medium no-underline hover:border-accent hover:text-accent transition-colors"
              >
                Suscribirme mensual
              </Link>
              <Link
                href="/checkout?plan=pro_annual"
                className="block w-full text-center bg-bg-secondary border-[0.5px] border-border text-text-primary py-2.5 rounded-xl text-[13px] font-medium no-underline hover:border-accent hover:text-accent transition-colors"
              >
                Suscribirme anual · ahorrás 3 meses
              </Link>
            </div>

            <div className="flex-grow space-y-5">
              <ul className="space-y-3">
                {FEATURES_PRO_BASE.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px] text-text-secondary">
                    <span className="text-accent mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div>
                <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.04em] mb-2">Agenda</p>
                <ul className="space-y-3">
                  {FEATURES_PRO_AGENDA.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-text-secondary">
                      <span className="text-accent mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.04em] mb-2">Modo equipo</p>
                <ul className="space-y-3">
                  {FEATURES_PRO_TEAM.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-text-secondary">
                      <span className="text-accent mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

        </div>

        <p className="text-center text-[13px] text-text-secondary">
          Podés cancelar en cualquier momento desde tu cuenta. Sin permanencia.
        </p>
      </main>
    </div>
  )
}
