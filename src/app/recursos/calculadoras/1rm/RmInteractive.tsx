'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { jsPDF } from 'jspdf'

export default function RmInteractive({ userId }: { userId: string }) {
  const [weight, setWeight] = useState<string>('')
  const [reps, setReps] = useState<string>('')
  const [hasSaved, setHasSaved] = useState(false)

  const w = parseFloat(weight)
  const r = parseInt(reps)

  const isValid = !isNaN(w) && w > 0 && !isNaN(r) && r > 0 && r <= 30

  // Fórmulas
  const brzycki = isValid ? w * (36 / (37 - r)) : 0
  const epley = isValid ? w * (1 + 0.0333 * r) : 0
  
  // Usamos el promedio para ser más robustos
  const rm = Math.round((brzycki + epley) / 2)

  const percentages = [
    { pct: 100, label: '1RM Máximo' },
    { pct: 95, label: 'Fuerza Máxima (2-3 reps)' },
    { pct: 90, label: 'Fuerza Máxima (3-4 reps)' },
    { pct: 85, label: 'Hipertrofia/Fuerza (5-6 reps)' },
    { pct: 80, label: 'Hipertrofia (7-8 reps)' },
    { pct: 75, label: 'Hipertrofia (9-10 reps)' },
    { pct: 70, label: 'Hipertrofia/Resistencia (11-12 reps)' },
    { pct: 65, label: 'Resistencia (14-15 reps)' },
    { pct: 60, label: 'Resistencia (+15 reps)' },
    { pct: 50, label: 'Potencia / Calentamiento' }
  ]

  const handleSaveResult = async () => {
    if (hasSaved) return
    const supabase = createClient()
    await supabase.from('tool_sessions').insert({
      user_id: userId,
      tool_type: 'calculadora',
      tool_slug: '1rm'
    })
    setHasSaved(true)
    alert('Uso registrado.')
  }

  const handleExportPDF = () => {
    if (!isValid) return
    handleSaveResult()
    
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Calculadora 1RM - Resultado', 20, 20)
    
    doc.setFontSize(12)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 20, 30)
    
    doc.setFontSize(14)
    doc.text(`Datos ingresados: ${w} kg x ${r} repeticiones`, 20, 45)
    doc.text(`1RM Estimado: ${rm} kg`, 20, 55)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Tabla de Porcentajes de Trabajo:', 20, 70)
    
    let y = 80
    percentages.forEach(p => {
      const calcWeight = Math.round(rm * (p.pct / 100))
      doc.text(`${p.pct}%`, 20, y)
      doc.setFont('helvetica', 'bold')
      doc.text(`${calcWeight} kg`, 40, y)
      doc.setFont('helvetica', 'normal')
      doc.text(p.label, 65, y)
      y += 8
    })

    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    doc.save('1RM_Resultado.pdf')
  }

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-[13px] uppercase tracking-[0.05em] text-text-secondary mb-2">Peso Levantado (kg)</label>
            <input 
              type="number" 
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="Ej: 60"
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[13px] uppercase tracking-[0.05em] text-text-secondary mb-2">Repeticiones logradas</label>
            <input 
              type="number" 
              value={reps}
              onChange={e => setReps(e.target.value)}
              placeholder="Ej: 5"
              max="30"
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] focus:outline-none focus:border-accent"
            />
            {r > 10 && <p className="text-[11px] text-warning mt-2">Más de 10 reps disminuye la precisión de la fórmula.</p>}
          </div>
        </div>

        {isValid && (
          <div className="mt-8 bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6">
            <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">1RM Estimado</div>
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-[48px] font-medium tracking-[-0.02em] text-accent">{rm}</span>
              <span className="text-[18px] text-text-secondary">kg</span>
            </div>

            <div className="mb-6">
              <div className="text-[13px] font-medium mb-3 border-b-[0.5px] border-border pb-2">Tabla de Porcentajes</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                {percentages.map(p => (
                  <div key={p.pct} className="flex justify-between items-center py-1 border-b-[0.5px] border-border/30 last:border-0">
                    <span className="text-[13px] text-text-secondary w-12">{p.pct}%</span>
                    <span className="text-[14px] font-medium">{Math.round(rm * (p.pct / 100))} kg</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 pt-4">
              <button onClick={handleExportPDF} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium">
                Exportar PDF e Imprimir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
