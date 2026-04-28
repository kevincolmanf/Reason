'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createContent, updateContent } from '../actions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ContentForm({ initialData }: { initialData?: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!initialData

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    try {
      if (isEditing) {
        await updateContent(initialData.id, formData)
      } else {
        await createContent(formData)
      }
    } catch (error) {
      console.error(error)
      alert('Error al guardar el contenido')
      setIsSubmitting(false)
    }
  }

  // Helper para convertir JSON a texto con saltos de línea para los textareas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const joinJson = (val: any) => {
    if (!val) return ''
    if (Array.isArray(val)) return val.join('\n')
    return String(val)
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-8 max-w-[800px] bg-bg-primary border-[0.5px] border-border p-8 rounded-xl">
      <div className="flex justify-between items-center border-b-[0.5px] border-border pb-6">
        <h2 className="text-[20px] font-medium tracking-[-0.01em]">
          {isEditing ? 'Editar contenido' : 'Nuevo contenido'}
        </h2>
        <div className="flex gap-4 items-center">
          <Link href="/admin/content" className="text-[14px] text-text-secondary hover:text-text-primary transition-colors">
            Cancelar
          </Link>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-accent text-bg-primary px-5 py-[10px] rounded-lg text-[14px] font-medium no-underline hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar contenido'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TITULO Y SLUG */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Título *</label>
          <input required name="title" defaultValue={initialData?.title} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Slug * (URL)</label>
          <input required name="slug" defaultValue={initialData?.slug} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors font-mono" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Subtítulo</label>
          <input name="subtitle" defaultValue={initialData?.subtitle} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Categoría *</label>
          <select required name="category" defaultValue={initialData?.category || 'resumen_comentado'} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors">
            <option value="resumen_comentado">Resumen Comentado</option>
            <option value="aplicacion_clinica">Aplicación Clínica</option>
            <option value="protocolo">Protocolo</option>
            <option value="caso_real">Caso Real</option>
          </select>
        </div>
      </div>

      <div className="border-t-[0.5px] border-border pt-6">
        <h3 className="text-[16px] font-medium mb-4 text-accent">Cuerpo del Contenido</h3>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Qué tenés que saber (JSON - 1 por línea)</label>
            <textarea name="body_que_saber" defaultValue={joinJson(initialData?.body_que_saber)} rows={4} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors" />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Interpretación</label>
            <textarea name="body_interpretacion" defaultValue={initialData?.body_interpretacion} rows={5} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Aplicación</label>
            <textarea name="body_aplicacion" defaultValue={initialData?.body_aplicacion} rows={5} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Tipo de Visualización</label>
              <select name="body_aplicacion_visual_type" defaultValue={initialData?.body_aplicacion_visual_type || 'null'} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors">
                <option value="null">Ninguna</option>
                <option value="arbol">Árbol</option>
                <option value="tabla">Tabla</option>
                <option value="linea_tiempo">Línea de tiempo</option>
                <option value="algoritmo">Algoritmo</option>
                <option value="diagnostico_diferencial">Diagnóstico diferencial</option>
                <option value="esquema_anatomico">Esquema anatómico</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Código SVG de Visualización</label>
              <textarea name="body_aplicacion_visual" defaultValue={initialData?.body_aplicacion_visual} rows={6} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[13px] font-mono focus:outline-none focus:border-accent transition-colors" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Qué evitar (JSON - 1 por línea)</label>
            <textarea name="body_que_evitar" defaultValue={joinJson(initialData?.body_que_evitar)} rows={4} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Conclusión</label>
            <textarea name="body_conclusion" defaultValue={initialData?.body_conclusion} rows={3} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors" />
          </div>
        </div>
      </div>

      <div className="border-t-[0.5px] border-border pt-6">
        <h3 className="text-[16px] font-medium mb-4 text-accent">Metadata</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Región (separado por comas)</label>
            <input name="metadata_region" defaultValue={joinJson(initialData?.metadata_region)?.replace(/\n/g, ', ')} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Temas (separado por comas)</label>
            <input name="metadata_tema" defaultValue={joinJson(initialData?.metadata_tema)?.replace(/\n/g, ', ')} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Nivel *</label>
            <select required name="metadata_nivel" defaultValue={initialData?.metadata_nivel || 'fundamentos'} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors">
              <option value="fundamentos">Fundamentos</option>
              <option value="aplicado">Aplicado</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Tags (separado por comas)</label>
            <input name="metadata_tags" defaultValue={joinJson(initialData?.metadata_tags)?.replace(/\n/g, ', ')} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Referencia</label>
            <input name="referencia" defaultValue={initialData?.referencia} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.05em]">Tiempo de lectura (minutos)</label>
            <input type="number" name="tiempo_lectura_min" defaultValue={initialData?.tiempo_lectura_min} className="w-full p-3 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[14px] focus:outline-none focus:border-accent transition-colors" />
          </div>
        </div>
      </div>

      <div className="border-t-[0.5px] border-border pt-6 flex items-center gap-3">
        <input 
          type="checkbox" 
          id="published" 
          name="published" 
          value="true"
          defaultChecked={initialData?.published}
          className="w-4 h-4 accent-accent"
        />
        <label htmlFor="published" className="text-[15px] font-medium">Publicar inmediatamente</label>
      </div>
    </form>
  )
}
