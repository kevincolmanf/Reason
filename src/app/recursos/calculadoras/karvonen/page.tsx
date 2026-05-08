import Header from '@/components/Header'
import Link from 'next/link'
import KarvonenInteractive from './KarvonenInteractive'

export const metadata = { title: 'Zonas FC Karvonen | Reason' }

export default function KarvonenPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[800px] mx-auto px-8 py-12">
        <Link href="/recursos/calculadoras" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors no-underline flex items-center gap-2 mb-6">← Volver a Calculadoras</Link>
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">Zonas de FC — Método Karvonen</h1>
        <p className="text-text-secondary text-[15px] mb-10 max-w-[600px]">Calculá las 5 zonas de entrenamiento por frecuencia cardíaca usando la Frecuencia Cardíaca de Reserva.</p>
        <KarvonenInteractive />
      </main>
    </div>
  )
}
