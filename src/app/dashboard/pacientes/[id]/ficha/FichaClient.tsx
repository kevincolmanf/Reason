'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { jsPDF } from 'jspdf'
import { getResponseItems } from '@/lib/questionnaires'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RecomendacionPdf {
  id: string
  nombre: string
  profesional: string
  fecha: string
  base64: string
}

interface Actualizacion {
  id: string
  fecha: string
  texto: string
}

interface FichaData {
  fecha: string
  motivoConsulta: string
  historiaEnfermedad: string
  factoresAgravantes: string
  factoresAtenuantes: string
  dolorEva: string
  dolorRitmo: string
  dolorMomento: string
  dolorTipo: string
  dolorIrradiacion: string
  antecedentes: string
  examenInspeccion: string
  examenFuerza: string
  examenTest: string
  movimientos: MovimientoRecord[]
  preferenciaDireccional: string
  diagnostico: string
  objetivosPaciente: string
  objetivosCortoPlazo: string
  objetivosLargoPlazo: string
  planTratamiento: string
  recomendacionesTexto: string
  recomendacionesPdfs: RecomendacionPdf[]
  goniometria: GonioRecord[]
  actualizaciones: Actualizacion[]
}

interface GonioRecord {
  id: string
  date: string
  region: string
  values: Record<string, string>
  pain: number | null
  notes: string
}

// Respuesta sintomática a un movimiento, sin necesidad de goniometrar grados.
interface MovimientoRecord {
  id: string
  movimiento: string
  respuesta: string
  nota: string
}

interface QuestionnaireResult {
  id: string
  questionnaire_type: string
  score: number | null
  interpretation: string | null
  created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result_data: any
}

interface DynamoResult {
  id: string
  unit: string
  muscle_results: Record<string, { right: string; left: string }>
  notes: string | null
  created_at: string
}

interface PatientFicha {
  id: string
  patient_id: string
  fecha: string | null
  ficha_data: Partial<FichaData>
}

// ─── Goniometry config ───────────────────────────────────────────────────────

const GONIO_REGIONS = [
  { key: 'cervical', label: 'Cervical', bilateral: false, movements: [
    { key: 'flexion', label: 'Flexión' },
    { key: 'extension', label: 'Extensión' },
    { key: 'rot_der', label: 'Rot. Derecha' },
    { key: 'rot_izq', label: 'Rot. Izquierda' },
    { key: 'incl_der', label: 'Incl. Lateral Der.' },
    { key: 'incl_izq', label: 'Incl. Lateral Izq.' },
  ]},
  { key: 'lumbar', label: 'Lumbar / Inclinómetro', bilateral: false, movements: [
    { key: 'flexion', label: 'Flexión' },
    { key: 'extension', label: 'Extensión' },
    { key: 'incl_der', label: 'Incl. Lateral Der.' },
    { key: 'incl_izq', label: 'Incl. Lateral Izq.' },
  ]},
  { key: 'hombro', label: 'Hombro', bilateral: true, movements: [
    { key: 'flexion', label: 'Flexión' },
    { key: 'extension', label: 'Extensión' },
    { key: 'abduccion', label: 'Abducción' },
    { key: 're', label: 'Rot. Externa' },
    { key: 'ri', label: 'Rot. Interna' },
  ]},
  { key: 'codo', label: 'Codo', bilateral: true, movements: [
    { key: 'flexion', label: 'Flexión' },
    { key: 'extension', label: 'Extensión' },
  ]},
  { key: 'muneca', label: 'Muñeca', bilateral: true, movements: [
    { key: 'flexion', label: 'Flexión' },
    { key: 'extension', label: 'Extensión' },
    { key: 'desv_radial', label: 'Desv. Radial' },
    { key: 'desv_cubital', label: 'Desv. Cubital' },
  ]},
  { key: 'cadera', label: 'Cadera', bilateral: true, movements: [
    { key: 'flexion', label: 'Flexión' },
    { key: 'extension', label: 'Extensión' },
    { key: 'abduccion', label: 'Abducción' },
    { key: 'aduccion', label: 'Aducción' },
    { key: 're', label: 'Rot. Externa' },
    { key: 'ri', label: 'Rot. Interna' },
  ]},
  { key: 'rodilla', label: 'Rodilla', bilateral: true, movements: [
    { key: 'flexion', label: 'Flexión' },
    { key: 'extension', label: 'Extensión' },
  ]},
  { key: 'tobillo', label: 'Tobillo', bilateral: true, movements: [
    { key: 'dorsiflexion', label: 'Dorsiflexión' },
    { key: 'plantarflexion', label: 'Plantiflexión' },
    { key: 'inversion', label: 'Inversión' },
    { key: 'eversion', label: 'Eversión' },
  ]},
]

const QUESTIONNAIRE_NAMES: Record<string, { label: string; unit: string }> = {
  spadi: { label: 'SPADI', unit: '/ 100' },
  ndi: { label: 'NDI', unit: '/ 50' },
  roland_morris: { label: 'Roland Morris', unit: '/ 24' },
  start_back: { label: 'Start Back', unit: '(riesgo)' },
  tampa: { label: 'Tampa (TSK)', unit: '/ 68' },
  catastrofismo: { label: 'Catastrofismo (PCS)', unit: '/ 52' },
  oswestry: { label: 'Oswestry (ODI)', unit: '%' },
  dash: { label: 'DASH', unit: '/ 100' },
  lefs: { label: 'LEFS', unit: '/ 80' },
  psfs: { label: 'PSFS', unit: '/ 10' },
  fabq: { label: 'FABQ', unit: '(PA / Trabajo)' },
}

const MUSCLE_LABELS: Record<string, string> = {
  quad: 'Cuádriceps',
  hamstring: 'Isquiotibiales',
  hip_abductor: 'Abd. Cadera',
  hip_adductor: 'Aductores',
  hip_ext_rotator: 'RE Cadera',
  shoulder_ext_rotator: 'RE Hombro',
  shoulder_abductor: 'Abd. Hombro',
  elbow_flexor: 'Flex. Codo',
}

const emptyFicha: FichaData = {
  fecha: new Date().toISOString().split('T')[0],
  motivoConsulta: '',
  historiaEnfermedad: '',
  factoresAgravantes: '',
  factoresAtenuantes: '',
  dolorEva: '',
  dolorRitmo: '',
  dolorMomento: '',
  dolorTipo: '',
  dolorIrradiacion: '',
  antecedentes: '',
  examenInspeccion: '',
  examenFuerza: '',
  examenTest: '',
  movimientos: [],
  preferenciaDireccional: '',
  diagnostico: '',
  objetivosPaciente: '',
  objetivosCortoPlazo: '',
  objetivosLargoPlazo: '',
  planTratamiento: '',
  recomendacionesTexto: '',
  recomendacionesPdfs: [],
  goniometria: [],
  actualizaciones: [],
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FichaClient({
  ficha: initialFicha,
  patientName,
  questionnaireResults,
  dynamoResults,
}: {
  ficha: PatientFicha
  patientId: string
  patientName: string
  questionnaireResults: QuestionnaireResult[]
  dynamoResults: DynamoResult[]
  userId: string
}) {
  const [ficha, setFicha] = useState<FichaData>({
    ...emptyFicha,
    ...initialFicha.ficha_data,
    fecha: initialFicha.fecha || emptyFicha.fecha,
    goniometria: (initialFicha.ficha_data?.goniometria as GonioRecord[]) ?? [],
    movimientos: (initialFicha.ficha_data?.movimientos as MovimientoRecord[]) ?? [],
  })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [hasChanges, setHasChanges] = useState(false)
  const [expandedSection, setExpandedSection] = useState<'goniometria' | 'cuestionarios' | 'dinamometria' | null>(null)
  const [showGonioForm, setShowGonioForm] = useState(false)
  const [gonioRegion, setGonioRegion] = useState(GONIO_REGIONS[0].key)
  const [gonioValues, setGonioValues] = useState<Record<string, string>>({})
  const [gonioDate, setGonioDate] = useState(new Date().toISOString().split('T')[0])

  const [gonioNotes, setGonioNotes] = useState('')
  const [qResults, setQResults] = useState<QuestionnaireResult[]>(questionnaireResults)
  const [openQ, setOpenQ] = useState<QuestionnaireResult | null>(null)
  const [dynResults, setDynResults] = useState<DynamoResult[]>(dynamoResults)
  const [pdfProfesional, setPdfProfesional] = useState('')
  const [pdfUploadError, setPdfUploadError] = useState('')
  const [previewPdf, setPreviewPdf] = useState<{ url: string; nombre: string } | null>(null)
  const [nuevaActFecha, setNuevaActFecha] = useState(new Date().toISOString().split('T')[0])
  const [nuevaActTexto, setNuevaActTexto] = useState('')

  const supabaseRef = useRef(createClient())

  const handleSave = async () => {
    setSaveStatus('saving')
    const { error } = await supabaseRef.current
      .from('patient_fichas')
      .update({ fecha: ficha.fecha || null, ficha_data: ficha })
      .eq('id', initialFicha.id)
    if (error) {
      setSaveStatus('error')
      alert(`Error al guardar: ${error.message}`)
    } else {
      setSaveStatus('saved')
      setHasChanges(false)
    }
  }

  const handleChange = (field: keyof FichaData, value: string) => {
    setFicha(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
    setSaveStatus('idle')
  }

  // Toggle de opciones múltiples guardadas como CSV (ej: momento del dolor)
  const toggleCsv = (field: keyof FichaData, opt: string) => {
    const current = String(ficha[field] ?? '').split(', ').filter(Boolean)
    const next = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt]
    handleChange(field, next.join(', '))
  }

  // ─── Actualizaciones ───────────────────────────────────────────────────────

  const handleAddActualizacion = () => {
    if (!nuevaActTexto.trim()) return
    const nueva: Actualizacion = {
      id: crypto.randomUUID(),
      fecha: nuevaActFecha,
      texto: nuevaActTexto.trim(),
    }
    setFicha(prev => ({ ...prev, actualizaciones: [nueva, ...(prev.actualizaciones ?? [])] }))
    setNuevaActTexto('')
    setNuevaActFecha(new Date().toISOString().split('T')[0])
    setHasChanges(true)
    setSaveStatus('idle')
  }

  const handleDeleteActualizacion = (id: string) => {
    setFicha(prev => ({ ...prev, actualizaciones: (prev.actualizaciones ?? []).filter(a => a.id !== id) }))
    setHasChanges(true)
    setSaveStatus('idle')
  }

  // ─── Goniometry ────────────────────────────────────────────────────────────

  const selectedRegion = GONIO_REGIONS.find(r => r.key === gonioRegion)!

  const handleGonioValueChange = (key: string, value: string) => {
    setGonioValues(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveGonio = () => {
    if (!selectedRegion) return
    const record: GonioRecord = {
      id: crypto.randomUUID(),
      date: gonioDate,
      region: gonioRegion,
      values: gonioValues,
      pain: null,
      notes: gonioNotes,
    }
    setFicha(prev => ({ ...prev, goniometria: [record, ...(prev.goniometria ?? [])] }))
    setHasChanges(true)
    setSaveStatus('idle')
    setShowGonioForm(false)
    setGonioValues({})
    setGonioNotes('')
    setGonioDate(new Date().toISOString().split('T')[0])
  }

  const handleDeleteGonio = (id: string) => {
    setFicha(prev => ({ ...prev, goniometria: (prev.goniometria ?? []).filter(r => r.id !== id) }))
    setHasChanges(true)
    setSaveStatus('idle')
  }

  // ─── Respuesta al movimiento (lista rápida, sin goniometría) ─────────────────
  const addMovimiento = () => {
    setFicha(prev => ({ ...prev, movimientos: [...(prev.movimientos ?? []), { id: crypto.randomUUID(), movimiento: '', respuesta: '', nota: '' }] }))
    setHasChanges(true)
    setSaveStatus('idle')
  }
  const updateMovimiento = (id: string, field: keyof MovimientoRecord, value: string) => {
    setFicha(prev => ({ ...prev, movimientos: (prev.movimientos ?? []).map(m => m.id === id ? { ...m, [field]: value } : m) }))
    setHasChanges(true)
    setSaveStatus('idle')
  }
  const removeMovimiento = (id: string) => {
    setFicha(prev => ({ ...prev, movimientos: (prev.movimientos ?? []).filter(m => m.id !== id) }))
    setHasChanges(true)
    setSaveStatus('idle')
  }

  // ─── Questionnaire delete ───────────────────────────────────────────────────

  const handleDeleteQ = async (id: string) => {
    if (!confirm('¿Eliminar este resultado?')) return
    const { error } = await supabaseRef.current.from('questionnaire_results').delete().eq('id', id)
    if (!error) setQResults(prev => prev.filter(r => r.id !== id))
  }

  const handleDeleteDynamo = async (id: string) => {
    if (!confirm('¿Eliminar esta evaluación?')) return
    const { error } = await supabaseRef.current.from('dynamometer_results').delete().eq('id', id)
    if (!error) setDynResults(prev => prev.filter(d => d.id !== id))
  }

  const formatScore = (result: QuestionnaireResult): string => {
    if (result.questionnaire_type === 'fabq') {
      const pa = result.result_data?.pa_score ?? '?'
      const work = result.result_data?.work_score ?? '?'
      return `${pa} / ${work}`
    }
    return result.score === null ? '—' : String(result.score)
  }

  // ─── Recomendaciones PDFs ────────────────────────────────────────────────────

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setPdfUploadError('Solo se aceptan archivos PDF.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPdfUploadError('El PDF no puede superar los 5 MB.')
      return
    }
    setPdfUploadError('')
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      const record: RecomendacionPdf = {
        id: crypto.randomUUID(),
        nombre: file.name,
        profesional: pdfProfesional.trim(),
        fecha: new Date().toISOString().split('T')[0],
        base64,
      }
      setFicha(prev => ({ ...prev, recomendacionesPdfs: [record, ...(prev.recomendacionesPdfs ?? [])] }))
      setHasChanges(true)
      setSaveStatus('idle')
      setPdfProfesional('')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleDeleteRecomendacionPdf = (id: string) => {
    setFicha(prev => ({ ...prev, recomendacionesPdfs: (prev.recomendacionesPdfs ?? []).filter(p => p.id !== id) }))
    setHasChanges(true)
    setSaveStatus('idle')
  }

  const openPdf = (base64: string, nombre: string) => {
    const bytes = atob(base64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    const blob = new Blob([arr], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    setPreviewPdf({ url, nombre })
  }

  const closePreview = () => {
    if (previewPdf) URL.revokeObjectURL(previewPdf.url)
    setPreviewPdf(null)
  }

  const downloadPdf = () => {
    if (!previewPdf) return
    const a = document.createElement('a')
    a.href = previewPdf.url
    a.download = previewPdf.nombre
    a.click()
  }

  // ─── PDF ────────────────────────────────────────────────────────────────────

  const handleExportPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Ficha Clínica', 20, 20)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Paciente: ${patientName}`, 20, 28)
    doc.text(`Fecha: ${ficha.fecha}`, 20, 34)

    let y = 46
    const margin = 20
    const pageHeight = 280
    const maxWidth = 170

    const addSection = (title: string, content: string) => {
      if (y > pageHeight - 20) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold')
      doc.text(title, margin, y); y += 6
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(content || '-', maxWidth)
      lines.forEach((line: string) => {
        if (y > pageHeight - 10) { doc.addPage(); y = 20 }
        doc.text(line, margin, y); y += 5
      })
      y += 8
    }

    addSection('1. MOTIVO DE CONSULTA', ficha.motivoConsulta)
    addSection('2. HISTORIA DE LA ENFERMEDAD ACTUAL', ficha.historiaEnfermedad)
    addSection('Factores agravantes', ficha.factoresAgravantes)
    addSection('Factores atenuantes', ficha.factoresAtenuantes)
    addSection('Caracterización del dolor', [
      ficha.dolorEva && `EVA: ${ficha.dolorEva}/10`,
      ficha.dolorRitmo && `Ritmo: ${ficha.dolorRitmo}`,
      ficha.dolorMomento && `Momento: ${ficha.dolorMomento}`,
      ficha.dolorTipo && `Tipo: ${ficha.dolorTipo}`,
      ficha.dolorIrradiacion && `Irradiación: ${ficha.dolorIrradiacion}`,
    ].filter(Boolean).join('  |  '))
    addSection('3. ANTECEDENTES', ficha.antecedentes)
    addSection('4. EXAMEN FÍSICO — Inspección y Palpación', ficha.examenInspeccion)
    addSection('Fuerza', ficha.examenFuerza)
    addSection('Test Especiales', ficha.examenTest)
    addSection('Respuesta al movimiento', (ficha.movimientos ?? [])
      .filter(m => m.movimiento || m.respuesta)
      .map(m => `${m.movimiento || '—'}: ${m.respuesta || '—'}${m.nota ? ` (${m.nota})` : ''}`)
      .join('\n'))
    addSection('Preferencia direccional', ficha.preferenciaDireccional)
    addSection('5. DIAGNÓSTICO KINÉSICO', ficha.diagnostico)
    addSection('Objetivos y expectativas del paciente', ficha.objetivosPaciente)
    addSection('Objetivos a corto plazo', ficha.objetivosCortoPlazo)
    addSection('Objetivos a largo plazo', ficha.objetivosLargoPlazo)
    addSection('6. PLAN DE TRATAMIENTO', ficha.planTratamiento)

    const textoRec = ficha.recomendacionesTexto || ''
    const pdfsRec = ficha.recomendacionesPdfs ?? []
    if (textoRec || pdfsRec.length > 0) {
      const contenidoRec = [
        textoRec,
        pdfsRec.length > 0 ? `\nArchivos adjuntos:\n${pdfsRec.map(p => `- ${p.nombre}${p.profesional ? ` (${p.profesional})` : ''} — ${p.fecha}`).join('\n')}` : '',
      ].filter(Boolean).join('\n')
      addSection('7. RECOMENDACIONES DE OTROS PROFESIONALES', contenidoRec)
    }

    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', margin, 285)
    doc.save(`Ficha_${patientName.replace(/\s+/g, '_')}_${ficha.fecha}.pdf`)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
    {openQ && (() => {
      const meta = QUESTIONNAIRE_NAMES[openQ.questionnaire_type] ?? { label: openQ.questionnaire_type, unit: '' }
      const responses = getResponseItems(openQ.questionnaire_type, openQ.result_data)
      const flaggedCount = responses.filter(r => r.relevant).length
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setOpenQ(null)}>
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl w-full max-w-[640px] max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b-[0.5px] border-border shrink-0">
              <div className="min-w-0">
                <h3 className="text-[18px] font-medium">{meta.label}</h3>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-[13px] text-text-secondary">{formatScore(openQ)} <span className="opacity-70">{meta.unit}</span></span>
                  {openQ.interpretation && (
                    <span className="text-[12px] bg-bg-primary border-[0.5px] border-border rounded-full px-2.5 py-0.5 text-text-secondary">{openQ.interpretation}</span>
                  )}
                </div>
                <div className="text-[12px] text-text-secondary mt-1">
                  {new Date(openQ.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <button onClick={() => setOpenQ(null)} className="text-[13px] text-text-secondary hover:text-text-primary shrink-0 ml-4">Cerrar ✕</button>
            </div>
            {/* Body */}
            <div className="overflow-y-auto px-6 py-4">
              {responses.length === 0 ? (
                <div className="text-[13px] text-text-secondary space-y-2">
                  <p>Este resultado se guardó en una versión anterior que solo registró el puntaje, sin las respuestas por ítem.</p>
                  <p>Los cuestionarios que completes a partir de ahora sí guardan el detalle de cada ítem.</p>
                </div>
              ) : (
                <>
                  {flaggedCount > 0 && (
                    <p className="text-[12px] text-text-secondary mb-4">
                      <span className="text-accent font-medium">{flaggedCount} {flaggedCount === 1 ? 'ítem marcado' : 'ítems marcados'}</span> como clínicamente relevante{flaggedCount === 1 ? '' : 's'} (a trabajar).
                    </p>
                  )}
                  <ol className="space-y-3">
                    {responses.map((item, i) => (
                      <li key={i} className={`flex items-start gap-3 p-3 rounded-xl border-[0.5px] ${item.relevant ? 'border-accent/40 bg-accent/5' : 'border-border bg-bg-primary'}`}>
                        <span className="text-[12px] text-text-secondary shrink-0 mt-0.5 w-5 text-right">{i + 1}.</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="text-[13px] text-text-primary">{item.text}</span>
                            {item.tag && (
                              <span className="text-[10px] uppercase tracking-[0.05em] text-[#9333ea] font-medium mt-0.5">{item.tag}</span>
                            )}
                            {item.relevant && (
                              <span className="text-[10px] uppercase tracking-[0.05em] text-accent font-medium mt-0.5">A trabajar</span>
                            )}
                          </div>
                          {item.detail && (
                            <div className={`text-[13px] mt-1 ${item.relevant ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>{item.detail}</div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          </div>
        </div>
      )
    })()}
    {previewPdf && (
      <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm" onClick={closePreview}>
        <div className="flex items-center justify-between px-5 py-3 bg-bg-secondary border-b-[0.5px] border-border shrink-0" onClick={e => e.stopPropagation()}>
          <span className="text-[14px] font-medium truncate max-w-[60%]">{previewPdf.nombre}</span>
          <div className="flex items-center gap-3">
            <button onClick={downloadPdf} className="text-[13px] text-accent font-medium hover:opacity-70">Descargar</button>
            <button onClick={closePreview} className="text-[13px] text-text-secondary hover:text-text-primary">Cerrar ✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden" onClick={e => e.stopPropagation()}>
          <iframe src={previewPdf.url} className="w-full h-full border-0" title={previewPdf.nombre} />
        </div>
      </div>
    )}
    <div>
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[28px] font-medium tracking-[-0.01em]">Ficha Clínica</h1>
        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && <span className="text-[13px] text-text-secondary">Guardando...</span>}
          {saveStatus === 'saved' && <span className="text-[13px] text-[#3b82f6]">✓ Guardado</span>}
          {saveStatus === 'error' && <span className="text-[13px] text-warning">Error al guardar</span>}
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || !hasChanges}
            className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saveStatus === 'saving' ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* ── DATOS CLÍNICOS ─────────────────────────────────────────────────── */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-6 space-y-8">

        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2 font-medium">Fecha de primera consulta</label>
          <input
            type="date"
            value={ficha.fecha}
            onChange={e => handleChange('fecha', e.target.value)}
            className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2 text-[14px] focus:outline-none focus:border-accent w-[200px]"
          />
        </div>

        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">1. Motivo de Consulta</label>
          <textarea rows={2} value={ficha.motivoConsulta} onChange={e => handleChange('motivoConsulta', e.target.value)} placeholder="Ej: Dolor lumbar bajo que le impide agacharse..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
        </div>

        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">2. Historia de la Enfermedad Actual</label>
          <textarea rows={4} value={ficha.historiaEnfermedad} onChange={e => handleChange('historiaEnfermedad', e.target.value)} placeholder="Cómo inició, evolución, irradiación..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-[12px] text-text-secondary mb-1">Factores agravantes <span className="text-text-tertiary normal-case">(qué empeora el dolor)</span></label>
              <textarea rows={3} value={ficha.factoresAgravantes} onChange={e => handleChange('factoresAgravantes', e.target.value)} placeholder="Ej: flexión de tronco, estar sentado, cargar peso, tos..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
            </div>
            <div>
              <label className="block text-[12px] text-text-secondary mb-1">Factores atenuantes <span className="text-text-tertiary normal-case">(qué lo alivia)</span></label>
              <textarea rows={3} value={ficha.factoresAtenuantes} onChange={e => handleChange('factoresAtenuantes', e.target.value)} placeholder="Ej: reposo, calor, cambiar de posición, analgésicos..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
            </div>
          </div>
        </div>

        {/* Caracterización del dolor */}
        <div className="bg-bg-secondary p-6 rounded-lg border-[0.5px] border-border space-y-5">
          <h3 className="text-[14px] uppercase tracking-[0.05em] text-text-primary font-medium border-b-[0.5px] border-border pb-2">Caracterización del dolor</h3>

          <div>
            <label className="block text-[12px] text-text-secondary mb-2">Intensidad (EVA 0–10)</label>
            <div className="flex flex-wrap gap-1.5">
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => {
                const sel = ficha.dolorEva === String(n)
                return (
                  <button key={n} onClick={() => handleChange('dolorEva', sel ? '' : String(n))}
                    className={`w-9 h-9 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${sel ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border-strong text-text-primary hover:border-accent'}`}
                  >{n}</button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-[12px] text-text-secondary mb-2">Ritmo</label>
            <div className="flex flex-wrap gap-2">
              {['Mecánico', 'Inflamatorio', 'Mixto'].map(opt => {
                const sel = ficha.dolorRitmo === opt
                return (
                  <button key={opt} onClick={() => handleChange('dolorRitmo', sel ? '' : opt)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] border-[0.5px] transition-colors ${sel ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border-strong text-text-secondary hover:text-text-primary'}`}
                  >{opt}</button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-[12px] text-text-secondary mb-2">Momento de aparición <span className="text-text-tertiary normal-case">(podés marcar varios)</span></label>
            <div className="flex flex-wrap gap-2">
              {['Reposo', 'Actividad', 'Nocturno', 'Matinal'].map(opt => {
                const sel = String(ficha.dolorMomento ?? '').split(', ').filter(Boolean).includes(opt)
                return (
                  <button key={opt} onClick={() => toggleCsv('dolorMomento', opt)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] border-[0.5px] transition-colors ${sel ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border-strong text-text-secondary hover:text-text-primary'}`}
                  >{opt}</button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] text-text-secondary mb-1">Tipo / carácter</label>
              <input type="text" value={ficha.dolorTipo} onChange={e => handleChange('dolorTipo', e.target.value)} placeholder="Punzante, quemante, opresivo, eléctrico..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-[12px] text-text-secondary mb-1">Irradiación</label>
              <input type="text" value={ficha.dolorIrradiacion} onChange={e => handleChange('dolorIrradiacion', e.target.value)} placeholder="Ej: irradia a cara posterior de muslo hasta rodilla..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">3. Antecedentes</label>
          <textarea rows={3} value={ficha.antecedentes} onChange={e => handleChange('antecedentes', e.target.value)} placeholder="Médicos, quirúrgicos, medicación actual..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
        </div>

        <div className="bg-bg-secondary p-6 rounded-lg border-[0.5px] border-border space-y-6">
          <h3 className="text-[13px] uppercase tracking-[0.05em] text-text-primary font-medium border-b-[0.5px] border-border pb-2">4. Examen Físico</h3>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Inspección y Palpación</label>
            <textarea rows={2} value={ficha.examenInspeccion} onChange={e => handleChange('examenInspeccion', e.target.value)} className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Fuerza muscular</label>
            <textarea rows={2} value={ficha.examenFuerza} onChange={e => handleChange('examenFuerza', e.target.value)} className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Test Especiales</label>
            <textarea rows={2} value={ficha.examenTest} onChange={e => handleChange('examenTest', e.target.value)} placeholder="Ej: Lasègue positivo a 45° pierna derecha..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
          </div>

          {/* Respuesta al movimiento — lista rápida, sin goniometrar */}
          <div>
            <div className="flex items-center justify-between mb-2 gap-2">
              <label className="block text-[12px] text-text-secondary">Respuesta al movimiento <span className="text-text-tertiary normal-case">(qué genera dolor, alivia o centraliza — sin medir grados)</span></label>
              <button onClick={addMovimiento} className="text-[12px] text-accent font-medium hover:opacity-80 transition-opacity shrink-0">+ Agregar</button>
            </div>
            {(ficha.movimientos?.length ?? 0) === 0 ? (
              <p className="text-[12px] text-text-tertiary">Sin registros. Tocá “Agregar” para anotar un movimiento y su respuesta.</p>
            ) : (
              <div className="space-y-2">
                <datalist id="mov-suggestions">
                  {['Flexión', 'Extensión', 'Rotación derecha', 'Rotación izquierda', 'Inclinación derecha', 'Inclinación izquierda', 'Abducción', 'Aducción', 'Flexión lumbar', 'Extensión lumbar'].map(o => <option key={o} value={o} />)}
                </datalist>
                {(ficha.movimientos ?? []).map(m => (
                  <div key={m.id} className="bg-bg-primary border-[0.5px] border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input list="mov-suggestions" value={m.movimiento} onChange={e => updateMovimiento(m.id, 'movimiento', e.target.value)} placeholder="Movimiento (ej: Extensión lumbar)" className="flex-1 bg-bg-secondary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent" />
                      <button onClick={() => removeMovimiento(m.id)} aria-label="Eliminar movimiento" className="text-text-tertiary hover:text-warning text-[18px] leading-none shrink-0 w-6 h-6 flex items-center justify-center">×</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[{ key: 'Dolor', tone: 'bad' }, { key: 'Alivia', tone: 'good' }, { key: 'Centraliza', tone: 'good' }, { key: 'Periferaliza', tone: 'bad' }, { key: 'Limita ROM', tone: 'bad' }, { key: 'Sin cambios', tone: 'neutral' }].map(({ key, tone }) => {
                        const sel = m.respuesta === key
                        const selCls = tone === 'bad' ? 'bg-red-500 text-white border-red-500' : tone === 'good' ? 'bg-green-500 text-white border-green-500' : 'bg-accent text-bg-primary border-accent'
                        return (
                          <button key={key} onClick={() => updateMovimiento(m.id, 'respuesta', sel ? '' : key)} className={`px-2.5 py-1 rounded-md text-[12px] border-[0.5px] transition-colors ${sel ? selCls : 'bg-bg-secondary border-border-strong text-text-secondary hover:text-text-primary'}`}>{key}</button>
                        )
                      })}
                    </div>
                    <input value={m.nota} onChange={e => updateMovimiento(m.id, 'nota', e.target.value)} placeholder="Nota (opcional)" className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-accent" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preferencia direccional (McKenzie/MDT) */}
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Preferencia direccional / movimiento preferente <span className="text-text-tertiary normal-case">(dirección que alivia o centraliza)</span></label>
            <input type="text" value={ficha.preferenciaDireccional} onChange={e => handleChange('preferenciaDireccional', e.target.value)} placeholder="Ej: extensión lumbar (centraliza y reduce el dolor)" className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
          </div>
        </div>

        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">5. Diagnóstico Kinésico</label>
          <textarea rows={3} value={ficha.diagnostico} onChange={e => handleChange('diagnostico', e.target.value)} placeholder="Conclusión de los hallazgos y diagnóstico de movimiento..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
        </div>

        {/* Objetivos */}
        <div className="bg-bg-secondary p-6 rounded-lg border-[0.5px] border-border space-y-5">
          <h3 className="text-[14px] uppercase tracking-[0.05em] text-text-primary font-medium border-b-[0.5px] border-border pb-2">Objetivos</h3>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Objetivos y expectativas del paciente</label>
            <textarea rows={2} value={ficha.objetivosPaciente} onChange={e => handleChange('objetivosPaciente', e.target.value)} placeholder="Qué espera lograr el paciente. Ej: volver a correr, dormir sin dolor, cargar a su hijo..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] text-text-secondary mb-1">Objetivos a corto plazo</label>
              <textarea rows={3} value={ficha.objetivosCortoPlazo} onChange={e => handleChange('objetivosCortoPlazo', e.target.value)} placeholder="Ej: reducir dolor a EVA ≤ 3, mejorar flexión de rodilla a 110° (2–4 semanas)..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
            </div>
            <div>
              <label className="block text-[12px] text-text-secondary mb-1">Objetivos a largo plazo</label>
              <textarea rows={3} value={ficha.objetivosLargoPlazo} onChange={e => handleChange('objetivosLargoPlazo', e.target.value)} placeholder="Ej: retorno deportivo completo, marcha sin claudicación (8–12 semanas)..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">6. Plan de Tratamiento</label>
          <textarea rows={4} value={ficha.planTratamiento} onChange={e => handleChange('planTratamiento', e.target.value)} placeholder="Intervenciones, técnicas, frecuencia, pautas de ejercicio..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
        </div>

        {/* 7. RECOMENDACIONES DE OTROS PROFESIONALES */}
        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">7. Recomendaciones de Otros Profesionales</label>
          <textarea
            rows={3}
            value={ficha.recomendacionesTexto}
            onChange={e => handleChange('recomendacionesTexto', e.target.value)}
            placeholder="Ej: Traumatólogo indica restricción de carga por 4 semanas. Nutricionista recomienda aumento proteico..."
            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y mb-4"
          />

          {/* PDF adjuntos */}
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4 space-y-3">
            <p className="text-[12px] text-text-secondary font-medium uppercase tracking-[0.05em]">Archivos PDF adjuntos</p>

            {(ficha.recomendacionesPdfs ?? []).length === 0 ? (
              <p className="text-[13px] text-text-secondary">Sin archivos adjuntos todavía.</p>
            ) : (
              <div className="space-y-2">
                {(ficha.recomendacionesPdfs ?? []).map(pdf => (
                  <div key={pdf.id} className="flex items-center justify-between bg-bg-primary border-[0.5px] border-border rounded-lg px-4 py-3 group">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{pdf.nombre}</div>
                      <div className="text-[11px] text-text-secondary">
                        {pdf.profesional && <span>{pdf.profesional} · </span>}
                        {new Date(pdf.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <button
                        onClick={() => openPdf(pdf.base64, pdf.nombre)}
                        className="text-accent text-[12px] font-medium hover:opacity-70"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => handleDeleteRecomendacionPdf(pdf.id)}
                        className="text-text-secondary hover:text-warning text-[12px] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload form */}
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t-[0.5px] border-border">
              <div>
                <label className="block text-[11px] text-text-secondary mb-1">Profesional (opcional)</label>
                <input
                  type="text"
                  value={pdfProfesional}
                  onChange={e => setPdfProfesional(e.target.value)}
                  placeholder="Ej: Traumatólogo"
                  className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent w-[180px]"
                />
              </div>
              <label className="cursor-pointer bg-bg-primary border-[0.5px] border-border-strong hover:border-accent rounded-lg px-4 py-2 text-[13px] font-medium transition-colors">
                + Adjuntar PDF
                <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={handlePdfUpload} />
              </label>
            </div>
            {pdfUploadError && <p className="text-[12px] text-warning">{pdfUploadError}</p>}
          </div>
        </div>
      </div>

      {/* ── ACTUALIZACIONES ────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-[14px] uppercase tracking-[0.05em] text-text-secondary mb-3">Actualizaciones</h2>
        <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 space-y-5">

          {/* Formulario nueva actualización */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha</label>
                <input
                  type="date"
                  value={nuevaActFecha}
                  onChange={e => setNuevaActFecha(e.target.value)}
                  className="bg-bg-secondary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <textarea
              rows={3}
              value={nuevaActTexto}
              onChange={e => setNuevaActTexto(e.target.value)}
              placeholder="Ej: Paciente refiere mejoría del 60% en dolor lumbar. Incorpora extensiones en decúbito..."
              className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y"
            />
            <button
              onClick={handleAddActualizacion}
              disabled={!nuevaActTexto.trim()}
              className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              + Agregar actualización
            </button>
          </div>

          {/* Lista de actualizaciones */}
          {(ficha.actualizaciones ?? []).length > 0 ? (
            <div className="space-y-3 pt-2 border-t-[0.5px] border-border">
              {(ficha.actualizaciones ?? []).map(act => (
                <div key={act.id} className="group flex gap-4 py-3 border-b-[0.5px] border-border last:border-0">
                  <div className="text-[12px] text-text-secondary tabular-nums shrink-0 pt-0.5 w-[80px]">
                    {new Date(act.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="flex-1 text-[14px] text-text-primary whitespace-pre-wrap">{act.texto}</div>
                  <button
                    onClick={() => handleDeleteActualizacion(act.id)}
                    className="text-[11px] text-text-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-text-secondary pt-2 border-t-[0.5px] border-border">Sin actualizaciones todavía.</p>
          )}
        </div>
      </div>

      {/* ── EVALUACIONES ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-[14px] uppercase tracking-[0.05em] text-text-secondary mb-3">Evaluaciones</h2>

        {/* Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {([
            { key: 'goniometria', label: 'Goniometría', count: ficha.goniometria?.length ?? 0 },
            { key: 'cuestionarios', label: 'Cuestionarios', count: qResults.length },
            { key: 'dinamometria', label: 'Dinamometría', count: dynResults.length },
          ] as const).map(item => (
            <button
              key={item.key}
              onClick={() => setExpandedSection(prev => prev === item.key ? null : item.key)}
              className={`text-left px-4 py-3 rounded-xl border-[0.5px] transition-colors ${
                expandedSection === item.key
                  ? 'bg-bg-primary border-accent'
                  : 'bg-bg-secondary border-border hover:border-border-strong'
              }`}
            >
              <div className="text-[13px] font-medium mb-0.5">{item.label}</div>
              <div className="text-[11px] text-text-secondary">{item.count} registro{item.count !== 1 ? 's' : ''}</div>
            </button>
          ))}
        </div>

        {/* ── Goniometría ─────────────────────────────────────────────────── */}
        {expandedSection === 'goniometria' && (
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[16px] font-medium">Goniometría / Inclinómetro</h3>
              <button
                onClick={() => { setShowGonioForm(v => !v); setGonioValues({}) }}
                className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90"
              >
                {showGonioForm ? 'Cancelar' : '+ Nueva medición'}
              </button>
            </div>

            {showGonioForm && (
              <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 mb-5 space-y-4">
                <div className="flex flex-wrap gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha</label>
                    <input
                      type="date"
                      value={gonioDate}
                      onChange={e => setGonioDate(e.target.value)}
                      className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Región</label>
                    <select
                      value={gonioRegion}
                      onChange={e => { setGonioRegion(e.target.value); setGonioValues({}) }}
                      className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent"
                    >
                      {GONIO_REGIONS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedRegion.movements.map(mv => {
                    const painKey = (side: string) => side ? `${mv.key}_${side}_pain` : `${mv.key}_pain`
                    const PainSelector = ({ side }: { side: string }) => {
                      const pk = painKey(side)
                      const val = gonioValues[pk] !== undefined ? parseInt(gonioValues[pk]) : null
                      return (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {Array.from({ length: 11 }, (_, i) => {
                            const active = val === i
                            const cls = i === 0
                              ? active ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : i <= 3
                                ? active ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                                : i <= 6
                                  ? active ? 'bg-orange-500 text-white border-orange-500' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                                  : active ? 'bg-red-500 text-white border-red-500' : 'bg-red-500/10 border-red-500/30 text-red-400'
                            return (
                              <button key={i} type="button"
                                onClick={() => handleGonioValueChange(pk, active ? '' : i.toString())}
                                className={`w-6 h-6 rounded text-[10px] font-medium border-[0.5px] transition-colors ${cls}`}
                              >{i}</button>
                            )
                          })}
                        </div>
                      )
                    }
                    return selectedRegion.bilateral ? (
                      <div key={mv.key} className="space-y-1.5 bg-bg-primary border-[0.5px] border-border rounded-lg p-3">
                        <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">{mv.label}</div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <div className="text-[10px] text-text-secondary mb-1">Der °</div>
                            <input type="number" placeholder="°" value={gonioValues[`${mv.key}_der`] ?? ''} onChange={e => handleGonioValueChange(`${mv.key}_der`, e.target.value)} className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded px-2 py-1.5 text-[13px] focus:outline-none focus:border-accent" />
                            <PainSelector side="der" />
                          </div>
                          <div className="flex-1">
                            <div className="text-[10px] text-text-secondary mb-1">Izq °</div>
                            <input type="number" placeholder="°" value={gonioValues[`${mv.key}_izq`] ?? ''} onChange={e => handleGonioValueChange(`${mv.key}_izq`, e.target.value)} className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded px-2 py-1.5 text-[13px] focus:outline-none focus:border-accent" />
                            <PainSelector side="izq" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={mv.key} className="space-y-1.5 bg-bg-primary border-[0.5px] border-border rounded-lg p-3">
                        <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">{mv.label}</div>
                        <input type="number" placeholder="°" value={gonioValues[mv.key] ?? ''} onChange={e => handleGonioValueChange(mv.key, e.target.value)} className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded px-2 py-1.5 text-[13px] focus:outline-none focus:border-accent" />
                        <PainSelector side="" />
                      </div>
                    )
                  })}
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Notas</label>
                  <input
                    type="text"
                    value={gonioNotes}
                    onChange={e => setGonioNotes(e.target.value)}
                    placeholder="Observaciones..."
                    className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent"
                  />
                </div>

                <button onClick={handleSaveGonio} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90">
                  Guardar medición
                </button>
              </div>
            )}

            {(ficha.goniometria ?? []).length === 0 ? (
              <div className="text-center py-8 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
                <p className="text-[14px] text-text-secondary">Sin mediciones todavía.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(ficha.goniometria ?? []).map(rec => {
                  const region = GONIO_REGIONS.find(r => r.key === rec.region)
                  const filledValues = Object.entries(rec.values).filter(([, v]) => v !== '')
                  return (
                    <div key={rec.id} className="flex items-start justify-between bg-bg-secondary border-[0.5px] border-border rounded-xl px-5 py-4 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                          <span className="text-[14px] font-medium">{region?.label ?? rec.region}</span>
                          <span className="text-[12px] text-text-secondary">
                            {new Date(rec.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        {filledValues.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {filledValues.filter(([k]) => !k.endsWith('_pain')).map(([k, v]) => {
                              const mvKey = k.replace(/_der$|_izq$/, '')
                              const mv = region?.movements.find(m => m.key === mvKey)
                              const side = k.endsWith('_der') ? ' D' : k.endsWith('_izq') ? ' I' : ''
                              const painKey = k + '_pain'
                              const pain = rec.values[painKey] !== undefined ? parseInt(rec.values[painKey]) : null
                              const painCls = pain == null ? '' : pain === 0 ? 'text-emerald-400' : pain <= 3 ? 'text-yellow-400' : pain <= 6 ? 'text-orange-400' : 'text-red-400'
                              return (
                                <span key={k} className="text-[11px] bg-bg-primary border-[0.5px] border-border rounded-full px-2 py-0.5 text-text-secondary">
                                  {mv?.label ?? k}{side}: {v}°{pain != null && <span className={` font-medium ${painCls}`}> · {pain}/10</span>}
                                </span>
                              )
                            })}
                          </div>
                        )}
                        {rec.notes && <div className="text-[12px] text-text-secondary mt-1">{rec.notes}</div>}
                      </div>
                      <button onClick={() => handleDeleteGonio(rec.id)} className="text-text-secondary hover:text-warning text-[12px] opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0">
                        Eliminar
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Cuestionarios ───────────────────────────────────────────────── */}
        {expandedSection === 'cuestionarios' && (
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[16px] font-medium">Cuestionarios</h3>
              <Link href="/recursos/cuestionarios" className="text-accent text-[13px] font-medium hover:opacity-80 no-underline">
                + Completar cuestionario
              </Link>
            </div>
            {qResults.length === 0 ? (
              <div className="text-center py-8 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
                <p className="text-[14px] text-text-secondary mb-3">Sin cuestionarios todavía.</p>
                <Link href="/recursos/cuestionarios" className="text-accent text-[13px] font-medium hover:opacity-80 no-underline">
                  Ir a Cuestionarios →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {qResults.map(result => {
                  const meta = QUESTIONNAIRE_NAMES[result.questionnaire_type] ?? { label: result.questionnaire_type, unit: '' }
                  const flaggedCount = getResponseItems(result.questionnaire_type, result.result_data).filter(r => r.relevant).length
                  return (
                    <div key={result.id} className="flex items-center justify-between bg-bg-secondary border-[0.5px] border-border rounded-xl px-5 py-4 group hover:border-accent/40 transition-colors">
                      <button onClick={() => setOpenQ(result)} className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[14px] font-medium">{meta.label}</span>
                          <span className="text-[14px] text-text-secondary">{formatScore(result)} <span className="text-[12px] opacity-70">{meta.unit}</span></span>
                          {result.interpretation && (
                            <span className="text-[12px] bg-bg-primary border-[0.5px] border-border rounded-full px-2.5 py-0.5 text-text-secondary">{result.interpretation}</span>
                          )}
                          {flaggedCount > 0 && (
                            <span className="text-[11px] text-accent font-medium">{flaggedCount} {flaggedCount === 1 ? 'ítem' : 'ítems'} a trabajar</span>
                          )}
                        </div>
                        <div className="text-[12px] text-text-secondary mt-1">
                          {new Date(result.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })} · <span className="text-accent">Abrir cuestionario →</span>
                        </div>
                      </button>
                      <button onClick={() => handleDeleteQ(result.id)} className="text-text-secondary hover:text-warning text-[12px] opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0">
                        Eliminar
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Dinamometría ────────────────────────────────────────────────── */}
        {expandedSection === 'dinamometria' && (
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[16px] font-medium">Dinamometría</h3>
              <Link href="/recursos/dinamometro" className="text-accent text-[13px] font-medium hover:opacity-80 no-underline">
                + Nueva evaluación
              </Link>
            </div>
            {dynResults.length === 0 ? (
              <div className="text-center py-8 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
                <p className="text-[14px] text-text-secondary mb-3">Sin evaluaciones todavía.</p>
                <Link href="/recursos/dinamometro" className="text-accent text-[13px] font-medium hover:opacity-80 no-underline">
                  Ir a Dinamómetro →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {dynResults.map(d => {
                  const muscles = Object.keys(d.muscle_results ?? {}).filter(k => {
                    const v = d.muscle_results[k]
                    return (v.right && parseFloat(v.right) > 0) || (v.left && parseFloat(v.left) > 0)
                  })
                  return (
                    <div key={d.id} className="flex items-center justify-between bg-bg-secondary border-[0.5px] border-border rounded-xl px-5 py-4 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[14px] font-medium">
                            {new Date(d.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                          <span className="text-[12px] text-text-secondary">{muscles.length} grupos · {d.unit}</span>
                        </div>
                        {muscles.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {muscles.map(k => (
                              <span key={k} className="text-[11px] bg-bg-primary border-[0.5px] border-border rounded-full px-2 py-0.5 text-text-secondary">
                                {MUSCLE_LABELS[k] ?? k}
                              </span>
                            ))}
                          </div>
                        )}
                        {d.notes && <div className="text-[12px] text-text-secondary mt-1 truncate max-w-[400px]">{d.notes}</div>}
                      </div>
                      <button onClick={() => handleDeleteDynamo(d.id)} className="text-text-secondary hover:text-warning text-[12px] opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0">
                        Eliminar
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="sticky bottom-6 bg-bg-secondary/90 backdrop-blur-md border-[0.5px] border-border rounded-xl p-4 flex justify-between items-center gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          {hasChanges && <span className="text-[12px] text-warning">Cambios sin guardar</span>}
          {saveStatus === 'saved' && !hasChanges && <span className="text-[12px] text-[#3b82f6]">✓ Guardado</span>}
          {saveStatus === 'error' && <span className="text-[12px] text-warning">Error al guardar — intentá de nuevo</span>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || !hasChanges}
            className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saveStatus === 'saving' ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button
            onClick={handleExportPDF}
            className="bg-bg-primary border-[0.5px] border-border text-text-secondary px-5 py-2 rounded-lg text-[13px] font-medium hover:text-text-primary transition-colors"
          >
            Exportar PDF
          </button>
        </div>
      </div>
    </div>
    </div>
    </>
  )
}
