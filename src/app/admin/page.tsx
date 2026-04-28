import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = createClient()
  
  const { data: contents } = await supabase
    .from('content')
    .select('id, title, slug, published, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="p-12">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-[32px] font-medium tracking-[-0.02em]">
          Dashboard
        </h1>
        <Link 
          href="/admin/content/new"
          className="bg-accent text-bg-primary px-5 py-[10px] rounded-lg text-[14px] font-medium no-underline hover:opacity-90 transition-opacity"
        >
          Nuevo contenido
        </Link>
      </div>

      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 max-w-[800px]">
        <h2 className="text-[18px] font-medium mb-6">Últimos contenidos cargados</h2>
        
        {contents && contents.length > 0 ? (
          <div className="flex flex-col gap-4">
            {contents.map((item) => (
              <div key={item.id} className="flex justify-between items-center pb-4 border-b-[0.5px] border-border last:border-0 last:pb-0">
                <div>
                  <div className="text-[15px] font-medium mb-1">
                    {item.title}
                  </div>
                  <div className="text-[13px] text-text-tertiary">
                    /{item.slug}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[12px] px-2 py-1 rounded font-medium ${item.published ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-bg-secondary text-text-secondary'}`}>
                    {item.published ? 'Publicado' : 'Borrador'}
                  </span>
                  <Link 
                    href={`/admin/content/${item.id}/edit`}
                    className="text-[13px] text-text-secondary hover:text-text-primary"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-text-secondary">No hay contenidos todavía.</p>
        )}

        <div className="mt-8">
          <Link href="/admin/content" className="text-[14px] text-accent hover:underline">
            Ver todos los contenidos →
          </Link>
        </div>
      </div>
    </div>
  )
}
