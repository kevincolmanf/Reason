export default function PacienteDetailLoading() {
  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col">
      <header className="py-6 bg-bg-primary border-b-[0.5px] border-border sticky top-0 z-10">
        <div className="w-full max-w-[1080px] mx-auto px-8 flex justify-between items-center">
          <div className="h-6 w-32 bg-border rounded animate-pulse"></div>
          <div className="h-8 w-8 bg-border rounded-full animate-pulse"></div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[1200px] mx-auto px-8 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-3 w-20 bg-border rounded animate-pulse"></div>
          <div className="h-3 w-3 bg-border rounded animate-pulse"></div>
          <div className="h-3 w-28 bg-border rounded animate-pulse"></div>
        </div>

        {/* Patient header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="h-14 w-14 bg-border rounded-full animate-pulse flex-shrink-0"></div>
          <div className="flex flex-col gap-2">
            <div className="h-7 w-52 bg-border rounded animate-pulse"></div>
            <div className="h-4 w-36 bg-border rounded animate-pulse"></div>
          </div>
        </div>

        {/* Tool cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col gap-3 p-5 bg-bg-primary border-[0.5px] border-border rounded-lg">
              <div className="h-9 w-9 bg-border rounded-lg animate-pulse"></div>
              <div className="h-5 w-32 bg-border rounded animate-pulse"></div>
              <div className="h-3 w-full bg-border rounded animate-pulse"></div>
              <div className="h-3 w-2/3 bg-border rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
