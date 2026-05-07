import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'

// Helper para renderizar texto que puede tener saltos de línea (párrafos)
function renderParagraphs(text: string | null) {
  if (!text) return null
  return text.split('\n').filter(Boolean).map((p, i) => (
    <p key={i} className="text-[15px] leading-[1.65] mb-3">
      {p}
    </p>
  ))
}

// Helper para renderizar listas JSON (qué saber, qué evitar)
function renderList(items: string[]) {
  if (!items || !Array.isArray(items) || items.length === 0) return null
  return (
    <ul className="list-none mb-2">
      {items.map((item, i) => (
        <li key={i} className="py-[6px] pl-4 text-[15px] leading-[1.6] relative before:content-['·'] before:absolute before:left-0 before:text-text-secondary">
          {item}
        </li>
      ))}
    </ul>
  )
}

export default async function ContentPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()
  
  const { data: content, error } = await supabase
    .from('content')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (error || !content) {
    notFound()
  }

  // Auth protection logic
  const { data: { user } } = await supabase.auth.getUser()
  if (user && params.slug !== 'dolor-lumbar-inespecifico') {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
      
    if (userData && userData.role === 'free') {
      const { redirect } = await import('next/navigation')
      redirect('/paywall')
    }
  }

  // Formatting tags
  const categoryFormatted = content.category.replace('_', ' ')
  const categoryCapitalized = categoryFormatted.charAt(0).toUpperCase() + categoryFormatted.slice(1)
  
  let chipClass = "bg-bg-secondary text-text-secondary text-[12px] py-[6px] px-3 rounded-md"
  if (content.category === 'aplicacion_clinica') chipClass = "bg-[#F0F0F0] text-text-secondary text-[12px] py-[6px] px-3 rounded-md"
  if (content.category === 'protocolo') chipClass = "bg-bg-secondary text-text-secondary text-[12px] py-[6px] px-3 rounded-md border-[0.5px] border-accent"
  if (content.category === 'caso_real') chipClass = "bg-bg-secondary text-text-secondary text-[12px] py-[6px] px-3 rounded-md border-[0.5px] border-accent flex items-center gap-1 before:content-['⚡'] before:text-[10px]"

  // Combine regions into a string if it's an array
  const regions = Array.isArray(content.metadata_region) ? content.metadata_region.join(', ') : null

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* HEADER */}
      <Header />

      {/* Contenido principal idéntico a la sección Preview de la Landing */}
      <main className="py-[96px]">
        <div className="w-full max-w-[720px] mx-auto px-8">
          
          <div className="flex gap-2 mb-6 flex-wrap">
            <span className={chipClass}>
              {categoryCapitalized}
            </span>
            {regions && (
              <span className="bg-bg-secondary text-text-secondary text-[12px] py-[6px] px-3 rounded-md">
                {regions}
              </span>
            )}
            {content.tiempo_lectura_min && (
              <span className="bg-bg-secondary text-text-secondary text-[12px] py-[6px] px-3 rounded-md">
                {content.tiempo_lectura_min} min de lectura
              </span>
            )}
          </div>

          <h1 className="text-[32px] md:text-[40px] font-medium leading-[1.15] mb-2 tracking-[-0.02em]">
            {content.title}
          </h1>
          
          {content.subtitle && (
            <p className="text-[18px] text-text-secondary mb-10">
              {content.subtitle}
            </p>
          )}

          {/* QUÉ TENÉS QUE SABER */}
          {content.body_que_saber && content.body_que_saber.length > 0 && (
            <>
              <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mt-12 mb-4">
                Qué tenés que saber
              </div>
              {renderList(content.body_que_saber)}
            </>
          )}

          {/* INTERPRETACIÓN CLÍNICA */}
          {content.body_interpretacion && (
            <>
              <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mt-12 mb-4">
                Interpretación clínica
              </div>
              {renderParagraphs(content.body_interpretacion)}
            </>
          )}

          {/* APLICACIÓN PRÁCTICA */}
          {(content.body_aplicacion || (content.body_aplicacion_visual && content.body_aplicacion_visual_type !== 'null')) && (
            <div className="bg-bg-secondary rounded-xl p-8 my-8">
              <div className="text-[11px] font-medium text-text-secondary tracking-[0.05em] uppercase mb-1">
                Aplicación práctica
              </div>
              
              {content.body_aplicacion_visual_type !== 'null' && (
                <div className="text-[13px] text-text-tertiary mb-6 capitalize">
                  {content.body_aplicacion_visual_type.replace('_', ' ')}
                </div>
              )}

              {/* Si hay un SVG guardado, lo renderizamos de forma segura usando dangerouslySetInnerHTML */}
              {content.body_aplicacion_visual && (
                <div 
                  className="mb-6 w-full overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: content.body_aplicacion_visual }} 
                />
              )}

              {content.body_aplicacion && renderParagraphs(content.body_aplicacion)}
            </div>
          )}

          {/* QUÉ EVITAR */}
          {content.body_que_evitar && content.body_que_evitar.length > 0 && (
            <>
              <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mt-12 mb-4">
                Qué evitar
              </div>
              {renderList(content.body_que_evitar)}
            </>
          )}

          {/* CONCLUSIÓN ACCIONABLE */}
          {content.body_conclusion && (
            <div className="border-l-[3px] border-text-primary py-4 px-6 mt-12 bg-bg-secondary">
              <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-3">
                Conclusión accionable
              </div>
              <p className="text-[18px] leading-[1.5] font-medium">
                {content.body_conclusion}
              </p>
            </div>
          )}

          {/* REFERENCIA */}
          {content.referencia && (
            <div className="mt-16 pt-8 border-t-[0.5px] border-border">
              <div className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-2">
                Referencia bibliográfica
              </div>
              <p className="text-[13px] text-text-secondary">
                {content.referencia}
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
