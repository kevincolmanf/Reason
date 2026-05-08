import Header from '@/components/Header'

const sections = [
  {
    icon: '📚',
    title: 'Biblioteca',
    description: 'Contenido clínico organizado para tu práctica.',
    steps: [
      'Accedé desde el menú superior haciendo clic en "Biblioteca".',
      'Navegá por las categorías o usá el buscador para encontrar un tema específico.',
      'Hacé clic en cualquier entrada para leer el contenido completo.',
    ],
  },
  {
    icon: '📁',
    title: 'Recursos',
    description: 'Materiales de apoyo descargables y de referencia rápida.',
    steps: [
      'Ingresá a "Recursos" desde el menú principal.',
      'Filtrá por tipo o área para encontrar lo que necesitás.',
      'Descargá o visualizá el recurso directamente desde la plataforma.',
    ],
  },
  {
    icon: '🗂️',
    title: 'Ficha Kinésica',
    description: 'Creá y gestioná fichas de evaluación de tus pacientes.',
    steps: [
      'Accedé desde el menú superior en "Ficha Kinésica".',
      'Completá los campos de evaluación según el paciente.',
      'Los datos se procesan localmente: Reason no almacena información de tus pacientes.',
    ],
  },
  {
    icon: '🏋️',
    title: 'Ejercicios',
    description: 'Explorá y seleccioná ejercicios para prescribir.',
    steps: [
      'Ingresá a "Ejercicios" desde el panel de inicio.',
      'Buscá por nombre, grupo muscular o tipo de ejercicio.',
      'Visualizá la descripción y los detalles de cada ejercicio.',
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
          Guías rápidas sobre cómo usar cada herramienta de Reason.
        </p>

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
              href="mailto:soporte@reason.com.ar"
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
