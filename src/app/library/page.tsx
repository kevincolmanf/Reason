import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ContentCard from '@/components/ContentCard'
import Header from '@/components/Header'

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const category = typeof searchParams.category === 'string' ? searchParams.category : null
  const query = typeof searchParams.q === 'string' ? searchParams.q : null

  // Construir la consulta
  let dbQuery = supabase
    .from('content')
    .select('id, title, subtitle, slug, category, tiempo_lectura_min, body_que_saber')
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (category) {
    dbQuery = dbQuery.eq('category', category)
  }
  if (query) {
    dbQuery = dbQuery.ilike('title', `%${query}%`)
  }

  const { data: contents } = await dbQuery

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* HEADER */}
      <Header />

      {/* MAIN CONTENT */}
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-8 py-12 flex flex-col md:flex-row gap-12">
        
        {/* SIDEBAR FILTROS */}
        <aside className="w-full md:w-[240px] flex-shrink-0">
          <div className="sticky top-[120px]">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.05em] text-text-secondary mb-4">
              Filtros
            </h2>

            {/* Buscador simple (simulado con links por ahora para no complicar con client components) */}
            <div className="mb-8">
              <form method="GET" action="/library">
                <input 
                  type="text" 
                  name="q" 
                  defaultValue={query || ''} 
                  placeholder="Buscar contenido..." 
                  className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[13px] focus:outline-none focus:border-accent transition-colors"
                />
                {category && <input type="hidden" name="category" value={category} />}
                <button type="submit" className="hidden">Buscar</button>
              </form>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.05em] mb-2">Categoría</div>
              <Link 
                href="/library" 
                className={`text-[14px] no-underline py-2 px-3 rounded-md transition-colors ${!category ? 'bg-bg-secondary text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Todas las categorías
              </Link>
              <Link 
                href="/library?category=resumen_comentado" 
                className={`text-[14px] no-underline py-2 px-3 rounded-md transition-colors ${category === 'resumen_comentado' ? 'bg-bg-secondary text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Resumen Comentado
              </Link>
              <Link 
                href="/library?category=aplicacion_clinica" 
                className={`text-[14px] no-underline py-2 px-3 rounded-md transition-colors ${category === 'aplicacion_clinica' ? 'bg-bg-secondary text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Aplicación Clínica
              </Link>
              <Link 
                href="/library?category=protocolo" 
                className={`text-[14px] no-underline py-2 px-3 rounded-md transition-colors ${category === 'protocolo' ? 'bg-bg-secondary text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Protocolos
              </Link>
              <Link 
                href="/library?category=caso_real" 
                className={`text-[14px] no-underline py-2 px-3 rounded-md transition-colors ${category === 'caso_real' ? 'bg-bg-secondary text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Casos Reales
              </Link>
            </div>
          </div>
        </aside>

        {/* GRID DE RESULTADOS */}
        <section className="flex-grow">
          <div className="flex justify-between items-end mb-6">
            <h1 className="text-[24px] font-medium tracking-[-0.01em]">
              {category ? `Explorando: ${category.replace('_', ' ')}` : 'Toda la biblioteca'}
            </h1>
            <span className="text-[13px] text-text-tertiary">
              {contents?.length || 0} resultados
            </span>
          </div>

          {contents && contents.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {contents.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="bg-bg-secondary rounded-xl p-16 text-center border-[0.5px] border-border mt-8">
              <p className="text-[15px] font-medium text-text-primary mb-2">
                {query ? `No se encontraron resultados para "${query}"` : 'No se encontraron resultados'}
              </p>
              <p className="text-[14px] text-text-secondary">Intentá cambiar los filtros o el término de búsqueda.</p>
              <Link href="/library" className="inline-block mt-6 text-[13px] text-bg-primary bg-accent px-4 py-2 rounded-lg no-underline hover:opacity-90 transition-opacity">
                Limpiar filtros
              </Link>
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
