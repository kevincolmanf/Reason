'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { jsPDF } from 'jspdf'

interface FichaState {
  fecha: string;
  motivoConsulta: string;
  historiaEnfermedad: string;
  antecedentes: string;
  examenInspeccion: string;
  examenROM: string;
  examenFuerza: string;
  examenTest: string;
  diagnostico: string;
  planTratamiento: string;
}

const initialState: FichaState = {
  fecha: new Date().toISOString().split('T')[0],
  motivoConsulta: '',
  historiaEnfermedad: '',
  antecedentes: '',
  examenInspeccion: '',
  examenROM: '',
  examenFuerza: '',
  examenTest: '',
  diagnostico: '',
  planTratamiento: ''
}

export default function FichaInteractive({ userId }: { userId: string }) {
  const [ficha, setFicha] = useState<FichaState>(initialState)
  const [isLoaded, setIsLoaded] = useState(false)

  // Cargar de LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('reason_ficha_draft')
    if (saved) {
      try {
        setFicha(JSON.parse(saved))
      } catch (e) {
        console.error('Error parsing ficha draft', e)
      }
    }
    setIsLoaded(true)
  }, [])

  // Guardar en LocalStorage ante cada cambio
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('reason_ficha_draft', JSON.stringify(ficha))
    }
  }, [ficha, isLoaded])

  const handleChange = (field: keyof FichaState, value: string) => {
    setFicha(prev => ({ ...prev, [field]: value }))
  }

  const handleClear = () => {
    if (confirm('¿Estás seguro de descartar la ficha actual? Se perderán todos los datos que no hayas exportado.')) {
      setFicha(initialState)
      localStorage.removeItem('reason_ficha_draft')
    }
  }

  const handleSaveResult = async () => {
    const supabase = createClient()
    await supabase.from('tool_sessions').insert({
      user_id: userId,
      tool_type: 'ficha',
      tool_slug: 'general'
    })
  }

  const formatText = () => {
    return `FICHA KINÉSICA
Fecha: ${ficha.fecha}

1. MOTIVO DE CONSULTA
${ficha.motivoConsulta || '-'}

2. HISTORIA DE LA ENFERMEDAD ACTUAL
${ficha.historiaEnfermedad || '-'}

3. ANTECEDENTES (Médicos, Quirúrgicos, Medicación)
${ficha.antecedentes || '-'}

4. EXAMEN FÍSICO
Inspección/Palpación:
${ficha.examenInspeccion || '-'}

Rangos de Movimiento (ROM):
${ficha.examenROM || '-'}

Fuerza:
${ficha.examenFuerza || '-'}

Test Especiales:
${ficha.examenTest || '-'}

5. EVALUACIÓN Y DIAGNÓSTICO KINÉSICO
${ficha.diagnostico || '-'}

6. PLAN DE TRATAMIENTO
${ficha.planTratamiento || '-'}

--
Documento generado con Reason — reason.com.ar`
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(formatText())
    handleSaveResult()
    alert('Texto clínico copiado al portapapeles. Uso registrado.')
  }

  const handleExportPDF = () => {
    handleSaveResult()
    const doc = new jsPDF()
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Ficha Kinésica', 20, 20)
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Fecha de evaluación: ${ficha.fecha}`, 20, 28)

    let y = 40
    const margin = 20
    const pageHeight = 280
    const maxWidth = 170

    const addSection = (title: string, content: string) => {
      if (y > pageHeight - 20) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold')
      doc.text(title, margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      const text = content ? content : '-'
      const lines = doc.splitTextToSize(text, maxWidth)
      
      lines.forEach((line: string) => {
        if (y > pageHeight - 10) {
          doc.addPage()
          y = 20
        }
        doc.text(line, margin, y)
        y += 5
      })
      y += 8
    }

    addSection('1. MOTIVO DE CONSULTA', ficha.motivoConsulta)
    addSection('2. HISTORIA DE LA ENFERMEDAD ACTUAL', ficha.historiaEnfermedad)
    addSection('3. ANTECEDENTES', ficha.antecedentes)
    addSection('4. EXAMEN FÍSICO - Inspección y Palpación', ficha.examenInspeccion)
    addSection('Rangos de Movimiento (ROM)', ficha.examenROM)
    addSection('Fuerza', ficha.examenFuerza)
    addSection('Test Especiales', ficha.examenTest)
    addSection('5. EVALUACIÓN Y DIAGNÓSTICO KINÉSICO', ficha.diagnostico)
    addSection('6. PLAN DE TRATAMIENTO', ficha.planTratamiento)

    if (y > pageHeight - 10) { doc.addPage(); y = 20; }
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', margin, y + 10)

    doc.save(`Ficha_Kinesica_${ficha.fecha}.pdf`)
  }

  if (!isLoaded) return <div className="text-text-secondary">Cargando borrador...</div>

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8 space-y-8 shadow-sm">
        
        {/* FECHA */}
        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2 font-medium">Fecha</label>
          <input 
            type="date" 
            value={ficha.fecha}
            onChange={e => handleChange('fecha', e.target.value)}
            className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2 text-[14px] focus:outline-none focus:border-accent w-[200px]"
          />
        </div>

        {/* 1. MOTIVO DE CONSULTA */}
        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">1. Motivo de Consulta</label>
          <textarea 
            rows={2}
            value={ficha.motivoConsulta}
            onChange={e => handleChange('motivoConsulta', e.target.value)}
            placeholder="Ej: Dolor lumbar bajo que le impide agacharse..."
            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y"
          />
        </div>

        {/* 2. HISTORIA DE LA ENFERMEDAD ACTUAL */}
        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">2. Historia de la Enfermedad Actual</label>
          <textarea 
            rows={4}
            value={ficha.historiaEnfermedad}
            onChange={e => handleChange('historiaEnfermedad', e.target.value)}
            placeholder="Cómo inició, evolución, irradiación, factores que agravan o alivian..."
            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y"
          />
        </div>

        {/* 3. ANTECEDENTES */}
        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">3. Antecedentes (Médicos, Quirúrgicos, Medicación)</label>
          <textarea 
            rows={3}
            value={ficha.antecedentes}
            onChange={e => handleChange('antecedentes', e.target.value)}
            placeholder="HTA, cirugías previas, toma de analgésicos..."
            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y"
          />
        </div>

        {/* 4. EXAMEN FÍSICO */}
        <div className="bg-bg-secondary p-6 rounded-lg border-[0.5px] border-border space-y-6">
          <h3 className="text-[14px] uppercase tracking-[0.05em] text-text-primary font-medium border-b-[0.5px] border-border pb-2">4. Examen Físico</h3>
          
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Inspección y Palpación</label>
            <textarea 
              rows={2}
              value={ficha.examenInspeccion}
              onChange={e => handleChange('examenInspeccion', e.target.value)}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y"
            />
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Rangos de Movimiento (ROM)</label>
            <textarea 
              rows={2}
              value={ficha.examenROM}
              onChange={e => handleChange('examenROM', e.target.value)}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y"
            />
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Fuerza</label>
            <textarea 
              rows={2}
              value={ficha.examenFuerza}
              onChange={e => handleChange('examenFuerza', e.target.value)}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y"
            />
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Test Especiales</label>
            <textarea 
              rows={2}
              value={ficha.examenTest}
              onChange={e => handleChange('examenTest', e.target.value)}
              placeholder="Ej: Lasegue positivo a 45 grados pierna derecha..."
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y"
            />
          </div>
        </div>

        {/* 5. DIAGNÓSTICO */}
        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">5. Evaluación y Diagnóstico Kinésico</label>
          <textarea 
            rows={3}
            value={ficha.diagnostico}
            onChange={e => handleChange('diagnostico', e.target.value)}
            placeholder="Conclusión de los hallazgos y diagnóstico de movimiento..."
            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y"
          />
        </div>

        {/* 6. PLAN DE TRATAMIENTO */}
        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">6. Plan de Tratamiento</label>
          <textarea 
            rows={4}
            value={ficha.planTratamiento}
            onChange={e => handleChange('planTratamiento', e.target.value)}
            placeholder="Objetivos a corto/largo plazo, intervenciones a realizar, pautas de ejercicio..."
            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y"
          />
        </div>

      </div>

      {/* FOOTER ACTIONS */}
      <div className="sticky bottom-6 bg-bg-secondary/90 backdrop-blur-md border-[0.5px] border-border rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-lg">
        <button onClick={handleClear} className="text-[13px] text-text-secondary hover:text-warning transition-colors bg-transparent border-none">
          Descartar borrador
        </button>
        <div className="flex gap-3">
          <button onClick={handleCopy} className="bg-bg-primary border-[0.5px] border-border-strong text-text-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-bg-secondary transition-colors">
            Copiar Texto Clínico
          </button>
          <button onClick={handleExportPDF} className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">
            Exportar Ficha a PDF
          </button>
        </div>
      </div>
    </div>
  )
}
