'use client'

// Planilla de entrenamiento imprimible (una sesión, A4, ahorro de tinta).
// Se renderiza fuera de pantalla y solo se vuelve visible al imprimir
// (window.print → "Guardar como PDF"). Blanco y negro, tabla densa.

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
}: {
  patientName: string
  planName: string
  session: PrintSession | null
}) {
  const blocks = (session?.session_data?.blocks ?? []).filter(b => b.exercises.length > 0)
  const dateLabel = session
    ? new Date(session.scheduled_date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <>
      <style>{`
        #plan-print-sheet { position: fixed; left: -99999px; top: 0; }
        @media print {
          body * { visibility: hidden !important; }
          #plan-print-sheet, #plan-print-sheet * { visibility: visible !important; }
          #plan-print-sheet {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100%; padding: 14mm; background: #fff; color: #000;
          }
          @page { size: A4; margin: 0; }
        }
        #plan-print-sheet { font-family: Helvetica, Arial, sans-serif; color: #000; background: #fff; }
        #plan-print-sheet h1 { font-size: 16px; font-weight: 700; margin: 0; }
        #plan-print-sheet .pp-sub { font-size: 11px; color: #333; margin-top: 2px; }
        #plan-print-sheet .pp-block { font-size: 12px; font-weight: 700; margin: 12px 0 4px; }
        #plan-print-sheet table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
        #plan-print-sheet th, #plan-print-sheet td { border: 0.5px solid #999; padding: 3px 5px; text-align: left; vertical-align: top; }
        #plan-print-sheet th { font-weight: 700; background: #f2f2f2; }
        #plan-print-sheet .pp-c { text-align: center; white-space: nowrap; }
        #plan-print-sheet .pp-foot { font-size: 9px; color: #666; margin-top: 14px; }
      `}</style>

      <div id="plan-print-sheet" aria-hidden="true">
        <div style={{ borderBottom: '1.5px solid #000', paddingBottom: '6px', marginBottom: '10px' }}>
          <h1>{patientName}</h1>
          <div className="pp-sub">{planName}{session?.session_name ? ` — ${session.session_name}` : ''}{dateLabel ? ` · ${dateLabel}` : ''}</div>
        </div>

        {blocks.length === 0 ? (
          <div style={{ fontSize: '11px' }}>Esta sesión no tiene ejercicios cargados.</div>
        ) : (
          blocks.map((block, bi) => (
            <div key={bi}>
              <div className="pp-block">{block.name}</div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Ejercicio</th>
                    <th className="pp-c" style={{ width: '12%' }}>Series × Reps</th>
                    <th className="pp-c" style={{ width: '12%' }}>Carga</th>
                    <th className="pp-c" style={{ width: '13%' }}>RPE / EAV</th>
                    <th style={{ width: '33%' }}>Recomendaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {block.exercises.map((ex, ei) => (
                    <tr key={ei}>
                      <td>{ex.exercise_name}</td>
                      <td className="pp-c">{(ex.sets || '–')} × {(ex.reps || '–')}</td>
                      <td className="pp-c">{ex.load || '—'}</td>
                      <td className="pp-c">{effort(ex)}</td>
                      <td>{ex.recommendations || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}

        <div className="pp-foot">Generado desde Reason · {new Date().toLocaleDateString('es-AR')}</div>
      </div>
    </>
  )
}
