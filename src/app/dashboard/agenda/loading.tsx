export default function AgendaLoading() {
  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col">
      <header className="py-6 bg-bg-primary border-b-[0.5px] border-border sticky top-0 z-10">
        <div className="w-full max-w-[1080px] mx-auto px-8 flex justify-between items-center">
          <div className="h-6 w-32 skeleton rounded"></div>
          <div className="h-8 w-8 skeleton rounded-full"></div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[1200px] mx-auto px-8 py-10">
        {/* Toolbar: título + navegación de fecha + botón */}
        <div className="flex justify-between items-center mb-8">
          <div className="h-8 w-40 skeleton rounded"></div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 skeleton rounded"></div>
            <div className="h-9 w-48 skeleton rounded"></div>
            <div className="h-9 w-9 skeleton rounded"></div>
          </div>
        </div>

        {/* Grilla semanal */}
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((col) => (
            <div key={col} className="flex flex-col gap-2">
              <div className="h-5 w-full skeleton rounded mb-1"></div>
              {[1, 2, 3, 4, 5].map((row) => (
                <div
                  key={row}
                  className="h-16 w-full bg-bg-primary border-[0.5px] border-border rounded"
                ></div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
