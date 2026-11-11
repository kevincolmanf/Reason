export default function AccountLoading() {
  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col">
      <header className="py-6 bg-bg-primary border-b-[0.5px] border-border sticky top-0 z-10">
        <div className="w-full max-w-[1080px] mx-auto px-8 flex justify-between items-center">
          <div className="h-6 w-32 skeleton rounded"></div>
          <div className="h-8 w-8 skeleton rounded-full"></div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[760px] mx-auto px-8 py-12">
        <div className="h-8 w-48 skeleton rounded mb-8"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 p-5 bg-bg-primary border-[0.5px] border-border rounded-lg">
              <div className="h-10 w-10 skeleton rounded-lg shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 skeleton rounded"></div>
                <div className="h-3 w-64 skeleton rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
