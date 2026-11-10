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
