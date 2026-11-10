# Historial del paciente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una línea de tiempo unificada por paciente que mezcla turnos, bitácora, hitos, plan y carga en un solo recorrido cronológico, sin migrar ni duplicar ningún dato existente.

**Architecture:** Una vista de Postgres (`patient_timeline`) arma por `UNION ALL` una fila homogénea por evento de las seis tablas fuente, creada con `security_invoker = true` para heredar exactamente el mismo RLS que ya protege cada tabla (sin esto, la vista podría filtrar datos de pacientes a los que el usuario no tiene acceso — es el punto más delicado de este plan). El front pagina por cursor (no trae todo de una) y agrupa/condensa en el cliente: mismo día en un bloque, rutinas de bitácora idénticas en días consecutivos colapsadas en una sola línea.

**Tech Stack:** Next.js 14 (App Router) + TypeScript + Supabase + Tailwind. Sin framework de tests — verificación con `tsc --noEmit`, `eslint`, build completo y prueba manual.

**Flujo de git:** toca base de datos (vista + índice) → rama obligatoria + confirmación de Kevin antes de mergear.

**Decisiones de diseño tomadas en este plan (no estaban cerradas en el spec, se explican acá):**
- **Orden cronológico por tipo:** todas las fuentes ordenan por su fecha de dominio (`scheduled_date`, `activity_date`, `attended_on`, `session_date`, `start_time`) — **excepto hitos** (`patient_events`), que ordena por `created_at`. Por qué: un hito puede cargarse hoy para una fecha futura ("reevaluación el 23 nov") — lo que importa para "recorrer lo cargado" es cuándo se registró, no la fecha que menciona (el mockup aprobado ya lo mostraba así, agrupado bajo "Hoy").
- **Autor por tipo:** turno, bitácora y atención ya tienen un nombre de profesional disponible (turno siempre; bitácora/atención gracias al Plan 1 de atribución) y muestran avatar. Plan de ejercicio, hitos y carga no tienen un campo de autor denormalizado hoy — en vez de sumar un join nuevo a la vista (más complejidad, fuera del pedido original), esas entradas se muestran sin avatar. Se puede sumar después con el mismo patrón si hace falta.
- **Paginación = "cargar más" por cursor**, no un resumen pre-calculado de "X turnos y Y atenciones más". El mockup mostraba esa idea como concepto — acá se resuelve con infinite-scroll simple (igual de efectivo para "no traer todo de una", mucho más simple y confiable de construir bien).
- **Plan de ejercicio:** solo se listan sesiones con `scheduled_date` hasta hoy (no las planificadas a futuro) — el Historial cuenta lo que pasó, no el calendario completo del plan (eso ya lo tiene la página de Plan).

---

### Task 1: Rama de trabajo

- [ ] **Step 1: Verificar working tree limpio**

Run: `git status --short`
Expected: nada tuyo pendiente.

- [ ] **Step 2: Crear la rama**

```bash
git checkout -b feature/historial-paciente
```

---

### Task 2: Índice faltante en `scheduled_sessions`

**Files:**
- Create: `supabase_historial_paciente.sql` (este archivo junta el índice y la vista — una sola migración para todo este plan)

- [ ] **Step 1: Escribir la parte del índice**

```sql
-- Historial del paciente: línea de tiempo unificada de turnos, bitácora,
-- hitos, plan y carga. Ejecutar en el SQL Editor de Supabase ANTES de
-- mergear feature/historial-paciente.

-- scheduled_sessions es la única de las seis tablas fuente sin índice por
-- patient_id (las otras cinco ya lo tienen) — sin esto, la vista de abajo
-- escanea toda la tabla en vez de ir directo a las filas del paciente.
CREATE INDEX IF NOT EXISTS scheduled_sessions_patient_idx
  ON scheduled_sessions (patient_id, scheduled_date DESC);
```

(seguir con Task 3 en el mismo archivo, no commitear todavía)

---

### Task 3: Vista `patient_timeline`

**Files:**
- Modify: `supabase_historial_paciente.sql` (agregar a lo de Task 2)

- [ ] **Step 1: Agregar la vista al mismo archivo**

```sql
-- Vista unificada: una fila por evento de cada una de las seis tablas,
-- misma forma (patient_id, fecha, tipo, resumen, nota, autor, orden, meta).
-- IMPORTANTE: security_invoker = true hace que la vista se ejecute con los
-- permisos de quien consulta, no de quien la creó — así respeta el RLS que
-- ya protege patients/turnos/kine_attentions/etc. Sin esto, cualquier usuario
-- autenticado podría leer el historial de CUALQUIER paciente con solo saber
-- su id, sin importar la organización. Requiere Postgres 15+ (Supabase lo usa
-- desde 2023 en proyectos nuevos); si esta sentencia falla con un error de
-- sintaxis en WITH (...), avisar antes de seguir — significa que el proyecto
-- corre una versión más vieja y hay que resolverlo de otra forma.
CREATE OR REPLACE VIEW patient_timeline
WITH (security_invoker = true) AS

  -- Plan de ejercicio: solo sesiones hasta hoy (no el calendario a futuro).
  SELECT
    id, patient_id, scheduled_date AS event_date, 'plan_session'::text AS event_type,
    COALESCE(session_name, 'Sesión de plan') AS summary,
    NULL::text AS note,
    NULL::text AS author_name,
    scheduled_date::timestamptz AS sort_key,
    jsonb_build_object('plan_id', plan_id, 'completed', completed) AS meta
  FROM scheduled_sessions
  WHERE scheduled_date <= CURRENT_DATE

  UNION ALL

  -- Bitácora (seguimiento simple).
  SELECT
    id, patient_id, activity_date, 'bitacora',
    'Bitácora de actividad',
    note,
    attributed_professional_name,
    activity_date::timestamptz,
    jsonb_build_object('exercises', exercises)
  FROM simple_activity_log

  UNION ALL

  -- Hitos del tratamiento: ordena por cuándo se cargó, no por la fecha que
  -- menciona (puede ser a futuro — ver nota de diseño arriba).
  SELECT
    id, patient_id, created_at::date, 'hito',
    COALESCE(title, type),
    CASE WHEN event_date <> created_at::date
      THEN COALESCE(note || ' — ', '') || 'fecha: ' || to_char(event_date, 'DD/MM/YYYY')
      ELSE note
    END,
    NULL,
    created_at,
    jsonb_build_object('type', type, 'target_date', event_date)
  FROM patient_events

  UNION ALL

  -- Atención de hoy (continuidad).
  SELECT
    id, patient_id, attended_on, 'atencion',
    COALESCE(auto_summary, 'Atención registrada'),
    note,
    COALESCE(attributed_professional_name, professional_name),
    attended_on::timestamptz,
    jsonb_build_object('symptom', symptom)
  FROM kine_attentions

  UNION ALL

  -- Monitoreo de carga avanzado.
  SELECT
    id, patient_id, session_date, 'carga',
    'Sesión de carga' || CASE WHEN rpe IS NOT NULL THEN ' · RPE ' || rpe ELSE '' END,
    notes,
    NULL,
    session_date::timestamptz,
    jsonb_build_object('rpe', rpe, 'source', source)
  FROM load_sessions

  UNION ALL

  -- Historial de turnos: solo hasta hoy (no la agenda futura).
  SELECT
    id, patient_id, start_time::date, 'turno',
    COALESCE(area, 'Turno'),
    notes,
    professional_name,
    start_time,
    jsonb_build_object('status', status)
  FROM turnos
  WHERE patient_id IS NOT NULL AND start_time::date <= CURRENT_DATE;
```

- [ ] **Step 2: Avisar que falta correrla**

Igual que las migraciones anteriores — pegarla en el SQL Editor de Supabase antes de probar en preview. Esta vez pedile a Kevin que confirme que el `CREATE VIEW ... WITH (security_invoker = true)` no tira error de sintaxis (si tira error, avisame antes de seguir con el resto del plan).

- [ ] **Step 3: Commit**

```bash
git add supabase_historial_paciente.sql
git commit -m "$(cat <<'EOF'
feat(db): vista patient_timeline + índice en scheduled_sessions

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Tipos compartidos del Historial

**Files:**
- Create: `src/lib/historial.ts`

- [ ] **Step 1: Escribir el tipo de fila y el helper de fetch paginado**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export type TimelineEventType = 'plan_session' | 'bitacora' | 'hito' | 'atencion' | 'carga' | 'turno'

export interface TimelineRow {
  id: string
  patient_id: string
  event_date: string
  event_type: TimelineEventType
  summary: string
  note: string | null
  author_name: string | null
  sort_key: string
  meta: Record<string, unknown>
}

const PAGE_SIZE = 40

// Pagina por cursor (sort_key del último elemento visto) en vez de traer todo
// de una — clave para pacientes con muchas sesiones. Más simple y confiable
// que pre-calcular resúmenes de "tramos viejos".
export async function fetchTimelinePage(
  supabase: SupabaseClient,
  patientId: string,
  beforeCursor?: string,
): Promise<{ rows: TimelineRow[]; hasMore: boolean }> {
  let query = supabase
    .from('patient_timeline')
    .select('*')
    .eq('patient_id', patientId)
    .order('sort_key', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (beforeCursor) query = query.lt('sort_key', beforeCursor)

  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as TimelineRow[]
  const hasMore = rows.length > PAGE_SIZE
  return { rows: hasMore ? rows.slice(0, PAGE_SIZE) : rows, hasMore }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/historial.ts
git commit -m "$(cat <<'EOF'
feat: tipos y fetch paginado de patient_timeline

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Lógica de agrupado y condensado

**Files:**
- Create: `src/lib/historialGrouping.ts`

- [ ] **Step 1: Escribir la función de agrupado por día + condensado de bitácora repetida**

```typescript
import type { TimelineRow } from './historial'

export interface DayGroup {
  date: string
  rows: TimelineRow[]
}

export interface CondensedStreak {
  kind: 'bitacora_streak'
  fromDate: string
  toDate: string
  exerciseCount: number
  rows: TimelineRow[] // los días individuales, para expandir
}

export type TimelineItem = DayGroup | CondensedStreak

function sameExerciseSet(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
  const namesA = a.map(e => (e as { name?: string })?.name ?? '').sort()
  const namesB = b.map(e => (e as { name?: string })?.name ?? '').sort()
  return namesA.every((n, i) => n === namesB[i])
}

// Agrupa filas (ya ordenadas por sort_key desc) por día, y colapsa corridas
// de 2+ días consecutivos donde el único evento del día es una bitácora con
// exactamente los mismos ejercicios que el día anterior — el caso real que
// infla la pantalla cuando se usa "Traer a hoy" varios días seguidos.
export function groupTimeline(rows: TimelineRow[]): TimelineItem[] {
  const byDate = new Map<string, TimelineRow[]>()
  for (const row of rows) {
    const list = byDate.get(row.event_date) ?? []
    list.push(row)
    byDate.set(row.event_date, list)
  }
  const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a)) // desc

  const items: TimelineItem[] = []
  let i = 0
  while (i < dates.length) {
    const dayRows = byDate.get(dates[i])!
    const isSoloBitacora = dayRows.length === 1 && dayRows[0].event_type === 'bitacora'

    if (isSoloBitacora) {
      const streak: TimelineRow[] = [dayRows[0]]
      let j = i + 1
      while (j < dates.length) {
        const nextDayRows = byDate.get(dates[j])!
        const isNextSolo = nextDayRows.length === 1 && nextDayRows[0].event_type === 'bitacora'
        if (!isNextSolo) break
        const prevExercises = (streak[streak.length - 1].meta as { exercises?: unknown }).exercises
        const nextExercises = (nextDayRows[0].meta as { exercises?: unknown }).exercises
        if (!sameExerciseSet(prevExercises, nextExercises)) break
        streak.push(nextDayRows[0])
        j++
      }
      if (streak.length >= 2) {
        const exerciseCount = Array.isArray((streak[0].meta as { exercises?: unknown[] }).exercises)
          ? ((streak[0].meta as { exercises?: unknown[] }).exercises as unknown[]).length
          : 0
        items.push({
          kind: 'bitacora_streak',
          fromDate: streak[streak.length - 1].event_date,
          toDate: streak[0].event_date,
          exerciseCount,
          rows: streak,
        })
        i = j
        continue
      }
    }

    items.push({ date: dates[i], rows: dayRows })
    i++
  }
  return items
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint src/lib/historialGrouping.ts`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/historialGrouping.ts
git commit -m "$(cat <<'EOF'
feat: agrupado por día y condensado de rutinas de bitácora repetidas

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Componente `HistorialTimeline`

Visual validado con Kevin (mockup aprobado): línea vertical, punto por evento, agrupado por día, autor con avatar chico cuando hay, nota en cursiva, ancla de "Ingreso" con diagnóstico al final.

**Files:**
- Create: `src/app/dashboard/pacientes/[id]/historial/HistorialTimeline.tsx`

- [ ] **Step 1: Escribir el componente**

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchTimelinePage, type TimelineRow } from '@/lib/historial'
import { groupTimeline, type TimelineItem } from '@/lib/historialGrouping'

const TYPE_LABEL: Record<TimelineRow['event_type'], string> = {
  plan_session: 'Plan',
  bitacora: 'Bitácora',
  hito: 'Hito',
  atencion: 'Atención',
  carga: 'Carga',
  turno: 'Turno',
}

const TYPE_ACCENT: Partial<Record<TimelineRow['event_type'], boolean>> = {
  hito: true,
}

function dayLabel(d: string, isToday: boolean): string {
  if (isToday) return 'Hoy'
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch { return d }
}

function todayAR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}

function initials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

export default function HistorialTimeline({
  patientId, initialRows, initialHasMore, ingresoLabel, diagnostico,
}: {
  patientId: string
  initialRows: TimelineRow[]
  initialHasMore: boolean
  ingresoLabel: string
  diagnostico: string | null
}) {
  const [rows, setRows] = useState<TimelineRow[]>(initialRows)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expandedStreaks, setExpandedStreaks] = useState<Set<string>>(new Set())

  const today = todayAR()
  const items = groupTimeline(rows)

  const loadMore = async () => {
    if (rows.length === 0) return
    setLoadingMore(true)
    try {
      const supabase = createClient()
      const cursor = rows[rows.length - 1].sort_key
      const { rows: more, hasMore: moreLeft } = await fetchTimelinePage(supabase, patientId, cursor)
      setRows(prev => [...prev, ...more])
      setHasMore(moreLeft)
    } finally {
      setLoadingMore(false)
    }
  }

  const toggleStreak = (key: string) => {
    setExpandedStreaks(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  return (
    <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5">
      <div className="relative pl-[22px]">
        <div className="absolute left-[5px] top-[6px] bottom-[6px] w-px bg-border-strong" />

        {items.length === 0 && (
          <p className="text-[13px] text-text-secondary">Todavía no hay actividad registrada.</p>
        )}

        {items.map((item, idx) => {
          if ('kind' in item) {
            const key = `streak-${item.fromDate}-${item.toDate}`
            const expanded = expandedStreaks.has(key)
            return (
              <div key={key} className="mb-[22px]">
                <div className="relative">
                  <span className="absolute left-[-22px] top-[3px] w-[9px] h-[9px] rounded-full bg-bg-tertiary border-[1.5px] border-border-strong" />
                  <button
                    onClick={() => toggleStreak(key)}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-bg-tertiary border-[0.5px] border-border rounded-lg text-[12px] text-text-secondary hover:text-text-primary transition-colors w-full text-left"
                  >
                    <span>⟳</span>
                    <span>Misma rutina de bitácora <b className="text-text-primary font-medium">{item.rows.length} días seguidos</b> ({item.exerciseCount} ejercicios)</span>
                    <span className="ml-auto text-text-tertiary">{expanded ? 'ocultar ›' : 'ver cada día ›'}</span>
                  </button>
                </div>
                {expanded && item.rows.map(r => (
                  <div key={r.id} className="relative mt-2 pl-0">
                    <span className="absolute left-[-22px] top-[3px] w-[9px] h-[9px] rounded-full bg-bg-tertiary border-[1.5px] border-border-strong" />
                    <div className="text-[11px] text-text-tertiary uppercase tracking-[0.05em] mb-1">{dayLabel(r.event_date, r.event_date === today)}</div>
                    <div className="text-[13px] text-text-primary">{r.summary}</div>
                  </div>
                ))}
              </div>
            )
          }

          return (
            <div key={item.date} className="mb-[22px]">
              <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.05em] mb-2.5">{dayLabel(item.date, item.date === today)}</div>
              {item.rows.map(r => (
                <div key={r.id} className="relative mb-2.5 last:mb-0">
                  <span className={`absolute left-[-22px] top-[3px] w-[9px] h-[9px] rounded-full border-[1.5px] ${TYPE_ACCENT[r.event_type] ? 'bg-accent border-accent' : 'bg-bg-tertiary border-border-strong'}`} />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {r.author_name && (
                      <span className="w-[17px] h-[17px] rounded-full bg-bg-tertiary border-[1.3px] border-accent flex items-center justify-center text-[8.5px] font-medium text-text-primary shrink-0" title={r.author_name}>
                        {initials(r.author_name)}
                      </span>
                    )}
                    <span className={`text-[10.5px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_ACCENT[r.event_type] ? 'text-accent bg-accent/10 border-[0.5px] border-accent/30' : 'text-text-secondary bg-bg-tertiary border-[0.5px] border-border'}`}>
                      {TYPE_LABEL[r.event_type]}
                    </span>
                  </div>
                  <div className="text-[13px] text-text-primary mt-1">{r.summary}</div>
                  {r.note && <div className="text-[12px] text-text-secondary italic mt-0.5">&ldquo;{r.note}&rdquo;</div>}
                </div>
              ))}
            </div>
          )
        })}

        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-[12px] text-accent hover:underline disabled:opacity-50 mt-1"
          >
            {loadingMore ? 'Cargando…' : 'Cargar más ›'}
          </button>
        ) : (
          <div className="flex items-center gap-2.5 mt-[26px] pt-4 border-t-[0.5px] border-dashed border-border">
            <span className="w-[7px] h-[7px] rounded-full bg-text-tertiary shrink-0 ml-[-19px]" />
            <span className="text-[12px] text-text-tertiary">
              Ingresó el {ingresoLabel}{diagnostico ? ` · diagnóstico: ${diagnostico}` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/dashboard/pacientes/[id]/historial/HistorialTimeline.tsx"`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/historial/HistorialTimeline.tsx"
git commit -m "$(cat <<'EOF'
feat(historial): componente de línea de tiempo (agrupado, condensado, paginado)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Ruta `/dashboard/pacientes/[id]/historial`

Mismo patrón de acceso que la Ficha (dato clínico, no acción de agenda) — reutiliza el guard que ya usan las otras rutas del paciente.

**Files:**
- Create: `src/app/dashboard/pacientes/[id]/historial/page.tsx`
- Modify: `src/app/dashboard/pacientes/[id]/loading.tsx` (ya cubre sub-rutas nuevas si sigue el mismo patrón — verificar, no debería hacer falta tocarlo)

- [ ] **Step 1: Escribir el server component**

Mismo patrón que `ficha/page.tsx`: `verifyPatientAccess(patientId, userId)` (confirmado en `src/utils/patient-access.ts:8` — `(patientId: string, userId: string): Promise<void>`, redirige si no hay acceso).

```tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { verifyPatientAccess } from '@/utils/patient-access'
import { fetchTimelinePage } from '@/lib/historial'
import HistorialTimeline from './HistorialTimeline'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Historial | Reason' }

export default async function HistorialPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: patient }, { data: ficha }] = await Promise.all([
    supabase.from('patients').select('id, name, user_id, created_at').eq('id', params.id).single(),
    supabase.from('patient_fichas').select('ficha_data').eq('patient_id', params.id).maybeSingle(),
  ])
  if (!patient) redirect('/dashboard/pacientes')
  await verifyPatientAccess(params.id, user.id)

  const { rows, hasMore } = await fetchTimelinePage(supabase, params.id)
  const diagnostico = (ficha?.ficha_data as Record<string, unknown> | null)?.diagnostico as string | undefined

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Header />
      <main className="max-w-[820px] mx-auto px-6 py-8">
        <div className="mb-5">
          <Link href={`/dashboard/pacientes/${params.id}`} className="text-[13px] text-text-secondary hover:text-text-primary no-underline">← {patient.name}</Link>
        </div>
        <h1 className="text-[22px] font-medium mb-5">Historial</h1>
        <HistorialTimeline
          patientId={params.id}
          initialRows={rows}
          initialHasMore={hasMore}
          ingresoLabel={new Date(patient.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
          diagnostico={diagnostico?.trim() || null}
        />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/dashboard/pacientes/[id]/historial/page.tsx"`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/historial/page.tsx"
git commit -m "$(cat <<'EOF'
feat(historial): nueva ruta /dashboard/pacientes/[id]/historial

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Verificación final y push

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: exit code 0, `/dashboard/pacientes/[id]/historial` listada en la tabla de rutas.

- [ ] **Step 2: Prueba manual** (si hay forma de probarlo logueado)

- Entrar a Historial de un paciente con turnos, bitácora y al menos un hito: confirmar que aparecen mezclados por fecha, más reciente arriba.
- Si el paciente tiene varios días seguidos de bitácora con la misma rutina (usando "Traer a hoy" un par de veces), confirmar que se condensan en una sola línea expandible.
- Confirmar que al final aparece "Ingresó el [fecha] · diagnóstico: [texto]".
- Tocar "Cargar más" en un paciente con muchas filas y confirmar que trae la página siguiente sin repetir nada.

- [ ] **Step 3: Push**

```bash
git push -u origin feature/historial-paciente
```

- [ ] **Step 4: Avisar a Kevin**

Falta correr `supabase_historial_paciente.sql` antes de probar en preview — y en particular, confirmar que el `CREATE VIEW ... WITH (security_invoker = true)` corrió sin error (si tira error de sintaxis, el proyecto corre una versión de Postgres más vieja que la 15 y hay que avisar antes de seguir).

---

## Self-review

- **Cobertura del spec:** vista unificada sin migrar nada (Task 3), diseño visual validado con el mockup (Task 6), diagnóstico + fecha de ingreso como ancla (Task 7), paginación para pacientes con muchas sesiones (Task 4/6), condensado de bitácora repetida (Task 5/6), índice faltante (Task 2).
- **Seguridad:** el punto más delicado de todo el plan es `security_invoker = true` en la vista — sin eso, cualquier usuario autenticado podría leer el historial de cualquier paciente. Quedó explícito en el SQL y en el Task 3 con una verificación pedida antes de seguir.
- **Placeholders:** ninguno salvo el Step 2 de Task 7, que pide confirmar la firma real de `verifyPatientAccess` antes de usarla (no se puede adivinar sin leer el archivo — es una verificación explícita, no un "TODO" vago).
- **Consistencia de tipos:** `TimelineRow`/`TimelineEventType` se definen una sola vez en `src/lib/historial.ts` y se importan en todos los demás archivos — no hay una segunda definición que pueda divergir.
- **Fuera de alcance (igual que el spec):** no se toca `load_sessions`/Monitoreo de Carga más allá de sumarlo como fuente de lectura; no se migra ningún dato; Ficha/Plan/RTS no cambian.
