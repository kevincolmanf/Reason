export default function CajaLoading() {
  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col">
      <header className="py-6 bg-bg-primary border-b-[0.5px] border-border sticky top-0 z-10">
        <div className="w-full max-w-[1080px] mx-auto px-8 flex justify-between items-center">
          <div className="h-6 w-32 bg-border rounded animate-pulse"></div>
          <div className="h-8 w-8 bg-border rounded-full animate-pulse"></div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div className="h-8 w-40 bg-border rounded animate-pulse"></div>
          <div className="h-9 w-44 bg-border rounded animate-pulse"></div>
        </div>

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 bg-bg-primary border-[0.5px] border-border rounded-lg space-y-2">
              <div className="h-3 w-20 bg-border rounded animate-pulse"></div>
              <div className="h-7 w-24 bg-border rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Filas de movimientos */}
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 w-full bg-bg-primary border-[0.5px] border-border rounded animate-pulse"></div>
          ))}
        </div>
      </main>
    </div>
  )
}
