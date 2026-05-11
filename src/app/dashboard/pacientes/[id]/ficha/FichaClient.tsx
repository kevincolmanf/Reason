'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { jsPDF } from 'jspdf'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FichaData {
  fecha: string
  motivoConsulta: string
  historiaEnfermedad: string
  antecedentes: string
  examenInspeccion: string
  examenFuerza: string
  examenTest: string
  diagnostico: string
  planTratamiento: string
  goniometria: GonioRecord[]
}

interface GonioRecord {
  id: string
  date: string
  region: string
  values: Record<string, string>
  notes: string
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
  antecedentes: '',
  examenInspeccion: '',
  examenFuerza: '',
  examenTest: '',
  diagnostico: '',
  planTratamiento: '',
  goniometria: [],
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
  })
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [expandedSection, setExpandedSection] = useState<'goniometria' | 'cuestionarios' | 'dinamometria' | null>(null)
  const [showGonioForm, setShowGonioForm] = useState(false)
  const [gonioRegion, setGonioRegion] = useState(GONIO_REGIONS[0].key)
  const [gonioValues, setGonioValues] = useState<Record<string, string>>({})
  const [gonioDate, setGonioDate] = useState(new Date().toISOString().split('T')[0])
  const [gonioNotes, setGonioNotes] = useState('')
  const [qResults, setQResults] = useState<QuestionnaireResult[]>(questionnaireResults)
  const [dynResults, setDynResults] = useState<DynamoResult[]>(dynamoResults)

  const supabaseRef = useRef(createClient())

  const handleSave = async () => {
    setSaveStatus('saving')
    const { error } = await supabaseRef.current
      .from('patient_fichas')
      .update({ fecha: ficha.fecha || null, ficha_data: ficha })
      .eq('id', initialFicha.id)
    setSaveStatus(error ? 'error' : 'saved')
  }

  const handleChange = (field: keyof FichaData, value: string) => {
    setFicha(prev => ({ ...prev, [field]: value }))
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
      notes: gonioNotes,
    }
    setFicha(prev => ({ ...prev, goniometria: [record, ...(prev.goniometria ?? [])] }))
    setShowGonioForm(false)
    setGonioValues({})
    setGonioNotes('')
    setGonioDate(new Date().toISOString().split('T')[0])
  }

  const handleDeleteGonio = (id: string) => {
    setFicha(prev => ({ ...prev, goniometria: (prev.goniometria ?? []).filter(r => r.id !== id) }))
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
    addSection('3. ANTECEDENTES', ficha.antecedentes)
    addSection('4. EXAMEN FÍSICO — Inspección y Palpación', ficha.examenInspeccion)
    addSection('Fuerza', ficha.examenFuerza)
    addSection('Test Especiales', ficha.examenTest)
    addSection('5. DIAGNÓSTICO KINÉSICO', ficha.diagnostico)
    addSection('6. PLAN DE TRATAMIENTO', ficha.planTratamiento)

    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('Documento generado con Reason — reason.com.ar', margin, 285)
    doc.save(`Ficha_${patientName.replace(/\s+/g, '_')}_${ficha.fecha}.pdf`)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[28px] font-medium tracking-[-0.01em]">Ficha Clínica</h1>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity min-w-[100px]"
        >
          {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? '✓ Guardado' : saveStatus === 'error' ? 'Error — reintentar' : 'Guardar'}
        </button>
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
          <textarea rows={4} value={ficha.historiaEnfermedad} onChange={e => handleChange('historiaEnfermedad', e.target.value)} placeholder="Cómo inició, evolución, irradiación, factores que agravan o alivian..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
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
        </div>

        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">5. Diagnóstico Kinésico</label>
          <textarea rows={3} value={ficha.diagnostico} onChange={e => handleChange('diagnostico', e.target.value)} placeholder="Conclusión de los hallazgos y diagnóstico de movimiento..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
        </div>

        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">6. Plan de Tratamiento</label>
          <textarea rows={4} value={ficha.planTratamiento} onChange={e => handleChange('planTratamiento', e.target.value)} placeholder="Objetivos, intervenciones, pautas de ejercicio..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
        </div>
      </div>

      {/* ── EVALUACIONES ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-[14px] uppercase tracking-[0.05em] text-text-secondary mb-3">Evaluaciones</h2>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
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

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedRegion.movements.map(mv => (
                    selectedRegion.bilateral ? (
                      <div key={mv.key} className="space-y-1">
                        <div className="text-[11px] text-text-secondary">{mv.label}</div>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            placeholder="Der °"
                            value={gonioValues[`${mv.key}_der`] ?? ''}
                            onChange={e => handleGonioValueChange(`${mv.key}_der`, e.target.value)}
                            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-2 py-1.5 text-[13px] focus:outline-none focus:border-accent"
                          />
                          <input
                            type="number"
                            placeholder="Izq °"
                            value={gonioValues[`${mv.key}_izq`] ?? ''}
                            onChange={e => handleGonioValueChange(`${mv.key}_izq`, e.target.value)}
                            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-2 py-1.5 text-[13px] focus:outline-none focus:border-accent"
                          />
                        </div>
                      </div>
                    ) : (
                      <div key={mv.key} className="space-y-1">
                        <div className="text-[11px] text-text-secondary">{mv.label}</div>
                        <input
                          type="number"
                          placeholder="°"
                          value={gonioValues[mv.key] ?? ''}
                          onChange={e => handleGonioValueChange(mv.key, e.target.value)}
                          className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-2 py-1.5 text-[13px] focus:outline-none focus:border-accent"
                        />
                      </div>
                    )
                  ))}
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
                            {filledValues.map(([k, v]) => {
                              const mvKey = k.replace(/_der$|_izq$/, '')
                              const mv = region?.movements.find(m => m.key === mvKey)
                              const side = k.endsWith('_der') ? ' D' : k.endsWith('_izq') ? ' I' : ''
                              return (
                                <span key={k} className="text-[11px] bg-bg-primary border-[0.5px] border-border rounded-full px-2 py-0.5 text-text-secondary">
                                  {mv?.label ?? k}{side}: {v}°
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
                  return (
                    <div key={result.id} className="flex items-center justify-between bg-bg-secondary border-[0.5px] border-border rounded-xl px-5 py-4 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[14px] font-medium">{meta.label}</span>
                          <span className="text-[14px] text-text-secondary">{formatScore(result)} <span className="text-[12px] opacity-70">{meta.unit}</span></span>
                          {result.interpretation && (
                            <span className="text-[12px] bg-bg-primary border-[0.5px] border-border rounded-full px-2.5 py-0.5 text-text-secondary">{result.interpretation}</span>
                          )}
                        </div>
                        <div className="text-[12px] text-text-secondary mt-1">
                          {new Date(result.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
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
      <div className="sticky bottom-6 bg-bg-secondary/90 backdrop-blur-md border-[0.5px] border-border rounded-xl p-4 flex justify-end gap-3 shadow-lg">
        <button
          onClick={handleExportPDF}
          className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          Exportar PDF
        </button>
      </div>
    </div>
  )
}
