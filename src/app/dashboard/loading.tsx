export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col">
      <header className="py-6 bg-bg-primary border-b-[0.5px] border-border sticky top-0 z-10">
        <div className="w-full max-w-[1080px] mx-auto px-8 flex justify-between items-center">
          <div className="h-6 w-32 skeleton rounded"></div>
          <div className="h-8 w-8 skeleton rounded-full"></div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12">
        <div className="mb-12">
          <div className="h-8 w-48 skeleton rounded mb-4"></div>
          <div className="h-4 w-64 skeleton rounded"></div>
        </div>

        <section className="mb-16">
          <div className="flex justify-between items-end mb-8 border-b-[0.5px] border-border pb-4">
            <div className="h-6 w-40 skeleton rounded"></div>
            <div className="h-4 w-24 skeleton rounded"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-4">
                <div className="w-full aspect-[4/3] skeleton rounded-lg"></div>
                <div className="h-4 w-16 skeleton rounded"></div>
                <div className="h-6 w-full skeleton rounded"></div>
                <div className="h-6 w-3/4 skeleton rounded"></div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
