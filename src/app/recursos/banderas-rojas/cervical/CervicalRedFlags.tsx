'use client'

import { useState } from 'react'
import { jsPDF } from 'jspdf'

const FLAGS = [
  { id: 1, text: 'Trauma cervical reciente (caída, accidente de tráfico, zambullida)', category: 'Trauma' },
  { id: 2, text: 'Cirugía cervical previa', category: 'Trauma' },
  { id: 3, text: 'Historia de osteoporosis severa o uso prolongado de corticoides', category: 'Trauma' },
  { id: 4, text: 'Dolor de características no mecánicas (constante, sin alivio en ninguna posición)', category: 'Dolor' },
  { id: 5, text: 'Dolor nocturno severo e inexplicable', category: 'Dolor' },
  { id: 6, text: 'Historia personal de cáncer', category: 'Sistémico' },
  { id: 7, text: 'Pérdida de peso inexplicable', category: 'Sistémico' },
  { id: 8, text: 'Fiebre persistente, sudoración nocturna, malestar general', category: 'Sistémico' },
  { id: 9, text: 'Inmunosupresión o HIV', category: 'Sistémico' },
  { id: 10, text: 'Déficit neurológico bilateral en miembros superiores o inferiores', category: 'Neurológico' },
  { id: 11, text: 'Mareos, vértigo, diplopia, disfagia, disartria (signos de insuficiencia vertebrobasilar)', category: 'Neurológico' },
  { id: 12, text: 'Drop attacks (caídas súbitas sin pérdida de conciencia)', category: 'Neurológico' },
  { id: 13, text: 'Signos de mielopatía cervical: torpeza en manos, marcha espástica, hiperreflexia', category: 'Neurológico' },
  { id: 14, text: 'Rigidez cervical con fiebre y fotofobia (meningismo)', category: 'Neurológico' },
  { id: 15, text: 'Hipotensión ortostática, síncope o palpitaciones asociadas al dolor cervical', category: 'Vascular' },
]

export default function CervicalRedFlags() {
  const [flags, setFlags] = useState<Record<number, boolean>>({})

  const handleToggle = (id: number) => {
    setFlags(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const activeFlags = Object.entries(flags).filter(([, val]) => val).map(([id]) => parseInt(id))
  const hasFlags = activeFlags.length > 0

  const handleExportPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(220, 38, 38)
    doc.text('Checklist Banderas Rojas Cervicales', 20, 20)

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

    doc.save('BanderasRojasCervicales.pdf')
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
        </div>
      </div>
    </div>
  )
}
