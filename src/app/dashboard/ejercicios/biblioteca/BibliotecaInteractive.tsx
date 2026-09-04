'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/components/Dialogs'
import { formatExerciseName } from '@/lib/formatExerciseName'

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

interface UserExercise {
  id: string
  name: string
  youtube_url: string | null
  created_at: string
}

const CATEGORIES = [
  { value: 'lower_body', label: 'Lower Body' },
  { value: 'upper_body', label: 'Upper Body' },
  { value: 'trunk_core', label: 'Trunk & Core' },
  { value: 'jump', label: 'Jump' },
  { value: 'speed', label: 'Speed' },
  { value: 'mobility_stretch', label: 'Mobility & Stretch' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'testing', label: 'Testing' },
  { value: 'adjuntos', label: 'Adjuntos (Build)' },
]

export default function BibliotecaInteractive({ equipments, userId }: { equipments: string[], userId: string }) {
  const { notify, toast } = useToast()
  const [view, setView] = useState<'biblioteca' | 'mis_ejercicios'>('biblioteca')

  // Biblioteca state
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [equipment, setEquipment] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [activeVideo, setActiveVideo] = useState<string | null>(null)

  // Mis ejercicios state
  const [userExercises, setUserExercises] = useState<UserExercise[]>([])
  const [userLoading, setUserLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  // Editar un ejercicio propio ya creado (nombre y/o URL de video)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNameInput, setEditNameInput] = useState('')
  const [editUrlInput, setEditUrlInput] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  // Ejercicios propios que matchean la búsqueda dentro de la vista Biblioteca
  const [bibUserMatches, setBibUserMatches] = useState<UserExercise[]>([])

  const PAGE_SIZE = 50
  const supabaseRef = useRef(createClient())

  const fetchExercises = useCallback(async (reset: boolean = false) => {
    setLoading(true)
    const currentPage = reset ? 0 : page

    let query = supabaseRef.current
      .from('exercises')
      .select('*')
      .order('name')
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)

    if (search) { for (const t of search.trim().split(/\s+/)) query = query.ilike('name', `%${t}%`) }
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
  }, [search, category, equipment, page])

  useEffect(() => {
    setPage(0)
  }, [search, category, equipment])

  useEffect(() => {
    if (view === 'biblioteca') {
      fetchExercises(page === 0)
    }
  }, [page, search, category, equipment, fetchExercises, view])

  const fetchUserExercises = useCallback(async () => {
    setUserLoading(true)
    const { data, error } = await supabaseRef.current
      .from('user_exercises')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (!error && data) setUserExercises(data)
    setUserLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (view === 'mis_ejercicios') {
      fetchUserExercises()
    }
  }, [view, fetchUserExercises])

  const handleAddExercise = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const { error } = await supabaseRef.current.from('user_exercises').insert({
      user_id: userId,
      name: newName.trim(),
      youtube_url: newUrl.trim() || null,
    })
    if (!error) {
      setNewName('')
      setNewUrl('')
      await fetchUserExercises()
    }
    setSaving(false)
  }

  const handleDeleteExercise = async (id: string) => {
    const { error } = await supabaseRef.current.from('user_exercises').delete().eq('id', id)
    if (!error) {
      setUserExercises(prev => prev.filter(e => e.id !== id))
    }
    setDeleteConfirm(null)
  }

  const startEdit = (ex: UserExercise) => {
    setEditingId(ex.id)
    setEditNameInput(ex.name)
    setEditUrlInput(ex.youtube_url ?? '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditNameInput('')
    setEditUrlInput('')
  }

  const handleSaveEdit = async (id: string) => {
    const name = editNameInput.trim()
    if (!name) return
    setSavingEdit(true)
    const url = editUrlInput.trim() || null
    const { error } = await supabaseRef.current.from('user_exercises').update({ name, youtube_url: url }).eq('id', id)
    if (!error) {
      setUserExercises(prev => prev.map(e => e.id === id ? { ...e, name, youtube_url: url } : e))
      setBibUserMatches(prev => prev.map(e => e.id === id ? { ...e, name, youtube_url: url } : e))
      cancelEdit()
    }
    setSavingEdit(false)
  }

  // En la vista Biblioteca, al buscar por nombre también traemos los ejercicios
  // propios que matchean (sin categoría/equipo, que no aplican a los propios).
  useEffect(() => {
    if (view !== 'biblioteca' || !search.trim() || category || equipment) {
      setBibUserMatches([])
      return
    }
    let cancelled = false
    ;(async () => {
      let q = supabaseRef.current.from('user_exercises').select('*').eq('user_id', userId)
      for (const t of search.trim().split(/\s+/)) q = q.ilike('name', `%${t}%`)
      const { data } = await q.order('created_at', { ascending: false })
      if (!cancelled && data) setBibUserMatches(data as UserExercise[])
    })()
    return () => { cancelled = true }
  }, [view, search, category, equipment, userId])

  const formatCategory = (cat: string) => {
    return CATEGORIES.find(c => c.value === cat)?.label || cat
  }

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  return (
    <div>
      {toast}
      {/* TABS */}
      <div className="flex gap-2 mb-8 border-b-[0.5px] border-border">
        <button
          onClick={() => setView('biblioteca')}
          className={`px-6 py-3 text-[14px] font-medium transition-colors border-t-[0.5px] border-x-[0.5px] border-b-0 rounded-t-xl ${view === 'biblioteca' ? 'bg-bg-primary text-text-primary border-border' : 'bg-transparent text-text-secondary border-transparent hover:text-text-primary'}`}
          style={{ marginBottom: '-1px' }}
        >
          Biblioteca
        </button>
        <button
          onClick={() => setView('mis_ejercicios')}
          className={`px-6 py-3 text-[14px] font-medium transition-colors border-t-[0.5px] border-x-[0.5px] border-b-0 rounded-t-xl ${view === 'mis_ejercicios' ? 'bg-bg-primary text-text-primary border-border' : 'bg-transparent text-text-secondary border-transparent hover:text-text-primary'}`}
          style={{ marginBottom: '-1px' }}
        >
          Mis Ejercicios
        </button>
      </div>

      {/* VISTA BIBLIOTECA */}
      {view === 'biblioteca' && (
        <div>
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
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Ejercicios propios que matchean la búsqueda (aparecen primero) */}
            {bibUserMatches.map(ex => (
              <div key={`u-${ex.id}`} className="bg-bg-primary border-[0.5px] border-accent/40 rounded-xl p-6 flex flex-col hover:border-accent transition-colors">
                <div className="mb-4">
                  <span className="inline-block bg-accent/10 text-accent text-[10px] py-1 px-2 rounded-full uppercase tracking-[0.05em] border-[0.5px] border-accent/30 font-medium">
                    Mis Ejercicios
                  </span>
                </div>
                <h3 className="text-[16px] font-medium leading-[1.3] mb-2 flex-grow">{formatExerciseName(ex.name)}</h3>
                <div className="flex justify-between items-center mt-auto pt-4 border-t-[0.5px] border-border">
                  {ex.youtube_url ? (
                    <button
                      onClick={() => setActiveVideo(getYoutubeId(ex.youtube_url!))}
                      className="text-accent text-[13px] font-medium hover:opacity-80 flex items-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                      Ver Video
                    </button>
                  ) : (
                    <span className="text-text-secondary text-[13px]">Sin video</span>
                  )}
                </div>
              </div>
            ))}
            {exercises.map(ex => (
              <div key={ex.id} className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 flex flex-col hover:border-border-strong transition-colors">
                <div className="mb-4">
                  <span className="inline-block bg-bg-secondary text-text-secondary text-[10px] py-1 px-2 rounded-full uppercase tracking-[0.05em] border-[0.5px] border-border font-medium">
                    {formatCategory(ex.category)}
                  </span>
                </div>
                <h3 className="text-[16px] font-medium leading-[1.3] mb-2">{formatExerciseName(ex.name)}</h3>

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
                    onClick={() => notify('Para agregar al plan, abrí el Planificador de Sesiones.')}
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

          {!loading && exercises.length === 0 && bibUserMatches.length === 0 && (
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
        </div>
      )}

      {/* VISTA MIS EJERCICIOS */}
      {view === 'mis_ejercicios' && (
        <div>
          {/* FORM AGREGAR */}
          <div className="bg-bg-secondary p-6 rounded-xl border-[0.5px] border-border mb-8">
            <h2 className="text-[16px] font-medium mb-4">Agregar ejercicio propio</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-1">
                <label className="block text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Nombre *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddExercise()}
                  placeholder="Ej: Sentadilla con pausa..."
                  className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">URL de YouTube (opcional)</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddExercise()}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <button
                  onClick={handleAddExercise}
                  disabled={saving || !newName.trim()}
                  className="w-full bg-accent text-bg-primary px-6 py-3 rounded-lg text-[14px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {saving ? 'Guardando...' : '+ Agregar'}
                </button>
              </div>
            </div>
          </div>

          {/* LISTA */}
          {userLoading ? (
            <div className="text-center py-12 text-text-secondary text-[14px]">Cargando tus ejercicios...</div>
          ) : userExercises.length === 0 ? (
            <div className="text-center py-16 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
              <p className="text-[16px] font-medium text-text-primary mb-2">Todavía no tenés ejercicios propios</p>
              <p className="text-[13px] text-text-secondary">Usá el formulario de arriba para agregar el primero.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {userExercises.map(ex => (
                <div key={ex.id} className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 flex flex-col hover:border-border-strong transition-colors">
                  <div className="mb-4">
                    <span className="inline-block bg-bg-secondary text-text-secondary text-[10px] py-1 px-2 rounded-full uppercase tracking-[0.05em] border-[0.5px] border-border font-medium">
                      Mis Ejercicios
                    </span>
                  </div>
                  {editingId === ex.id ? (
                    <div className="mt-2 pt-4 border-t-[0.5px] border-border">
                      <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1.5">Nombre</label>
                      <input
                        type="text"
                        value={editNameInput}
                        onChange={e => setEditNameInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(ex.id)}
                        placeholder="Nombre del ejercicio"
                        autoFocus
                        className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-2 text-[13px] focus:outline-none focus:border-accent mb-3"
                      />
                      <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1.5">URL de YouTube (opcional)</label>
                      <input
                        type="url"
                        value={editUrlInput}
                        onChange={e => setEditUrlInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(ex.id)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-2 text-[13px] focus:outline-none focus:border-accent mb-3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(ex.id)}
                          disabled={savingEdit || !editNameInput.trim()}
                          className="bg-accent text-bg-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                        >
                          {savingEdit ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-text-secondary text-[12px] hover:text-text-primary px-2"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                  <>
                  <h3 className="text-[16px] font-medium leading-[1.3] mb-2 flex-grow">{formatExerciseName(ex.name)}</h3>
                  <div className="flex justify-between items-center mt-auto pt-4 border-t-[0.5px] border-border">
                    {ex.youtube_url ? (
                      <button
                        onClick={() => setActiveVideo(getYoutubeId(ex.youtube_url!))}
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

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => startEdit(ex)}
                        className="text-text-secondary text-[12px] hover:text-text-primary transition-colors flex items-center gap-1.5"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Editar
                      </button>

                    {deleteConfirm === ex.id ? (
                      <div className="flex gap-2 items-center">
                        <span className="text-[12px] text-text-secondary">¿Eliminar?</span>
                        <button
                          onClick={() => handleDeleteExercise(ex.id)}
                          className="text-warning text-[12px] font-medium hover:opacity-80"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-text-secondary text-[12px] hover:text-text-primary"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(ex.id)}
                        className="text-text-secondary hover:text-warning text-[12px] transition-colors"
                        title="Eliminar ejercicio"
                      >
                        Eliminar
                      </button>
                    )}
                    </div>
                  </div>
                  </>
                  )}
                </div>
              ))}
            </div>
          )}
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
