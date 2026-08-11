'use client'

import { Fragment } from 'react'

// Planilla(s) de entrenamiento imprimible(s) (A4 apaisado, ahorro de tinta).
// Se renderiza oculta (display:none) y solo aparece al imprimir
// (window.print → "Guardar como PDF"). Blanco y negro, tabla densa.
//
// Cada hoja = un día del plan: a la izquierda la prescripción (series×reps,
// RPE/EAV), a la derecha una columna por semana con la FECHA real (cuadra 1:1
// con el calendario). Modo "en blanco" (el alumno anota kg a lapicera) o
// "con cargas" (imprime la carga planificada de cada semana). Se pueden
// imprimir varios días, uno por hoja (salto de página entre cada uno).

interface PrintExercise {
  exercise_name: string
  sets: string
  reps: string
  load: string
  rpe_obj: string
  eav_obj: string
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

function effort(ex: PrintExercise): string {
  const parts: string[] = []
  if (ex.rpe_obj) parts.push(`RPE ${ex.rpe_obj}`)
  if (ex.eav_obj) parts.push(`EAV ${ex.eav_obj}`)
  return parts.join(' · ') || '—'
}

function fmtDate(iso: string): { dow: string; dm: string } {
  const d = new Date(iso + 'T00:00:00')
  return { dow: DOW[d.getDay()], dm: `${d.getDate()}/${d.getMonth() + 1}` }
}

function Wordmark() {
  return <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em' }}>reason<span style={{ fontWeight: 400 }}>.</span></span>
}

function SheetBody({ patientName, planName, session, weekSessions, weeks, showLoads, isLast }: {
  patientName: string
  planName: string
  session: PrintSession
  weekSessions?: WeekSession[]
  weeks: number
  showLoads: boolean
  isLast: boolean
}) {
  const blocks = (session.session_data?.blocks ?? []).filter(b => b.exercises.length > 0)
  const dateLabel = new Date(session.scheduled_date + 'T00:00:00')
    .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const weeksArr = weekSessions ?? []
  const useDates = weeksArr.length > 1
  const withLoads = useDates && showLoads
  const cols = useDates
    ? weeksArr.map((ws, i) => ({ key: ws.date, week: i + 1, blocks: ws.blocks, ...fmtDate(ws.date) }))
    : Array.from({ length: Math.max(1, Math.min(12, Math.round(weeks))) }, (_, i) => ({ key: `w${i + 1}`, week: i + 1, dow: '', dm: '', blocks: [] as PrintBlock[] }))
  const colCount = cols.length
  const weekColWidth = `${Math.max(6, Math.round((withLoads ? 54 : 43) / colCount))}%`
  const showSug = !withLoads
  const fixedCount = showSug ? 4 : 3

  return (
    <section className="pp-sheet" style={{ pageBreakAfter: isLast ? undefined : 'always' }}>
      <div className="pp-head">
        <div>
          <h1>{patientName}</h1>
          <div className="pp-sub">{planName}{session.session_name ? ` — ${session.session_name}` : ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Wordmark />
          <div className="pp-meta" style={{ marginTop: '4px' }}>
            Inicio: {dateLabel}<br />
            {colCount} {colCount === 1 ? 'semana' : 'semanas'}{withLoads ? ' · con cargas' : ''}
          </div>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div style={{ fontSize: '11px' }}>Esta sesión no tiene ejercicios cargados.</div>
      ) : (
        <table>
          <colgroup>
            <col style={{ width: showSug ? '24%' : '28%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '13%' }} />
            {showSug ? <col style={{ width: '11%' }} /> : null}
            {cols.map(c => <col key={c.key} style={{ width: weekColWidth }} />)}
          </colgroup>
          <thead>
            <tr>
              <th>Ejercicio</th>
              <th className="pp-c">Ser × Rep</th>
              <th className="pp-c">RPE / EAV</th>
              {showSug ? <th className="pp-c">Sug.</th> : null}
              {cols.map(c => (
                <th key={c.key} className="pp-wh">
                  <div className="pp-wk-dow">{useDates ? `${c.dow} ${c.dm}` : `Sem ${c.week}`}</div>
                  {useDates ? <div className="pp-wk-sem">Sem {c.week}</div> : null}
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
                    <td>
                      <div className="pp-exname">{ex.exercise_name.toUpperCase()}</div>
                      {ex.recommendations ? <div className="pp-rec">{ex.recommendations}</div> : null}
                    </td>
                    <td className="pp-c">{(ex.sets || '–')} × {(ex.reps || '–')}</td>
                    <td className="pp-c">{effort(ex)}</td>
                    {showSug ? <td className="pp-c">{ex.load || '—'}</td> : null}
                    {cols.map(c => (
                      <td key={c.key} className="pp-c">
                        {withLoads ? (c.blocks[bi]?.exercises[ei]?.load || '—') : ''}
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
        <span>{withLoads ? 'Cargas planificadas por semana (kg). PC = peso corporal.' : 'En cada columna de semana anotá la carga usada (kg). PC = peso corporal.'}</span>
        <span>Generado desde <Wordmark /> · {new Date().toLocaleDateString('es-AR')}</span>
      </div>
    </section>
  )
}

export default function PlanPrintSheet({
  patientName,
  planName,
  sheets,
  weeks = 6,
  showLoads = false,
}: {
  patientName: string
  planName: string
  sheets: Sheet[]
  weeks?: number
  showLoads?: boolean
}) {
  return (
    <>
      <style>{`
        #plan-print-sheet { display: none; }
        @media print {
          body * { visibility: hidden !important; }
          #plan-print-sheet { display: block !important; }
          #plan-print-sheet, #plan-print-sheet * { visibility: visible !important; }
          #plan-print-sheet {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100%; background: #fff; color: #000;
          }
          @page { size: A4 landscape; margin: 12mm; }
        }
        #plan-print-sheet { font-family: Helvetica, Arial, sans-serif; color: #000; background: #fff; }
        #plan-print-sheet .pp-sheet { padding-bottom: 4px; }
        #plan-print-sheet .pp-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
        #plan-print-sheet h1 { font-size: 16px; font-weight: 700; margin: 0; }
        #plan-print-sheet .pp-sub { font-size: 11px; color: #333; margin-top: 2px; }
        #plan-print-sheet .pp-meta { font-size: 10px; color: #333; text-align: right; line-height: 1.5; }
        #plan-print-sheet table { width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; }
        #plan-print-sheet th, #plan-print-sheet td { border: 0.5px solid #999; padding: 4px 5px; text-align: left; vertical-align: top; word-break: break-word; }
        #plan-print-sheet th { font-weight: 700; border-color: #000; }
        #plan-print-sheet .pp-block td { font-weight: 700; font-size: 10px; border-color: #000; }
        #plan-print-sheet .pp-c { text-align: center; white-space: nowrap; }
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
            showLoads={showLoads}
            isLast={i === sheets.length - 1}
          />
        ))}
      </div>
    </>
  )
}
