export default function LibraryLoading() {
  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col">
      <header className="py-6 bg-bg-primary border-b-[0.5px] border-border sticky top-0 z-10">
        <div className="w-full max-w-[1080px] mx-auto px-8 flex justify-between items-center">
          <div className="h-6 w-32 bg-border rounded animate-pulse"></div>
          <div className="h-8 w-8 bg-border rounded-full animate-pulse"></div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12">
        <div className="mb-12">
          <div className="h-8 w-64 bg-border rounded animate-pulse mb-4"></div>
          <div className="h-4 w-48 bg-border rounded animate-pulse"></div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar / Filters Skeleton */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <div className="sticky top-[120px]">
              <div className="h-4 w-32 bg-border rounded animate-pulse mb-6"></div>
              <div className="flex flex-col gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-4 w-full bg-border rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </aside>

          {/* Search & Grid Skeleton */}
          <div className="flex-grow">
            <div className="mb-8">
              <div className="h-12 w-full bg-border rounded-lg animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col gap-4">
                  <div className="w-full aspect-[4/3] bg-border rounded-lg animate-pulse"></div>
                  <div className="h-4 w-16 bg-border rounded animate-pulse"></div>
                  <div className="h-6 w-full bg-border rounded animate-pulse"></div>
                  <div className="h-6 w-3/4 bg-border rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
