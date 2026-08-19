'use client'

import { Fragment, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Planilla(s) de entrenamiento imprimible(s) (A4 apaisado, ahorro de tinta).
// Se monta como hijo directo de <body> (portal) y está oculta en pantalla
// (display:none). Al imprimir, se ocultan los demás hijos de body y solo
// queda la planilla — así no salen páginas en blanco ni se filtra en la app.
//
// Cada hoja = un día del plan: a la izquierda superserie (A1/A2, en blanco si
// no está cargada) + ejercicio + series×reps, y a la derecha una columna por
// semana con la FECHA real. Modo "en blanco" (anotar kg a lapicera) o "con
// cargas" (imprime la carga planificada de cada semana).

interface PrintExercise {
  exercise_name: string
  group?: string
  sets: string
  reps: string
  load: string
  recommendations: string
}
interface PrintBlock { name: string; exercises: PrintExercise[] }
interface PrintSession {
  session_name: string | null
  scheduled_date: string
  session_data: { blocks: PrintBlock[] } | null
}
interface WeekSession { date: string; blocks: PrintBlock[] }
interface Sheet { session: PrintSession; weekSessions?: WeekSession[] }

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function fmtDate(iso: string): { dow: string; dm: string } {
  const d = new Date(iso + 'T00:00:00')
  return { dow: DOW[d.getDay()], dm: `${d.getDate()}/${d.getMonth() + 1}` }
}

function Wordmark() {
  return <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em' }}>reason<span style={{ fontWeight: 400 }}>.</span></span>
}

function SheetBody({ patientName, planName, session, weekSessions, weeks, startWeek, showLoads, isLast }: {
  patientName: string
  planName: string
  session: PrintSession
  weekSessions?: WeekSession[]
  weeks: number
  startWeek: number
  showLoads: boolean
  isLast: boolean
}) {
  const blocks = (session.session_data?.blocks ?? []).filter(b => b.exercises.length > 0)

  const weeksArr = weekSessions ?? []
  const withLoads = showLoads && weeksArr.length > 0
  const showSug = !withLoads
  const N = Math.max(1, Math.min(16, Math.round(weeks)))
  const cols = Array.from({ length: N }, (_, i) => {
    const ws = weeksArr[i]
    const week = startWeek + i
    return ws
      ? { key: ws.date, week, dated: true, blocks: ws.blocks, ...fmtDate(ws.date) }
      : { key: `w${week}`, week, dated: false, blocks: [] as PrintBlock[], dow: '', dm: '' }
  })
  const colCount = cols.length
  const weekColWidth = `${Math.max(6, Math.round((withLoads ? 52 : 42) / colCount))}%`
  const fixedCount = showSug ? 4 : 3

  return (
    <section className="pp-sheet" style={{ pageBreakAfter: isLast ? undefined : 'always' }}>
      <div className="pp-head">
        <div>
          <h1>{patientName}</h1>
          <div className="pp-sub">{planName}{session.session_name ? ` — ${session.session_name}` : ''}</div>
        </div>
        <Wordmark />
      </div>

      {blocks.length === 0 ? (
        <div style={{ fontSize: '11px' }}>Esta sesión no tiene ejercicios cargados.</div>
      ) : (
        <table>
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: showSug ? '24%' : '28%' }} />
            <col style={{ width: '9%' }} />
            {showSug ? <col style={{ width: '11%' }} /> : null}
            {cols.map(c => <col key={c.key} style={{ width: weekColWidth }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="pp-c">Sup.</th>
              <th>Ejercicio</th>
              <th className="pp-c">Ser × Rep</th>
              {showSug ? <th className="pp-c">Sug.</th> : null}
              {cols.map(c => (
                <th key={c.key} className="pp-wh">
                  <div className="pp-wk-dow">{c.dated ? `${c.dow} ${c.dm}` : `Sem ${c.week}`}</div>
                  {c.dated ? <div className="pp-wk-sem">Sem {c.week}</div> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {blocks.map((block, bi) => (
              <Fragment key={`b${bi}`}>
                <tr className="pp-block">
                  <td colSpan={fixedCount + colCount}>{block.name.toUpperCase()}</td>
                </tr>
                {block.exercises.map((ex, ei) => (
                  <tr key={`b${bi}e${ei}`} style={{ height: '30px' }}>
                    <td className="pp-c pp-sup">{ex.group || ''}</td>
                    <td>
                      <div className="pp-exname">{ex.exercise_name.toUpperCase()}</div>
                      {ex.recommendations ? <div className="pp-rec">{ex.recommendations}</div> : null}
                    </td>
                    <td className="pp-c">{(ex.sets || '–')} × {(ex.reps || '–')}</td>
                    {showSug ? <td className="pp-c">{ex.load || '—'}</td> : null}
                    {cols.map(c => (
                      <td key={c.key} className="pp-c">
                        {withLoads && c.dated ? (c.blocks[bi]?.exercises[ei]?.load || '—') : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}

      <div className="pp-foot">
        <span>{withLoads ? 'Cargas planificadas por semana (kg). PC = peso corporal.' : 'Anotá la carga usada (kg) en cada semana. Columna “Sup.” = superserie. PC = peso corporal.'}</span>
        <Wordmark />
      </div>
    </section>
  )
}

export default function PlanPrintSheet({
  patientName,
  planName,
  sheets,
  weeks = 6,
  startWeek = 1,
  showLoads = false,
}: {
  patientName: string
  planName: string
  sheets: Sheet[]
  weeks?: number
  startWeek?: number
  showLoads?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const content = (
    <>
      <style>{`
        #plan-print-sheet { display: none; }
        @media print {
          body > *:not(#plan-print-sheet) { display: none !important; }
          #plan-print-sheet { display: block !important; }
          @page { size: A4 landscape; margin: 12mm; }
        }
        #plan-print-sheet { font-family: Helvetica, Arial, sans-serif; color: #000; background: #fff; }
        #plan-print-sheet .pp-sheet { padding-bottom: 2px; }
        #plan-print-sheet .pp-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
        #plan-print-sheet h1 { font-size: 16px; font-weight: 700; margin: 0; }
        #plan-print-sheet .pp-sub { font-size: 11px; color: #333; margin-top: 2px; }
        #plan-print-sheet table { width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; }
        #plan-print-sheet th, #plan-print-sheet td { border: 0.5px solid #444; padding: 4px 5px; text-align: left; vertical-align: top; word-break: break-word; }
        #plan-print-sheet th { font-weight: 700; }
        #plan-print-sheet .pp-block td { font-weight: 700; font-size: 10px; }
        #plan-print-sheet .pp-c { text-align: center; white-space: nowrap; }
        #plan-print-sheet .pp-sup { font-weight: 700; }
        #plan-print-sheet .pp-wh { text-align: center; white-space: normal; }
        #plan-print-sheet .pp-exname { font-size: 10.5px; }
        #plan-print-sheet .pp-wk-dow { font-size: 10px; }
        #plan-print-sheet .pp-wk-sem { font-size: 8px; color: #666; font-weight: 400; }
        #plan-print-sheet .pp-rec { font-size: 8.5px; color: #555; font-style: italic; margin-top: 1px; }
        #plan-print-sheet .pp-foot { font-size: 9px; color: #555; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; }
      `}</style>

      <div id="plan-print-sheet" aria-hidden="true">
        {sheets.map((sh, i) => (
          <SheetBody
            key={i}
            patientName={patientName}
            planName={planName}
            session={sh.session}
            weekSessions={sh.weekSessions}
            weeks={weeks}
            startWeek={startWeek}
            showLoads={showLoads}
            isLast={i === sheets.length - 1}
          />
        ))}
      </div>
    </>
  )

  return createPortal(content, document.body)
}
