import Header from '@/components/Header'
import Link from 'next/link'

function FlagCard({ title, desc, href }: { title: string, desc: string, href: string }) {
  return (
    <Link href={href} className="block no-underline">
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full flex flex-col">
        <h3 className="text-[18px] font-medium mb-2 text-warning">{title}</h3>
        <p className="text-[13px] text-text-secondary leading-[1.5] mb-4">{desc}</p>
        <div className="mt-auto pt-4 flex items-center text-accent text-[13px] font-medium">
          Ver checklist →
        </div>
      </div>
    </Link>
  )
}

export default function BanderasRojasPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12">
        <div className="mb-8">
          <Link href="/recursos" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">
            ← Volver a Recursos
          </Link>
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-4">
            Banderas Rojas (Red Flags)
          </h1>
          <p className="text-text-secondary text-[18px] max-w-[720px] leading-[1.5]">
            Checklists rápidos para la detección de signos y síntomas de alerta de patologías severas que requieren derivación médica.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FlagCard 
            title="Banderas Rojas Lumbares" 
            desc="Cribado de patologías graves de la columna lumbar (fracturas, infección, cauda equina, tumor)."
            href="/recursos/banderas-rojas/lumbar"
          />
        </div>
      </main>
    </div>
  )
}
