import Header from '@/components/Header'
import Link from 'next/link'
import Vo2maxInteractive from './Vo2maxInteractive'

export const metadata = { title: 'VO2max Estimado | Reason' }

export default function Vo2maxPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[800px] mx-auto px-8 py-12">
        <Link href="/recursos/calculadoras" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">← Volver a Calculadoras</Link>
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">VO2max Estimado</h1>
        <p className="text-text-secondary text-[15px] mb-10 max-w-[600px]">Estimación del consumo máximo de oxígeno por test de Rockport (caminata 1.6 km) o fórmula de FC de reserva (Uth et al.).</p>
        <Vo2maxInteractive />
      </main>
    </div>
  )
}
