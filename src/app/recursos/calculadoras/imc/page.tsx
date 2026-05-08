import Header from '@/components/Header'
import Link from 'next/link'
import ImcInteractive from './ImcInteractive'

export const metadata = { title: 'Calculadora IMC | Reason' }

export default function ImcPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[800px] mx-auto px-8 py-12">
        <Link href="/recursos/calculadoras" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">← Volver a Calculadoras</Link>
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">Índice de Masa Corporal (IMC)</h1>
        <p className="text-text-secondary text-[15px] mb-10 max-w-[600px]">Calculá el IMC con categorización clínica y barra visual de referencia.</p>
        <ImcInteractive />
      </main>
    </div>
  )
}
