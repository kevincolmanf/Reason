'use client'

// Next.js crea una instancia nueva de este componente en cada navegación (a
// diferencia de layout.tsx, que persiste) — por eso es el lugar correcto para
// una animación de entrada de página sin librerías externas ni manejo manual
// de pathname/key.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-enter">{children}</div>
}
