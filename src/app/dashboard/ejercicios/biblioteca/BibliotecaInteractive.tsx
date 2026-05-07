'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Exercise {
  id: string
  name: string
  youtube_url: string
  category: string
  equipment: string
  pattern: string
  contraction_type: string
  exercise_type: string
}

export default function BibliotecaInteractive({ equipments }: { equipments: string[] }) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [equipment, setEquipment] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [activeVideo, setActiveVideo] = useState<string | null>(null)

  const PAGE_SIZE = 50
  const supabase = createClient()

  const fetchExercises = useCallback(async (reset: boolean = false) => {
    setLoading(true)
    const currentPage = reset ? 0 : page
    
    let query = supabase
      .from('exercises')
      .select('*')
      .order('name')
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)

    if (search) query = query.ilike('name', `%${search}%`)
    if (category) query = query.eq('category', category)
    if (equipment) query = query.eq('equipment', equipment)

    const { data, error } = await query

    if (!error && data) {
      if (reset) {
        setExercises(data)
      } else {
        setExercises(prev => [...prev, ...data])
      }
      setHasMore(data.length === PAGE_SIZE)
    }
    setLoading(false)
  }, [search, category, equipment, page, supabase])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [search, category, equipment])

  // Fetch when filters or page change
  useEffect(() => {
    fetchExercises(page === 0)
  }, [page, search, category, equipment, fetchExercises])

  const formatCategory = (cat: string) => {
    const map: Record<string, string> = {
      'lower_body': 'Lower Body',
      'upper_body': 'Upper Body',
      'trunk_core': 'Trunk & Core',
      'jump': 'Jump',
      'speed': 'Speed',
      'mobility_stretch': 'Mobility',
      'conditioning': 'Conditioning',
      'testing': 'Testing',
      'adjuntos': 'Adjuntos (Build)'
    }
    return map[cat] || cat
  }

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  return (
    <div>
      {/* FILTERS */}
      <div className="bg-bg-secondary p-6 rounded-xl border-[0.5px] border-border mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Buscar</label>
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ej: Squat..."
            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Categoría</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent appearance-none"
          >
            <option value="">Todas las categorías</option>
            <option value="lower_body">Lower Body</option>
            <option value="upper_body">Upper Body</option>
            <option value="trunk_core">Trunk & Core</option>
            <option value="jump">Jump</option>
            <option value="speed">Speed</option>
            <option value="mobility_stretch">Mobility & Stretch</option>
            <option value="conditioning">Conditioning</option>
            <option value="testing">Testing</option>
            <option value="adjuntos">Adjuntos (Build)</option>
          </select>
        </div>
        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Equipamiento</label>
          <select 
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent appearance-none"
          >
            <option value="">Todo el equipo</option>
            {equipments.map(eq => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {exercises.map(ex => (
          <div key={ex.id} className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 flex flex-col hover:border-border-strong transition-colors">
            <div className="mb-4">
              <span className="inline-block bg-bg-secondary text-text-secondary text-[10px] py-1 px-2 rounded-full uppercase tracking-[0.05em] border-[0.5px] border-border font-medium">
                {formatCategory(ex.category)}
              </span>
            </div>
            <h3 className="text-[16px] font-medium leading-[1.3] mb-2">{ex.name}</h3>
            
            <div className="text-[12px] text-text-secondary mb-6 flex-grow">
              {ex.equipment && ex.equipment !== 'nan' && <p>Equipo: {ex.equipment}</p>}
              {ex.pattern && ex.pattern !== 'nan' && <p>Patrón: {ex.pattern}</p>}
            </div>

            <div className="flex justify-between items-center mt-auto pt-4 border-t-[0.5px] border-border">
              {ex.youtube_url && ex.youtube_url !== 'nan' ? (
                <button 
                  onClick={() => setActiveVideo(getYoutubeId(ex.youtube_url))}
                  className="text-accent text-[13px] font-medium hover:opacity-80 flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Ver Video
                </button>
              ) : (
                <span className="text-text-secondary text-[13px]">Sin video</span>
              )}
              
              <button 
                onClick={() => alert('Para agregar al plan, abrí el Planificador de Sesiones.')}
                className="text-text-primary bg-bg-secondary border-[0.5px] border-border px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-border transition-colors"
              >
                + Plan
              </button>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-center py-8 text-text-secondary text-[14px]">
          Cargando ejercicios...
        </div>
      )}

      {!loading && exercises.length === 0 && (
        <div className="text-center py-16 text-text-secondary bg-bg-secondary rounded-xl border-[0.5px] border-border">
          <p className="text-[16px] mb-2">No se encontraron ejercicios</p>
          <p className="text-[14px]">Probá ajustando los filtros de búsqueda.</p>
        </div>
      )}

      {!loading && hasMore && (
        <div className="text-center pb-12">
          <button 
            onClick={() => setPage(p => p + 1)}
            className="bg-bg-secondary border-[0.5px] border-border text-text-primary px-6 py-3 rounded-xl text-[14px] font-medium hover:border-border-strong transition-colors"
          >
            Cargar más ejercicios
          </button>
        </div>
      )}

      {/* VIDEO MODAL */}
      {activeVideo && (
        <div className="fixed inset-0 bg-bg-primary/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-8" onClick={() => setActiveVideo(null)}>
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden w-full max-w-[900px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b-[0.5px] border-border">
              <h3 className="text-[16px] font-medium">Video de Ejercicio</h3>
              <button onClick={() => setActiveVideo(null)} className="text-text-secondary hover:text-text-primary p-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe 
                width="100%" 
                height="100%" 
                src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
