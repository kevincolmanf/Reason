import Link from 'next/link'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ContentCard({ item, locked = false }: { item: any; locked?: boolean }) {
  const categoryFormatted = item.category.replace('_', ' ')
  const categoryCapitalized = categoryFormatted.charAt(0).toUpperCase() + categoryFormatted.slice(1)

  let chipClass = "bg-bg-secondary text-text-secondary text-[11px] py-[4px] px-2 rounded-md"
  if (item.category === 'aplicacion_clinica') chipClass = "bg-[#F0F0F0] text-text-secondary text-[11px] py-[4px] px-2 rounded-md"
  if (item.category === 'protocolo') chipClass = "bg-bg-secondary text-text-secondary text-[11px] py-[4px] px-2 rounded-md border-[0.5px] border-accent"
  if (item.category === 'caso_real') chipClass = "bg-bg-secondary text-text-secondary text-[11px] py-[4px] px-2 rounded-md border-[0.5px] border-accent flex items-center gap-1 before:content-['⚡'] before:text-[10px] w-fit"

  const previewText = item.body_que_saber && Array.isArray(item.body_que_saber) && item.body_que_saber.length > 0
    ? item.body_que_saber[0]
    : 'Haz clic para leer el contenido completo...'

  const href = locked ? '/checkout' : `/content/${item.slug}`

  return (
    <Link href={href} className="block group no-underline h-full">
      <article className={`border-[0.5px] border-border rounded-xl p-6 transition-colors bg-bg-primary h-full flex flex-col relative overflow-hidden ${locked ? 'hover:border-accent' : 'hover:border-border-strong'}`}>
        <div className="flex justify-between items-start mb-4">
          <span className={chipClass}>{categoryCapitalized}</span>
          <div className="flex items-center gap-2">
            {item.tiempo_lectura_min && (
              <span className="text-[11px] text-text-tertiary">{item.tiempo_lectura_min} min</span>
            )}
            {locked && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            )}
          </div>
        </div>
        <h3 className={`text-[18px] font-medium leading-[1.3] mb-1 transition-colors ${locked ? 'text-text-primary group-hover:text-accent' : 'text-text-primary group-hover:text-accent'}`}>
          {item.title}
        </h3>
        {item.subtitle && (
          <p className="text-[14px] text-text-secondary mb-4 line-clamp-1">
            {item.subtitle}
          </p>
        )}
        <p className={`text-[13px] leading-[1.6] line-clamp-2 mt-auto pt-4 transition-all ${locked ? 'text-transparent bg-clip-text' : 'text-text-tertiary'}`}
          style={locked ? { textShadow: '0 0 8px rgba(0,0,0,0.25)', color: 'transparent', filter: 'blur(3.5px)', userSelect: 'none' } : {}}>
          {previewText}
        </p>
        {locked && (
          <div className="absolute bottom-6 left-6 right-6 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[12px] text-accent font-medium">Suscribite para leer</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        )}
      </article>
    </Link>
  )
}
