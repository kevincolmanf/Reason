'use client'

import { useState } from 'react'
import SaveToPatient from '@/components/SaveToPatient'

const FABQ_ITEMS = [
  { id: 1, text: 'Mi dolor fue causado por una actividad física', scored: false },
  { id: 2, text: 'La actividad física empeora mi dolor', scored: true, subscale: 'pa' },
  { id: 3, text: 'La actividad física podría dañarme', scored: true, subscale: 'pa' },
  { id: 4, text: 'No debería realizar actividades físicas que empeoran mi dolor', scored: true, subscale: 'pa' },
  { id: 5, text: 'No puedo hacer actividades físicas que empeoren mi dolor', scored: true, subscale: 'pa' },
  { id: 6, text: 'Mi dolor fue causado por mi trabajo o por un accidente laboral', scored: true, subscale: 'work' },
  { id: 7, text: 'Mi trabajo empeoró mi dolor', scored: true, subscale: 'work' },
  { id: 8, text: 'Mi trabajo es demasiado pesado para mí', scored: false },
  { id: 9, text: 'Mi trabajo podría dañarme', scored: true, subscale: 'work' },
  { id: 10, text: 'Mi trabajo no debería realizarlo con el dolor actual', scored: true, subscale: 'work' },
  { id: 11, text: 'Mi trabajo empeora o empeoraría mi dolor', scored: true, subscale: 'work' },
  { id: 12, text: 'No debería realizar mi trabajo normal con el dolor actual', scored: true, subscale: 'work' },
  { id: 13, text: 'No puedo realizar mi trabajo normal con el dolor actual', scored: false },
  { id: 14, text: 'No puedo hacer mi trabajo normal hasta que el dolor sea tratado', scored: false },
  { id: 15, text: 'No creo que volvería al trabajo normal en los próximos 3 meses', scored: true, subscale: 'work' },
  { id: 16, text: 'No creo que volvería al trabajo normal en los próximos 6 meses', scored: false },
]

const PA_ITEM_IDS = [2, 3, 4, 5]
const WORK_ITEM_IDS = [6, 7, 9, 10, 11, 12, 15]

export default function FabqInteractive() {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [showResult, setShowResult] = useState(false)

  const answeredCount = Object.keys(answers).length
  const isComplete = answeredCount === 16

  const paScore = PA_ITEM_IDS.reduce((sum, id) => sum + (answers[id] ?? 0), 0)
  const workScore = WORK_ITEM_IDS.reduce((sum, id) => sum + (answers[id] ?? 0), 0)

  const getInterpretation = (pa: number, work: number) => {
    if (pa > 14 || work > 29) return 'Creencias evitativas elevadas'
    if (pa >= 8 || work >= 15) return 'Creencias evitativas moderadas'
    return 'Creencias evitativas bajas'
  }

  const getColor = (pa: number, work: number) => {
    if (pa > 14 || work > 29) return 'text-[#ef4444]'
    if (pa >= 8 || work >= 15) return 'text-[#f97316]'
    return 'text-[#22c55e]'
  }

  const handleReset = () => {
    if (confirm('¿Limpiar todas las respuestas?')) {
      setAnswers({})
      setShowResult(false)
    }
  }

  const SCALE_OPTIONS = [
    { val: 0, label: 'Totalmente\nen desacuerdo' },
    { val: 1, label: '' },
    { val: 2, label: '' },
    { val: 3, label: 'Sin opinión\ndefinida' },
    { val: 4, label: '' },
    { val: 5, label: '' },
    { val: 6, label: 'Totalmente\nde acuerdo' },
  ]

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-[20px] font-medium">Completar Cuestionario</h2>
          <span className="text-[13px] text-text-secondary">{answeredCount} de 16 respondidos</span>
        </div>
        <p className="text-[13px] text-text-secondary mb-8">
          Indicá en qué medida estás de acuerdo con cada afirmación. 0 = Totalmente en desacuerdo, 3 = Sin opinión definida, 6 = Totalmente de acuerdo.
        </p>

        <div className="space-y-8">
          {FABQ_ITEMS.map((item, idx) => {
            const isScored = item.scored
            return (
              <div key={item.id} className="pb-8 border-b-[0.5px] border-border last:border-0 last:pb-0">
                <div className="flex items-start gap-2 mb-3">
                  <p className="text-[14px] font-medium flex-1">{idx + 1}. {item.text}</p>
                  {!isScored && (
                    <span className="text-[10px] bg-bg-secondary border-[0.5px] border-border rounded px-1.5 py-0.5 text-text-secondary shrink-0 mt-0.5">
                      No puntúa
                    </span>
                  )}
                  {isScored && item.subscale && (
                    <span className={`text-[10px] border-[0.5px] rounded px-1.5 py-0.5 shrink-0 mt-0.5 ${
                      item.subscale === 'pa'
                        ? 'bg-blue-900/20 border-blue-500/30 text-blue-400'
                        : 'bg-purple-900/20 border-purple-500/30 text-purple-400'
                    }`}>
                      {item.subscale === 'pa' ? 'AF' : 'Trabajo'}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {SCALE_OPTIONS.map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setAnswers(prev => ({ ...prev, [item.id]: opt.val }))}
                      className={`flex-1 py-2 text-center border-[0.5px] rounded-lg transition-colors ${
                        answers[item.id] === opt.val
                          ? 'bg-accent border-accent text-bg-primary font-medium'
                          : 'bg-bg-secondary border-border text-text-secondary hover:border-border-strong'
                      }`}
                    >
                      <div className="text-[13px] font-medium">{opt.val}</div>
                      {opt.label && (
                        <div className="text-[9px] leading-tight mt-0.5 opacity-70 whitespace-pre-line hidden sm:block">
                          {opt.label}
                        </div>
                      )}
                    </button>
                  ))}
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

        {!isComplete && answeredCount > 0 && (
          <div className="mt-4 text-[13px] text-text-secondary text-center py-3 bg-bg-secondary rounded-lg">
            Faltan {16 - answeredCount} ítems para ver el resultado.
          </div>
        )}

        {showResult && isComplete && (
          <div className="mt-8 bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6">
            <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Resultado</div>
            <div className={`text-[22px] font-medium mb-5 ${getColor(paScore, workScore)}`}>
              {getInterpretation(paScore, workScore)}
            </div>

            {/* Two subscale bars */}
            <div className="space-y-5 mb-6">
              {/* PA subscale */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[12px] font-medium text-text-primary">Subescala Actividad Física (AF)</span>
                  <span className="text-[16px] font-medium text-accent">{paScore} / 24</span>
                </div>
                <div className="flex justify-between text-[10px] text-text-secondary mb-1">
                  <span>0</span><span>14 (corte)</span><span>24</span>
                </div>
                <div className="relative w-full h-2 rounded-full overflow-hidden bg-bg-primary">
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #22c55e, #f97316, #ef4444)' }} />
                  <div className="absolute top-0 h-full w-0.5 bg-yellow-300 shadow" style={{ left: `${(14 / 24) * 100}%` }} />
                  <div className="absolute top-0 h-full w-0.5 bg-white shadow" style={{ left: `${(paScore / 24) * 100}%` }} />
                </div>
                {paScore > 14 && <p className="text-[11px] text-[#ef4444] mt-1">Por encima del punto de corte (&gt;14)</p>}
              </div>

              {/* Work subscale */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[12px] font-medium text-text-primary">Subescala Trabajo</span>
                  <span className="text-[16px] font-medium text-accent">{workScore} / 42</span>
                </div>
                <div className="flex justify-between text-[10px] text-text-secondary mb-1">
                  <span>0</span><span>29 (corte)</span><span>42</span>
                </div>
                <div className="relative w-full h-2 rounded-full overflow-hidden bg-bg-primary">
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #22c55e, #f97316, #ef4444)' }} />
                  <div className="absolute top-0 h-full w-0.5 bg-yellow-300 shadow" style={{ left: `${(29 / 42) * 100}%` }} />
                  <div className="absolute top-0 h-full w-0.5 bg-white shadow" style={{ left: `${(workScore / 42) * 100}%` }} />
                </div>
                {workScore > 29 && <p className="text-[11px] text-[#ef4444] mt-1">Por encima del punto de corte (&gt;29)</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
              <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border">
                <div className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">MCID</div>
                <div className="text-[13px] font-medium">No existe MCID establecido. Los puntos de corte son PA &gt; 14 y Trabajo &gt; 29.</div>
              </div>
              <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border">
                <div className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">Implicancia clínica</div>
                <div className="text-[12px] text-text-secondary leading-[1.5]">Creencias evitativas elevadas se asocian a cronificación del dolor y peores resultados. Considerar educación en neurociencia del dolor y exposición gradual.</div>
              </div>
            </div>

            <SaveToPatient
              questionnaireType="fabq"
              questionnaireName="FABQ"
              score={paScore}
              interpretation={getInterpretation(paScore, workScore)}
              resultData={{ pa_score: paScore, work_score: workScore, answers: Object.values(answers) }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
