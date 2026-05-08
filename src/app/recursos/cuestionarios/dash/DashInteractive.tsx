'use client'

import { useState } from 'react'
import SaveToPatient from '@/components/SaveToPatient'

const DASH_ITEMS = [
  { id: 1, text: 'Abrir un frasco hermético nuevo o con tapa difícil' },
  { id: 2, text: 'Escribir' },
  { id: 3, text: 'Girar una llave' },
  { id: 4, text: 'Preparar comidas' },
  { id: 5, text: 'Empujar una puerta pesada' },
  { id: 6, text: 'Colocar un objeto en un estante sobre la cabeza' },
  { id: 7, text: 'Realizar tareas domésticas pesadas (limpiar pisos, lavar paredes)' },
  { id: 8, text: 'Trabajar en el jardín o patio' },
  { id: 9, text: 'Tender la cama' },
  { id: 10, text: 'Cargar una bolsa de supermercado o maletín' },
  { id: 11, text: 'Cargar un objeto pesado (más de 5 kg)' },
  { id: 12, text: 'Cambiar un foco eléctrico sobre la cabeza' },
  { id: 13, text: 'Lavarse o secarse el cabello' },
  { id: 14, text: 'Lavarse la espalda' },
  { id: 15, text: 'Ponerse un suéter o pullover' },
  { id: 16, text: 'Cortar alimentos con cuchillo' },
  { id: 17, text: 'Actividades de recreación que requieren poco esfuerzo (jugar a las cartas, tejer)' },
  { id: 18, text: 'Actividades de recreación que requieren fuerza o impacto en el brazo, hombro o mano (golf, martillar, tenis)' },
  { id: 19, text: 'Actividades de recreación en las que mueve libremente el brazo (frisbee, badminton)' },
  { id: 20, text: 'Movilizarse de un lugar a otro (de una silla a otra, de la cama al baño)' },
  { id: 21, text: 'Actividad sexual (si aplica)', optional: true },
  { id: 22, text: '¿En qué medida su problema de brazo, hombro o mano ha interferido en sus actividades sociales normales con familia, amigos, vecinos o grupos?' },
  { id: 23, text: '¿Ha tenido limitaciones en su trabajo u otras actividades diarias como consecuencia de su problema?' },
  { id: 24, text: 'Dolor en brazo, hombro o mano' },
  { id: 25, text: 'Dolor al realizar actividades específicas' },
  { id: 26, text: 'Hormigueo (pinchazos) en brazo, hombro o mano' },
  { id: 27, text: 'Debilidad en brazo, hombro o mano' },
  { id: 28, text: 'Rigidez en brazo, hombro o mano' },
  { id: 29, text: '¿Cuánta dificultad tuvo para dormir debido al dolor en brazo, hombro o mano?' },
  { id: 30, text: 'Me sentí menos capaz, confiado/a o útil por mi problema' },
]

const SCALE_LABELS: Record<number, string[]> = {
  // Default 1-5 for most items
  0: ['Sin dificultad', 'Poca dificultad', 'Dificultad moderada', 'Mucha dificultad', 'Incapaz'],
}

function getLabels(id: number): string[] {
  if ([24, 25, 26, 27, 28].includes(id)) return ['Ninguno', 'Leve', 'Moderado', 'Intenso', 'Extremo']
  if (id === 29) return ['Ninguna', 'Poca', 'Moderada', 'Mucha', 'Incapaz de dormir']
  if (id === 30) return ['Totalmente en desacuerdo', 'En desacuerdo', 'Sin opinión', 'De acuerdo', 'Totalmente de acuerdo']
  if ([22, 23].includes(id)) return ['Nada', 'Poco', 'Moderadamente', 'Bastante', 'Extremadamente']
  return SCALE_LABELS[0]
}

export default function DashInteractive() {
  const [answers, setAnswers] = useState<Record<number, number | null>>({})
  const [showResult, setShowResult] = useState(false)

  const item21Skipped = answers[21] === null

  const requiredAnswered = DASH_ITEMS.filter(item => {
    if (item.id === 21) return answers[21] !== undefined
    return answers[item.id] !== undefined
  }).length

  const isComplete = (() => {
    // All 30 items need a value (including item 21 = null for "no aplica")
    return DASH_ITEMS.every(item => answers[item.id] !== undefined)
  })()

  const calculateScore = () => {
    const validAnswers = Object.entries(answers)
      .filter(([, v]) => v !== null)
      .map(([, v]) => v as number)
    const n = validAnswers.length
    if (n === 0) return 0
    const sum = validAnswers.reduce((a, b) => a + b, 0)
    return Math.round(((sum / n) - 1) * 25 * 10) / 10
  }

  const score = isComplete ? calculateScore() : null

  const getInterpretation = (s: number) => {
    if (s <= 20) return 'Discapacidad leve'
    if (s <= 40) return 'Discapacidad moderada'
    if (s <= 60) return 'Discapacidad moderada-severa'
    return 'Discapacidad severa'
  }

  const getColor = (s: number) => {
    if (s <= 20) return 'text-[#22c55e]'
    if (s <= 40) return 'text-[#facc15]'
    if (s <= 60) return 'text-[#f97316]'
    return 'text-[#ef4444]'
  }

  const handleReset = () => {
    if (confirm('¿Limpiar todas las respuestas?')) {
      setAnswers({})
      setShowResult(false)
    }
  }

  const answeredCount = Object.keys(answers).length

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-[20px] font-medium">Completar Cuestionario</h2>
          <span className="text-[13px] text-text-secondary">{answeredCount} de 30 respondidos</span>
        </div>
        <p className="text-[13px] text-text-secondary mb-8">
          1 = Sin dificultad / Sin dolor / Nada — 5 = Incapaz / Mucho / Extremo
        </p>

        <div className="space-y-8">
          {DASH_ITEMS.map((item, idx) => {
            const labels = getLabels(item.id)
            const isOptional = item.optional === true
            return (
              <div key={item.id} className="pb-8 border-b-[0.5px] border-border last:border-0 last:pb-0">
                <p className="text-[14px] font-medium mb-3">
                  {idx + 1}. {item.text}
                  {isOptional && <span className="text-text-secondary font-normal ml-1">(opcional)</span>}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5].map((val, vIdx) => (
                    <button
                      key={val}
                      onClick={() => setAnswers(prev => ({ ...prev, [item.id]: val }))}
                      className={`flex-1 min-w-[52px] py-2 px-1 text-center border-[0.5px] rounded-lg transition-colors ${
                        answers[item.id] === val
                          ? 'bg-accent border-accent text-bg-primary font-medium'
                          : 'bg-bg-secondary border-border text-text-secondary hover:border-border-strong'
                      }`}
                    >
                      <div className="text-[14px] font-medium">{val}</div>
                      <div className="text-[10px] leading-tight mt-0.5 opacity-70">{labels[vIdx]}</div>
                    </button>
                  ))}
                  {isOptional && (
                    <button
                      onClick={() => setAnswers(prev => ({ ...prev, [item.id]: null }))}
                      className={`flex-1 min-w-[52px] py-2 px-1 text-center border-[0.5px] rounded-lg transition-colors text-[12px] ${
                        item21Skipped
                          ? 'bg-accent border-accent text-bg-primary font-medium'
                          : 'bg-bg-secondary border-border text-text-secondary hover:border-border-strong'
                      }`}
                    >
                      No aplica
                    </button>
                  )}
                </div>
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

        {!isComplete && requiredAnswered > 0 && (
          <div className="mt-4 text-[13px] text-text-secondary text-center py-3 bg-bg-secondary rounded-lg">
            Faltan {30 - answeredCount} ítems para ver el resultado.
          </div>
        )}

        {showResult && score !== null && (
          <div className="mt-8 bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6">
            <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Resultado</div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-[40px] font-medium tracking-[-0.02em]">{score}</span>
              <span className="text-[16px] text-text-secondary">/ 100</span>
            </div>
            <div className={`text-[18px] font-medium mb-4 ${getColor(score)}`}>
              {getInterpretation(score)}
            </div>

            <div className="mb-6 space-y-3">
              <div>
                <div className="flex justify-between text-[10px] text-text-secondary mb-1">
                  <span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span>
                </div>
                <div className="relative w-full h-2 rounded-full overflow-hidden bg-bg-primary">
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #22c55e, #facc15, #f97316, #ef4444)' }} />
                  <div className="absolute top-0 h-full w-0.5 bg-white shadow" style={{ left: `${Math.min(score, 100)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border">
                  <div className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">MCID</div>
                  <div className="text-[13px] font-medium">≥ 10-13 puntos indica cambio clínicamente significativo</div>
                </div>
                <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border">
                  <div className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">Implicancia clínica</div>
                  <div className="text-[12px] text-text-secondary leading-[1.5]">El DASH evalúa función del miembro superior en su conjunto. Útil para hombro, codo, muñeca y mano. Permite monitorear evolución y establecer objetivos funcionales.</div>
                </div>
              </div>
            </div>

            <SaveToPatient
              questionnaireType="dash"
              questionnaireName="DASH"
              score={score}
              interpretation={getInterpretation(score)}
              resultData={{ answers: Object.values(answers), score }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
