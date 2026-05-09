'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Patient {
  id: string
  name: string
  age: number | null
  occupation: string | null
  created_at: string
  load_share_token: string | null
}

interface Plan {
  id: string
  name: string
  updated_at: string
  share_token: string | null
  start_date: string | null
}

interface Ficha {
  id: string
  fecha: string | null
  created_at: string
  ficha_data: { motivoConsulta?: string }
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
  muscle_results: Record<string, { right: string, left: string }>
  notes: string | null
  created_at: string
}

interface RtsEvalSummary {
  id: string
  created_at: string
  surgery_date: string | null
  affected_side: string
  quad_affected: number | null
  quad_unaffected: number | null
  hamstring_affected: number | null
  hamstring_unaffected: number | null
  acl_rsi: number | null
  koos_sport: number | null
  effusion: number | null
  rom_extension: number | null
  rom_flexion: number | null
  pain_vas: number | null
  single_hop_affected: number | null
  single_hop_unaffected: number | null
  triple_hop_affected: number | null
  triple_hop_unaffected: number | null
  crossover_hop_affected: number | null
  crossover_hop_unaffected: number | null
  timed_hop_affected: number | null
  timed_hop_unaffected: number | null
  slcmj_affected: number | null
  slcmj_unaffected: number | null
  drop_jump_quality: string | null
  grs: number | null
}

const MUSCLE_LABELS: Record<string, string> = {
  quad: 'Cuádriceps',
  hamstring: 'Isquiotibiales',
  hip_abductor: 'Abd. Cadera',
  hip_ext_rotator: 'RE Cadera',
  shoulder_ext_rotator: 'RE Hombro',
  shoulder_abductor: 'Abd. Hombro',
  elbow_flexor: 'Flex. Codo',
}

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

export default function PacienteDetail({ patient: initialPatient, userId: _userId }: { patient: Patient, userId: string }) {
  const [patient, setPatient] = useState<Patient>(initialPatient)
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [fichasLoading, setFichasLoading] = useState(true)
  const [questionnaireResults, setQuestionnaireResults] = useState<QuestionnaireResult[]>([])
  const [qResultsLoading, setQResultsLoading] = useState(true)
  const [dynamoResults, setDynamoResults] = useState<DynamoResult[]>([])
  const [dynamoLoading, setDynamoLoading] = useState(true)
  const [rtsEvals, setRtsEvals] = useState<RtsEvalSummary[]>([])
  const [rtsLoading, setRtsLoading] = useState(true)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [creatingFicha, setCreatingFicha] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: initialPatient.name, age: initialPatient.age?.toString() || '', occupation: initialPatient.occupation || '' })
  const [saving, setSaving] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true)
    const { data, error } = await supabase
      .from('exercise_plans')
      .select('id, name, updated_at, share_token, start_date')
      .eq('patient_id', patient.id)
      .order('updated_at', { ascending: false })

    if (!error && data) setPlans(data)
    setPlansLoading(false)
  }, [supabase, patient.id])

  const fetchFichas = useCallback(async () => {
    setFichasLoading(true)
    const { data, error } = await supabase
      .from('patient_fichas')
      .select('id, fecha, created_at, ficha_data')
      .eq('patient_id', patient.id)
      .order('fecha', { ascending: false })

    if (!error && data) setFichas(data)
    setFichasLoading(false)
  }, [supabase, patient.id])

  const fetchQuestionnaireResults = useCallback(async () => {
    setQResultsLoading(true)
    const { data, error } = await supabase
      .from('questionnaire_results')
      .select('id, questionnaire_type, score, interpretation, created_at, result_data')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })

    if (!error && data) setQuestionnaireResults(data)
    setQResultsLoading(false)
  }, [supabase, patient.id])

  const fetchDynamoResults = useCallback(async () => {
    setDynamoLoading(true)
    const { data, error } = await supabase
      .from('dynamometer_results')
      .select('id, unit, muscle_results, notes, created_at')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })

    if (!error && data) setDynamoResults(data)
    setDynamoLoading(false)
  }, [supabase, patient.id])

  const fetchRtsEvals = useCallback(async () => {
    setRtsLoading(true)
    const { data, error } = await supabase
      .from('rts_evaluations')
      .select('id, created_at, surgery_date, affected_side, quad_affected, quad_unaffected, hamstring_affected, hamstring_unaffected, acl_rsi, koos_sport, effusion, rom_extension, rom_flexion, pain_vas, single_hop_affected, single_hop_unaffected, triple_hop_affected, triple_hop_unaffected, crossover_hop_affected, crossover_hop_unaffected, timed_hop_affected, timed_hop_unaffected, slcmj_affected, slcmj_unaffected, drop_jump_quality, grs')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .limit(3)

    if (!error && data) setRtsEvals(data)
    setRtsLoading(false)
  }, [supabase, patient.id])

  useEffect(() => {
    fetchPlans()
    fetchFichas()
    fetchQuestionnaireResults()
    fetchDynamoResults()
    fetchRtsEvals()
  }, [fetchPlans, fetchFichas, fetchQuestionnaireResults, fetchDynamoResults, fetchRtsEvals])

  const generatePortalToken = async () => {
    setGeneratingToken(true)
    const token = crypto.randomUUID()
    const { data, error } = await supabase
      .from('patients')
      .update({ load_share_token: token })
      .eq('id', patient.id)
      .select()
      .single()
    if (!error && data) setPatient(data)
    setGeneratingToken(false)
  }

  const revokePortalToken = async () => {
    if (!confirm('¿Revocar el link del portal? El paciente ya no podrá acceder.')) return
    const { data, error } = await supabase
      .from('patients')
      .update({ load_share_token: null })
      .eq('id', patient.id)
      .select()
      .single()
    if (!error && data) setPatient(data)
  }

  const handleNewFicha = async () => {
    setCreatingFicha(true)
    const { data, error } = await supabase
      .from('patient_fichas')
      .insert({
        patient_id: patient.id,
        user_id: _userId,
        fecha: new Date().toISOString().split('T')[0],
        ficha_data: {},
      })
      .select()
      .single()

    if (!error && data) {
      router.push(`/dashboard/pacientes/${patient.id}/fichas/${data.id}`)
    }
    setCreatingFicha(false)
  }

  const handleDeleteFicha = async (fichaId: string) => {
    if (!confirm('¿Eliminar esta ficha? No se puede deshacer.')) return
    const { error } = await supabase.from('patient_fichas').delete().eq('id', fichaId)
    if (!error) setFichas(prev => prev.filter(f => f.id !== fichaId))
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return
    setSaving(true)

    const { data, error } = await supabase
      .from('patients')
      .update({
        name: editForm.name.trim(),
        age: editForm.age ? parseInt(editForm.age) : null,
        occupation: editForm.occupation.trim() || null,
      })
      .eq('id', patient.id)
      .select()
      .single()

    if (!error && data) {
      setPatient(data)
      setEditing(false)
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar a ${patient.name}? Los planes asociados quedarán sin paciente asignado.`)) return
    const { error } = await supabase.from('patients').delete().eq('id', patient.id)
    if (!error) router.push('/dashboard/pacientes')
  }

  const handleDeleteResult = async (resultId: string) => {
    if (!confirm('¿Eliminar este resultado? No se puede deshacer.')) return
    const { error } = await supabase.from('questionnaire_results').delete().eq('id', resultId)
    if (!error) setQuestionnaireResults(prev => prev.filter(r => r.id !== resultId))
  }

  const handleDeleteDynamo = async (dynamoId: string) => {
    if (!confirm('¿Eliminar esta evaluación? No se puede deshacer.')) return
    const { error } = await supabase.from('dynamometer_results').delete().eq('id', dynamoId)
    if (!error) setDynamoResults(prev => prev.filter(d => d.id !== dynamoId))
  }

  const computeRtsCriteriaSummary = (ev: RtsEvalSummary): { passed: number; total: number } => {
    let passed = 0
    let total = 0

    // Surgery date / time criterion
    if (ev.surgery_date) {
      total++
      const months = Math.floor((new Date().getTime() - new Date(ev.surgery_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
      if (months >= 9) passed++
    }
    if (ev.effusion !== null && ev.effusion !== undefined) { total++; if (ev.effusion <= 1) passed++ }
    if (ev.rom_extension !== null && ev.rom_extension !== undefined) { total++; if (ev.rom_extension === 0) passed++ }
    if (ev.rom_flexion !== null && ev.rom_flexion !== undefined) { total++; if (ev.rom_flexion >= 120) passed++ }
    if (ev.pain_vas !== null && ev.pain_vas !== undefined) { total++; if (ev.pain_vas <= 2) passed++ }

    const computeLSI = (aff: number | null, unaff: number | null) => (!aff || !unaff || unaff === 0) ? null : (aff / unaff) * 100
    const qLSI = computeLSI(ev.quad_affected, ev.quad_unaffected)
    const hLSI = computeLSI(ev.hamstring_affected, ev.hamstring_unaffected)
    const hqRatio = (ev.hamstring_affected && ev.quad_affected && ev.quad_affected > 0) ? ev.hamstring_affected / ev.quad_affected : null
    const singleLSI = computeLSI(ev.single_hop_affected, ev.single_hop_unaffected)
    const tripleLSI = computeLSI(ev.triple_hop_affected, ev.triple_hop_unaffected)
    const crossLSI = computeLSI(ev.crossover_hop_affected, ev.crossover_hop_unaffected)
    const timedLSI = (ev.timed_hop_affected && ev.timed_hop_unaffected && ev.timed_hop_affected > 0)
      ? (ev.timed_hop_unaffected / ev.timed_hop_affected) * 100 : null
    const slcmjLSI = computeLSI(ev.slcmj_affected, ev.slcmj_unaffected)

    if (qLSI !== null) { total++; if (qLSI >= 90) passed++ }
    if (hLSI !== null) { total++; if (hLSI >= 90) passed++ }
    if (hqRatio !== null) { total++; if (hqRatio >= 0.60) passed++ }
    if (singleLSI !== null) { total++; if (singleLSI >= 90) passed++ }
    if (tripleLSI !== null) { total++; if (tripleLSI >= 90) passed++ }
    if (crossLSI !== null) { total++; if (crossLSI >= 90) passed++ }
    if (timedLSI !== null) { total++; if (timedLSI >= 90) passed++ }
    if (slcmjLSI !== null) { total++; if (slcmjLSI >= 90) passed++ }
    if (ev.drop_jump_quality) { total++; if (ev.drop_jump_quality === 'good') passed++ }
    if (ev.koos_sport !== null && ev.koos_sport !== undefined) { total++; if (ev.koos_sport >= 89) passed++ }
    if (ev.acl_rsi !== null && ev.acl_rsi !== undefined) { total++; if (ev.acl_rsi >= 65) passed++ }
    if (ev.grs !== null && ev.grs !== undefined) { total++; if (ev.grs >= 90) passed++ }

    return { passed, total }
  }

  const formatScore = (result: QuestionnaireResult): string => {
    if (result.questionnaire_type === 'fabq') {
      const pa = result.result_data?.pa_score ?? '?'
      const work = result.result_data?.work_score ?? '?'
      return `${pa} / ${work}`
    }
    if (result.score === null) return '—'
    return String(result.score)
  }

  return (
    <div>
      {/* HEADER PACIENTE */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 mb-8">
        {editing ? (
          <div>
            <h2 className="text-[16px] font-medium mb-4">Editar datos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nombre *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Edad</label>
                <input
                  type="number"
                  value={editForm.age}
                  onChange={e => setEditForm(f => ({ ...f, age: e.target.value }))}
                  min="1" max="120"
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Ocupación</label>
                <input
                  type="text"
                  value={editForm.occupation}
                  onChange={e => setEditForm(f => ({ ...f, occupation: e.target.value }))}
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editForm.name.trim()}
                className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-[28px] font-medium tracking-[-0.01em] mb-3">{patient.name}</h1>
              <div className="flex flex-wrap gap-4 text-[14px] text-text-secondary">
                {patient.age && (
                  <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1">
                    {patient.age} años
                  </span>
                )}
                {patient.occupation && (
                  <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1">
                    {patient.occupation}
                  </span>
                )}
                <span className="bg-bg-secondary border-[0.5px] border-border rounded-full px-3 py-1 text-[12px]">
                  Desde {new Date(patient.created_at).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary transition-colors"
              >
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-warning transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PORTAL DEL PACIENTE */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[16px] font-medium">Portal del Paciente</h2>
        </div>
        {patient.load_share_token ? (
          <div>
            <p className="text-[13px] text-text-secondary mb-3">
              Compartí este link con {patient.name} para que vea sus ejercicios y registre sus sesiones de entrenamiento.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/paciente/${patient.load_share_token}`)
                  alert('Link copiado')
                }}
                className="bg-[#24342A] border-[0.5px] border-[#34D399]/50 text-[#34D399] px-4 py-2 rounded-lg text-[13px] font-medium flex-grow truncate"
              >
                Enviar link al paciente
              </button>
              <button
                onClick={revokePortalToken}
                className="bg-bg-secondary border-[0.5px] border-border px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-warning"
                title="Revocar"
              >
                X
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[13px] text-text-secondary mb-3">
              Generá un link único para que {patient.name} pueda ver sus ejercicios y registrar sus sesiones desde el celular.
            </p>
            <button
              onClick={generatePortalToken}
              disabled={generatingToken}
              className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40"
            >
              {generatingToken ? 'Generando...' : 'Generar link para el paciente'}
            </button>
          </div>
        )}
      </div>

      {/* FICHAS KINÉSICAS */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[20px] font-medium">Fichas Kinésicas</h2>
          <button
            onClick={handleNewFicha}
            disabled={creatingFicha}
            className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {creatingFicha ? 'Creando...' : '+ Nueva Ficha'}
          </button>
        </div>

        {fichasLoading ? (
          <div className="text-text-secondary text-[14px]">Cargando fichas...</div>
        ) : fichas.length === 0 ? (
          <div className="text-center py-10 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
            <p className="text-[15px] font-medium text-text-primary mb-1">Sin fichas todavía</p>
            <p className="text-[13px] text-text-secondary">Hacé clic en &quot;Nueva Ficha&quot; para crear la primera.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fichas.map(f => (
              <div key={f.id} className="flex items-center justify-between bg-bg-primary border-[0.5px] border-border rounded-xl px-5 py-4 hover:bg-bg-secondary transition-colors group">
                <Link href={`/dashboard/pacientes/${patient.id}/fichas/${f.id}`} className="flex-grow no-underline">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-[14px] font-medium text-text-primary">
                        {f.fecha ? new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Sin fecha'}
                      </div>
                      {f.ficha_data?.motivoConsulta && (
                        <div className="text-[12px] text-text-secondary mt-0.5 truncate max-w-[400px]">
                          {f.ficha_data.motivoConsulta}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/pacientes/${patient.id}/fichas/${f.id}`}
                    className="text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity no-underline"
                  >
                    Abrir →
                  </Link>
                  <button
                    onClick={() => handleDeleteFicha(f.id)}
                    className="text-text-secondary hover:text-warning text-[12px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CUESTIONARIOS */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[20px] font-medium">Cuestionarios</h2>
          <Link
            href="/recursos/cuestionarios"
            className="text-accent text-[13px] font-medium hover:opacity-80 no-underline"
          >
            Ir a Cuestionarios →
          </Link>
        </div>

        {qResultsLoading ? (
          <div className="text-text-secondary text-[14px]">Cargando cuestionarios...</div>
        ) : questionnaireResults.length === 0 ? (
          <div className="text-center py-10 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
            <p className="text-[15px] font-medium text-text-primary mb-1">Sin cuestionarios todavía</p>
            <p className="text-[13px] text-text-secondary max-w-[400px] mx-auto">
              Completá un cuestionario desde{' '}
              <Link href="/recursos/cuestionarios" className="text-accent hover:underline">
                Recursos
              </Link>{' '}
              y guardalo en este paciente.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {questionnaireResults.map(result => {
              const meta = QUESTIONNAIRE_NAMES[result.questionnaire_type] ?? { label: result.questionnaire_type, unit: '' }
              return (
                <div key={result.id} className="flex items-center justify-between bg-bg-primary border-[0.5px] border-border rounded-xl px-5 py-4 hover:bg-bg-secondary transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[14px] font-medium text-text-primary">{meta.label}</span>
                      <span className="text-[14px] text-text-secondary">
                        {formatScore(result)} <span className="text-[12px] opacity-70">{meta.unit}</span>
                      </span>
                      {result.interpretation && (
                        <span className="text-[12px] bg-bg-secondary border-[0.5px] border-border rounded-full px-2.5 py-0.5 text-text-secondary">
                          {result.interpretation}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-text-secondary mt-1">
                      {new Date(result.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteResult(result.id)}
                    className="text-text-secondary hover:text-warning text-[12px] opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0"
                  >
                    Eliminar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* RETORNO AL DEPORTE (RTS) */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[20px] font-medium">Retorno al Deporte — RTS</h2>
          <Link
            href={`/dashboard/pacientes/${patient.id}/rts`}
            className="text-accent text-[13px] font-medium hover:opacity-80 no-underline"
          >
            Nueva Evaluación RTS →
          </Link>
        </div>

        {rtsLoading ? (
          <div className="text-text-secondary text-[14px]">Cargando evaluaciones...</div>
        ) : rtsEvals.length === 0 ? (
          <div className="text-center py-10 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
            <p className="text-[15px] font-medium text-text-primary mb-1">Sin evaluaciones RTS todavía</p>
            <p className="text-[13px] text-text-secondary max-w-[420px] mx-auto">
              El protocolo RTS evalúa fuerza muscular, hop tests, saltos verticales y cuestionarios validados (ACL-RSI, KOOS-Sport) para determinar si el paciente está listo para retornar al deporte.
            </p>
            <Link
              href={`/dashboard/pacientes/${patient.id}/rts`}
              className="inline-block mt-4 text-accent text-[13px] font-medium hover:opacity-80 no-underline"
            >
              Iniciar primera evaluación →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rtsEvals.map(ev => {
              const { passed, total } = computeRtsCriteriaSummary(ev)
              const allPassed = total > 0 && passed === total
              return (
                <Link
                  key={ev.id}
                  href={`/dashboard/pacientes/${patient.id}/rts`}
                  className="flex items-center justify-between bg-bg-primary border-[0.5px] border-border rounded-xl px-5 py-4 hover:bg-bg-secondary transition-colors group no-underline"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[14px] font-medium text-text-primary">
                        {new Date(ev.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                      {total > 0 && (
                        <span className={`text-[12px] font-medium px-2.5 py-0.5 rounded-full border-[0.5px] ${allPassed ? 'text-[#4ade80] border-[#4ade8040] bg-[#4ade8010]' : 'text-[#fb923c] border-[#fb923c40] bg-[#fb923c10]'}`}>
                          {passed}/{total} criterios
                        </span>
                      )}
                      <span className="text-[12px] text-text-secondary capitalize">{ev.affected_side === 'left' ? 'Izquierdo' : ev.affected_side === 'right' ? 'Derecho' : ev.affected_side}</span>
                    </div>
                    {ev.surgery_date && (
                      <div className="text-[12px] text-text-secondary mt-1">
                        Cirugía: {new Date(ev.surgery_date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <span className="text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0">
                    Ver →
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* DINAMOMETRÍA */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[20px] font-medium">Dinamometría</h2>
          <Link
            href="/recursos/dinamometro"
            className="text-accent text-[13px] font-medium hover:opacity-80 no-underline"
          >
            Ir a Dinamómetro →
          </Link>
        </div>

        {dynamoLoading ? (
          <div className="text-text-secondary text-[14px]">Cargando evaluaciones...</div>
        ) : dynamoResults.length === 0 ? (
          <div className="text-center py-10 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
            <p className="text-[15px] font-medium text-text-primary mb-1">Sin evaluaciones todavía</p>
            <p className="text-[13px] text-text-secondary max-w-[400px] mx-auto">
              Realizá una evaluación desde{' '}
              <Link href="/recursos/dinamometro" className="text-accent hover:underline">
                Dinamómetro HHD
              </Link>{' '}
              y guardala en este paciente.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dynamoResults.map(d => {
              const muscles = Object.keys(d.muscle_results ?? {}).filter(k => {
                const v = d.muscle_results[k]
                return (v.right && parseFloat(v.right) > 0) || (v.left && parseFloat(v.left) > 0)
              })
              return (
                <div key={d.id} className="flex items-center justify-between bg-bg-primary border-[0.5px] border-border rounded-xl px-5 py-4 hover:bg-bg-secondary transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[14px] font-medium text-text-primary">
                        {new Date(d.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                      <span className="text-[12px] text-text-secondary">{muscles.length} grupos · {d.unit}</span>
                    </div>
                    {muscles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {muscles.map(k => (
                          <span key={k} className="text-[11px] bg-bg-secondary border-[0.5px] border-border rounded-full px-2 py-0.5 text-text-secondary">
                            {MUSCLE_LABELS[k] ?? k}
                          </span>
                        ))}
                      </div>
                    )}
                    {d.notes && (
                      <div className="text-[12px] text-text-secondary mt-1 truncate max-w-[400px]">{d.notes}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteDynamo(d.id)}
                    className="text-text-secondary hover:text-warning text-[12px] opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0"
                  >
                    Eliminar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MONITOREO DE CARGA */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[20px] font-medium">Monitoreo de Carga</h2>
          <Link
            href={`/dashboard/pacientes/${patient.id}/carga`}
            className="text-accent text-[13px] font-medium hover:opacity-80 no-underline"
          >
            Ver monitoreo →
          </Link>
        </div>
        <div className="text-center py-10 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
          <p className="text-[15px] font-medium text-text-primary mb-1">Seguimiento de carga semanal</p>
          <p className="text-[13px] text-text-secondary max-w-[420px] mx-auto">
            Registrá sesiones, calculá ACWR y monitoreá la evolución del dolor post-sesión.
          </p>
          <Link
            href={`/dashboard/pacientes/${patient.id}/carga`}
            className="inline-block mt-4 text-accent text-[13px] font-medium hover:opacity-80 no-underline"
          >
            Ir al módulo de carga →
          </Link>
        </div>
      </div>

      {/* PLANES ASOCIADOS */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[20px] font-medium">Planes de Ejercicio</h2>
          <Link
            href="/dashboard/ejercicios/plan"
            className="text-accent text-[13px] font-medium hover:opacity-80 no-underline"
          >
            Ir a Mis Planes →
          </Link>
        </div>

        {plansLoading ? (
          <div className="text-text-secondary text-[14px]">Cargando planes...</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-12 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
            <p className="text-[15px] font-medium text-text-primary mb-2">Sin planes asociados</p>
            <p className="text-[13px] text-text-secondary max-w-[400px] mx-auto">
              Abrí un plan desde Mis Planes y seleccioná a {patient.name} en el campo Paciente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => (
              <Link key={plan.id} href={`/dashboard/ejercicios/plan/${plan.id}`} className="block no-underline">
                <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-[16px] font-medium text-text-primary leading-[1.3] pr-4">{plan.name}</h3>
                    {plan.share_token && (
                      <span className="text-accent flex-shrink-0" title="Compartido">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-text-secondary space-y-1">
                    {plan.start_date && <p>Inicio: {new Date(plan.start_date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
                    <p>Modificado: {new Date(plan.updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t-[0.5px] border-border opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-accent text-[13px] font-medium">Editar →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
