import Header from '@/components/Header'

// Flujo recomendado de trabajo con un paciente. Sirve de orientación para
// quien recién empieza: el orden en que conviene usar las herramientas.
const flow = [
  { n: 1, title: 'Creá el paciente', desc: 'Desde "Pacientes" cargás sus datos básicos. Es el punto de partida de todo lo demás.' },
  { n: 2, title: 'Completá la ficha clínica', desc: 'Anamnesis, diagnóstico, goniometría, cuestionarios y dinamometría dentro de la ficha del paciente.' },
  { n: 3, title: 'Armá el plan de ejercicio', desc: 'Elegís ejercicios de la base de +1.700 con video y programás las sesiones en el calendario.' },
  { n: 4, title: 'Compartí el portal del paciente', desc: 'Un link para que siga el plan desde el teléfono y registre cómo le fue en cada sesión.' },
  { n: 5, title: 'Seguí la evolución', desc: 'Monitoreo de carga y protocolos de retorno al deporte (RTS) quedan integrados al historial.' },
]

const sections = [
  {
    icon: '👥',
    title: 'Pacientes',
    description: 'El centro de tu trabajo. Cada paciente reúne su ficha, planes, carga y evaluaciones.',
    steps: [
      'Entrá a "Pacientes" desde el menú superior y tocá "+ Nuevo Paciente".',
      'Al abrir un paciente ves sus herramientas: Ficha Clínica, Monitoreo de Carga, Plan de Ejercicio y Retorno al Deporte.',
      'Registrás sesiones, hitos del tratamiento y el historial de turnos desde la misma pantalla.',
    ],
  },
  {
    icon: '🗂️',
    title: 'Ficha Clínica',
    description: 'La evaluación completa del paciente, pensada bajo razonamiento clínico.',
    steps: [
      'Dentro de un paciente, abrí "Ficha Clínica".',
      'Cargá anamnesis, diagnóstico, goniometría, cuestionarios validados y dinamometría.',
      'Todo queda guardado de forma segura en la nube, asociado al paciente, y podés exportarlo a PDF.',
    ],
  },
  {
    icon: '🏋️',
    title: 'Plan de Ejercicio y Portal',
    description: 'Constructor de planes con +1.700 ejercicios en video y seguimiento del paciente.',
    steps: [
      'Desde el paciente, abrí "Plan de Ejercicio / Calendario" y agregá ejercicios buscando por patrón, equipo o categoría.',
      'Programá las sesiones en el calendario y marcá los hitos del tratamiento.',
      'Generá el link del "Portal del Paciente": lo sigue desde el teléfono y te deja feedback de RPE y dolor en tiempo real.',
    ],
  },
  {
    icon: '📈',
    title: 'Monitoreo de Carga',
    description: 'Decisiones de progresión con datos, sesión a sesión.',
    steps: [
      'Dentro del paciente, abrí "Monitoreo de Carga".',
      'Se registra la carga de cada sesión (propia o cargada por el paciente desde el portal).',
      'Visualizás ACWR, VAS y RPE con un consejo semanal para ajustar la progresión.',
    ],
  },
  {
    icon: '🎯',
    title: 'Retorno al Deporte (RTS)',
    description: 'Protocolos de retorno al deporte con criterios y etapas definidas.',
    steps: [
      'Dentro del paciente, abrí "Retorno al Deporte".',
      'Elegí el protocolo según la lesión: LCA, isquiotibiales, tobillo, femoropatelar, tendinopatía, inguinal u hombro.',
      'Registrás las evaluaciones y quedan integradas al historial del paciente.',
    ],
  },
  {
    icon: '📅',
    title: 'Agenda',
    description: 'Gestión de turnos con recordatorios por WhatsApp. Disponible en Plan Pro.',
    steps: [
      'Accedé a "Agenda" desde el menú superior (Plan Pro).',
      'Gestioná los turnos en una vista semanal, por profesional en el modo equipo.',
      'Enviá recordatorios por WhatsApp con un click desde la propia agenda.',
    ],
  },
  {
    icon: '🧰',
    title: 'Recursos',
    description: 'Herramientas clínicas interactivas de referencia rápida.',
    steps: [
      'Entrá a "Recursos" desde el menú superior.',
      'Usá cuestionarios validados con cálculo automático de score, calculadoras (1RM, IMC, VO2máx), el dinamómetro (HHD) y las banderas rojas.',
      'El Bodyboard te ayuda a explicarle al paciente los factores que contribuyen a su dolor.',
    ],
  },
  {
    icon: '📚',
    title: 'Biblioteca',
    description: 'Contenido clínico basado en evidencia para leer entre paciente y paciente.',
    steps: [
      'Accedé a "Biblioteca" desde el menú superior.',
      'Navegá por resúmenes comentados y aplicaciones clínicas, o usá el buscador.',
      'Cada entrada es una lectura corta con criterio clínico aplicado.',
    ],
  },
]

export default function AyudaPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />

      <main className="flex-grow w-full max-w-[720px] mx-auto px-8 py-12">
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">
          Centro de ayuda
        </h1>
        <p className="text-[15px] text-text-secondary mb-10">
          Cómo trabajar en Reason y qué hace cada herramienta.
        </p>

        {/* Flujo recomendado — orienta a quien recién empieza */}
        <div className="bg-bg-secondary rounded-xl border-[0.5px] border-border p-6 mb-10">
          <h2 className="text-[17px] font-medium mb-1">Cómo trabajar un paciente, paso a paso</h2>
          <p className="text-[13px] text-text-secondary mb-5">
            El recorrido típico en Reason. Cada paso vive dentro del paciente.
          </p>
          <ol className="flex flex-col gap-4">
            {flow.map((f) => (
              <li key={f.n} className="flex gap-4">
                <span className="shrink-0 w-7 h-7 rounded-lg bg-accent/10 text-accent text-[13px] font-medium flex items-center justify-center mt-[1px]">
                  {f.n}
                </span>
                <div>
                  <p className="text-[14px] font-medium text-text-primary">{f.title}</p>
                  <p className="text-[13px] text-text-secondary">{f.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <h2 className="text-[15px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-4">
          Cada herramienta en detalle
        </h2>
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <div
              key={section.title}
              className="bg-bg-secondary rounded-xl border-[0.5px] border-border p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[20px]">{section.icon}</span>
                <h2 className="text-[17px] font-medium">{section.title}</h2>
              </div>
              <p className="text-[13px] text-text-secondary mb-4">
                {section.description}
              </p>
              <ol className="flex flex-col gap-2">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-[14px]">
                    <span className="text-[11px] text-text-secondary font-medium mt-[3px] w-4 shrink-0">
                      {i + 1}.
                    </span>
                    <span className="text-text-primary">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <div className="mt-10 p-5 bg-bg-secondary rounded-xl border-[0.5px] border-border">
          <p className="text-[13px] text-text-secondary">
            ¿Tenés alguna duda que no está cubierta acá?{' '}
            <a
              href="mailto:reasoncontacto@gmail.com"
              className="text-accent hover:opacity-80 transition-opacity no-underline"
            >
              Escribinos
            </a>{' '}
            y te respondemos a la brevedad.
          </p>
        </div>
      </main>
    </div>
  )
}
