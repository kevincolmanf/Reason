'use client'

import { useState } from 'react'
import { jsPDF } from 'jspdf'
import SaveRedFlagsToFicha from '@/components/SaveRedFlagsToFicha'

const FLAGS = [
  { id: 1, text: 'Trauma significativo reciente (caída sobre el hombro, luxación de alta energía)', category: 'Trauma' },
  { id: 2, text: 'Historia personal de cáncer (especialmente pulmón, mama, próstata)', category: 'Sistémico' },
  { id: 3, text: 'Pérdida de peso inexplicable', category: 'Sistémico' },
  { id: 4, text: 'Dolor que no mejora con ninguna posición ni en reposo', category: 'Dolor' },
  { id: 5, text: 'Dolor nocturno severo con signos sistémicos', category: 'Dolor' },
  { id: 6, text: 'Fiebre, eritema local, calor y tumefacción articular (artritis séptica)', category: 'Sistémico' },
  { id: 7, text: 'Masa palpable en región escapular o axilar', category: 'Sistémico' },
  { id: 8, text: 'Dolor irradiado al brazo izquierdo con disnea, sudoración o dolor precordial (origen cardíaco)', category: 'Vascular/Cardíaco' },
  { id: 9, text: 'Dolor en hombro derecho con ictericia o dolor abdominal superior (origen visceral — hígado/vesícula)', category: 'Vascular/Cardíaco' },
  { id: 10, text: 'Tumor de Pancoast: dolor en hombro + síndrome de Horner (ptosis, miosis, anhidrosis) + atrofia mano', category: 'Neurológico' },
  { id: 11, text: 'Déficit neurológico progresivo: parálisis, atrofia marcada', category: 'Neurológico' },
  { id: 12, text: 'Inestabilidad glenohumeral asociada a fractura (Hill-Sachs, Bankart óseo)', category: 'Trauma' },
]

export default function HombroRedFlags() {
  const [flags, setFlags] = useState<Record<number, boolean>>({})

  const handleToggle = (id: number) => {
    setFlags(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const activeFlags = Object.entries(flags).filter(([, val]) => val).map(([id]) => parseInt(id))
  const hasFlags = activeFlags.length > 0
  const anyChecked = Object.keys(flags).length > 0

  const examenTestText = hasFlags
    ? `Banderas Rojas Hombro — ${new Date().toLocaleDateString('es-AR')}\nALERTA: ${activeFlags.length} bandera(s) roja(s) detectada(s).\n${activeFlags.map(id => `• ${FLAGS.find(f => f.id === id)?.text ?? ''}`).join('\n')}\nJustifica derivación médica o estudios por imagen.`
    : `Banderas Rojas Hombro — ${new Date().toLocaleDateString('es-AR')}\nSin banderas rojas detectadas.`

  const handleExportPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(220, 38, 38)
    doc.text('Checklist Banderas Rojas de Hombro', 20, 20)

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 20, 30)

    doc.setFontSize(14)
    if (hasFlags) {
      doc.setTextColor(220, 38, 38)
      doc.text(`ALERTA: Se detectaron ${activeFlags.length} bandera(s) roja(s).`, 20, 45)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text('Posible indicación de evaluación médica o estudios de imagen.', 20, 52)

      let y = 65
      doc.setFont('helvetica', 'bold')
      doc.text('Signos detectados:', 20, y)
      doc.setFont('helvetica', 'normal')
      y += 8

      activeFlags.forEach((id) => {
        const item = FLAGS.find(f => f.id === id)
        if (item) {
          const splitText = doc.splitTextToSize(`- ${item.text}`, 170)
          doc.text(splitText, 20, y)
          y += 5 * splitText.length + 2
        }
      })
    } else {
      doc.setTextColor(34, 197, 94)
      doc.text('No se detectaron banderas rojas.', 20, 45)
      doc.setTextColor(0, 0, 0)
    }

    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', 20, 285)

    doc.save('BanderasRojasHombro.pdf')
  }

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <div className="space-y-3">
          {FLAGS.map((item) => (
            <label key={item.id} className="flex items-start gap-4 p-4 border-[0.5px] border-border rounded-lg cursor-pointer hover:bg-bg-secondary transition-colors group">
              <input
                type="checkbox"
                checked={flags[item.id] || false}
                onChange={() => handleToggle(item.id)}
                className="mt-1 w-5 h-5 cursor-pointer accent-warning"
              />
              <div>
                <div className="text-[15px] group-hover:text-warning transition-colors">{item.text}</div>
                <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mt-1">{item.category}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-8 border-t-[0.5px] border-border pt-8">
          {hasFlags ? (
            <div className="bg-[#451A1A]/20 border-[0.5px] border-warning/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2 text-warning">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <h3 className="text-[18px] font-medium">Atención Clínica</h3>
              </div>
              <p className="text-[14px] text-text-primary mb-6">
                Se detectaron {activeFlags.length} banderas rojas. La presencia de banderas rojas justifica una anamnesis más profunda y probable derivación médica u orden de estudios por imágenes para descartar patología seria.
              </p>
              <div className="flex gap-4">
                <button onClick={handleExportPDF} className="bg-warning text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90">
                  Exportar Reporte PDF
                </button>
                <button onClick={() => setFlags({})} className="bg-transparent text-text-secondary px-4 py-2 rounded-lg text-[13px] font-medium hover:text-text-primary border-[0.5px] border-border">
                  Limpiar Banderas
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <button onClick={handleExportPDF} className="bg-bg-secondary text-text-primary px-4 py-2 rounded-lg text-[13px] font-medium border-[0.5px] border-border hover:border-border-strong">
                Exportar Reporte Negativo
              </button>
            </div>
          )}
          {anyChecked && <SaveRedFlagsToFicha region="Hombro" examenTestText={examenTestText} />}
        </div>
      </div>
    </div>
  )
}
