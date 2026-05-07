import Header from '@/components/Header'
import Link from 'next/link'
import LumbarRedFlags from './LumbarRedFlags'

export const metadata = {
  title: 'Banderas Rojas Lumbares | Reason',
}

export default function LumbarRedFlagsPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[720px] mx-auto px-8 py-12">
        <div className="mb-8">
          <Link href="/recursos/banderas-rojas" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">
            ← Volver a Banderas Rojas
          </Link>
          <div className="flex gap-2 mb-4">
            <span className="bg-bg-secondary text-warning text-[11px] py-1 px-2 rounded-md uppercase tracking-[0.05em] border-[0.5px] border-border font-medium">
              Checklist de Seguridad
            </span>
          </div>
          <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-4 text-warning">
            Banderas Rojas Lumbares
          </h1>
          <p className="text-text-secondary text-[16px] leading-[1.5]">
            Marcá cualquier signo o síntoma presente. La presencia de banderas rojas puede indicar patología grave (infección, cáncer, fractura o síndrome de cola de caballo) y podría requerir derivación médica inmediata o estudios por imágenes.
          </p>
        </div>

        <LumbarRedFlags />
      </main>
    </div>
  )
}
