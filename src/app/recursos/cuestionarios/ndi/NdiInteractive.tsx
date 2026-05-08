'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { jsPDF } from 'jspdf'

const NDI_SECTIONS = [
  { id: 1, title: 'Intensidad del dolor', text: 'Sección 1: Intensidad del dolor' },
  { id: 2, title: 'Cuidado personal', text: 'Sección 2: Cuidado personal (lavarse, vestirse, etc.)' },
  { id: 3, title: 'Levantar peso', text: 'Sección 3: Levantar peso' },
  { id: 4, title: 'Lectura', text: 'Sección 4: Lectura' },
  { id: 5, title: 'Dolores de cabeza', text: 'Sección 5: Dolores de cabeza' },
  { id: 6, title: 'Concentración', text: 'Sección 6: Concentración' },
  { id: 7, title: 'Trabajo', text: 'Sección 7: Trabajo' },
  { id: 8, title: 'Conducir', text: 'Sección 8: Conducir' },
  { id: 9, title: 'Dormir', text: 'Sección 9: Dormir' },
  { id: 10, title: 'Actividades de ocio', text: 'Sección 10: Actividades de ocio' }
]

export default function NdiInteractive({ userId }: { userId: string }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [standaloneScore, setStandaloneScore] = useState<string>('')
  
  const handleAnswer = (id: number, val: number) => {
    setAnswers(prev => ({ ...prev, [id]: val }))
  }

  const isComplete = Object.keys(answers).length === 10

  const calculateScore = () => {
    if (!isComplete) return null
    let total = 0
    Object.values(answers).forEach(val => total += val)
    return { total, percentage: total * 2 }
  }

  const scoreData = calculateScore()

  const getInterpretation = (s: number) => {
    // Escala sobre 50
    if (s <= 4) return 'Sin Discapacidad (0-8%)'
    if (s <= 14) return 'Discapacidad Leve (10-28%)'
    if (s <= 24) return 'Discapacidad Moderada (30-48%)'
    if (s <= 34) return 'Discapacidad Severa (50-68%)'
    return 'Discapacidad Completa (70-100%)'
  }

  const handleSaveResult = async () => {
    const supabase = createClient()
    await supabase.from('tool_sessions').insert({
      user_id: userId,
      tool_type: 'cuestionario',
      tool_slug: 'ndi'
    })
    alert('Resultado guardado.')
  }

  const handleCopy = () => {
    if (scoreData) {
      navigator.clipboard.writeText(`NDI (Neck Disability Index)\nScore Total: ${scoreData.total}/50 (${scoreData.percentage}%)\nInterpretación: ${getInterpretation(scoreData.total)}`)
      alert('Copiado al portapapeles')
    }
  }

  const handleExportPDF = () => {
    if (!scoreData) return
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Neck Disability Index (NDI) - Resultado', 20, 20)
    
    doc.setFontSize(12)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 20, 30)
    
    doc.setFontSize(14)
    doc.text(`Score Total: ${scoreData.total} / 50 (${scoreData.percentage}%)`, 20, 45)
    doc.text(`Interpretación: ${getInterpretation(scoreData.total)}`, 20, 55)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Detalle de respuestas (0 a 5):', 20, 70)
    
    let y = 80
    NDI_SECTIONS.forEach((item, index) => {
      const val = answers[item.id]
      doc.text(`${index + 1}. ${item.title}`, 20, y)
      doc.setFont('helvetica', 'bold')
      doc.text(`R: ${val}/5`, 160, y)
      doc.setFont('helvetica', 'normal')
      y += 8
    })

    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    doc.save('NDI_Resultado.pdf')
  }

  const handleReset = () => {
    if (confirm('¿Limpiar todas las respuestas?')) setAnswers({})
  }

  const downloadBlankPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('NDI (Neck Disability Index)', 20, 20)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Instrucciones: En cada sección marque el valor (0 a 5) de la afirmación que mejor describa su condición actual.', 20, 30)

    let y = 45
    NDI_SECTIONS.forEach((item, index) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      doc.text(`${index + 1}. ${item.title}`, 20, y)
      doc.text('[0]   [1]   [2]   [3]   [4]   [5]', 130, y)
      y += 10
    })
    
    if (y > 250) { doc.addPage(); y = 20; }
    doc.line(20, y + 5, 190, y + 5)
    doc.text('Puntuación Total: _______ / 50', 20, y + 15)
    
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    doc.save('NDI_Blank.pdf')
  }

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <h2 className="text-[20px] font-medium mb-6">Completar Cuestionario</h2>
        <p className="text-[14px] text-text-secondary mb-8">
          Para simplificar la toma, elegí el valor de 0 (Sin limitación / Ningún problema) a 5 (Peor limitación / Máximo problema) en cada categoría reportada por el paciente.
        </p>
        
        <div className="space-y-6">
          {NDI_SECTIONS.map((item, index) => (
            <div key={item.id} className="pb-6 border-b-[0.5px] border-border">
              <p className="text-[15px] font-medium mb-3">{index + 1}. {item.title}</p>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4, 5].map(val => (
                  <button
                    key={val}
                    onClick={() => handleAnswer(item.id, val)}
                    className={`flex-1 min-w-[40px] py-2 px-1 text-[13px] border-[0.5px] rounded-lg transition-colors ${answers[item.id] === val ? 'bg-accent border-accent text-bg-primary font-medium' : 'bg-bg-secondary border-border text-text-secondary hover:border-border-strong'}`}
                  >
                    {val}
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
              <span className="text-[16px] text-text-secondary">/ 50 ({scoreData.percentage}%)</span>
            </div>
            <div className="text-[18px] font-medium text-accent mb-3">
              {getInterpretation(scoreData.total)}
            </div>

            {/* Interpretación clínica */}
            <div className="mb-6 space-y-3">
              <div>
                <div className="flex justify-between text-[10px] text-text-secondary mb-1">
                  <span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span>
                </div>
                <div className="relative w-full h-2 rounded-full overflow-hidden bg-bg-primary">
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #34d399, #facc15, #f97316, #ef4444)' }} />
                  <div className="absolute top-0 h-full w-0.5 bg-white shadow" style={{ left: `${(scoreData.total / 50) * 100}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border">
                  <div className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">MCID</div>
                  <div className="text-[13px] font-medium">≥ 5 puntos (10%) de cambio</div>
                </div>
                <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border">
                  <div className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mb-1">Implicancia clínica</div>
                  <div className="text-[12px] text-text-secondary leading-[1.5]">Puntajes en rango moderado-severo suelen requerir abordaje multimodal. El NDI es sensible al cambio con tratamiento.</div>
                </div>
              </div>
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
        )}
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
            max="50" 
            value={standaloneScore}
            onChange={(e) => setStandaloneScore(e.target.value)}
            placeholder="Ej: 20"
            className="w-[100px] bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] text-center focus:outline-none focus:border-accent"
          />
          {standaloneScore && !isNaN(parseInt(standaloneScore)) && parseInt(standaloneScore) >= 0 && parseInt(standaloneScore) <= 50 ? (
            <div className="text-[16px] font-medium">
              → {getInterpretation(parseInt(standaloneScore))}
            </div>
          ) : standaloneScore ? (
            <div className="text-[14px] text-warning">Puntaje inválido (rango 0-50)</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
