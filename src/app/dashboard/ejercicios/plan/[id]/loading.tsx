export default function PlanEditorLoading() {
  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col">
      <header className="py-6 bg-bg-primary border-b-[0.5px] border-border sticky top-0 z-10">
        <div className="w-full max-w-[1080px] mx-auto px-8 flex justify-between items-center">
          <div className="h-6 w-32 bg-border rounded animate-pulse"></div>
          <div className="h-8 w-8 bg-border rounded-full animate-pulse"></div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[1440px] mx-auto px-8 py-10">
        {/* Encabezado del plan */}
        <div className="flex justify-between items-start mb-10">
          <div className="flex flex-col gap-3">
            <div className="h-7 w-64 bg-border rounded animate-pulse"></div>
            <div className="h-4 w-40 bg-border rounded animate-pulse"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-border rounded-lg animate-pulse"></div>
            <div className="h-10 w-28 bg-border rounded-lg animate-pulse"></div>
          </div>
        </div>

        {/* Bloques de ejercicios */}
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map((block) => (
            <div key={block} className="p-6 bg-bg-primary border-[0.5px] border-border rounded-lg">
              <div className="h-5 w-48 bg-border rounded animate-pulse mb-5"></div>
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((row) => (
                  <div key={row} className="flex items-center gap-4">
                    <div className="h-12 w-16 bg-border rounded animate-pulse flex-shrink-0"></div>
                    <div className="h-4 w-52 bg-border rounded animate-pulse"></div>
                    <div className="h-4 w-20 bg-border rounded animate-pulse ml-auto"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
