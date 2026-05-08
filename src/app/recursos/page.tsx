import Header from '@/components/Header'
import Link from 'next/link'

function ResourceCard({ title, desc, href }: { title: string, desc: string, href: string }) {
  return (
    <Link href={href} className="block no-underline">
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-8 hover:bg-[#1A1A18] transition-colors h-full flex flex-col justify-center">
        <h3 className="text-[20px] font-medium mb-3 text-text-primary">{title}</h3>
        <p className="text-[14px] text-text-secondary leading-[1.5]">{desc}</p>
      </div>
    </Link>
  )
}

export default function RecursosPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12">
        <div className="mb-12">
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-4">
            Recursos Clínicos
          </h1>
          <p className="text-text-secondary text-[18px] max-w-[720px] leading-[1.5]">
            Herramientas validadas y calculadoras diseñadas para usar en el consultorio. 
            No almacenamos datos de tus pacientes, los resultados son para tu gestión.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ResourceCard
            title="Cuestionarios Validados"
            desc="Cuestionarios interactivos con cálculo automático de score e interpretación clínica."
            href="/recursos/cuestionarios"
          />
          <ResourceCard
            title="Calculadoras"
            desc="Cálculo rápido de métricas clínicas como 1RM, IMC, VO2max y zonas de FC."
            href="/recursos/calculadoras"
          />
          <ResourceCard
            title="Banderas Rojas"
            desc="Checklists de referencia rápida para descartar patologías severas."
            href="/recursos/banderas-rojas"
          />
          <ResourceCard
            title="Dinamómetro (HHD)"
            desc="Evaluación bilateral de fuerza muscular con cálculo automático del LSI y ratio H:Q."
            href="/recursos/dinamometro"
          />
        </div>
      </main>
    </div>
  )
}
