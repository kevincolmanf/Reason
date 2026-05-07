'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { jsPDF } from 'jspdf'

const RM_ITEMS = [
  { id: 1, text: 'Me quedo en casa la mayor parte del tiempo por el dolor de espalda.' },
  { id: 2, text: 'Cambio de postura con frecuencia para intentar aliviar el dolor.' },
  { id: 3, text: 'Debido al dolor de espalda, camino más lento que de costumbre.' },
  { id: 4, text: 'A causa del dolor, no puedo hacer ninguna de las tareas habituales de mi casa.' },
  { id: 5, text: 'Por el dolor de espalda, utilizo el pasamanos para subir escaleras.' },
  { id: 6, text: 'A causa del dolor, me acuesto más a menudo para descansar.' },
  { id: 7, text: 'Debido al dolor, necesito agarrarme a algo para levantarme del sillón.' },
  { id: 8, text: 'A causa del dolor, pido a otras personas que me hagan las cosas.' },
  { id: 9, text: 'Me visto más lento de lo normal por el dolor.' },
  { id: 10, text: 'A causa del dolor, sólo me quedo de pie por períodos cortos de tiempo.' },
  { id: 11, text: 'A causa del dolor, procuro evitar agacharme o arrodillarme.' },
  { id: 12, text: 'Me resulta difícil levantarme de una silla por el dolor de espalda.' },
  { id: 13, text: 'Casi siempre me duele la espalda.' },
  { id: 14, text: 'Me cuesta trabajo darme vuelta en la cama por el dolor.' },
  { id: 15, text: 'Debido al dolor, no tengo buen apetito.' },
  { id: 16, text: 'A causa del dolor, me resulta difícil ponerme los calcetines/medias.' },
  { id: 17, text: 'A causa del dolor de espalda, ando distancias cortas solamente.' },
  { id: 18, text: 'Duermo peor que de costumbre por el dolor.' },
  { id: 19, text: 'Por culpa del dolor de espalda me tienen que ayudar a vestirme.' },
  { id: 20, text: 'Me paso casi todo el día sentado(a) por el dolor de espalda.' },
  { id: 21, text: 'Por el dolor evito hacer trabajos pesados en la casa.' },
  { id: 22, text: 'Debido al dolor de espalda, estoy más irritable o de peor humor.' },
  { id: 23, text: 'A causa del dolor, subo las escaleras más lentamente que de costumbre.' },
  { id: 24, text: 'Me quedo en la cama casi todo el día por el dolor.' }
]

export default function RolandMorrisInteractive({ userId }: { userId: string }) {
  const [answers, setAnswers] = useState<Record<number, boolean>>({})
  const [standaloneScore, setStandaloneScore] = useState<string>('')
  
  const handleAnswer = (id: number) => {
    setAnswers(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Roland Morris solo requiere sumar los marcados
  const score = Object.values(answers).filter(Boolean).length

  const getInterpretation = (s: number) => {
    if (s <= 8) return 'Discapacidad Leve'
    if (s <= 16) return 'Discapacidad Moderada'
    return 'Discapacidad Severa'
  }

  const handleSaveResult = async () => {
    const supabase = createClient()
    await supabase.from('tool_sessions').insert({
      user_id: userId,
      tool_type: 'cuestionario',
      tool_slug: 'roland-morris'
    })
    alert('Resultado guardado.')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`Roland-Morris Disability Questionnaire\nScore Total: ${score}/24\nInterpretación: ${getInterpretation(score)}`)
    alert('Copiado al portapapeles')
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Roland-Morris - Resultado', 20, 20)
    
    doc.setFontSize(12)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 20, 30)
    
    doc.setFontSize(14)
    doc.text(`Score Total: ${score} / 24`, 20, 45)
    doc.text(`Interpretación: ${getInterpretation(score)}`, 20, 55)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Ítems marcados afirmativamente:', 20, 70)
    
    let y = 80
    let count = 0
    RM_ITEMS.forEach((item, index) => {
      if (answers[item.id]) {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        const splitText = doc.splitTextToSize(`- ${index + 1}. ${item.text}`, 170)
        doc.text(splitText, 20, y)
        y += 5 * splitText.length + 2
        count++
      }
    })

    if (count === 0) {
      doc.text('Ningún ítem fue marcado.', 20, y)
    }
    
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    doc.save('RolandMorris_Resultado.pdf')
  }

  const handleReset = () => {
    if (confirm('¿Limpiar todas las respuestas?')) setAnswers({})
  }

  const downloadBlankPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Roland-Morris Disability Questionnaire', 20, 20)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Instrucciones: Al leer la lista, marque aquellas frases que lo describan a usted el día de HOY.', 20, 30)

    let y = 45
    RM_ITEMS.forEach((item, index) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      const splitText = doc.splitTextToSize(`[   ] ${index + 1}. ${item.text}`, 170)
      doc.text(splitText, 20, y)
      y += 5 * splitText.length + 3
    })
    
    if (y > 250) { doc.addPage(); y = 20; }
    doc.line(20, y + 5, 190, y + 5)
    doc.text('Puntuación Total (cantidad de cruces): _______ / 24', 20, y + 15)
    
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    doc.save('RolandMorris_Blank.pdf')
  }

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <h2 className="text-[20px] font-medium mb-6">Completar Cuestionario</h2>
        <p className="text-[14px] text-text-secondary mb-6">
          Marcá las casillas que correspondan al estado del paciente el día de HOY. Dejá sin marcar las que no correspondan.
        </p>
        
        <div className="space-y-4">
          {RM_ITEMS.map((item, index) => (
            <label key={item.id} className="flex items-start gap-4 p-4 border-[0.5px] border-border rounded-lg cursor-pointer hover:bg-bg-secondary transition-colors">
              <input 
                type="checkbox" 
                checked={answers[item.id] || false}
                onChange={() => handleAnswer(item.id)}
                className="mt-1 w-5 h-5 accent-accent cursor-pointer"
              />
              <span className="text-[15px]">{index + 1}. {item.text}</span>
            </label>
          ))}
        </div>

        <div className="mt-8 bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6">
          <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Resultado Actual</div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-[40px] font-medium tracking-[-0.02em]">{score}</span>
            <span className="text-[16px] text-text-secondary">/ 24</span>
          </div>
          <div className="text-[18px] font-medium text-accent mb-6">
            {getInterpretation(score)}
          </div>
          
          <div className="flex flex-wrap gap-4">
            <button onClick={handleSaveResult} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium">
              Registrar Uso
            </button>
            <button onClick={handleCopy} className="bg-bg-primary border-[0.5px] border-border-strong text-text-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-bg-secondary">
              Copiar
            </button>
            <button onClick={handleExportPDF} className="bg-bg-primary border-[0.5px] border-border-strong text-text-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-bg-secondary">
              Exportar PDF
            </button>
            <button onClick={handleReset} className="bg-transparent text-text-secondary px-4 py-2 rounded-lg text-[13px] font-medium hover:text-text-primary">
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-12">
        <button onClick={downloadBlankPDF} className="text-accent text-[14px] font-medium hover:underline bg-transparent border-none cursor-pointer">
          Descargar PDF en blanco para imprimir
        </button>
      </div>

      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-8">
        <h2 className="text-[20px] font-medium mb-2">Calculadora de Interpretación</h2>
        <div className="flex items-center gap-4">
          <input 
            type="number" 
            min="0" 
            max="24" 
            value={standaloneScore}
            onChange={(e) => setStandaloneScore(e.target.value)}
            placeholder="Ej: 14"
            className="w-[100px] bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] text-center focus:outline-none focus:border-accent"
          />
          {standaloneScore && !isNaN(parseInt(standaloneScore)) && parseInt(standaloneScore) >= 0 && parseInt(standaloneScore) <= 24 ? (
            <div className="text-[16px] font-medium">
              → {getInterpretation(parseInt(standaloneScore))}
            </div>
          ) : standaloneScore ? (
            <div className="text-[14px] text-warning">Puntaje inválido (rango 0-24)</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
