import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-bg-secondary flex">
      {/* Sidebar */}
      <aside className="w-[240px] bg-bg-primary border-r-[0.5px] border-border flex flex-col fixed h-full">
        <div className="p-6 border-b-[0.5px] border-border">
          <Link href="/" className="text-[18px] font-medium tracking-[-0.01em] no-underline text-text-primary">
            reason<span className="text-accent">.</span> <span className="text-[11px] font-mono text-text-tertiary ml-2 uppercase">Admin</span>
          </Link>
        </div>
        
        <nav className="p-4 flex flex-col gap-2 flex-grow">
          <Link 
            href="/admin" 
            className="text-[14px] text-text-secondary hover:text-text-primary px-3 py-2 rounded-md hover:bg-bg-secondary transition-colors"
          >
            Dashboard
          </Link>
          <Link 
            href="/admin/content" 
            className="text-[14px] text-text-secondary hover:text-text-primary px-3 py-2 rounded-md hover:bg-bg-secondary transition-colors"
          >
            Contenidos
          </Link>
        </nav>

        <div className="p-6 border-t-[0.5px] border-border">
          <div className="text-[12px] text-text-secondary truncate">
            {user?.email}
          </div>
          <div className="text-[11px] text-text-tertiary mt-1">
            Admin
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-[240px]">
        {children}
      </main>
    </div>
  )
}
