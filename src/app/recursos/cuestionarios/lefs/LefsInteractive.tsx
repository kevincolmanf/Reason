'use client'

import { useState } from 'react'
import SaveToPatient from '@/components/SaveToPatient'

const LEFS_ITEMS = [
  { id: 1, text: 'Actividades habituales en el hogar' },
  { id: 2, text: 'Actividades de ocio liviano (caminar, sentarse)' },
  { id: 3, text: 'Entrar y salir de la bañera' },
  { id: 4, text: 'Caminar entre habitaciones' },
  { id: 5, text: 'Ponerse los zapatos y calcetines' },
  { id: 6, text: 'Agacharse (cuclillas)' },
  { id: 7, text: 'Levantar un objeto del piso (p. ej. bolsa)' },
  { id: 8, text: 'Realizar actividades físicas livianas (caminar media hora)' },
  { id: 9, text: 'Realizar actividades físicas moderadas (jardinería, barrer)' },
  { id: 10, text: 'Subir escaleras' },
  { id: 11, text: 'Bajar escaleras' },
  { id: 12, text: 'Estar de pie por 1 hora' },
  { id: 13, text: 'Sentarse por 1 hora' },
  { id: 14, text: 'Correr en terreno llano' },
  { id: 15, text: 'Correr en terreno irregular' },
  { id: 16, text: 'Hacer giros y cambios de dirección al correr' },
  { id: 17, text: 'Saltar' },
  { id: 18, text: 'Rotar sobre la pierna afectada' },
  { id: 19, text: 'Realizar su actividad laboral habitual' },
  { id: 20, text: 'Realizar su actividad deportiva o recreativa habitual' },
]

const LEFS_OPTIONS = [
  { val: 0, label: 'Incapaz' },
  { val: 1, label: 'Dificultad extrema' },
  { val: 2, label: 'Bastante dificultad' },
  { val: 3, label: 'Poca dificultad' },
  { val: 4, label: 'Sin dificultad' },
]

export default function LefsInteractive() {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [showResult, setShowResult] = useState(false)

  const answeredCount = Object.keys(answers).length
  const isComplete = answeredCount === 20

  const score = isComplete
    ? Object.values(answers).reduce((a, b) => a + b, 0)
    : null

  const getInterpretation = (s: number) => {
    if (s >= 73) return 'Función normal / discapacidad mínima'
    if (s >= 54) return 'Discapacidad leve'
    if (s >= 31) return 'Discapacidad moderada'
    return 'Discapacidad severa'
  }

  const getColor = (s: number) => {
    if (s >= 73) return 'text-[#22c55e]'
    if (s >= 54) return 'text-[#a3e635]'
    if (s >= 31) return 'text-[#f97316]'
    return 'text-[#ef4444]'
  }

  const handleReset = () => {
    if (confirm('¿Limpiar todas las respuestas?')) {
      setAnswers({})
      setShowResult(false)
    }
  }

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-[20px] font-medium">Completar Cuestionario</h2>
          <span className="text-[13px] text-text-secondary">{answeredCount} de 20 respondidos</span>
        </div>
        <p className="text-[13px] text-text-secondary mb-8">
          ¿Cuánta dificultad tiene actualmente para realizar las siguientes actividades?
        </p>

        <div className="space-y-8">
          {LEFS_ITEMS.map((item, idx) => (
            <div key={item.id} className="pb-8 border-b-[0.5px] border-border last:border-0 last:pb-0">
              <p className="text-[14px] font-medium mb-3">{idx + 1}. {item.text}</p>
              <div className="flex flex-wrap gap-2">
                {LEFS_OPTIONS.map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setAnswers(prev => ({ ...prev, [item.id]: opt.val }))}
                    className={`flex-1 min-w-[80px] py-2 px-2 text-[12px] border-[0.5px] rounded-lg transition-colors text-center ${
                      answers[item.id] === opt.val
                        ? 'bg-accent border-accent text-bg-primary font-medium'
                        : 'bg-bg-secondary border-border text-text-secondary hover:border-border-strong'
                    }`}
                  >
                    <div className="font-medium text-[14px]">{opt.val}</div>
                    <div className="text-[10px] leading-tight mt-0.5 opacity-80">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
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

        {!isComplete && answeredCount > 0 && (
          <div className="mt-4 text-[13px] text-text-secondary text-center py-3 bg-bg-secondary rounded-lg">
            Faltan {20 - answeredCount} ítems para ver el resultado.
          </div>
        )}

        {showResult && score !== null && (
          <div className="mt-8 bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6">
            <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Resultado</div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-[40px] font-medium tracking-[-0.02em]">{score}</span>
              <span className="text-[16px] text-text-secondary">/ 80</span>
            </div>
            <div className={`text-[18px] font-medium mb-4 ${getColor(score)}`}>
              {getInterpretation(score)}
            </div>

            <div className="mb-6 space-y-3">
              <div>
                <div className="flex justify-between text-[10px] text-text-secondary mb-1">
                  <span>0</span><span>20</span><span>40</span><span>54</span><span>73</span><span>80</span>
                </div>
                {/* LEFS: higher is better — green on right */}
                <div className="relative w-full h-2 rounded-full overflow-hidden bg-bg-primary">
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)' }} />
                  <div className="absolute top-0 h-full w-0.5 bg-white shadow" style={{ left: `${(score / 80) * 100}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border">
                  <div className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">MCID</div>
                  <div className="text-[13px] font-medium">≥ 9 puntos indica cambio clínicamente relevante</div>
                </div>
                <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border">
                  <div className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">Implicancia clínica</div>
                  <div className="text-[12px] text-text-secondary leading-[1.5]">Una puntuación &lt;54 indica impacto funcional significativo que puede requerir intervención intensiva.</div>
                </div>
              </div>
            </div>

            <SaveToPatient
              questionnaireType="lefs"
              questionnaireName="LEFS"
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
