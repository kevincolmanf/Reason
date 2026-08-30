import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Quita acentos y pasa a minúscula: "Abducción" -> "abduccion". Así una búsqueda
// sin acento encuentra el ejercicio acentuado (y viceversa), que era el problema
// reportado (#2): la búsqueda con ilike es case-insensitive pero NO ignora tildes.
const norm = (s: string) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

type Ex = { id: string; name: string; category: string | null; equipment: string | null; youtube_url: string | null }

// Cache del catálogo en memoria (el catálogo es casi estático, +1.700 ejercicios).
// Evita re-traer todo en cada tecleo. Best-effort por instancia; TTL corto.
let cache: { at: number; rows: Ex[] } | null = null
const TTL = 5 * 60 * 1000

async function getCatalog(admin: ReturnType<typeof createAdminClient>): Promise<Ex[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.rows
  // Paginado: Supabase corta en 1000 filas por request, así que traemos por páginas
  // hasta juntar todo el catálogo (si no, se perdían ~700 ejercicios).
  const PAGE = 1000
  const all: Ex[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('exercises')
      .select('id, name, category, equipment, youtube_url')
      .order('name')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    all.push(...((data ?? []) as Ex[]))
    if (!data || data.length < PAGE) break
  }
  cache = { at: Date.now(), rows: all }
  return all
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''

  const admin = createAdminClient()
  let rows: Ex[]
  try {
    rows = await getCatalog(admin)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  if (category) rows = rows.filter(ex => ex.category === category)
  if (q.trim()) {
    const terms = norm(q).split(/\s+/).filter(Boolean)
    rows = rows.filter(ex => {
      const n = norm(ex.name)
      return terms.every(t => n.includes(t))
    })
  }

  // Cap de resultados para no devolver miles de una; el buscador muestra los
  // primeros y el usuario afina con más letras.
  return NextResponse.json(rows.slice(0, 200))
}
