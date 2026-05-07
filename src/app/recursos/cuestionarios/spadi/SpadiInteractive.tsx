'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { jsPDF } from 'jspdf'

const SPADI_PAIN = [
  { id: 1, text: 'En su peor momento', desc: '0=Ningún dolor, 10=El peor dolor imaginable' },
  { id: 2, text: 'Al acostarse sobre el lado afectado' },
  { id: 3, text: 'Al alcanzar algo en un estante alto' },
  { id: 4, text: 'Al tocar la parte posterior del cuello' },
  { id: 5, text: 'Al empujar algo con el brazo afectado' }
]

const SPADI_DISABILITY = [
  { id: 6, text: 'Lavarse el pelo', desc: '0=Ninguna dificultad, 10=Tan difícil que requiere ayuda' },
  { id: 7, text: 'Lavarse la espalda' },
  { id: 8, text: 'Ponerse una camiseta o suéter por la cabeza' },
  { id: 9, text: 'Ponerse una camisa que se abotona por delante' },
  { id: 10, text: 'Ponerse los pantalones' },
  { id: 11, text: 'Colocar un objeto pesado en un estante alto' },
  { id: 12, text: 'Llevar un objeto pesado de 5kg' },
  { id: 13, text: 'Sacar algo del bolsillo trasero del pantalón' }
]

export default function SpadiInteractive({ userId }: { userId: string }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [standaloneScore, setStandaloneScore] = useState<string>('')
  
  const handleAnswer = (id: number, value: number) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  const isComplete = Object.keys(answers).length === 13

  const calculateScore = () => {
    if (!isComplete) return null
    let painSum = 0
    let disSum = 0
    
    SPADI_PAIN.forEach(item => painSum += answers[item.id])
    SPADI_DISABILITY.forEach(item => disSum += answers[item.id])
    
    const painScore = (painSum / 50) * 100
    const disScore = (disSum / 80) * 100
    const totalScore = ((painSum + disSum) / 130) * 100
    
    return { 
      total: Math.round(totalScore), 
      pain: Math.round(painScore), 
      disability: Math.round(disScore) 
    }
  }

  const scoreData = calculateScore()

  const getInterpretation = (s: number) => {
    if (s <= 20) return 'Mínimo'
    if (s <= 40) return 'Leve'
    if (s <= 60) return 'Moderado'
    if (s <= 80) return 'Severo'
    return 'Máximo'
  }

  const handleSaveResult = async () => {
    const supabase = createClient()
    await supabase.from('tool_sessions').insert({
      user_id: userId,
      tool_type: 'cuestionario',
      tool_slug: 'spadi'
    })
    alert('Resultado guardado.')
  }

  const handleCopy = () => {
    if (scoreData) {
      navigator.clipboard.writeText(`SPADI (Shoulder Pain and Disability Index)\nScore Total: ${scoreData.total}%\nInterpretación: ${getInterpretation(scoreData.total)}\n- Dolor: ${scoreData.pain}%\n- Discapacidad: ${scoreData.disability}%`)
      alert('Copiado al portapapeles')
    }
  }

  const handleExportPDF = () => {
    if (!scoreData) return
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('SPADI - Resultado', 20, 20)
    
    doc.setFontSize(12)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 20, 30)
    
    doc.setFontSize(14)
    doc.text(`Score Total: ${scoreData.total}%`, 20, 45)
    doc.text(`Interpretación: ${getInterpretation(scoreData.total)}`, 20, 55)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.text(`Subescala Dolor: ${scoreData.pain}%`, 20, 70)
    doc.text(`Subescala Discapacidad: ${scoreData.disability}%`, 20, 80)

    doc.setFontSize(10)
    doc.text('Detalle de respuestas:', 20, 100)
    
    let y = 110
    
    doc.setFont('helvetica', 'bold')
    doc.text('Dolor', 20, y)
    doc.setFont('helvetica', 'normal')
    y += 8
    
    SPADI_PAIN.forEach((item, index) => {
      const val = answers[item.id]
      doc.text(`${index + 1}. ${item.text}: ${val}/10`, 25, y)
      y += 6
    })

    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text('Discapacidad', 20, y)
    doc.setFont('helvetica', 'normal')
    y += 8

    SPADI_DISABILITY.forEach((item, index) => {
      const val = answers[item.id]
      doc.text(`${index + 1}. ${item.text}: ${val}/10`, 25, y)
      y += 6
    })
    
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    doc.save('SPADI_Resultado.pdf')
  }

  const handleReset = () => {
    if (confirm('¿Limpiar todas las respuestas?')) setAnswers({})
  }

  const downloadBlankPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('SPADI (Shoulder Pain and Disability Index)', 20, 20)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Instrucciones: Marque del 0 al 10.', 20, 30)

    let y = 45
    doc.setFont('helvetica', 'bold')
    doc.text('Dolor (0 = Sin dolor, 10 = Peor dolor imaginable)', 20, y)
    doc.setFont('helvetica', 'normal')
    y += 10
    SPADI_PAIN.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.text}`, 20, y)
      doc.text('0 - 1 - 2 - 3 - 4 - 5 - 6 - 7 - 8 - 9 - 10', 140, y)
      y += 10
    })

    y += 10
    doc.setFont('helvetica', 'bold')
    doc.text('Discapacidad (0 = Sin dificultad, 10 = Tan difícil que requiere ayuda)', 20, y)
    doc.setFont('helvetica', 'normal')
    y += 10
    SPADI_DISABILITY.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.text}`, 20, y)
      doc.text('0 - 1 - 2 - 3 - 4 - 5 - 6 - 7 - 8 - 9 - 10', 140, y)
      y += 10
    })
    
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    doc.save('SPADI_Blank.pdf')
  }

  const renderSlider = (item: any) => (
    <div key={item.id} className="pb-8 border-b-[0.5px] border-border last:border-0 last:pb-0">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[15px] font-medium pr-4">{item.text}</p>
        <div className="text-[18px] font-medium text-accent w-[30px] text-right">
          {answers[item.id] !== undefined ? answers[item.id] : '-'}
        </div>
      </div>
      {item.desc && <p className="text-[12px] text-text-secondary mb-3">{item.desc}</p>}
      <input 
        type="range" 
        min="0" 
        max="10" 
        step="1"
        value={answers[item.id] !== undefined ? answers[item.id] : 5}
        onChange={(e) => handleAnswer(item.id, parseInt(e.target.value))}
        className="w-full accent-accent cursor-pointer"
        onMouseDown={(e) => {
          if (answers[item.id] === undefined) handleAnswer(item.id, parseInt((e.target as HTMLInputElement).value))
        }}
        onTouchStart={(e) => {
          if (answers[item.id] === undefined) handleAnswer(item.id, parseInt((e.target as HTMLInputElement).value))
        }}
      />
      <div className="flex justify-between text-[11px] text-text-secondary mt-2">
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  )

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <h2 className="text-[20px] font-medium mb-8">Completar Cuestionario</h2>
        
        <h3 className="text-[14px] uppercase tracking-[0.05em] text-text-secondary mb-6 font-medium">Dolor</h3>
        <div className="space-y-8 mb-12">
          {SPADI_PAIN.map(renderSlider)}
        </div>

        <h3 className="text-[14px] uppercase tracking-[0.05em] text-text-secondary mb-6 font-medium">Discapacidad</h3>
        <div className="space-y-8">
          {SPADI_DISABILITY.map(renderSlider)}
        </div>

        {isComplete && scoreData && (
          <div className="mt-12 bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6">
            <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">Resultado Total</div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-[40px] font-medium tracking-[-0.02em]">{scoreData.total}%</span>
            </div>
            <div className="text-[18px] font-medium text-accent mb-6">
              {getInterpretation(scoreData.total)}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8 pt-6 border-t-[0.5px] border-border">
              <div>
                <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Dolor</div>
                <div className="text-[16px] font-medium">{scoreData.pain}%</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Discapacidad</div>
                <div className="text-[16px] font-medium">{scoreData.disability}%</div>
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
      </div>

      <div className="flex justify-between items-center mb-12">
        <button onClick={downloadBlankPDF} className="text-accent text-[14px] font-medium hover:underline bg-transparent border-none cursor-pointer">
          Descargar PDF en blanco para imprimir
        </button>
      </div>

      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-8">
        <h2 className="text-[20px] font-medium mb-2">Calculadora de Interpretación</h2>
        <p className="text-[14px] text-text-secondary mb-6">
          Ingresá un porcentaje total (0-100) para ver la interpretación directa.
        </p>
        <div className="flex items-center gap-4">
          <input 
            type="number" 
            min="0" 
            max="100" 
            value={standaloneScore}
            onChange={(e) => setStandaloneScore(e.target.value)}
            placeholder="Ej: 45"
            className="w-[100px] bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] text-center focus:outline-none focus:border-accent"
          />
          {standaloneScore && !isNaN(parseInt(standaloneScore)) && parseInt(standaloneScore) >= 0 && parseInt(standaloneScore) <= 100 ? (
            <div className="text-[16px] font-medium">
              → {getInterpretation(parseInt(standaloneScore))}
            </div>
          ) : standaloneScore ? (
            <div className="text-[14px] text-warning">Porcentaje inválido (0-100)</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
