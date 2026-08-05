export default function EjerciciosLoading() {
  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col">
      <header className="py-6 bg-bg-primary border-b-[0.5px] border-border sticky top-0 z-10">
        <div className="w-full max-w-[1080px] mx-auto px-8 flex justify-between items-center">
          <div className="h-6 w-32 bg-border rounded animate-pulse"></div>
          <div className="h-8 w-8 bg-border rounded-full animate-pulse"></div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12">
        <div className="mb-10">
          <div className="h-8 w-56 bg-border rounded animate-pulse mb-4"></div>
          <div className="h-4 w-72 bg-border rounded animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-4 p-6 bg-bg-primary border-[0.5px] border-border rounded-lg">
              <div className="h-10 w-10 bg-border rounded-lg animate-pulse"></div>
              <div className="h-6 w-40 bg-border rounded animate-pulse"></div>
              <div className="h-4 w-full bg-border rounded animate-pulse"></div>
              <div className="h-4 w-3/4 bg-border rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
