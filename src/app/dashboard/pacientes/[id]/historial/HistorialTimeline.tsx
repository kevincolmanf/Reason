'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchTimelinePage, type TimelineRow } from '@/lib/historial'
import { groupTimeline } from '@/lib/historialGrouping'

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

        {items.map((item) => {
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
