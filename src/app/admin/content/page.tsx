import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { togglePublishStatus, deleteContent } from '../actions'

export default async function AdminContentPage() {
  const supabase = createClient()
  
  const { data: contents } = await supabase
    .from('content')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-12">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-[32px] font-medium tracking-[-0.02em]">
          Contenidos
        </h1>
        <Link 
          href="/admin/content/new"
          className="bg-accent text-bg-primary px-5 py-[10px] rounded-lg text-[14px] font-medium no-underline hover:opacity-90 transition-opacity"
        >
          Nuevo contenido
        </Link>
      </div>

      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-[0.5px] border-border bg-bg-secondary">
              <th className="p-4 text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Título</th>
              <th className="p-4 text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Categoría</th>
              <th className="p-4 text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Estado</th>
              <th className="p-4 text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em] text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contents && contents.length > 0 ? (
              contents.map((item) => (
                <tr key={item.id} className="border-b-[0.5px] border-border last:border-0 hover:bg-bg-secondary transition-colors">
                  <td className="p-4">
                    <div className="text-[15px] font-medium text-text-primary mb-1">{item.title}</div>
                    <div className="text-[13px] text-text-tertiary font-mono">/{item.slug}</div>
                  </td>
                  <td className="p-4">
                    <span className="text-[13px] bg-bg-secondary border-[0.5px] border-border px-2 py-1 rounded">
                      {item.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <form action={async () => {
                      'use server'
                      await togglePublishStatus(item.id, item.published)
                    }}>
                      <button 
                        type="submit"
                        className={`text-[12px] px-2 py-1 rounded font-medium cursor-pointer border-none ${item.published ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-bg-secondary text-text-secondary'}`}
                      >
                        {item.published ? 'Publicado' : 'Borrador'}
                      </button>
                    </form>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-3 items-center">
                      <Link 
                        href={`/admin/content/${item.id}/edit`}
                        className="text-[13px] text-text-secondary hover:text-text-primary"
                      >
                        Editar
                      </Link>
                      <form action={async () => {
                        'use server'
                        await deleteContent(item.id)
                      }}>
                        <button 
                          type="submit"
                          className="text-[13px] text-warning hover:opacity-80 bg-transparent border-none cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-[14px] text-text-secondary">
                  No hay contenidos. Empezá creando uno nuevo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
