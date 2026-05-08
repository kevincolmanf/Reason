'use client'

import { useState } from 'react'
import SaveToPatient from '@/components/SaveToPatient'

const OSWESTRY_SECTIONS = [
  {
    id: 1,
    title: 'Intensidad del dolor',
    options: [
      'Puedo tolerar el dolor sin medicación',
      'El dolor es fuerte pero puedo manejarlo sin medicación',
      'Los analgésicos me alivian completamente',
      'Los analgésicos me alivian moderadamente',
      'Los analgésicos me alivian muy poco',
      'Los analgésicos no alivian el dolor y no los utilizo',
    ],
  },
  {
    id: 2,
    title: 'Cuidado personal (higiene, vestirse)',
    options: [
      'Puedo cuidarme normalmente sin dolor adicional',
      'Puedo cuidarme normalmente pero causa dolor extra',
      'Es doloroso cuidarme y soy lento/cuidadoso',
      'Necesito algo de ayuda pero puedo manejar la mayoría',
      'Necesito ayuda todos los días en la mayoría de aspectos',
      'No me puedo vestir, me cuesta lavarme y permanezco en cama',
    ],
  },
  {
    id: 3,
    title: 'Levantamiento de objetos',
    options: [
      'Puedo levantar objetos pesados sin dolor extra',
      'Puedo levantarlos pero causa dolor extra',
      'El dolor impide levantar objetos del suelo, pero puedo si están en buena posición',
      'El dolor me impide levantar objetos pesados, pero puedo levantar objetos ligeros si están bien ubicados',
      'Solo puedo levantar objetos muy ligeros',
      'No puedo levantar ni cargar nada',
    ],
  },
  {
    id: 4,
    title: 'Caminar',
    options: [
      'El dolor no impide caminar cualquier distancia',
      'El dolor impide caminar más de 1 km',
      'El dolor impide caminar más de 500 m',
      'El dolor impide caminar más de 100 m',
      'Solo puedo caminar con bastón o muletas',
      'Estoy en cama la mayor parte del tiempo y tengo que arrastrarme al baño',
    ],
  },
  {
    id: 5,
    title: 'Estar sentado/a',
    options: [
      'Puedo sentarme en cualquier silla todo el tiempo que quiero',
      'Solo puedo sentarme en mi silla favorita todo el tiempo que quiero',
      'El dolor impide sentarme más de 1 hora',
      'El dolor impide sentarme más de 30 minutos',
      'El dolor impide sentarme más de 10 minutos',
      'El dolor impide sentarme',
    ],
  },
  {
    id: 6,
    title: 'Estar de pie',
    options: [
      'Puedo estar de pie todo el tiempo sin dolor adicional',
      'Puedo estar de pie todo el tiempo pero causa dolor extra',
      'El dolor impide estar de pie más de 1 hora',
      'El dolor impide estar de pie más de 30 minutos',
      'El dolor impide estar de pie más de 10 minutos',
      'El dolor impide estar de pie',
    ],
  },
  {
    id: 7,
    title: 'Dormir',
    options: [
      'El dolor no impide dormir bien',
      'Solo puedo dormir bien con pastillas',
      'Incluso con pastillas duermo menos de 6 horas',
      'Incluso con pastillas duermo menos de 4 horas',
      'Incluso con pastillas duermo menos de 2 horas',
      'El dolor impide dormir completamente',
    ],
  },
  {
    id: 8,
    title: 'Vida social',
    options: [
      'Mi vida social es normal y no causa dolor adicional',
      'Mi vida social es normal pero aumenta el dolor',
      'El dolor impide actividades enérgicas (deporte, baile)',
      'El dolor limita frecuentemente mi vida social',
      'El dolor limita mi vida social al hogar',
      'No tengo vida social por el dolor',
    ],
  },
  {
    id: 9,
    title: 'Viajes',
    options: [
      'Puedo viajar a cualquier lugar sin dolor',
      'Puedo viajar a cualquier lugar pero causa dolor extra',
      'El dolor limita los viajes a menos de 2 horas',
      'El dolor limita los viajes a menos de 1 hora',
      'El dolor limita los viajes necesarios a menos de 30 minutos',
      'El dolor impide todos los viajes excepto ir al médico',
    ],
  },
  {
    id: 10,
    title: 'Actividad laboral / doméstica',
    options: [
      'Puedo realizar toda mi actividad habitual sin dolor',
      'Puedo realizar mi actividad habitual pero con dolor extra',
      'Puedo realizar la mayoría pero no toda mi actividad habitual',
      'No puedo realizar mi actividad habitual, que requiere esfuerzo',
      'Solo puedo realizar actividades livianas',
      'No puedo realizar ninguna actividad',
    ],
  },
]

export default function OswestryInteractive() {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [showResult, setShowResult] = useState(false)

  const answeredCount = Object.keys(answers).length
  const isComplete = answeredCount === 10

  const calculateScore = () => {
    const sum = Object.values(answers).reduce((acc, v) => acc + v, 0)
    return Math.round((sum / 50) * 100 * 10) / 10
  }

  const score = isComplete ? calculateScore() : null

  const getInterpretation = (s: number) => {
    if (s <= 20) return 'Discapacidad mínima'
    if (s <= 40) return 'Discapacidad moderada'
    if (s <= 60) return 'Discapacidad severa'
    if (s <= 80) return 'Discapacidad muy severa'
    return 'Máxima discapacidad'
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

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[20px] font-medium">Completar Cuestionario</h2>
          <span className="text-[13px] text-text-secondary">{answeredCount} de 10 secciones respondidas</span>
        </div>

        <div className="space-y-8">
          {OSWESTRY_SECTIONS.map((section, sIdx) => (
            <div key={section.id} className="pb-8 border-b-[0.5px] border-border last:border-0 last:pb-0">
              <p className="text-[15px] font-medium mb-3">{sIdx + 1}. {section.title}</p>
              <div className="space-y-2">
                {section.options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    onClick={() => setAnswers(prev => ({ ...prev, [section.id]: oIdx }))}
                    className={`w-full text-left px-4 py-3 text-[13px] border-[0.5px] rounded-lg transition-colors ${
                      answers[section.id] === oIdx
                        ? 'bg-accent border-accent text-bg-primary font-medium'
                        : 'bg-bg-secondary border-border text-text-secondary hover:border-border-strong'
                    }`}
                  >
                    <span className="text-[11px] opacity-60 mr-2">{oIdx}</span> {opt}
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

        {showResult && score !== null && (
          <div className="mt-8 bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6">
            <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Resultado</div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-[40px] font-medium tracking-[-0.02em]">{score}%</span>
            </div>
            <div className={`text-[18px] font-medium mb-4 ${getColor(score)}`}>
              {getInterpretation(score)}
            </div>

            <div className="mb-6 space-y-3">
              <div>
                <div className="flex justify-between text-[10px] text-text-secondary mb-1">
                  <span>0%</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span><span>100%</span>
                </div>
                <div className="relative w-full h-2 rounded-full overflow-hidden bg-bg-primary">
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #22c55e, #facc15, #f97316, #ef4444)' }} />
                  <div className="absolute top-0 h-full w-0.5 bg-white shadow" style={{ left: `${Math.min(score, 100)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border">
                  <div className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">MCID</div>
                  <div className="text-[13px] font-medium">≥ 10 puntos indica cambio clínicamente relevante</div>
                </div>
                <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border">
                  <div className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">Implicancia clínica</div>
                  <div className="text-[12px] text-text-secondary leading-[1.5]">Una puntuación &gt;40% sugiere que el dolor impacta significativamente la actividad laboral y social. Considerar evaluación multidisciplinaria.</div>
                </div>
              </div>
            </div>

            <SaveToPatient
              questionnaireType="oswestry"
              questionnaireName="Oswestry (ODI)"
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
