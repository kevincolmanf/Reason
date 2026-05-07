'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { jsPDF } from 'jspdf'

const START_ITEMS_1_TO_8 = [
  { id: 1, text: 'Mi dolor de espalda se ha propagado por la pierna(s) en algún momento de las últimas 2 semanas.' },
  { id: 2, text: 'He tenido dolor en el hombro o en la nuca en algún momento de las últimas 2 semanas.' },
  { id: 3, text: 'Solo he caminado distancias cortas a causa de mi dolor de espalda.' },
  { id: 4, text: 'En las últimas dos semanas, me he vestido más lento de lo normal a causa del dolor de espalda.' },
  { id: 5, text: 'Realmente no es seguro que una persona con mi problema se mantenga físicamente activa.' },
  { id: 6, text: 'Pensamientos preocupantes han estado rondando por mi mente gran parte del tiempo.' },
  { id: 7, text: 'Siento que mi dolor de espalda es terrible y que nunca va a mejorar.' },
  { id: 8, text: 'En general no he disfrutado de todas las cosas que normalmente disfruto.' },
]

export default function StartBackInteractive({ userId }: { userId: string }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  
  const handleAnswer = (id: number, val: number) => {
    setAnswers(prev => ({ ...prev, [id]: val }))
  }

  const isComplete = Object.keys(answers).length === 9

  const calculateScore = () => {
    if (!isComplete) return null
    let total = 0
    let psicosocial = 0 // 5, 6, 7, 8, 9
    
    Object.entries(answers).forEach(([key, val]) => {
      const id = parseInt(key)
      total += val
      if (id >= 5 && id <= 9) {
        psicosocial += val
      }
    })
    
    return { total, psicosocial }
  }

  const scoreData = calculateScore()

  const getInterpretation = (total: number, psicosocial: number) => {
    if (total < 4) return 'Riesgo Bajo'
    if (psicosocial <= 3) return 'Riesgo Medio'
    return 'Riesgo Alto'
  }

  const handleSaveResult = async () => {
    const supabase = createClient()
    await supabase.from('tool_sessions').insert({
      user_id: userId,
      tool_type: 'cuestionario',
      tool_slug: 'start-back'
    })
    alert('Resultado guardado.')
  }

  const handleCopy = () => {
    if (scoreData) {
      navigator.clipboard.writeText(`STarT Back Screening Tool\nScore Total: ${scoreData.total}/9\nSubscore Psicosocial: ${scoreData.psicosocial}/5\nInterpretación: ${getInterpretation(scoreData.total, scoreData.psicosocial)}`)
      alert('Copiado al portapapeles')
    }
  }

  const handleExportPDF = () => {
    if (!scoreData) return
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('STarT Back Screening Tool - Resultado', 20, 20)
    
    doc.setFontSize(12)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 20, 30)
    
    doc.setFontSize(14)
    doc.text(`Score Total: ${scoreData.total} / 9`, 20, 45)
    doc.text(`Subscore Psicosocial (Ítems 5-9): ${scoreData.psicosocial} / 5`, 20, 55)
    doc.text(`Interpretación: ${getInterpretation(scoreData.total, scoreData.psicosocial)}`, 20, 65)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Detalle de respuestas:', 20, 85)
    
    let y = 95
    START_ITEMS_1_TO_8.forEach((item, index) => {
      const val = answers[item.id]
      const label = val === 1 ? 'De acuerdo' : 'En desacuerdo'
      const splitText = doc.splitTextToSize(`${index + 1}. ${item.text}`, 130)
      doc.text(splitText, 20, y)
      doc.setFont('helvetica', 'bold')
      doc.text(`R: ${label} (${val})`, 155, y)
      doc.setFont('helvetica', 'normal')
      y += 5 * splitText.length + 4
    })
    
    const val9 = answers[9]
    let label9 = ''
    if (val9 === 0) label9 = 'Nada / Ligeramente / Moderadamente'
    if (val9 === 1) label9 = 'Mucho / Extremadamente'
    
    doc.text('9. ¿Qué tan molesto ha sido su dolor de espalda en las últimas 2 semanas?', 20, y)
    doc.setFont('helvetica', 'bold')
    doc.text(`R: ${label9} (${val9})`, 20, y + 6)
    doc.setFont('helvetica', 'normal')

    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    doc.save('STarT_Back_Resultado.pdf')
  }

  const handleReset = () => {
    if (confirm('¿Limpiar todas las respuestas?')) setAnswers({})
  }

  const downloadBlankPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('STarT Back Screening Tool', 20, 20)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Piense en las ÚLTIMAS 2 SEMANAS y marque la respuesta adecuada.', 20, 30)

    let y = 45
    START_ITEMS_1_TO_8.forEach((item, index) => {
      const splitText = doc.splitTextToSize(`${index + 1}. ${item.text}`, 140)
      doc.text(splitText, 20, y)
      doc.text('[ ] En desacuerdo    [ ] De acuerdo', 140, y)
      y += 5 * splitText.length + 5
    })
    
    y += 5
    doc.text('9. En general, ¿qué tan molesto ha sido su dolor de espalda en las últimas 2 semanas?', 20, y)
    y += 10
    doc.text('[ ] Nada  [ ] Ligeramente  [ ] Moderadamente  [ ] Mucho  [ ] Extremadamente', 25, y)
    
    y += 20
    if (y > 240) { doc.addPage(); y = 20; }
    doc.line(20, y, 190, y)
    doc.text('Puntuación Total: _______ / 9', 20, y + 10)
    doc.text('Subscore Psicosocial (Preguntas 5-9): _______ / 5', 20, y + 18)
    
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    doc.save('STarT_Back_Blank.pdf')
  }

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <h2 className="text-[20px] font-medium mb-6">Completar Cuestionario</h2>
        
        <div className="space-y-6">
          {START_ITEMS_1_TO_8.map((item, index) => (
            <div key={item.id} className="pb-6 border-b-[0.5px] border-border">
              <p className="text-[15px] font-medium mb-3">{index + 1}. {item.text}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAnswer(item.id, 0)}
                  className={`flex-1 py-2 px-3 text-[13px] border-[0.5px] rounded-lg transition-colors ${answers[item.id] === 0 ? 'bg-accent border-accent text-bg-primary font-medium' : 'bg-bg-secondary border-border text-text-secondary hover:border-border-strong'}`}
                >
                  En desacuerdo
                </button>
                <button
                  onClick={() => handleAnswer(item.id, 1)}
                  className={`flex-1 py-2 px-3 text-[13px] border-[0.5px] rounded-lg transition-colors ${answers[item.id] === 1 ? 'bg-accent border-accent text-bg-primary font-medium' : 'bg-bg-secondary border-border text-text-secondary hover:border-border-strong'}`}
                >
                  De acuerdo
                </button>
              </div>
            </div>
          ))}
          
          <div className="pb-6">
            <p className="text-[15px] font-medium mb-3">9. En general, ¿qué tan molesto ha sido su dolor de espalda en las últimas 2 semanas?</p>
            <div className="flex flex-col sm:flex-row gap-2">
              {[
                { val: 0, label: 'Nada' },
                { val: 0, label: 'Ligeramente' },
                { val: 0, label: 'Moderadamente' },
                { val: 1, label: 'Mucho' },
                { val: 1, label: 'Extremadamente' }
              ].map((opt, i) => {
                return (
                <button
                  key={i}
                  onClick={() => handleAnswer(9, opt.val)}
                  className="flex-1 py-2 px-1 text-[12px] border-[0.5px] rounded-lg bg-bg-secondary border-border text-text-secondary hover:border-border-strong"
                  style={{
                    backgroundColor: answers[9] === opt.val ? 'var(--accent)' : '',
                    color: answers[9] === opt.val ? 'var(--bg-primary)' : '',
                    borderColor: answers[9] === opt.val ? 'var(--accent)' : ''
                  }}
                >
                  {opt.label}
                </button>
              )})}
            </div>
          </div>
        </div>

        {isComplete && scoreData && (
          <div className="mt-8 bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6">
            <div className="flex justify-between items-start mb-6 border-b-[0.5px] border-border pb-6">
              <div>
                <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Score Total</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-[40px] font-medium tracking-[-0.02em]">{scoreData.total}</span>
                  <span className="text-[16px] text-text-secondary">/ 9</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Subscore Psicosocial</div>
                <div className="flex items-baseline justify-end gap-2">
                  <span className="text-[24px] font-medium tracking-[-0.02em]">{scoreData.psicosocial}</span>
                  <span className="text-[14px] text-text-secondary">/ 5</span>
                </div>
              </div>
            </div>
            
            <div className="text-[18px] font-medium text-accent mb-6">
              {getInterpretation(scoreData.total, scoreData.psicosocial)}
            </div>
            
            <div className="flex flex-wrap gap-4">
              <button onClick={handleSaveResult} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium">
                Confirmar y Registrar Uso
              </button>
              <button onClick={handleCopy} className="bg-bg-primary border-[0.5px] border-border-strong text-text-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-bg-secondary">
                Copiar Resultado
              </button>
              <button onClick={handleExportPDF} className="bg-bg-primary border-[0.5px] border-border-strong text-text-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-bg-secondary">
                Exportar PDF
              </button>
              <button onClick={handleReset} className="bg-transparent text-text-secondary px-4 py-2 rounded-lg text-[13px] font-medium hover:text-text-primary">
                Nueva Sesión
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-12">
        <button onClick={downloadBlankPDF} className="text-accent text-[14px] font-medium hover:underline bg-transparent border-none cursor-pointer">
          Descargar PDF en blanco para imprimir
        </button>
      </div>

    </div>
  )
}
