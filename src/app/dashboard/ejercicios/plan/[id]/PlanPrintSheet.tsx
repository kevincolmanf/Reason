'use client'

import { Fragment } from 'react'

// Planilla de entrenamiento imprimible (una sesión, A4, ahorro de tinta).
// Se renderiza fuera de pantalla y solo se vuelve visible al imprimir
// (window.print → "Guardar como PDF"). Blanco y negro, tabla densa.
//
// Formato "para usar durante semanas": a la izquierda la prescripción
// (series×reps, RPE/EAV), y a la derecha una columna por semana. Si el día
// está duplicado en el calendario, las columnas llevan la FECHA real de cada
// semana (la hoja cuadra 1:1 con el plan digital). Dos modos de impresión:
//   · en blanco → el alumno anota la carga (kg) a lapicera.
//   · con cargas → se imprime la carga planificada de cada semana (entrena
//     leyendo la hoja, sin celular).
// Sin rellenos grises: solo texto y filas finas.

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

export default function PlanPrintSheet({
  patientName,
  planName,
  session,
  weeks = 4,
  weekSessions,
  showLoads = false,
}: {
  patientName: string
  planName: string
  session: PrintSession | null
  weeks?: number
  weekSessions?: WeekSession[]
  showLoads?: boolean
}) {
  const blocks = (session?.session_data?.blocks ?? []).filter(b => b.exercises.length > 0)
  const dateLabel = session
    ? new Date(session.scheduled_date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  // Columnas semanales: fechas reales del plan si las hay; si no, blanco "Sem N".
  const weeksArr = weekSessions ?? []
  const useDates = weeksArr.length > 1
  const withLoads = useDates && showLoads
  const cols = useDates
    ? weeksArr.map((ws, i) => ({ key: ws.date, week: i + 1, blocks: ws.blocks, ...fmtDate(ws.date) }))
    : Array.from({ length: Math.max(1, Math.min(10, Math.round(weeks))) }, (_, i) => ({ key: `w${i + 1}`, week: i + 1, dow: '', dm: '', blocks: [] as PrintBlock[] }))
  const colCount = cols.length
  const weekColWidth = `${Math.max(6, Math.round((withLoads ? 54 : 43) / colCount))}%`
  // En modo "con cargas" la columna Sug. es redundante (cada semana ya la muestra).
  const showSug = !withLoads
  const fixedCount = showSug ? 4 : 3

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
            width: 100%; padding: 12mm; background: #fff; color: #000;
          }
          @page { size: A4 landscape; margin: 0; }
        }
        #plan-print-sheet { font-family: Helvetica, Arial, sans-serif; color: #000; background: #fff; }
        #plan-print-sheet h1 { font-size: 16px; font-weight: 700; margin: 0; }
        #plan-print-sheet .pp-sub { font-size: 11px; color: #333; margin-top: 2px; }
        #plan-print-sheet .pp-meta { font-size: 10px; color: #333; text-align: right; line-height: 1.5; }
        #plan-print-sheet table { width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; }
        #plan-print-sheet th, #plan-print-sheet td { border: 0.5px solid #999; padding: 4px 5px; text-align: left; vertical-align: top; }
        #plan-print-sheet th { font-weight: 700; border-color: #000; }
        #plan-print-sheet .pp-block td { font-weight: 700; font-size: 10px; border-color: #000; }
        #plan-print-sheet .pp-c { text-align: center; white-space: nowrap; }
        #plan-print-sheet .pp-wk-dow { font-size: 10.5px; }
        #plan-print-sheet .pp-wk-sem { font-size: 8px; color: #666; font-weight: 400; }
        #plan-print-sheet .pp-rec { font-size: 8.5px; color: #555; font-style: italic; margin-top: 1px; }
        #plan-print-sheet .pp-foot { font-size: 9px; color: #555; margin-top: 12px; display: flex; justify-content: space-between; align-items: center; }
      `}</style>

      <div id="plan-print-sheet" aria-hidden="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #000', paddingBottom: '6px', marginBottom: '10px' }}>
          <div>
            <h1>{patientName}</h1>
            <div className="pp-sub">{planName}{session?.session_name ? ` — ${session.session_name}` : ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Wordmark />
            <div className="pp-meta" style={{ marginTop: '4px' }}>
              {dateLabel ? <>Inicio: {dateLabel}<br /></> : <>Inicio: __ /__ /____<br /></>}
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
                  <th key={c.key} className="pp-c">
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
                    <td colSpan={fixedCount + colCount}>{block.name}</td>
                  </tr>
                  {block.exercises.map((ex, ei) => (
                    <tr key={`b${bi}e${ei}`} style={{ height: '30px' }}>
                      <td>
                        <div>{ex.exercise_name}</div>
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
      </div>
    </>
  )
}
