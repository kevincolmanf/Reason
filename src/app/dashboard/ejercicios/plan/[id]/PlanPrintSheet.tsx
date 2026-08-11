'use client'

import { Fragment } from 'react'

// Planilla de entrenamiento imprimible (una sesión, A4, ahorro de tinta).
// Se renderiza fuera de pantalla y solo se vuelve visible al imprimir
// (window.print → "Guardar como PDF"). Blanco y negro, tabla densa.
//
// Formato "para usar durante semanas": a la izquierda va la prescripción
// (series×reps, RPE/EAV objetivo, carga sugerida) y a la derecha hay N
// columnas en blanco (una por semana) para que el alumno anote a lapicera
// la carga (kg) que usó. Sin rellenos grises: solo texto y filas finas.

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

function effort(ex: PrintExercise): string {
  const parts: string[] = []
  if (ex.rpe_obj) parts.push(`RPE ${ex.rpe_obj}`)
  if (ex.eav_obj) parts.push(`EAV ${ex.eav_obj}`)
  return parts.join(' · ') || '—'
}

export default function PlanPrintSheet({
  patientName,
  planName,
  session,
  weeks = 4,
}: {
  patientName: string
  planName: string
  session: PrintSession | null
  weeks?: number
}) {
  const blocks = (session?.session_data?.blocks ?? []).filter(b => b.exercises.length > 0)
  const dateLabel = session
    ? new Date(session.scheduled_date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  // Columnas semanales en blanco (para escribir la carga usada con lapicera).
  const weekCount = Math.max(1, Math.min(10, Math.round(weeks)))
  const weekCols = Array.from({ length: weekCount }, (_, i) => i + 1)
  // Ancho: columnas fijas de prescripción + reparto del resto entre semanas.
  const weekColWidth = `${Math.max(6, Math.round(43 / weekCount))}%`

  return (
    <>
      <style>{`
        #plan-print-sheet { position: fixed; left: -99999px; top: 0; }
        @media print {
          body * { visibility: hidden !important; }
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
        #plan-print-sheet .pp-meta { font-size: 10px; color: #333; text-align: right; line-height: 1.6; }
        #plan-print-sheet table { width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; }
        #plan-print-sheet th, #plan-print-sheet td { border: 0.5px solid #999; padding: 4px 5px; text-align: left; vertical-align: top; }
        #plan-print-sheet th { font-weight: 700; border-color: #000; }
        #plan-print-sheet .pp-block td { font-weight: 700; font-size: 10px; border-color: #000; }
        #plan-print-sheet .pp-c { text-align: center; white-space: nowrap; }
        #plan-print-sheet .pp-ex { font-weight: 400; }
        #plan-print-sheet .pp-rec { font-size: 8.5px; color: #555; font-style: italic; margin-top: 1px; }
        #plan-print-sheet .pp-week { background: #fff; }
        #plan-print-sheet .pp-foot { font-size: 9px; color: #555; margin-top: 12px; display: flex; justify-content: space-between; }
      `}</style>

      <div id="plan-print-sheet" aria-hidden="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1.5px solid #000', paddingBottom: '6px', marginBottom: '10px' }}>
          <div>
            <h1>{patientName}</h1>
            <div className="pp-sub">{planName}{session?.session_name ? ` — ${session.session_name}` : ''}</div>
          </div>
          <div className="pp-meta">
            {dateLabel ? <>Inicio: {dateLabel}<br /></> : <>Inicio: __ /__ /____<br /></>}
            {weekCount} {weekCount === 1 ? 'semana' : 'semanas'}
          </div>
        </div>

        {blocks.length === 0 ? (
          <div style={{ fontSize: '11px' }}>Esta sesión no tiene ejercicios cargados.</div>
        ) : (
          <table>
            <colgroup>
              <col style={{ width: '24%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '11%' }} />
              {weekCols.map(w => <col key={w} style={{ width: weekColWidth }} />)}
            </colgroup>
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th className="pp-c">Ser × Rep</th>
                <th className="pp-c">RPE / EAV</th>
                <th className="pp-c">Sug.</th>
                {weekCols.map(w => <th key={w} className="pp-c">Sem {w}</th>)}
              </tr>
            </thead>
            <tbody>
              {blocks.map((block, bi) => (
                <Fragment key={`b${bi}`}>
                  <tr className="pp-block">
                    <td colSpan={4 + weekCount}>{block.name}</td>
                  </tr>
                  {block.exercises.map((ex, ei) => (
                    <tr key={`b${bi}e${ei}`} style={{ height: '30px' }}>
                      <td>
                        <div className="pp-ex">{ex.exercise_name}</div>
                        {ex.recommendations ? <div className="pp-rec">{ex.recommendations}</div> : null}
                      </td>
                      <td className="pp-c">{(ex.sets || '–')} × {(ex.reps || '–')}</td>
                      <td className="pp-c">{effort(ex)}</td>
                      <td className="pp-c">{ex.load || '—'}</td>
                      {weekCols.map(w => <td key={w} className="pp-week" />)}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        <div className="pp-foot">
          <span>En cada columna de semana anotá la carga usada (kg). PC = peso corporal.</span>
          <span>Generado desde Reason · {new Date().toLocaleDateString('es-AR')}</span>
        </div>
      </div>
    </>
  )
}
