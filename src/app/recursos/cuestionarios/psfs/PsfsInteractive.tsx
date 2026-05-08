'use client'

import { useState } from 'react'
import SaveToPatient from '@/components/SaveToPatient'

interface ActivityEntry {
  name: string
  score: number | null
}

export default function PsfsInteractive() {
  const [activities, setActivities] = useState<ActivityEntry[]>([
    { name: '', score: null },
    { name: '', score: null },
    { name: '', score: null },
  ])
  const [showResult, setShowResult] = useState(false)

  const updateActivityName = (idx: number, name: string) => {
    setActivities(prev => prev.map((a, i) => i === idx ? { ...a, name } : a))
  }

  const updateActivityScore = (idx: number, score: number) => {
    setActivities(prev => prev.map((a, i) => i === idx ? { ...a, score } : a))
  }

  // An activity counts if it has a name AND a score
  const ratedActivities = activities.filter(a => a.name.trim() !== '' && a.score !== null)
  const isComplete = ratedActivities.length >= 1

  const average = isComplete
    ? Math.round((ratedActivities.reduce((sum, a) => sum + (a.score as number), 0) / ratedActivities.length) * 10) / 10
    : null

  const getInterpretation = (s: number) => {
    if (s >= 8) return 'Función buena / mínima limitación'
    if (s >= 6) return 'Limitación leve'
    if (s >= 4) return 'Limitación moderada'
    return 'Limitación severa'
  }

  const getColor = (s: number) => {
    if (s >= 8) return 'text-[#22c55e]'
    if (s >= 6) return 'text-[#facc15]'
    if (s >= 4) return 'text-[#f97316]'
    return 'text-[#ef4444]'
  }

  const handleReset = () => {
    if (confirm('¿Limpiar todas las respuestas?')) {
      setActivities([
        { name: '', score: null },
        { name: '', score: null },
        { name: '', score: null },
      ])
      setShowResult(false)
    }
  }

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <h2 className="text-[20px] font-medium mb-3">Completar Cuestionario</h2>
        <p className="text-[14px] text-text-secondary mb-8">
          Nombrá hasta 3 actividades que actualmente no podés hacer o que tenés dificultad para realizar a causa de tu problema. Luego indicá cuánta dificultad tenés para cada una (0 = Incapaz de realizar, 10 = Sin dificultad).
        </p>

        <div className="space-y-10">
          {activities.map((activity, idx) => {
            const hasName = activity.name.trim() !== ''
            return (
              <div key={idx} className="pb-10 border-b-[0.5px] border-border last:border-0 last:pb-0">
                <label className="block text-[13px] font-medium text-text-secondary uppercase tracking-[0.05em] mb-2">
                  Actividad {idx + 1}
                </label>
                <input
                  type="text"
                  value={activity.name}
                  onChange={e => updateActivityName(idx, e.target.value)}
                  placeholder={`Ej: ${idx === 0 ? 'Subir escaleras' : idx === 1 ? 'Caminar más de 10 minutos' : 'Practicar deporte'}`}
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-accent mb-4"
                />

                {hasName && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[12px] text-text-secondary">0 = Incapaz de realizar</span>
                      <span className="text-[12px] text-text-secondary">10 = Sin dificultad</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: 11 }, (_, i) => i).map(val => (
                        <button
                          key={val}
                          onClick={() => updateActivityScore(idx, val)}
                          className={`flex-1 min-w-[36px] py-2.5 text-[14px] font-medium border-[0.5px] rounded-lg transition-colors ${
                            activity.score === val
                              ? 'bg-accent border-accent text-bg-primary'
                              : 'bg-bg-secondary border-border text-text-secondary hover:border-border-strong'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    {activity.score !== null && (
                      <div className="mt-2 text-[12px] text-text-secondary text-right">
                        Seleccionado: <span className="font-medium text-accent">{activity.score}/10</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setShowResult(true)}
            disabled={!isComplete}
            className="bg-accent text-bg-primary px-5 py-2.5 rounded-lg text-[14px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Ver Resultado
          </button>
          <button onClick={handleReset} className="text-text-secondary text-[13px] hover:text-text-primary">
            Limpiar
          </button>
        </div>

        {!isComplete && (
          <div className="mt-4 text-[13px] text-text-secondary text-center py-3 bg-bg-secondary rounded-lg">
            Ingresá al menos 1 actividad con su puntuación para ver el resultado.
          </div>
        )}

        {showResult && average !== null && (
          <div className="mt-8 bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6">
            <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Resultado Promedio</div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-[40px] font-medium tracking-[-0.02em]">{average}</span>
              <span className="text-[16px] text-text-secondary">/ 10</span>
            </div>
            <div className={`text-[18px] font-medium mb-6 ${getColor(average)}`}>
              {getInterpretation(average)}
            </div>

            {/* Individual activity scores */}
            <div className="mb-6 space-y-2">
              {ratedActivities.map((a, i) => (
                <div key={i} className="flex justify-between items-center bg-bg-primary rounded-lg px-4 py-3 border-[0.5px] border-border">
                  <span className="text-[14px] text-text-primary">{a.name}</span>
                  <span className="text-[16px] font-medium text-accent ml-4 shrink-0">{a.score}/10</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
              <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border">
                <div className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">MCID</div>
                <div className="text-[13px] font-medium">≥ 2 puntos por actividad indica cambio clínicamente significativo</div>
              </div>
              <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border">
                <div className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">Implicancia clínica</div>
                <div className="text-[12px] text-text-secondary leading-[1.5]">La PSFS es sensible al cambio y centrada en el paciente. Permite monitorear progreso en actividades que el propio paciente considera importantes.</div>
              </div>
            </div>

            <SaveToPatient
              questionnaireType="psfs"
              questionnaireName="PSFS"
              score={average}
              interpretation={getInterpretation(average)}
              resultData={{
                activities: ratedActivities.map(a => ({ name: a.name, score: a.score })),
                average,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
