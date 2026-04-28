import ContentForm from '../../../components/ContentForm'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'

export default async function EditContentPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  
  const { data: content, error } = await supabase
    .from('content')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !content) {
    notFound()
  }

  return (
    <div className="p-12">
      <div className="mb-10">
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">
          Editar Contenido
        </h1>
        <p className="text-text-secondary text-[16px] font-mono text-[13px]">
          ID: {content.id}
        </p>
      </div>

      <ContentForm initialData={content} />
    </div>
  )
}
