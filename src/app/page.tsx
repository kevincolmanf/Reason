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

      <section className="pt-[120px] pb-[96px]">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <h1 className="text-[64px] font-medium tracking-[-0.02em] leading-[1.1] mb-6">
            Criterio clínico aplicado.
          </h1>
          <p className="text-[20px] text-text-secondary leading-[1.5] max-w-[600px] mb-10">
            Reason traduce evidencia en decisiones de consultorio. Para kinesiólogos que
            ya están atendiendo y quieren decidir mejor.
          </p>
          <div className="flex gap-4 items-center">
            <a
              href="/login"
              className="bg-accent text-bg-primary py-[14px] px-7 rounded-lg text-[14px] font-medium no-underline inline-block border-none cursor-pointer"
            >
              Ingresar / Suscribirse
            </a>
            <a
              href="#como-funciona"
              className="text-text-primary text-[14px] no-underline py-[14px] px-0"
            >
              Ver cómo funciona →
            </a>
          </div>
        </div>
      </section>

      <section className="py-[96px] border-t-[0.5px] border-border">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="mb-16 max-w-[720px]">
            <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.15] mb-4">
              No te falta información. Te falta criterio para usarla.
            </h2>
            <p className="text-[18px] text-text-secondary leading-[1.5]">
              Reason no suma contenido al ruido. Sintetiza lo que importa, descarta lo
              que no, y te muestra cómo se piensa cada decisión clínica.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="p-8 rounded-xl bg-bg-primary border-[0.5px] border-border">
              <div className="text-[11px] font-medium text-text-secondary tracking-[0.05em] uppercase mb-6">
                Lo que ya tenés
              </div>
              <ul className="list-none">
                <li className="py-4 text-[15px] text-text-primary border-b-[0.5px] border-border">
                  Papers acumulados sin leer
                </li>
                <li className="py-4 text-[15px] text-text-primary border-b-[0.5px] border-border">
                  Cursos que no llegaste a aplicar
                </li>
                <li className="py-4 text-[15px] text-text-primary border-b-[0.5px] border-border">
                  Información dispersa en mil lugares
                </li>
                <li className="py-4 text-[15px] text-text-primary">
                  Decisiones que tomás sin estar seguro
                </li>
              </ul>
            </div>
            <div className="p-8 rounded-xl bg-bg-secondary border-[0.5px] border-border">
              <div className="text-[11px] font-medium text-text-secondary tracking-[0.05em] uppercase mb-6">
                Lo que te falta
              </div>
              <ul className="list-none">
                <li className="py-4 text-[15px] text-text-primary border-b-[0.5px] border-border">
                  Criterio clínico aplicado a casos reales
                </li>
                <li className="py-4 text-[15px] text-text-primary border-b-[0.5px] border-border">
                  Decisiones claras en formato breve
                </li>
                <li className="py-4 text-[15px] text-text-primary border-b-[0.5px] border-border">
                  Razonamiento expuesto, no recetas
                </li>
                <li className="py-4 text-[15px] text-text-primary">
                  Tiempo recuperado para tu consultorio
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-[96px] bg-bg-secondary" id="como-funciona">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="mb-16 max-w-[720px]">
            <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.15] mb-4">
              Cada contenido te lleva a una decisión.
            </h2>
            <p className="text-[18px] text-text-secondary leading-[1.5]">
              Estructura fija. Lectura de 2 a 3 minutos. Visualizaciones cuando ayudan
              a pensar mejor que el texto.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8">
              <div className="h-[80px] mb-6 flex items-center justify-start">
                <div className="flex flex-col gap-[6px]">
                  <div className="w-[80px] h-[6px] bg-border-strong rounded-[3px]"></div>
                  <div className="w-[50px] h-[6px] bg-border-strong rounded-[3px]"></div>
                  <div className="w-[65px] h-[6px] bg-border-strong rounded-[3px]"></div>
                  <div className="w-[80px] h-[6px] bg-border-strong rounded-[3px]"></div>
                  <div className="w-[50px] h-[6px] bg-border-strong rounded-[3px]"></div>
                </div>
              </div>
              <h3 className="text-[18px] font-medium mb-3 text-text-primary">
                Estructura fija
              </h3>
              <p className="text-[14px] text-text-secondary leading-[1.55]">
                Cada contenido sigue la misma arquitectura: qué tenés que saber,
                interpretación, aplicación, qué evitar, conclusión. Sabés dónde
                encontrar cada cosa, siempre.
              </p>
            </div>

            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8">
              <div className="h-[80px] mb-6 flex items-center justify-start">
                <div className="font-mono text-[48px] font-medium text-text-primary tracking-[-0.02em]">
                  2-3<span className="text-[16px] text-text-secondary ml-1 font-sans">min</span>
                </div>
              </div>
              <h3 className="text-[18px] font-medium mb-3 text-text-primary">
                Formato breve
              </h3>
              <p className="text-[14px] text-text-secondary leading-[1.55]">
                Diseñado para leer entre paciente y paciente. Si te lleva más de tres
                minutos, está mal escrito.
              </p>
            </div>

            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8">
              <div className="h-[80px] mb-6 flex items-center justify-start">
                <svg viewBox="0 0 100 60" className="w-full h-full">
                  <rect x="35" y="5" width="30" height="14" rx="3" fill="#FFFFFF" stroke="#5C5B57" strokeWidth="0.5" />
                  <line x1="50" y1="19" x2="50" y2="27" stroke="#5C5B57" strokeWidth="0.8" />
                  <rect x="10" y="27" width="30" height="14" rx="3" fill="#FFFFFF" stroke="#5C5B57" strokeWidth="0.5" />
                  <rect x="60" y="27" width="30" height="14" rx="3" fill="rgba(194,90,44,0.08)" stroke="#C25A2C" strokeWidth="0.5" />
                  <line x1="40" y1="34" x2="60" y2="34" stroke="#5C5B57" strokeWidth="0.5" strokeDasharray="2,2" />
                  <rect x="35" y="46" width="30" height="14" rx="3" fill="rgba(194,90,44,0.08)" stroke="#C25A2C" strokeWidth="0.5" />
                  <line x1="75" y1="41" x2="50" y2="46" stroke="#5C5B57" strokeWidth="0.8" />
                </svg>
              </div>
              <h3 className="text-[18px] font-medium mb-3 text-text-primary">
                Visualizaciones
              </h3>
              <p className="text-[14px] text-text-secondary leading-[1.55]">
                Árboles de decisión, tablas comparativas, líneas de tiempo. Cuando un
                razonamiento se ve, se aplica mejor que cuando se lee.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-[96px]">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="mb-16 max-w-[720px]">
            <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.15] mb-4">
              Mirá cómo se ve un contenido de Reason.
            </h2>
            <p className="text-[18px] text-text-secondary leading-[1.5]">
              Un caso completo, abierto. Para que decidas si Reason vale la suscripción
              antes de pagarla.
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
              href="/signup"
              className="bg-accent text-bg-primary py-[18px] px-9 rounded-[10px] text-[16px] font-medium no-underline inline-block"
            >
              Empezar suscripción y acceder al catálogo completo
            </a>
          </div>
        </div>
      </section>

      <section className="py-[96px] border-t-[0.5px] border-border">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="mb-16 max-w-[720px]">
            <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.15] mb-4">
              Más que una biblioteca. Un ecosistema clínico integrado.
            </h2>
            <p className="text-[18px] text-text-secondary leading-[1.5]">
              La suscripción a Reason no solo te da contenido. Te da acceso total a herramientas diseñadas específicamente para agilizar tu flujo de trabajo y mejorar el control de tus pacientes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8">
              <div className="h-[60px] mb-4 flex items-center justify-start text-accent">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <h3 className="text-[18px] font-medium mb-3 text-text-primary">
                Movement Dashboard
              </h3>
              <p className="text-[14px] text-text-secondary leading-[1.55]">
                Constructor de planes con +250 ejercicios en video. Compartí links mágicos con el Modo Paciente, recibí su feedback de RPE y EVA en tiempo real, o exportalos a PDF con códigos QR automáticos.
              </p>
            </div>

            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8">
              <div className="h-[60px] mb-4 flex items-center justify-start text-accent">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                  <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                </svg>
              </div>
              <h3 className="text-[18px] font-medium mb-3 text-text-primary">
                Ficha Kinésica Inteligente
              </h3>
              <p className="text-[14px] text-text-secondary leading-[1.55]">
                Dejá de usar planillas genéricas. Evaluá a tus pacientes usando una ficha digital diseñada bajo razonamiento clínico, con exportación a PDF para que te quede el registro offline. Sin guardar datos sensibles en la nube.
              </p>
            </div>

            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8">
              <div className="h-[60px] mb-4 flex items-center justify-start text-accent">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                  <line x1="8" y1="6" x2="16" y2="6"></line>
                  <line x1="16" y1="10" x2="16" y2="10.01"></line>
                  <line x1="12" y1="10" x2="12" y2="10.01"></line>
                  <line x1="8" y1="10" x2="8" y2="10.01"></line>
                  <line x1="16" y1="14" x2="16" y2="14.01"></line>
                  <line x1="12" y1="14" x2="12" y2="14.01"></line>
                  <line x1="8" y1="14" x2="8" y2="14.01"></line>
                  <line x1="16" y1="18" x2="16" y2="18.01"></line>
                  <line x1="12" y1="18" x2="12" y2="18.01"></line>
                  <line x1="8" y1="18" x2="8" y2="18.01"></line>
                </svg>
              </div>
              <h3 className="text-[18px] font-medium mb-3 text-text-primary">
                Calculadoras y Scores
              </h3>
              <p className="text-[14px] text-text-secondary leading-[1.55]">
                Cuestionarios interactivos y calculadoras de riesgo integradas. Herramientas validadas (como STarT Back, RMQ, VISA) listas para usar en consultorio sin tener que buscarlas en Google cada vez.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-[96px] bg-bg-secondary">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-12 items-center">
            <div className="w-[200px] h-[200px] rounded-xl overflow-hidden flex-shrink-0">
              <img src="/Photoroom_20240929_222601 2.JPG" alt="Kevin Colman" className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <h2 className="text-[32px] font-medium tracking-[-0.02em] mb-3">
                Reason lo escribe Kevin Colman.
              </h2>
              <p className="text-[16px] text-text-secondary leading-[1.55] mb-4">
                Kinesiólogo, autor de &quot;Movimiento mata dolor&quot;. Director de Build, donde forma estudiantes y atiende pacientes todas las mañanas.
              </p>
              <p className="text-[15px] leading-[1.6] text-text-primary">
                Reason no es contenido genérico. Es el sistema de pensamiento que
                aplico todos los días en consultorio, sistematizado para que lo
                apliques en el tuyo.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-[96px]" id="pricing">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="mb-16 max-w-[720px]">
            <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.15] mb-4">
              Una suscripción. Todo el catálogo.
            </h2>
            <p className="text-[18px] text-text-secondary leading-[1.5]">
              Sin niveles. Sin contenido bloqueado para &quot;premium&quot;. Lo que pagás es acceso completo a Reason.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <div className="bg-bg-primary border-[0.5px] border-border rounded-2xl p-10 relative">
              <div className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-4">
                Mensual
              </div>
              <div className="font-mono text-[36px] font-medium text-text-primary mb-2 tracking-[-0.02em]">
                <span className="text-[18px] text-text-secondary font-normal">ARS</span> 18.000<span className="text-[16px] text-text-secondary font-normal"> /mes</span>
              </div>
              <div className="font-mono text-[13px] text-text-secondary mb-6">&nbsp;</div>
              <p className="text-[14px] text-text-secondary leading-[1.55] mb-8 min-h-[40px]">
                Acceso completo al catálogo. Cancelás cuando quieras.
              </p>
              <a
                href="/signup"
                className="w-full py-[14px] rounded-lg text-[14px] font-medium text-center no-underline block border-[0.5px] border-border-strong text-text-primary bg-bg-primary"
              >
                Empezar suscripción mensual
              </a>
            </div>

            <div className="bg-bg-primary border-[1px] border-accent rounded-2xl p-10 relative">
              <div className="absolute -top-[12px] left-6 bg-accent text-bg-primary text-[11px] font-medium py-1 px-3 rounded tracking-[0.03em] uppercase">
                Recomendado · Ahorro 30%
              </div>
              <div className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-4">
                Anual
              </div>
              <div className="font-mono text-[36px] font-medium text-text-primary mb-2 tracking-[-0.02em]">
                <span className="text-[18px] text-text-secondary font-normal">ARS</span> 150.000<span className="text-[16px] text-text-secondary font-normal"> /año</span>
              </div>
              <div className="font-mono text-[13px] text-text-secondary mb-6">≈ ARS 12.500 / mes</div>
              <p className="text-[14px] text-text-secondary leading-[1.55] mb-8 min-h-[40px]">
                Acceso completo al catálogo durante 12 meses.
              </p>
              <a
                href="/signup"
                className="w-full py-[14px] rounded-lg text-[14px] font-medium text-center no-underline block border-none bg-accent text-bg-primary"
              >
                Empezar suscripción anual
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-[120px] bg-bg-tertiary text-center">
        <div className="w-full max-w-[720px] mx-auto px-8">
          <h2 className="text-[40px] font-medium tracking-[-0.02em] leading-[1.15] mb-4">
            Empezá a decidir mejor desde el lunes.
          </h2>
          <p className="text-[18px] text-text-secondary leading-[1.5] mb-10">
            Cancelás cuando quieras. Acceso inmediato a todo el catálogo.
          </p>
          <a
            href="/login"
            className="bg-accent text-bg-primary py-[18px] px-9 rounded-[10px] text-[16px] font-medium no-underline inline-block"
          >
            Ingresar / Suscribirse
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
