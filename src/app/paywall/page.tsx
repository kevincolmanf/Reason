import Link from 'next/link'

export default function PaywallPlaceholder() {
  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col items-center justify-center p-8">
      <div className="max-w-[480px] bg-bg-primary border-[0.5px] border-border rounded-xl p-10 text-center">
        <h1 className="text-[24px] font-medium tracking-[-0.01em] mb-4">
          Función premium
        </h1>
        <p className="text-[15px] text-text-secondary leading-[1.5] mb-8">
          Esta sección está disponible para suscriptores de Reason. Accedé a todos los módulos clínicos, la biblioteca de contenido y las herramientas de seguimiento.
        </p>
        <Link href="/checkout" className="block w-full bg-accent text-bg-primary py-3 rounded-lg text-[14px] font-medium no-underline hover:opacity-90 transition-opacity">
          Ver planes de suscripción
        </Link>
      </div>
    </div>
  )
}
