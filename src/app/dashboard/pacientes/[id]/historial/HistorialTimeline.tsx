'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchTimelinePage, type TimelineRow } from '@/lib/historial'
import { groupTimeline } from '@/lib/historialGrouping'
import { eventMeta } from '@/lib/patientEvents'

const TYPE_LABEL: Record<TimelineRow['event_type'], string> = {
  plan_session: 'Plan',
  bitacora: 'Bitácora',
  hito: 'Hito',
  atencion: 'Atención',
  carga: 'Carga',
  turno: 'Turno',
}

// Gris neutro para los tipos de rutina diaria — nada compite con el color
// del hito, que es el que de verdad marca un punto de inflexión del caso.
const NEUTRAL = '#8A9691'

// ─── Iconos de tipo (mismo trazo que el resto de la app: 24x24, stroke 2,
// puntas redondeadas) — ayudan a escanear la columna sin leer cada pill. ───
function IconPlan() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="2.5" /><circle cx="19" cy="12" r="2.5" /><path d="M8 12h8" /></svg>
}
function IconBitacora() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
}
function IconHito() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18" /><path d="M5 4h10l-2 4 2 4H5" /></svg>
}
function IconAtencion() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6" /></svg>
}
function IconCarga() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 7-8" /><path d="M15 7h5v5" /></svg>
}
function IconTurno() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
}

const TYPE_ICON: Record<TimelineRow['event_type'], () => React.JSX.Element> = {
  plan_session: IconPlan,
  bitacora: IconBitacora,
  hito: IconHito,
  atencion: IconAtencion,
  carga: IconCarga,
  turno: IconTurno,
}

// Color del punto/pill: los hitos toman el color de su propio tipo (el mismo
// que ya se ve en la pantalla de Hitos — alta en verde, control en ámbar,
// etc.), así el historial queda consistente con el resto de la app. El
// resto de las filas queda en gris neutro: son actividad de rutina, no
// quiere competir visualmente con los hitos.
function rowColor(r: TimelineRow): string {
  if (r.event_type === 'hito') {
    const hitoType = (r.meta as { type?: string })?.type
    return eventMeta(hitoType ?? 'otro').color
  }
  return NEUTRAL
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
      <div className="relative pl-[24px]">
        <div className="absolute left-[5px] top-[7px] bottom-[7px] w-px bg-border-strong" />

        {items.length === 0 && (
          <p className="text-[13px] text-text-secondary">Todavía no hay actividad registrada.</p>
        )}

        {items.map((item, index) => {
          // Separador entre días: antes solo quedaba la etiqueta chica, costaba
          // ver dónde terminaba un día y empezaba otro. Una línea arriba de
          // cada grupo (salvo el primero) marca el corte de un vistazo.
          const dividerClass = index > 0 ? 'pt-[22px] border-t-[0.5px] border-border/70' : ''

          if ('kind' in item) {
            const key = `streak-${item.fromDate}-${item.toDate}`
            const expanded = expandedStreaks.has(key)
            return (
              <div key={key} className={`mb-[26px] ${dividerClass}`}>
                <div className="relative">
                  <span className="absolute left-[-24px] top-[5px] w-[10px] h-[10px] rounded-full bg-bg-tertiary border-[1.5px] border-border-strong" />
                  <button
                    onClick={() => toggleStreak(key)}
                    className="flex items-center gap-2 pl-3 pr-2.5 py-2 bg-bg-tertiary border-l-2 border-border-strong rounded-r-lg rounded-l-sm text-[12px] text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors w-full text-left"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></svg>
                    <span>Misma rutina de bitácora <b className="text-text-primary font-medium">{item.rows.length} días seguidos</b> ({item.exerciseCount} ejercicios)</span>
                    <span className="ml-auto text-text-tertiary shrink-0">{expanded ? 'ocultar ›' : 'ver cada día ›'}</span>
                  </button>
                </div>
                {expanded && (
                  <div className="mt-2 space-y-2.5">
                    {item.rows.map(r => (
                      <div key={r.id} className="relative">
                        <span className="absolute left-[-24px] top-[3px] w-[10px] h-[10px] rounded-full bg-bg-tertiary border-[1.5px] border-border-strong" />
                        <div className="text-[11px] text-text-tertiary uppercase tracking-[0.05em] mb-1">{dayLabel(r.event_date, r.event_date === today)}</div>
                        <div className="text-[13px] text-text-primary">{r.summary}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          const isToday = item.date === today
          return (
            <div key={item.date} className={`mb-[26px] last:mb-0 ${dividerClass}`}>
              <div
                className={`inline-block text-[11px] font-medium uppercase tracking-[0.08em] mb-3 px-2 py-0.5 rounded-full border-[0.5px] ${
                  isToday ? 'text-accent bg-accent/10 border-accent/30' : 'text-text-tertiary bg-bg-tertiary border-border'
                }`}
              >
                {dayLabel(item.date, isToday)}
              </div>
              <div className="space-y-3">
                {item.rows.map(r => {
                  const color = rowColor(r)
                  const Icon = TYPE_ICON[r.event_type]
                  const isHito = r.event_type === 'hito'
                  return (
                    <div key={r.id} className="relative">
                      {/* El punto se posiciona contra ESTE div (sin márgenes
                          propios) para no desalinearse con la línea — el
                          resaltado de hover va en un wrapper interno aparte,
                          que sí puede tener su propio -mx/px sin afectarlo. */}
                      <span
                        className="absolute left-[-24px] top-[5px] w-[10px] h-[10px] rounded-full border-[1.5px]"
                        style={{ backgroundColor: isHito ? color : 'var(--color-bg-tertiary)', borderColor: color }}
                      />
                      <div className="-mx-2 px-2 py-0.5 rounded-lg hover:bg-bg-tertiary/50 transition-colors">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {r.author_name && (
                            <span className="w-[17px] h-[17px] rounded-full bg-bg-tertiary border-[1.3px] border-accent flex items-center justify-center text-[8.5px] font-medium text-text-primary shrink-0" title={r.author_name}>
                              {initials(r.author_name)}
                            </span>
                          )}
                          <span
                            className="flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded-full border-[0.5px]"
                            style={{ color, backgroundColor: `${color}1A`, borderColor: `${color}4D` }}
                          >
                            <Icon />
                            {TYPE_LABEL[r.event_type]}
                          </span>
                        </div>
                        <div className="text-[13px] text-text-primary mt-1">{r.summary}</div>
                        {r.note && <div className="text-[12px] text-text-secondary italic mt-0.5">&ldquo;{r.note}&rdquo;</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
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
          <div className="flex items-center gap-2.5 mt-[28px] pt-4 border-t-[0.5px] border-dashed border-border">
            <span className="w-[10px] h-[10px] rounded-full bg-bg-secondary border-[1.5px] border-text-tertiary shrink-0 ml-[-24px]" />
            <span className="text-[12px] text-text-tertiary">
              Ingresó el {ingresoLabel}{diagnostico ? ` · diagnóstico: ${diagnostico}` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
