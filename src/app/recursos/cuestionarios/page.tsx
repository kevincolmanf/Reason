import Header from '@/components/Header'
import Link from 'next/link'

function QuestionnaireCard({ title, region, items, slug, desc }: { title: string, region: string, items: string, slug: string, desc?: string }) {
  return (
    <Link href={`/recursos/cuestionarios/${slug}`} className="block no-underline">
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full flex flex-col">
        <div className="flex gap-2 mb-4 flex-wrap">
          <span className="bg-bg-secondary text-text-secondary text-[11px] py-1 px-2 rounded-md uppercase tracking-[0.05em] border-[0.5px] border-border">
            {region}
          </span>
          <span className="bg-bg-secondary text-text-secondary text-[11px] py-1 px-2 rounded-md uppercase tracking-[0.05em] border-[0.5px] border-border">
            {items}
          </span>
        </div>
        <h3 className="text-[18px] font-medium mb-2 text-text-primary">{title}</h3>
        {desc && <p className="text-[13px] text-text-secondary leading-[1.4] mb-2">{desc}</p>}
        <div className="mt-auto pt-4 flex items-center text-accent text-[13px] font-medium">
          Aplicar cuestionario →
        </div>
      </div>
    </Link>
  )
}

export default function CuestionariosPage() {
  const cuestionarios = [
    { title: 'Tampa Scale of Kinesiophobia', slug: 'tampa', region: 'General', items: '17 ítems', desc: 'Kinesiofobia — miedo al movimiento y relesión.' },
    { title: 'Pain Catastrophizing Scale', slug: 'catastrofismo', region: 'General', items: '13 ítems', desc: 'Catastrofismo ante el dolor. Predictor de cronificación.' },
    { title: 'FABQ', slug: 'fabq', region: 'General', items: '16 ítems', desc: 'Creencias miedo-evitación — 16 ítems. Predictor de cronificación.' },
    { title: 'PSFS', slug: 'psfs', region: 'General', items: '3 actividades', desc: 'Funcional específico del paciente — 3 actividades elegidas por el paciente.' },
    { title: 'SPADI (Shoulder Pain and Disability)', slug: 'spadi', region: 'Hombro', items: '13 ítems', desc: 'Dolor y discapacidad de hombro.' },
    { title: 'DASH', slug: 'dash', region: 'Miembro Superior', items: '30 ítems', desc: 'Función miembro superior — 30 ítems. Hombro, codo, muñeca y mano.' },
    { title: 'NDI (Neck Disability Index)', slug: 'ndi', region: 'Cervical', items: '10 ítems', desc: 'Discapacidad cervical. Gold standard para cuello.' },
    { title: 'Roland-Morris Disability', slug: 'roland-morris', region: 'Lumbar', items: '24 ítems', desc: 'Discapacidad por dolor lumbar.' },
    { title: 'STarT Back Screening Tool', slug: 'start-back', region: 'Lumbar', items: '9 ítems', desc: 'Estratificación de riesgo en lumbalgia.' },
    { title: 'Oswestry Disability Index (ODI)', slug: 'oswestry', region: 'Lumbar', items: '10 secciones', desc: 'Incapacidad lumbar — gold standard para columna lumbar.' },
    { title: 'LEFS', slug: 'lefs', region: 'Miembro Inferior', items: '20 ítems', desc: 'Función miembro inferior — 20 ítems. Cadera, rodilla, tobillo y pie.' },
  ]

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12">
        <div className="mb-8">
          <Link href="/recursos" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">
            ← Volver a Recursos
          </Link>
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-4">
            Cuestionarios Validados
          </h1>
          <p className="text-text-secondary text-[18px] max-w-[720px] leading-[1.5]">
            Completá el cuestionario en línea para obtener el score e interpretación automática, o descargá el PDF en blanco para tu paciente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cuestionarios.map(c => (
            <QuestionnaireCard key={c.slug} {...c} />
          ))}
        </div>
      </main>
    </div>
  )
}
