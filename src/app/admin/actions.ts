'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function safeJsonParse(val: string) {
  if (!val) return null
  try {
    return JSON.parse(val)
  } catch {
    // If it's not valid JSON but they entered text, we wrap it in an array for basic compatibility
    // since the schema expects jsonb
    return val.split('\n').filter(Boolean)
  }
}

function parseCommaSeparated(val: string) {
  if (!val) return null
  return val.split(',').map(s => s.trim()).filter(Boolean)
}

export async function createContent(formData: FormData) {
  const supabase = createClient()
  
  const payload = {
    title: formData.get('title'),
    slug: formData.get('slug'),
    subtitle: formData.get('subtitle') || null,
    category: formData.get('category'),
    body_que_saber: safeJsonParse(formData.get('body_que_saber') as string),
    body_interpretacion: formData.get('body_interpretacion') || null,
    body_aplicacion: formData.get('body_aplicacion') || null,
    body_aplicacion_visual: formData.get('body_aplicacion_visual') || null,
    body_aplicacion_visual_type: formData.get('body_aplicacion_visual_type') || 'null',
    body_que_evitar: safeJsonParse(formData.get('body_que_evitar') as string),
    body_conclusion: formData.get('body_conclusion') || null,
    metadata_region: parseCommaSeparated(formData.get('metadata_region') as string),
    metadata_tema: parseCommaSeparated(formData.get('metadata_tema') as string),
    metadata_nivel: formData.get('metadata_nivel') || null,
    metadata_tags: parseCommaSeparated(formData.get('metadata_tags') as string),
    referencia: formData.get('referencia') || null,
    tiempo_lectura_min: parseInt(formData.get('tiempo_lectura_min') as string) || null,
    published: formData.get('published') === 'true',
  }

  const { error } = await supabase.from('content').insert([payload])

  if (error) {
    console.error('Error creating content:', error)
    throw new Error('No se pudo crear el contenido')
  }

  revalidatePath('/admin/content')
  revalidatePath('/admin')
  redirect('/admin/content')
}

export async function updateContent(id: string, formData: FormData) {
  const supabase = createClient()
  
  const payload = {
    title: formData.get('title'),
    slug: formData.get('slug'),
    subtitle: formData.get('subtitle') || null,
    category: formData.get('category'),
    body_que_saber: safeJsonParse(formData.get('body_que_saber') as string),
    body_interpretacion: formData.get('body_interpretacion') || null,
    body_aplicacion: formData.get('body_aplicacion') || null,
    body_aplicacion_visual: formData.get('body_aplicacion_visual') || null,
    body_aplicacion_visual_type: formData.get('body_aplicacion_visual_type') || 'null',
    body_que_evitar: safeJsonParse(formData.get('body_que_evitar') as string),
    body_conclusion: formData.get('body_conclusion') || null,
    metadata_region: parseCommaSeparated(formData.get('metadata_region') as string),
    metadata_tema: parseCommaSeparated(formData.get('metadata_tema') as string),
    metadata_nivel: formData.get('metadata_nivel') || null,
    metadata_tags: parseCommaSeparated(formData.get('metadata_tags') as string),
    referencia: formData.get('referencia') || null,
    tiempo_lectura_min: parseInt(formData.get('tiempo_lectura_min') as string) || null,
    published: formData.get('published') === 'true',
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('content').update(payload).eq('id', id)

  if (error) {
    console.error('Error updating content:', error)
    throw new Error('No se pudo actualizar el contenido')
  }

  revalidatePath('/admin/content')
  revalidatePath('/admin')
  redirect('/admin/content')
}

export async function togglePublishStatus(id: string, currentStatus: boolean) {
  const supabase = createClient()
  
  const payload = {
    published: !currentStatus,
    published_at: !currentStatus ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }

  const { error } = await supabase.from('content').update(payload).eq('id', id)

  if (error) {
    console.error('Error toggling status:', error)
    throw new Error('No se pudo cambiar el estado')
  }

  revalidatePath('/admin/content')
  revalidatePath('/admin')
}

export async function deleteContent(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase.from('content').delete().eq('id', id)

  if (error) {
    console.error('Error deleting content:', error)
    throw new Error('No se pudo eliminar')
  }

  revalidatePath('/admin/content')
  revalidatePath('/admin')
}
