export default function LandingPage() {
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

      {/* Hero */}
      <section className="pt-[120px] pb-[96px]">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="max-w-[760px]">
            <h1 className="text-[64px] font-medium tracking-[-0.02em] leading-[1.1] mb-6">
              La plataforma que usás<br />para atender mejor.
            </h1>
            <p className="text-[20px] text-text-secondary leading-[1.5] max-w-[600px] mb-10">
              Agenda, planes de ejercicio, monitoreo de carga, protocolos RTS, ficha kinésica y contenido clínico basado en evidencia. Todo diseñado para kinesiólogos.
            </p>
            <div className="flex gap-4 items-center flex-wrap">
              <a
                href="/login"
                className="bg-accent text-bg-primary py-[14px] px-7 rounded-lg text-[14px] font-medium no-underline inline-block border-none cursor-pointer"
              >
                Probá gratis 7 días
              </a>
              <a
                href="#funcionalidades"
                className="text-text-primary text-[14px] no-underline py-[14px] px-0"
              >
                Ver funcionalidades →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-10 border-t-[0.5px] border-border border-b-[0.5px] bg-bg-secondary">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="font-mono text-[32px] font-medium text-text-primary tracking-[-0.02em]">1800+</div>
              <div className="text-[13px] text-text-secondary mt-1">ejercicios con video</div>
            </div>
            <div>
              <div className="font-mono text-[32px] font-medium text-text-primary tracking-[-0.02em]">Agenda</div>
              <div className="text-[13px] text-text-secondary mt-1">integrada con recordatorios WA</div>
            </div>
            <div>
              <div className="font-mono text-[32px] font-medium text-text-primary tracking-[-0.02em]">RTS</div>
              <div className="text-[13px] text-text-secondary mt-1">protocolos de retorno al deporte</div>
            </div>
            <div>
              <div className="font-mono text-[32px] font-medium text-text-primary tracking-[-0.02em]">Equipo</div>
              <div className="text-[13px] text-text-secondary mt-1">modo multi-profesional integrado</div>
            </div>
          </div>
        </div>
      </section>

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
                  Agenda integrada con recordatorios de WhatsApp <span className="text-[12px] text-accent">(Pro)</span>
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
              <div className="h-[48px] mb-5 flex items-center justify-between text-accent">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className="text-[10px] font-medium text-accent border-[0.5px] border-accent rounded px-2 py-0.5 tracking-[0.04em] uppercase">Pro</span>
              </div>
              <h3 className="text-[17px] font-medium mb-3 text-text-primary">Agenda de turnos</h3>
              <p className="text-[14px] text-text-secondary leading-[1.55]">
                Gestioná todos tus turnos desde una vista semanal. Enviá recordatorios de WhatsApp con un click y sabé quién confirmó y quién no.
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
                Evaluá a tus pacientes con una ficha diseñada bajo razonamiento clínico. Exportá a PDF para el registro offline. Sin datos sensibles en la nube.
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
      <section className="py-[96px] border-t-[0.5px] border-border">
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
          <div className="mb-16 max-w-[720px]">
            <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.15] mb-4">
              Y además: contenido clínico que te hace pensar mejor.
            </h2>
            <p className="text-[18px] text-text-secondary leading-[1.5]">
              Artículos de 2-3 minutos con criterio clínico aplicado. Diseñados para leer entre paciente y paciente. Con árboles de decisión cuando ayudan a pensar mejor que el texto.
            </p>
          </div>

          <div className="bg-bg-primary border-[0.5px] border-border rounded-2xl p-12 mt-8">
            <div className="flex gap-2 mb-6 flex-wrap">
              <span className="bg-bg-secondary text-text-secondary text-[12px] py-[6px] px-3 rounded-md">
                Aplicación clínica
              </span>
              <span className="bg-bg-secondary text-text-secondary text-[12px] py-[6px] px-3 rounded-md">
                Lumbar
              </span>
              <span className="bg-bg-secondary text-text-secondary text-[12px] py-[6px] px-3 rounded-md">
                3 min de lectura
              </span>
            </div>

            <h3 className="text-[28px] font-medium leading-[1.2] mb-2 tracking-[-0.01em]">
              Dolor lumbar inespecífico en primera consulta
            </h3>
            <p className="text-[18px] text-text-secondary mb-8">
              Qué descartar y qué hacer
            </p>

            <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mt-8 mb-3">
              Qué tenés que saber
            </div>
            <ul className="list-none mb-2">
              <li className="py-[6px] pl-4 text-[15px] leading-[1.6] relative before:content-['·'] before:absolute before:left-0 before:text-text-secondary">
                El 90% de las consultas por dolor lumbar son inespecíficas. No hay
                estructura responsable y eso está bien.
              </li>
              <li className="py-[6px] pl-4 text-[15px] leading-[1.6] relative before:content-['·'] before:absolute before:left-0 before:text-text-secondary">
                Las banderas rojas son raras pero hay que descartarlas siempre.
              </li>
              <li className="py-[6px] pl-4 text-[15px] leading-[1.6] relative before:content-['·'] before:absolute before:left-0 before:text-text-secondary">
                La irradiación con déficit cambia el manejo, no lo invalida.
              </li>
              <li className="py-[6px] pl-4 text-[15px] leading-[1.6] relative before:content-['·'] before:absolute before:left-0 before:text-text-secondary">
                Lo que más mejora el cuadro es lo más simple: educación, movimiento,
                tiempo.
              </li>
            </ul>

            <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mt-8 mb-3">
              Interpretación clínica
            </div>
            <p className="text-[15px] leading-[1.65] mb-3">
              Llega un paciente con resonancia de hace una semana. Trae la palabra
              &quot;protrusión&quot; subrayada y los ojos lavados de tres noches sin dormir. Lo
              más útil que vas a hacer en esa consulta probablemente no sea lo que
              vino a buscar.
            </p>
            <p className="text-[15px] leading-[1.65] mb-3">
              El dolor lumbar inespecífico es la categoría diagnóstica más
              subestimada de la práctica musculoesquelética. &quot;Inespecífico&quot; suena a
              &quot;no sabemos lo que tiene&quot;. En realidad significa otra cosa: no hay una
              estructura claramente identificable como causa, y la evidencia muestra
              que buscarla en exceso empeora los resultados clínicos. La resonancia no
              predice mejor el pronóstico que una buena conversación.
            </p>

            <div className="bg-bg-secondary rounded-xl p-8 my-4">
              <div className="text-[11px] font-medium text-text-secondary tracking-[0.05em] uppercase mb-1">
                Aplicación práctica
              </div>
              <div className="text-[13px] text-text-tertiary mb-6">
                Árbol de decisión clínica
              </div>
              <svg viewBox="0 0 600 720" width="100%" className="block">
                <defs>
                  <marker
                    id="chev"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M2 1L8 5L2 9" fill="none" stroke="var(--color-text-primary)" strokeWidth="1" strokeLinecap="round" />
                  </marker>
                </defs>
                <rect x="200" y="20" width="200" height="56" rx="8" fill="var(--color-bg-primary)" stroke="var(--color-border-strong)" strokeWidth="0.5" />
                <text x="300" y="44" fontFamily="Geist, sans-serif" fontSize="14" fontWeight="500" fill="var(--color-text-primary)" textAnchor="middle">Paciente con dolor lumbar</text>
                <text x="300" y="62" fontFamily="Geist, sans-serif" fontSize="12" fontWeight="400" fill="var(--color-text-secondary)" textAnchor="middle">Primera consulta</text>
                <line x1="300" y1="76" x2="300" y2="120" stroke="var(--color-text-primary)" strokeWidth="1" markerEnd="url(#chev)" />
                <rect x="180" y="120" width="240" height="56" rx="8" fill="var(--color-bg-primary)" stroke="var(--color-border-strong)" strokeWidth="0.5" />
                <text x="300" y="144" fontFamily="Geist, sans-serif" fontSize="14" fontWeight="500" fill="var(--color-text-primary)" textAnchor="middle">¿Hay banderas rojas?</text>
                <text x="300" y="162" fontFamily="Geist, sans-serif" fontSize="12" fontWeight="400" fill="var(--color-text-secondary)" textAnchor="middle">Trauma, fiebre, déficit, edad</text>
                <text x="155" y="190" fontFamily="Geist, sans-serif" fontSize="11" fontWeight="400" fill="var(--color-text-secondary)" textAnchor="middle">Sí</text>
                <line x1="240" y1="176" x2="135" y2="220" stroke="var(--color-text-primary)" strokeWidth="1" markerEnd="url(#chev)" />
                <text x="445" y="190" fontFamily="Geist, sans-serif" fontSize="11" fontWeight="400" fill="var(--color-text-secondary)" textAnchor="middle">No</text>
                <line x1="360" y1="176" x2="465" y2="220" stroke="var(--color-text-primary)" strokeWidth="1" markerEnd="url(#chev)" />
                <rect x="40" y="220" width="200" height="56" rx="8" fill="var(--color-bg-primary)" stroke="var(--color-warning)" strokeWidth="0.5" />
                <text x="140" y="244" fontFamily="Geist, sans-serif" fontSize="14" fontWeight="500" fill="var(--color-text-primary)" textAnchor="middle">Derivar a médico</text>
                <text x="140" y="262" fontFamily="Geist, sans-serif" fontSize="12" fontWeight="400" fill="var(--color-text-secondary)" textAnchor="middle">No iniciar kinesiología sola</text>
                <rect x="360" y="220" width="200" height="56" rx="8" fill="var(--color-bg-primary)" stroke="var(--color-border-strong)" strokeWidth="0.5" />
                <text x="460" y="244" fontFamily="Geist, sans-serif" fontSize="14" fontWeight="500" fill="var(--color-text-primary)" textAnchor="middle">¿Hay irradiación neuro?</text>
                <text x="460" y="262" fontFamily="Geist, sans-serif" fontSize="12" fontWeight="400" fill="var(--color-text-secondary)" textAnchor="middle">Déficit motor, sensitivo</text>
                <text x="355" y="295" fontFamily="Geist, sans-serif" fontSize="11" fontWeight="400" fill="var(--color-text-secondary)" textAnchor="middle">Sí</text>
                <line x1="420" y1="276" x2="320" y2="328" stroke="var(--color-text-primary)" strokeWidth="1" markerEnd="url(#chev)" />
                <text x="505" y="350" fontFamily="Geist, sans-serif" fontSize="11" fontWeight="400" fill="var(--color-text-secondary)" textAnchor="middle">No</text>
                <line x1="495" y1="276" x2="495" y2="430" stroke="var(--color-text-primary)" strokeWidth="1" markerEnd="url(#chev)" />
                <rect x="200" y="328" width="240" height="56" rx="8" fill="var(--color-bg-primary)" stroke="var(--color-border-strong)" strokeWidth="0.5" />
                <text x="320" y="352" fontFamily="Geist, sans-serif" fontSize="14" fontWeight="500" fill="var(--color-text-primary)" textAnchor="middle">Evaluar y monitorear déficit</text>
                <text x="320" y="370" fontFamily="Geist, sans-serif" fontSize="12" fontWeight="400" fill="var(--color-text-secondary)" textAnchor="middle">Co-manejo con médico</text>
                <rect x="380" y="430" width="220" height="56" rx="8" fill="rgba(194,90,44,0.08)" stroke="var(--color-accent)" strokeWidth="0.5" />
                <text x="490" y="454" fontFamily="Geist, sans-serif" fontSize="14" fontWeight="500" fill="var(--color-text-primary)" textAnchor="middle">Dolor lumbar inespecífico</text>
                <text x="490" y="472" fontFamily="Geist Mono, monospace" fontSize="12" fontWeight="400" fill="var(--color-text-secondary)" textAnchor="middle">≈90% de los casos</text>
                <line x1="490" y1="486" x2="490" y2="540" stroke="var(--color-text-primary)" strokeWidth="1" markerEnd="url(#chev)" />
                <rect x="320" y="540" width="280" height="80" rx="8" fill="rgba(194,90,44,0.08)" stroke="var(--color-accent)" strokeWidth="0.5" />
                <text x="460" y="566" fontFamily="Geist, sans-serif" fontSize="14" fontWeight="500" fill="var(--color-text-primary)" textAnchor="middle">Educación + movimiento + tiempo</text>
                <text x="460" y="588" fontFamily="Geist, sans-serif" fontSize="12" fontWeight="400" fill="var(--color-text-secondary)" textAnchor="middle">Tranquilizar, evitar reposo</text>
                <text x="460" y="606" fontFamily="Geist, sans-serif" fontSize="12" fontWeight="400" fill="var(--color-text-secondary)" textAnchor="middle">Volver a actividad gradual</text>
                <line x1="460" y1="620" x2="460" y2="660" stroke="var(--color-text-primary)" strokeWidth="1" markerEnd="url(#chev)" />
                <rect x="320" y="660" width="280" height="56" rx="8" fill="var(--color-bg-primary)" stroke="var(--color-border-strong)" strokeWidth="0.5" />
                <text x="460" y="684" fontFamily="Geist, sans-serif" fontSize="14" fontWeight="500" fill="var(--color-text-primary)" textAnchor="middle">{'¿Persiste > 6 semanas?'}</text>
                <text x="460" y="702" fontFamily="Geist, sans-serif" fontSize="12" fontWeight="400" fill="var(--color-text-secondary)" textAnchor="middle">Reconsiderar factores contextuales</text>
              </svg>
            </div>

            <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mt-8 mb-3">
              Qué evitar
            </div>
            <ul className="list-none mb-2">
              <li className="py-[6px] pl-4 text-[15px] leading-[1.6] relative before:content-['·'] before:absolute before:left-0 before:text-text-secondary">
                Pedir resonancia de entrada en ausencia de banderas rojas. Es la
                decisión que más cronifica casos.
              </li>
              <li className="py-[6px] pl-4 text-[15px] leading-[1.6] relative before:content-['·'] before:absolute before:left-0 before:text-text-secondary">
                Tratar el dolor lumbar inespecífico como si fuera siempre lo mismo.
              </li>
              <li className="py-[6px] pl-4 text-[15px] leading-[1.6] relative before:content-['·'] before:absolute before:left-0 before:text-text-secondary">
                Tranquilizar sin marco. &quot;No tenés nada&quot; deja al paciente con dolor real
                y sin explicación.
              </li>
            </ul>

            <div className="border-l-[3px] border-text-primary py-4 px-6 mt-8 bg-bg-secondary">
              <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-2">
                Conclusión accionable
              </div>
              <p className="text-[18px] leading-[1.5] font-medium">
                En dolor lumbar inespecífico, el primer movimiento clínico no es buscar la causa. Es ordenar la conversación.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <a
              href="/login"
              className="bg-accent text-bg-primary py-[18px] px-9 rounded-[10px] text-[16px] font-medium no-underline inline-block"
            >
              Acceder al catálogo completo
            </a>
          </div>
        </div>
      </section>

      {/* Author */}
      <section className="py-[96px] border-t-[0.5px] border-border">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-12 items-center">
            <div className="w-[200px] h-[200px] rounded-xl overflow-hidden flex-shrink-0">
              <img src="/Photoroom_20240929_222601 2.JPG" alt="Kevin Colman" className="w-full h-full object-cover object-top" />
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
              El plan individual es completo para un profesional independiente. El Pro agrega la capa de equipo y agenda para centros que trabajan con varios profesionales.
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
                    <span className="text-[18px] text-text-secondary font-normal">ARS</span> 150.000<span className="text-[16px] text-text-secondary font-normal"> /mes</span>
                  </div>
                  <div className="font-mono text-[13px] text-text-secondary mb-8">Pacientes ilimitados · todos los profesionales del centro incluidos</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-[10px]">
                    <div>
                      <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.04em] mb-3">Todo lo del plan individual, más:</div>
                      <ul className="list-none space-y-[10px]">
                        <li className="text-[13px] text-text-secondary flex items-start gap-2">
                          <span className="text-accent mt-[1px]">✓</span> Agenda de turnos integrada
                        </li>
                        <li className="text-[13px] text-text-secondary flex items-start gap-2">
                          <span className="text-accent mt-[1px]">✓</span> Recordatorios automáticos por WhatsApp
                        </li>
                        <li className="text-[13px] text-text-secondary flex items-start gap-2">
                          <span className="text-accent mt-[1px]">✓</span> Vista semanal de agenda por profesional
                        </li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.04em] mb-3">Funciones de equipo:</div>
                      <ul className="list-none space-y-[10px]">
                        <li className="text-[13px] text-text-secondary flex items-start gap-2">
                          <span className="text-accent mt-[1px]">✓</span> Pacientes y planes compartidos entre profesionales
                        </li>
                        <li className="text-[13px] text-text-secondary flex items-start gap-2">
                          <span className="text-accent mt-[1px]">✓</span> Historial permanente del equipo
                        </li>
                        <li className="text-[13px] text-text-secondary flex items-start gap-2">
                          <span className="text-accent mt-[1px]">✓</span> Control de acceso por profesional
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
              <a href="#" className="text-text-secondary text-[13px] no-underline">
                Términos
              </a>
              <a href="#" className="text-text-secondary text-[13px] no-underline">
                Privacidad
              </a>
              <a href="#" className="text-text-secondary text-[13px] no-underline">
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
