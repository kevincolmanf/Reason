'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { jsPDF } from 'jspdf'

const TAMPA_ITEMS = [
  { id: 1, text: 'Tengo miedo de lesionarme si hago ejercicio.', inverted: false },
  { id: 2, text: 'Si superara el dolor, la lesión en mi cuerpo empeoraría.', inverted: false },
  { id: 3, text: 'Mi cuerpo me dice que algo está peligrosamente mal.', inverted: false },
  { id: 4, text: 'Mi dolor podría estar provocado porque no he realizado el ejercicio adecuado.', inverted: true },
  { id: 5, text: 'La gente no se toma suficientemente en serio mi dolor físico.', inverted: false },
  { id: 6, text: 'Mi accidente (o dolor) me ha provocado tal lesión en el cuerpo que nunca me recuperaré del todo.', inverted: false },
  { id: 7, text: 'Un dolor físico significa que algo de mi cuerpo está lesionado (o dañado).', inverted: false },
  { id: 8, text: 'Aunque tenga dolor me encuentro bien realizando actividades.', inverted: true },
  { id: 9, text: 'El dolor me avisa de cuándo parar de hacer un ejercicio para no lesionarme de nuevo.', inverted: false },
  { id: 10, text: 'Teniendo en cuenta la lesión padecida, lo más seguro que puedo hacer es cuidar de no realizar movimientos innecesarios.', inverted: false },
  { id: 11, text: 'No tendría que tener el dolor que tengo, hay algo que no marcha bien.', inverted: false },
  { id: 12, text: 'Aunque el dolor es un problema constante, puedo vivir la vida de manera relativamente normal.', inverted: true },
  { id: 13, text: 'El dolor me hace pensar que debo parar de hacer lo que estoy haciendo y cuidarme a mí mismo de posibles daños.', inverted: false },
  { id: 14, text: 'Es realmente peligroso para una persona con mi problema estar activa (físicamente).', inverted: false },
  { id: 15, text: 'No puedo hacer todas las cosas que la gente normal hace debido al riesgo tan alto de volverme a lesionar.', inverted: false },
  { id: 16, text: 'Es muy normal de esperar que haya momentos en los que un problema físico lleve acompañado dolor de mayor o menor intensidad.', inverted: true },
  { id: 17, text: 'A nadie le debería de extrañar que estuviese de baja laboral debido a mis problemas físicos.', inverted: false },
]

export default function TampaInteractive({ userId }: { userId: string }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [standaloneScore, setStandaloneScore] = useState<string>('')
  
  const handleAnswer = (id: number, value: number) => {
    setAnswers(prev => {
      const next = { ...prev, [id]: value }
      return next
    })
  }

  const isComplete = Object.keys(answers).length === TAMPA_ITEMS.length

  const calculateScore = () => {
    if (!isComplete) return null
    let total = 0
    TAMPA_ITEMS.forEach(item => {
      let val = answers[item.id]
      if (item.inverted) {
        val = 5 - val
      }
      total += val
    })
    return total
  }

  const score = calculateScore()

  const getInterpretation = (s: number) => {
    if (s < 37) return 'Baja Kinesiofobia'
    if (s <= 44) return 'Kinesiofobia Moderada'
    return 'Kinesiofobia Alta'
  }

  const handleSaveResult = async () => {
    const supabase = createClient()
    await supabase.from('tool_sessions').insert({
      user_id: userId,
      tool_type: 'cuestionario',
      tool_slug: 'tampa'
    })
    alert('Resultado guardado (se registró el uso de la herramienta para fines analíticos).')
  }

  const handleCopy = () => {
    if (score) {
      navigator.clipboard.writeText(`Tampa Scale of Kinesiophobia\nScore Total: ${score}/68\nInterpretación: ${getInterpretation(score)}`)
      alert('Copiado al portapapeles')
    }
  }

  const handleExportPDF = () => {
    if (!score) return
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Tampa Scale of Kinesiophobia - Resultado', 20, 20)
    
    doc.setFontSize(12)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 20, 30)
    
    doc.setFontSize(14)
    doc.text(`Score Total: ${score} / 68`, 20, 45)
    doc.text(`Interpretación: ${getInterpretation(score)}`, 20, 55)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Detalle de respuestas:', 20, 70)
    
    let y = 80
    TAMPA_ITEMS.forEach((item, index) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      const val = answers[item.id]
      const labels = ['Totalmente en desacuerdo', 'En desacuerdo', 'De acuerdo', 'Totalmente de acuerdo']
      const ansLabel = labels[val - 1]
      
      const splitText = doc.splitTextToSize(`${index + 1}. ${item.text}`, 130)
      doc.text(splitText, 20, y)
      
      doc.setFont('helvetica', 'bold')
      doc.text(`R: ${ansLabel} (${val})`, 155, y)
      doc.setFont('helvetica', 'normal')
      
      y += 5 * splitText.length + 4
    })
    
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    doc.save('Tampa_Resultado.pdf')
  }

  const handleReset = () => {
    if (confirm('¿Estás seguro de limpiar todas las respuestas?')) {
      setAnswers({})
    }
  }

  const downloadBlankPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Tampa Scale of Kinesiophobia', 20, 20)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Por favor, marque la opción que mejor describa su acuerdo con las siguientes afirmaciones.', 20, 30)

    let y = 45
    TAMPA_ITEMS.forEach((item, index) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      // Truncar o multilínea
      const splitText = doc.splitTextToSize(`${index + 1}. ${item.text}`, 170)
      doc.text(splitText, 20, y)
      y += 5 * splitText.length
      doc.text('[1] Totalmente en desacuerdo    [2] En desacuerdo    [3] De acuerdo    [4] Totalmente de acuerdo', 25, y + 2)
      y += 12
    })
    
    if (y > 250) { doc.addPage(); y = 20; }
    doc.line(20, y, 190, y)
    doc.text('Puntuación Total: _______ / 68', 20, y + 10)
    
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    doc.save('Tampa_Scale_Blank.pdf')
  }

  return (
    <div>
      {/* Vista Interactiva */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <h2 className="text-[20px] font-medium mb-6">Completar Cuestionario</h2>
        
        <div className="space-y-6">
          {TAMPA_ITEMS.map((item, index) => (
            <div key={item.id} className="pb-6 border-b-[0.5px] border-border last:border-0 last:pb-0">
              <p className="text-[15px] font-medium mb-3">{index + 1}. {item.text}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                {[
                  { val: 1, label: 'Totalmente en desacuerdo' },
                  { val: 2, label: 'En desacuerdo' },
                  { val: 3, label: 'De acuerdo' },
                  { val: 4, label: 'Totalmente de acuerdo' }
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => handleAnswer(item.id, opt.val)}
                    className={`flex-1 py-2 px-3 text-[13px] border-[0.5px] rounded-lg transition-colors ${answers[item.id] === opt.val ? 'bg-accent border-accent text-bg-primary font-medium' : 'bg-bg-secondary border-border text-text-secondary hover:border-border-strong'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {isComplete && score !== null && (
          <div className="mt-8 bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6">
            <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Resultado Total</div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-[40px] font-medium tracking-[-0.02em]">{score}</span>
              <span className="text-[16px] text-text-secondary">/ 68</span>
            </div>
            <div className="text-[18px] font-medium text-accent mb-6">
              {getInterpretation(score)}
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
        
        {!isComplete && (
          <div className="mt-8 text-[13px] text-text-secondary text-center py-4 bg-bg-secondary rounded-lg">
            Faltan responder {TAMPA_ITEMS.length - Object.keys(answers).length} ítems para ver el resultado.
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-12">
        <button onClick={downloadBlankPDF} className="text-accent text-[14px] font-medium hover:underline bg-transparent border-none cursor-pointer">
          Descargar PDF en blanco para imprimir
        </button>
      </div>

      {/* Calculadora Standalone */}
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-8">
        <h2 className="text-[20px] font-medium mb-2">Calculadora de Interpretación</h2>
        <p className="text-[14px] text-text-secondary mb-6">
          Si tu paciente ya completó el cuestionario en papel y tenés el puntaje total, ingresalo acá para ver la interpretación clínica directa.
        </p>
        <div className="flex items-center gap-4">
          <input 
            type="number" 
            min="17" 
            max="68" 
            value={standaloneScore}
            onChange={(e) => setStandaloneScore(e.target.value)}
            placeholder="Ej: 42"
            className="w-[100px] bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] text-center focus:outline-none focus:border-accent"
          />
          {standaloneScore && !isNaN(parseInt(standaloneScore)) && parseInt(standaloneScore) >= 17 && parseInt(standaloneScore) <= 68 ? (
            <div className="text-[16px] font-medium">
              → {getInterpretation(parseInt(standaloneScore))}
            </div>
          ) : standaloneScore ? (
            <div className="text-[14px] text-warning">Puntaje inválido (rango 17-68)</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
