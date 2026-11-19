import { redirect } from 'next/navigation'
import Image from 'next/image'
import LandingHero from '@/components/LandingHero'

export default function LandingPage({
  searchParams,
}: {
  searchParams: { code?: string; error?: string; error_description?: string; next?: string }
}) {
  // Red de seguridad OAuth: si el `redirectTo` (/auth/callback) no matchea la lista
  // de Redirect URLs de Supabase, éste cae al Site URL (la raíz) con el ?code=.
  // Sin esto el usuario vuelve a la landing sin loguearse. Reenviamos el código a
  // /auth/callback, que lo canjea por sesión (el code_verifier vive en este dominio).
  if (searchParams?.code) {
    const nextParam = searchParams.next && searchParams.next.startsWith('/') ? searchParams.next : '/dashboard'
    redirect(`/auth/callback?code=${encodeURIComponent(searchParams.code)}&next=${encodeURIComponent(nextParam)}`)
  }
  if (searchParams?.error) {
    redirect(`/login?message=${encodeURIComponent(searchParams.error_description || 'No pudimos completar el ingreso con Google. Probá de nuevo.')}`)
  }

  return (
    <>
      <header className="py-8 border-b-[0.5px] border-border">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="flex justify-between items-center">
            <div className="text-[18px] font-medium tracking-[-0.01em]">
              reason<span className="text-accent">.</span>
            </div>
            <a
              href="/login"
              className="text-[13px] text-text-primary no-underline py-2 px-4 border-[0.5px] border-border-strong rounded-lg"
            >
              Ingresar / Suscribirse
            </a>
          </div>
        </div>
      </header>

      {/* Hero con bifurcación de audiencia (solo vs. centro) + franja de highlights */}
      <LandingHero />

      {/* Problem / Solution */}
      <section className="py-[96px]">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="mb-16 max-w-[720px]">
            <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.15] mb-4">
              Demasiadas herramientas para gestionar una práctica.
            </h2>
            <p className="text-[18px] text-text-secondary leading-[1.5]">
              Turnos por WhatsApp, planillas de Excel, libretas de papel, PDFs enviados por correo. Reason reemplaza todo eso con una sola plataforma pensada desde adentro del consultorio.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="p-8 rounded-xl bg-bg-primary border-[0.5px] border-border">
              <div className="text-[11px] font-medium text-text-secondary tracking-[0.05em] uppercase mb-6">
                Sin Reason
              </div>
              <ul className="list-none">
                <li className="py-4 text-[15px] text-text-primary border-b-[0.5px] border-border">
                  Turnos perdidos y recordatorios manuales por WhatsApp
                </li>
                <li className="py-4 text-[15px] text-text-primary border-b-[0.5px] border-border">
                  Planes de ejercicio en PDF genéricos, sin seguimiento
                </li>
                <li className="py-4 text-[15px] text-text-primary border-b-[0.5px] border-border">
                  Fichas en papel o en planillas que nadie encuentra después
                </li>
                <li className="py-4 text-[15px] text-text-primary">
                  Carga y RTS calculados de memoria o sin protocolo
                </li>
              </ul>
            </div>
            <div className="p-8 rounded-xl bg-bg-secondary border-[0.5px] border-border">
              <div className="text-[11px] font-medium text-text-secondary tracking-[0.05em] uppercase mb-6">
                Con Reason
              </div>
              <ul className="list-none">
                <li className="py-4 text-[15px] text-text-primary border-b-[0.5px] border-border">
                  Agenda integrada con recordatorios por WhatsApp en un click
                </li>
                <li className="py-4 text-[15px] text-text-primary border-b-[0.5px] border-border">
                  Planes con 1800+ ejercicios en video y feedback en tiempo real
                </li>
                <li className="py-4 text-[15px] text-text-primary border-b-[0.5px] border-border">
                  Ficha kinésica digital, exportable a PDF con registro permanente
                </li>
                <li className="py-4 text-[15px] text-text-primary">
                  Monitoreo de carga y protocolos RTS integrados al historial del paciente
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="py-[96px] bg-bg-secondary" id="funcionalidades">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="mb-16 max-w-[720px]">
            <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.15] mb-4">
              Todo lo que necesitás, en un solo lugar.
            </h2>
            <p className="text-[18px] text-text-secondary leading-[1.5]">
              Cada herramienta está diseñada para el flujo de trabajo real del kinesiólogo. No son funcionalidades genéricas — son soluciones a problemas que aparecen todos los días en consultorio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Agenda */}
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8">
              <div className="h-[48px] mb-5 flex items-center justify-start text-accent">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <h3 className="text-[17px] font-medium mb-3 text-text-primary">Agenda de turnos</h3>
              <p className="text-[14px] text-text-secondary leading-[1.55]">
                Gestioná todos tus turnos desde una vista semanal. Enviá recordatorios por WhatsApp con un click, directo desde la agenda.
              </p>
            </div>

            {/* Planes de ejercicio */}
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8">
              <div className="h-[48px] mb-5 flex items-center justify-start text-accent">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h6"></path>
                  <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                </svg>
              </div>
              <h3 className="text-[17px] font-medium mb-3 text-text-primary">Planes de ejercicio</h3>
              <p className="text-[14px] text-text-secondary leading-[1.55]">
                Constructor con 1800+ ejercicios en video. Compartí un link con tu paciente para que siga el plan desde el teléfono, con feedback de RPE y EVA. Exportá a PDF con QR automático.
              </p>
            </div>

            {/* Monitoreo de carga */}
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8">
              <div className="h-[48px] mb-5 flex items-center justify-start text-accent">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <h3 className="text-[17px] font-medium mb-3 text-text-primary">Monitoreo de carga</h3>
              <p className="text-[14px] text-text-secondary leading-[1.55]">
                Registrá y visualizá la carga de entrenamiento sesión a sesión. Tomá decisiones de progresión con datos, no con intuición.
              </p>
            </div>

            {/* RTS */}
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8">
              <div className="h-[48px] mb-5 flex items-center justify-start text-accent">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <h3 className="text-[17px] font-medium mb-3 text-text-primary">Protocolo RTS</h3>
              <p className="text-[14px] text-text-secondary leading-[1.55]">
                Protocolos de retorno al deporte integrados al historial del paciente. Criterios claros, etapas definidas, sin improvisar la progresión.
              </p>
            </div>

            {/* Ficha */}
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8">
              <div className="h-[48px] mb-5 flex items-center justify-start text-accent">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                  <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                </svg>
              </div>
              <h3 className="text-[17px] font-medium mb-3 text-text-primary">Ficha kinésica digital</h3>
              <p className="text-[14px] text-text-secondary leading-[1.55]">
                Evaluá a tus pacientes con una ficha diseñada bajo razonamiento clínico. Historial permanente y exportable a PDF, con tus datos encriptados y seguros en la nube.
              </p>
            </div>

            {/* Calendario */}
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8">
              <div className="h-[48px] mb-5 flex items-center justify-start text-accent">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <circle cx="12" cy="16" r="1" fill="currentColor"></circle>
                </svg>
              </div>
              <h3 className="text-[17px] font-medium mb-3 text-text-primary">Calendario del paciente</h3>
              <p className="text-[14px] text-text-secondary leading-[1.55]">
                Planificá las sesiones de cada paciente con su plan asignado. Visualizá de un vistazo los turnos agendados y las sesiones programadas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modo equipo */}
      <section className="py-[96px] border-t-[0.5px] border-border" id="modo-equipo">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-[11px] font-medium text-accent tracking-[0.05em] uppercase mb-4">
                Plan Pro · Centros
              </div>
              <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.15] mb-4">
                Trabajá en equipo sin perder el hilo.
              </h2>
              <p className="text-[18px] text-text-secondary leading-[1.5] mb-8">
                Modo equipo para centros y consultorios interdisciplinarios. Agenda compartida, pacientes del equipo, historial permanente y control de acceso por profesional.
              </p>
              <ul className="list-none">
                <li className="py-4 border-b-[0.5px] border-border flex items-start gap-3">
                  <span className="text-accent mt-[2px]">→</span>
                  <span className="text-[15px] text-text-primary">Agenda propia para cada miembro del equipo</span>
                </li>
                <li className="py-4 border-b-[0.5px] border-border flex items-start gap-3">
                  <span className="text-accent mt-[2px]">→</span>
                  <span className="text-[15px] text-text-primary">Pacientes compartidos con historial integrado</span>
                </li>
                <li className="py-4 border-b-[0.5px] border-border flex items-start gap-3">
                  <span className="text-accent mt-[2px]">→</span>
                  <span className="text-[15px] text-text-primary">Planes de ejercicio accesibles por todo el equipo</span>
                </li>
                <li className="py-4 flex items-start gap-3">
                  <span className="text-accent mt-[2px]">→</span>
                  <span className="text-[15px] text-text-primary">Control de acceso granular por profesional</span>
                </li>
              </ul>
            </div>
            <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl p-10">
              <div className="text-[13px] text-text-secondary mb-6 font-medium">Modo equipo · Vista de agenda</div>
              <div className="space-y-3">
                {['Sebastián Ruiz', 'Lucía Martínez', 'Tomás Pérez'].map((name, i) => (
                  <div key={i} className="bg-bg-primary rounded-lg p-4 border-[0.5px] border-border flex justify-between items-center">
                    <span className="text-[14px] text-text-primary font-medium">{name}</span>
                    <div className="flex gap-1">
                      {[...Array(i === 0 ? 5 : i === 1 ? 3 : 4)].map((_, j) => (
                        <div key={j} className="w-5 h-5 rounded bg-accent opacity-[0.15] border-[0.5px] border-accent" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t-[0.5px] border-border">
                <div className="text-[12px] text-text-secondary">Pacientes compartidos del equipo</div>
                <div className="mt-3 space-y-2">
                  {['Paciente A — Plan inicial', 'Paciente B — Protocolo RTS semana 3', 'Paciente C — Monitoreo de carga'].map((p, i) => (
                    <div key={i} className="text-[13px] text-text-primary flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido clínico — sample article */}
      <section className="py-[96px] bg-bg-secondary">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-[11px] font-medium text-accent tracking-[0.05em] uppercase mb-4">
                De regalo, apenas entrás
              </div>
              <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.15] mb-4">
                Una biblioteca clínica completa.
              </h2>
              <p className="text-[18px] text-text-secondary leading-[1.5] mb-8">
                Resúmenes comentados y aplicaciones clínicas de 2-3 minutos, con criterio aplicado — no relleno. Pensados para leer entre paciente y paciente, con árboles de decisión cuando ayudan a pensar mejor que el texto.
              </p>
              <a
                href="/login"
                className="bg-accent text-bg-primary py-[16px] px-8 rounded-[10px] text-[15px] font-medium no-underline inline-block"
              >
                Entrar y ver la biblioteca
              </a>
            </div>

            <div className="bg-bg-primary border-[0.5px] border-border rounded-2xl p-8">
              <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-5">
                Algunos de los títulos
              </div>
              <ul className="list-none space-y-4">
                {[
                  'Dolor lumbar inespecífico: qué descartar y qué hacer en primera consulta',
                  'Aprendizaje motor: que hoy salga bien no significa que haya aprendido',
                  '¿Qué tan confiable es diagnosticar puntos gatillo con palpación?',
                  '¿Cuándo se lesionan los isquios durante el sprint? Lo que muestra la evidencia',
                ].map(title => (
                  <li key={title} className="text-[14px] text-text-primary leading-[1.5] pb-4 border-b-[0.5px] border-border last:border-0 last:pb-0">
                    {title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Author */}
      <section className="py-[96px] border-t-[0.5px] border-border">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-12 items-center">
            <div className="w-[200px] h-[200px] rounded-xl overflow-hidden flex-shrink-0">
              <Image src="/Photoroom_20240929_222601 2.JPG" alt="Kevin Colman" width={200} height={200} className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <h2 className="text-[32px] font-medium tracking-[-0.02em] mb-3">
                Reason lo construye Kevin Colman.
              </h2>
              <p className="text-[16px] text-text-secondary leading-[1.55] mb-4">
                Kinesiólogo, autor de &quot;Movimiento mata dolor&quot;. Director de Build Health & Performance, donde forma estudiantes y atiende pacientes todas las mañanas.
              </p>
              <p className="text-[15px] leading-[1.6] text-text-primary">
                Reason no es software genérico adaptado para kinesiólogos. Es la plataforma que quería tener en consultorio y que tuve que construir porque no existía.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-[96px] bg-bg-secondary" id="pricing">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="mb-16 max-w-[720px]">
            <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.15] mb-4">
              Planes para cada práctica.
            </h2>
            <p className="text-[18px] text-text-secondary leading-[1.5]">
              El plan Individual es completo para un profesional independiente, agenda incluida. El Pro agrega la capa de equipo para centros que trabajan con varios profesionales.
            </p>
          </div>

          {/* Tier 1: Individual */}
          <div className="mb-4">
            <div className="text-[11px] font-medium text-text-secondary tracking-[0.05em] uppercase mb-4">Para el profesional independiente</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Mensual */}
              <div className="bg-bg-primary border-[0.5px] border-border rounded-2xl p-10 relative">
                <div className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-4">Mensual</div>
                <div className="font-mono text-[36px] font-medium text-text-primary mb-2 tracking-[-0.02em]">
                  <span className="text-[18px] text-text-secondary font-normal">ARS</span> 18.000<span className="text-[16px] text-text-secondary font-normal"> /mes</span>
                </div>
                <div className="font-mono text-[13px] text-text-secondary mb-6">Hasta 20 pacientes · cancelás cuando querés</div>
                <ul className="list-none mb-8 space-y-[10px]">
                  <li className="text-[13px] text-text-secondary flex items-start gap-2">
                    <span className="text-accent mt-[1px]">✓</span> Agenda, recordatorios por WhatsApp y seguimiento de ausencias
                  </li>
                  <li className="text-[13px] text-text-secondary flex items-start gap-2">
                    <span className="text-accent mt-[1px]">✓</span> Constructor de planes con 1800+ ejercicios en video
                  </li>
                  <li className="text-[13px] text-text-secondary flex items-start gap-2">
                    <span className="text-accent mt-[1px]">✓</span> Monitoreo de carga sesión a sesión
                  </li>
                  <li className="text-[13px] text-text-secondary flex items-start gap-2">
                    <span className="text-accent mt-[1px]">✓</span> Protocolo RTS integrado al historial del paciente
                  </li>
                  <li className="text-[13px] text-text-secondary flex items-start gap-2">
                    <span className="text-accent mt-[1px]">✓</span> Ficha kinésica digital exportable a PDF
                  </li>
                  <li className="text-[13px] text-text-secondary flex items-start gap-2">
                    <span className="text-accent mt-[1px]">✓</span> Calendario de sesiones por paciente
                  </li>
                  <li className="text-[13px] text-text-secondary flex items-start gap-2">
                    <span className="text-accent mt-[1px]">✓</span> Catálogo de contenido clínico completo
                  </li>
                </ul>
                <a
                  href="/login"
                  className="w-full py-[14px] rounded-lg text-[14px] font-medium text-center no-underline block border-[0.5px] border-border-strong text-text-primary bg-bg-primary"
                >
                  Empezar suscripción mensual
                </a>
              </div>

              {/* Anual */}
              <div className="bg-bg-primary border-[1px] border-accent rounded-2xl p-10 relative">
                <div className="absolute -top-[12px] left-6 bg-accent text-bg-primary text-[11px] font-medium py-1 px-3 rounded tracking-[0.03em] uppercase">
                  Recomendado · Ahorro 30%
                </div>
                <div className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-4">Anual</div>
                <div className="font-mono text-[36px] font-medium text-text-primary mb-2 tracking-[-0.02em]">
                  <span className="text-[18px] text-text-secondary font-normal">ARS</span> 150.000<span className="text-[16px] text-text-secondary font-normal"> /año</span>
                </div>
                <div className="font-mono text-[13px] text-text-secondary mb-6">≈ ARS 12.500 / mes · hasta 20 pacientes</div>
                <ul className="list-none mb-8 space-y-[10px]">
                  <li className="text-[13px] text-text-secondary flex items-start gap-2">
                    <span className="text-accent mt-[1px]">✓</span> Todo lo del plan mensual incluido
                  </li>
                  <li className="text-[13px] text-text-secondary flex items-start gap-2">
                    <span className="text-accent mt-[1px]">✓</span> 12 meses de acceso sin interrupciones
                  </li>
                  <li className="text-[13px] text-text-secondary flex items-start gap-2">
                    <span className="text-accent mt-[1px]">✓</span> Ahorrás ARS 66.000 vs. pagar mes a mes
                  </li>
                </ul>
                <a
                  href="/login"
                  className="w-full py-[14px] rounded-lg text-[14px] font-medium text-center no-underline block border-none bg-accent text-bg-primary"
                >
                  Empezar suscripción anual
                </a>
              </div>
            </div>
          </div>

          {/* Tier 2: Pro */}
          <div className="mt-10">
            <div className="text-[11px] font-medium text-text-secondary tracking-[0.05em] uppercase mb-4">Para centros y equipos interdisciplinarios</div>
            <div className="bg-bg-primary border-[0.5px] border-border rounded-2xl p-10 relative">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-start">
                <div>
                  <div className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-2">Pro · Centros</div>
                  <div className="font-mono text-[36px] font-medium text-text-primary mb-1 tracking-[-0.02em]">
                    <span className="text-[18px] text-text-secondary font-normal">ARS</span> 53.900<span className="text-[16px] text-text-secondary font-normal"> /mes</span>
                  </div>
                  <div className="font-mono text-[13px] text-text-secondary mb-8">Pacientes ilimitados · todos los profesionales del centro incluidos</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-[10px]">
                    <div>
                      <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.04em] mb-3">Todo lo del plan Individual, más:</div>
                      <ul className="list-none space-y-[10px]">
                        <li className="text-[13px] text-text-secondary flex items-start gap-2">
                          <span className="text-accent mt-[1px]">✓</span> Pacientes y planes compartidos entre profesionales
                        </li>
                        <li className="text-[13px] text-text-secondary flex items-start gap-2">
                          <span className="text-accent mt-[1px]">✓</span> Agenda propia para cada profesional del equipo
                        </li>
                        <li className="text-[13px] text-text-secondary flex items-start gap-2">
                          <span className="text-accent mt-[1px]">✓</span> Historial permanente del equipo
                        </li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.04em] mb-3">Gestión del centro:</div>
                      <ul className="list-none space-y-[10px]">
                        <li className="text-[13px] text-text-secondary flex items-start gap-2">
                          <span className="text-accent mt-[1px]">✓</span> Control de acceso por profesional
                        </li>
                        <li className="text-[13px] text-text-secondary flex items-start gap-2">
                          <span className="text-accent mt-[1px]">✓</span> Caja diaria y chat del equipo
                        </li>
                        <li className="text-[13px] text-text-secondary flex items-start gap-2">
                          <span className="text-accent mt-[1px]">✓</span> Panel de gestión y auditoría de accesos
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="md:w-[220px] flex-shrink-0">
                  <a
                    href="/checkout?plan=pro_monthly"
                    className="w-full py-[14px] rounded-lg text-[14px] font-medium text-center no-underline block border-[0.5px] border-border-strong text-text-primary bg-bg-primary"
                  >
                    Suscribirme al Plan Pro
                  </a>
                  <p className="text-[12px] text-text-tertiary text-center mt-3 leading-[1.5]">
                    Incluye a todos los profesionales del centro sin costo adicional por miembro.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-[120px] bg-bg-tertiary text-center">
        <div className="w-full max-w-[720px] mx-auto px-8">
          <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.15] mb-4">
            Probá Reason gratis por 7 días.
          </h2>
          <p className="text-[18px] text-text-secondary leading-[1.5] mb-10">
            Sin tarjeta de crédito. Cancelás cuando querés. Acceso inmediato a todas las herramientas.
          </p>
          <a
            href="/login"
            className="bg-accent text-bg-primary py-[18px] px-9 rounded-[10px] text-[16px] font-medium no-underline inline-block"
          >
            Empezar gratis
          </a>
        </div>
      </section>

      <footer className="py-12 border-t-[0.5px] border-border">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="flex justify-between items-center flex-wrap gap-6">
            <div className="text-[18px] font-medium tracking-[-0.01em]">
              reason<span className="text-accent">.</span>
            </div>
            <div className="flex gap-6">
              <a href="/terminos" className="text-text-secondary text-[13px] no-underline">
                Términos
              </a>
              <a href="/sobre-tus-datos" className="text-text-secondary text-[13px] no-underline">
                Privacidad
              </a>
              <a href="mailto:reasoncontacto@gmail.com" className="text-text-secondary text-[13px] no-underline">
                Contacto
              </a>
            </div>
            <div className="text-[13px] text-text-tertiary">
              © 2026 Reason. Por Kevin Colman.
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
