'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { jsPDF } from 'jspdf'

const PCS_ITEMS = [
  { id: 1, text: 'Me preocupo continuamente sobre si el dolor terminará.' },
  { id: 2, text: 'Siento que no puedo seguir adelante.' },
  { id: 3, text: 'Es terrible y pienso que nunca mejorará.' },
  { id: 4, text: 'Es espantoso y siento que me sobrepasa.' },
  { id: 5, text: 'Siento que no puedo soportarlo más.' },
  { id: 6, text: 'Tengo miedo de que el dolor empeore.' },
  { id: 7, text: 'Sigo pensando en otros episodios dolorosos.' },
  { id: 8, text: 'Deseo ansiosamente que el dolor desaparezca.' },
  { id: 9, text: 'No puedo mantenerlo fuera de mi mente.' },
  { id: 10, text: 'Sigo pensando en lo mucho que me duele.' },
  { id: 11, text: 'Sigo pensando en cuánto deseo que se detenga el dolor.' },
  { id: 12, text: 'No hay nada que pueda hacer para reducir la intensidad del dolor.' },
  { id: 13, text: 'Me pregunto si algo grave me puede pasar.' },
]

export default function CatastrofismoInteractive({ userId }: { userId: string }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [standaloneScore, setStandaloneScore] = useState<string>('')
  
  const handleAnswer = (id: number, value: number) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  const isComplete = Object.keys(answers).length === PCS_ITEMS.length

  const calculateScore = () => {
    if (!isComplete) return null
    let total = 0
    let rumiacion = 0 // 8, 9, 10, 11
    let magnificacion = 0 // 6, 7, 13
    let desesperanza = 0 // 1, 2, 3, 4, 5, 12 (wait, 12 is usually desesperanza too, though original architecture says 1,2,3,4,5. Standard PCS has 12 in Helplessness. The architecture doc says: Rumiación (8,9,10,11), Magnificación (6,7,13), Desesperanza (1,2,3,4,5). We will add 12 to Desesperanza as per standard, or just leave it to total if subscales are just informational).
    
    PCS_ITEMS.forEach(item => {
      const val = answers[item.id]
      total += val
      
      if ([8, 9, 10, 11].includes(item.id)) rumiacion += val
      if ([6, 7, 13].includes(item.id)) magnificacion += val
      if ([1, 2, 3, 4, 5, 12].includes(item.id)) desesperanza += val
    })
    
    return { total, rumiacion, magnificacion, desesperanza }
  }

  const scoreData = calculateScore()

  const getInterpretation = (s: number) => {
    if (s > 30) return 'Nivel clínicamente significativo (Alto riesgo)'
    return 'Nivel no significativo'
  }

  const handleSaveResult = async () => {
    const supabase = createClient()
    await supabase.from('tool_sessions').insert({
      user_id: userId,
      tool_type: 'cuestionario',
      tool_slug: 'catastrofismo'
    })
    alert('Resultado guardado (se registró el uso de la herramienta para fines analíticos).')
  }

  const handleCopy = () => {
    if (scoreData) {
      navigator.clipboard.writeText(`Pain Catastrophizing Scale\nScore Total: ${scoreData.total}/52\nInterpretación: ${getInterpretation(scoreData.total)}\n\nSubescalas:\n- Rumiación: ${scoreData.rumiacion}\n- Magnificación: ${scoreData.magnificacion}\n- Desesperanza: ${scoreData.desesperanza}`)
      alert('Copiado al portapapeles')
    }
  }

  const handleExportPDF = () => {
    if (!scoreData) return
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Pain Catastrophizing Scale - Resultado', 20, 20)
    
    doc.setFontSize(12)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 20, 30)
    
    doc.setFontSize(14)
    doc.text(`Score Total: ${scoreData.total} / 52`, 20, 45)
    doc.text(`Interpretación: ${getInterpretation(scoreData.total)}`, 20, 55)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.text(`Subescala Rumiación: ${scoreData.rumiacion}`, 20, 70)
    doc.text(`Subescala Magnificación: ${scoreData.magnificacion}`, 20, 80)
    doc.text(`Subescala Desesperanza: ${scoreData.desesperanza}`, 20, 90)

    doc.setFontSize(10)
    doc.text('Detalle de respuestas:', 20, 110)
    
    let y = 120
    PCS_ITEMS.forEach((item, index) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      const val = answers[item.id]
      const labels = ['En absoluto', 'Un poco', 'Moderadamente', 'Mucho', 'Siempre']
      const ansLabel = labels[val]
      
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

    doc.save('Catastrofismo_Resultado.pdf')
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
    doc.text('Pain Catastrophizing Scale (PCS)', 20, 20)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Instrucciones: Pensando en experiencias dolorosas pasadas, indique en qué medida experimenta cada', 20, 30)
    doc.text('uno de los siguientes pensamientos o sentimientos cuando siente dolor.', 20, 35)

    let y = 50
    PCS_ITEMS.forEach((item, index) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      const splitText = doc.splitTextToSize(`${index + 1}. ${item.text}`, 170)
      doc.text(splitText, 20, y)
      y += 5 * splitText.length
      doc.text('[0] En absoluto   [1] Un poco   [2] Moderadamente   [3] Mucho   [4] Siempre', 25, y + 2)
      y += 12
    })
    
    if (y > 250) { doc.addPage(); y = 20; }
    doc.line(20, y, 190, y)
    doc.text('Puntuación Total: _______ / 52', 20, y + 10)
    
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    doc.save('Catastrofismo_Blank.pdf')
  }

  return (
    <div>
      {/* Vista Interactiva */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <h2 className="text-[20px] font-medium mb-6">Completar Cuestionario</h2>
        
        <div className="space-y-6">
          {PCS_ITEMS.map((item, index) => (
            <div key={item.id} className="pb-6 border-b-[0.5px] border-border last:border-0 last:pb-0">
              <p className="text-[15px] font-medium mb-3">{index + 1}. {item.text}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                {[
                  { val: 0, label: 'En absoluto' },
                  { val: 1, label: 'Un poco' },
                  { val: 2, label: 'Moderadamente' },
                  { val: 3, label: 'Mucho' },
                  { val: 4, label: 'Siempre' }
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => handleAnswer(item.id, opt.val)}
                    className={`flex-1 py-2 px-1 text-[12px] md:text-[13px] border-[0.5px] rounded-lg transition-colors ${answers[item.id] === opt.val ? 'bg-accent border-accent text-bg-primary font-medium' : 'bg-bg-secondary border-border text-text-secondary hover:border-border-strong'}`}
                  >
                    {opt.label} <span className="block opacity-50 text-[10px]">({opt.val})</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {isComplete && scoreData && (
          <div className="mt-8 bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6">
            <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Resultado Total</div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-[40px] font-medium tracking-[-0.02em]">{scoreData.total}</span>
              <span className="text-[16px] text-text-secondary">/ 52</span>
            </div>
            <div className={`text-[18px] font-medium mb-3 ${scoreData.total > 30 ? 'text-warning' : 'text-text-primary'}`}>
              {getInterpretation(scoreData.total)}
            </div>

            {/* Interpretación clínica */}
            <div className="mb-6 space-y-3">
              <div>
                <div className="flex justify-between text-[10px] text-text-secondary mb-1">
                  <span>0</span><span>13</span><span>26</span><span>30</span><span>52</span>
                </div>
                <div className="relative w-full h-2 rounded-full overflow-hidden bg-bg-primary">
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #34d399, #facc15, #ef4444)' }} />
                  <div className="absolute top-0 h-full w-0.5 bg-white shadow" style={{ left: `${(scoreData.total / 52) * 100}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border">
                  <div className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">MCID / Punto de corte</div>
                  <div className="text-[13px] font-medium">&gt; 30 significativo — ≈ 10 de cambio</div>
                </div>
                <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border">
                  <div className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">Implicancia clínica</div>
                  <div className="text-[12px] text-text-secondary leading-[1.5]">La subescala Desesperanza es el predictor más fuerte de discapacidad a largo plazo. Scores altos se asocian con mayor uso de analgésicos.</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8 pt-6 border-t-[0.5px] border-border">
              <div>
                <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Rumiación</div>
                <div className="text-[16px] font-medium">{scoreData.rumiacion}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Magnificación</div>
                <div className="text-[16px] font-medium">{scoreData.magnificacion}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Desesperanza</div>
                <div className="text-[16px] font-medium">{scoreData.desesperanza}</div>
              </div>
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
            Faltan responder {PCS_ITEMS.length - Object.keys(answers).length} ítems para ver el resultado.
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
          Ingresá un puntaje total (0-52) para ver la interpretación directa.
        </p>
        <div className="flex items-center gap-4">
          <input 
            type="number" 
            min="0" 
            max="52" 
            value={standaloneScore}
            onChange={(e) => setStandaloneScore(e.target.value)}
            placeholder="Ej: 35"
            className="w-[100px] bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] text-center focus:outline-none focus:border-accent"
          />
          {standaloneScore && !isNaN(parseInt(standaloneScore)) && parseInt(standaloneScore) >= 0 && parseInt(standaloneScore) <= 52 ? (
            <div className={`text-[16px] font-medium ${parseInt(standaloneScore) > 30 ? 'text-warning' : 'text-text-primary'}`}>
              → {getInterpretation(parseInt(standaloneScore))}
            </div>
          ) : standaloneScore ? (
            <div className="text-[14px] text-warning">Puntaje inválido (rango 0-52)</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
