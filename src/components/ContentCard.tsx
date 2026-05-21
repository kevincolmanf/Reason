import Link from 'next/link'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ContentCard({ item }: { item: any }) {
  const categoryFormatted = item.category.replace('_', ' ')
  const categoryCapitalized = categoryFormatted.charAt(0).toUpperCase() + categoryFormatted.slice(1)
  
  let chipClass = "bg-bg-secondary text-text-secondary text-[11px] py-[4px] px-2 rounded-md"
  if (item.category === 'aplicacion_clinica') chipClass = "bg-[#F0F0F0] text-text-secondary text-[11px] py-[4px] px-2 rounded-md"
  if (item.category === 'protocolo') chipClass = "bg-bg-secondary text-text-secondary text-[11px] py-[4px] px-2 rounded-md border-[0.5px] border-accent"
  if (item.category === 'caso_real') chipClass = "bg-bg-secondary text-text-secondary text-[11px] py-[4px] px-2 rounded-md border-[0.5px] border-accent flex items-center gap-1 before:content-['⚡'] before:text-[10px] w-fit"

  const previewText = item.body_que_saber && Array.isArray(item.body_que_saber) && item.body_que_saber.length > 0 
    ? item.body_que_saber[0]
    : 'Haz clic para leer el contenido completo...'

  return (
    <Link href={`/content/${item.slug}`} className="block group no-underline h-full">
      <article className="border-[0.5px] border-border rounded-xl p-6 hover:border-border-strong transition-colors bg-bg-primary h-full flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <span className={chipClass}>{categoryCapitalized}</span>
          {item.tiempo_lectura_min && (
            <span className="text-[11px] text-text-tertiary">{item.tiempo_lectura_min} min</span>
          )}
        </div>
        <h3 className="text-[18px] font-medium leading-[1.3] text-text-primary mb-1 group-hover:text-accent transition-colors">
          {item.title}
        </h3>
        {item.subtitle && (
          <p className="text-[14px] text-text-secondary mb-4 line-clamp-1">
            {item.subtitle}
          </p>
        )}
        <p className="text-[13px] text-text-tertiary leading-[1.6] line-clamp-2 mt-auto pt-4">
          {previewText}
        </p>
      </article>
    </Link>
  )
}
