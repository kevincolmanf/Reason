'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useConfirm, useToast } from '@/components/Dialogs'
import { softDeleteRecord } from '@/lib/softDelete'
import { PROTOCOL_OPTIONS } from './protocols/shared'
import HamstringProtocol from './protocols/HamstringProtocol'
import AnkleProtocol from './protocols/AnkleProtocol'
import PfpProtocol from './protocols/PfpProtocol'
import TendinopathyProtocol from './protocols/TendinopathyProtocol'
import GroinProtocol from './protocols/GroinProtocol'
import ShoulderProtocol from './protocols/ShoulderProtocol'
import RtsEvaluationForm from './RtsEvaluationForm'
import { RtsEvaluation } from './rtsUtils'
import { LatestQuestionnaires } from './protocols/QuestionnaireAutofill'

interface SavedEval {
  id: string
  created_at: string
  evaluation_date?: string | null
  protocol_type: string
  affected_side: string
  notes: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form_data: Record<string, string> | null
  [key: string]: unknown
}

interface Props {
  patient: { id: string; name: string; age: number | null }
  userId: string
  lastDynamo: { muscle_results: Record<string, { right: string; left: string }>; unit: string; created_at: string } | null
  lastKoos: { score: number | null; result_data: unknown; created_at: string } | null
  lastAclRsi: { score: number | null; created_at: string } | null
  latestQuestionnaires: LatestQuestionnaires
  previousEvals: SavedEval[]
  initialEvalId?: string | null
  initialProtocol?: string | null
  initialDate?: string | null
}

function protocolLabel(type: string) {
  return PROTOCOL_OPTIONS.find(p => p.value === type)?.label ?? type
}

function sideLabel(side: string | null) {
  if (!side) return ''
  if (side === 'left') return 'Izquierdo'
  if (side === 'right') return 'Derecho'
  return side
}

// Fecha con la que se ubica la evaluación: la del día del calendario si existe,
// si no la de creación. La devolvemos como Date para ordenar y formatear.
function effectiveDate(ev: SavedEval): Date {
  // evaluation_date viene como 'YYYY-MM-DD' (date puro): lo interpretamos en hora
  // local para no mostrar un día menos en Argentina (UTC-3).
  if (ev.evaluation_date) return new Date(ev.evaluation_date + 'T00:00:00')
  return new Date(ev.created_at)
}

function formatEvalDate(ev: SavedEval) {
  return effectiveDate(ev).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Orden por fecha efectiva descendente (la evaluación más reciente arriba).
function byDateDesc(a: SavedEval, b: SavedEval) {
  return effectiveDate(b).getTime() - effectiveDate(a).getTime()
}

export default function RtsContainer({ patient, userId, lastDynamo, lastKoos, lastAclRsi, latestQuestionnaires, previousEvals, initialEvalId, initialProtocol, initialDate }: Props) {
  const [activeProtocol, setActiveProtocol] = useState<string>('')
  const [evalsList, setEvalsList] = useState<SavedEval[]>(previousEvals)
  const [loadedEval, setLoadedEval] = useState<SavedEval | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { confirm, confirmDialog } = useConfirm()
  const { notify, toast } = useToast()
  const supabase = useRef(createClient())

  // Abrir directo una evaluación cuando se llega desde el calendario (?eval=<id>).
  useEffect(() => {
    if (initialEvalId) {
      const ev = previousEvals.find(e => e.id === initialEvalId)
      if (ev) { setLoadedEval(ev); setActiveProtocol(ev.protocol_type); setShowHistory(false) }
    } else if (initialProtocol) {
      // Nueva evaluación desde el calendario: abrir el protocolo directamente.
      setActiveProtocol(initialProtocol)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEvalId, initialProtocol])

  // Al guardar traemos la fila completa: si solo agregáramos el id, la entrada
  // del historial quedaría sin form_data y al recargarla el formulario abría vacío.
  const handleSaved = async (id: string, protocol: string) => {
    // Si la evaluación se creó desde un día del calendario, le fijamos esa fecha.
    if (initialDate) {
      await supabase.current.from('rts_evaluations').update({ evaluation_date: initialDate }).eq('id', id)
    }
    const { data } = await supabase.current
      .from('rts_evaluations')
      .select('*')
      .eq('id', id)
      .single()
    const row: SavedEval = (data as SavedEval | null) ?? {
      id, created_at: new Date().toISOString(), protocol_type: protocol,
      affected_side: '', notes: null, form_data: null,
    }
    setEvalsList(prev => {
      const idx = prev.findIndex(e => e.id === id)
      if (idx === -1) return [row, ...prev]
      const next = [...prev]
      next[idx] = row
      return next
    })
  }

  const handleNewEval = () => {
    setActiveProtocol('')
    setLoadedEval(null)
  }

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Borrar evaluación RTS', message: 'La evaluación se moverá a la papelera. Podés restaurarla por 30 días.', danger: true, confirmLabel: 'Borrar' }))) return
    setDeletingId(id)
    const { error } = await softDeleteRecord(supabase.current, {
      table: 'rts_evaluations', id, userId, patientId: patient.id, patientName: patient.name,
    })
    setDeletingId(null)
    if (error) { notify('No se pudo borrar: ' + error, 'error'); return }
    setEvalsList(prev => prev.filter(e => e.id !== id))
    if (loadedEval?.id === id) { setLoadedEval(null); setActiveProtocol('') }
    notify('Evaluación movida a la papelera')
  }

  const loadEval = (ev: SavedEval) => {
    setLoadedEval(ev)
    setActiveProtocol(ev.protocol_type)
    setShowHistory(false)
  }

  // Protocol selector screen
  if (!activeProtocol) {
    return (
      <div>
        {confirmDialog}
        {toast}
        {/* Previous evaluations */}
        {evalsList.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setShowHistory(v => !v)}
              className="flex items-center gap-2 text-[14px] font-medium text-text-secondary hover:text-text-primary transition-colors mb-3"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
              Evaluaciones anteriores ({evalsList.length})
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showHistory ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            {showHistory && (
              <div className="border-[0.5px] border-border rounded-xl overflow-hidden mb-6">
                <div className="divide-y-[0.5px] divide-border">
                  {[...evalsList].sort(byDateDesc).map(ev => (
                    <div key={ev.id} className="flex items-center hover:bg-bg-secondary transition-colors">
                      <button
                        onClick={() => loadEval(ev)}
                        className="flex-1 text-left px-4 py-3 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="text-[13px] font-medium text-text-primary">{protocolLabel(ev.protocol_type)}</div>
                          <div className="text-[12px] text-text-secondary mt-0.5">{formatEvalDate(ev)}{ev.affected_side ? ` · ${sideLabel(ev.affected_side)}` : ''}</div>
                        </div>
                        <span className="text-[12px] text-accent shrink-0">Cargar →</span>
                      </button>
                      <button
                        onClick={() => handleDelete(ev.id)}
                        disabled={deletingId === ev.id}
                        className="px-3 py-3 text-text-secondary hover:text-warning transition-colors disabled:opacity-40 shrink-0"
                        title="Eliminar evaluación"
                      >
                        {deletingId === ev.id ? '...' : '×'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Protocol selector */}
        <div>
          <h2 className="text-[20px] font-medium mb-2">Nueva evaluación</h2>
          <p className="text-[14px] text-text-secondary mb-6">Seleccioná el protocolo de retorno al deporte para comenzar.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROTOCOL_OPTIONS.map(p => (
              <button
                key={p.value}
                onClick={() => { setActiveProtocol(p.value); setLoadedEval(null) }}
                className="text-left bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 hover:border-accent hover:bg-bg-primary transition-colors group"
              >
                <div className="text-[14px] font-medium text-text-primary group-hover:text-accent transition-colors">{p.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Protocol header (shown when a protocol is active)
  const ProtocolHeader = () => (
    <>
    {confirmDialog}
    {toast}
    <div className="flex items-center gap-3 mb-8">
      <button onClick={handleNewEval} className="text-[12px] text-text-secondary hover:text-text-primary transition-colors">← Protocolos</button>
      <span className="text-text-secondary/30">|</span>
      <span className="text-[13px] font-medium text-accent">{protocolLabel(activeProtocol)}</span>
      {evalsList.filter(e => e.protocol_type === activeProtocol).length > 0 && (
        <>
          <span className="text-text-secondary/30">|</span>
          <button onClick={() => { setShowHistory(v => !v) }} className="text-[12px] text-text-secondary hover:text-text-primary transition-colors">
            Historial ({evalsList.filter(e => e.protocol_type === activeProtocol).length})
          </button>
        </>
      )}
    </div>
    </>
  )

  // Protocol history (shown inline when requested)
  const ProtocolHistory = () => {
    const protocolEvals = evalsList.filter(e => e.protocol_type === activeProtocol).sort(byDateDesc)
    if (!showHistory || protocolEvals.length === 0) return null
    return (
      <div className="border-[0.5px] border-border rounded-xl overflow-hidden mb-8">
        <div className="divide-y-[0.5px] divide-border">
          {protocolEvals.map(ev => (
            <div key={ev.id} className="flex items-center hover:bg-bg-secondary transition-colors">
              <button onClick={() => loadEval(ev)} className="flex-1 text-left px-4 py-3 flex justify-between items-center gap-4">
                <div className="text-[13px] text-text-secondary">{formatEvalDate(ev)}{ev.affected_side ? ` · ${sideLabel(ev.affected_side)}` : ''}</div>
                <span className="text-[12px] text-accent shrink-0">Cargar →</span>
              </button>
              <button
                onClick={() => handleDelete(ev.id)}
                disabled={deletingId === ev.id}
                className="px-3 py-3 text-text-secondary hover:text-warning transition-colors disabled:opacity-40 shrink-0"
                title="Eliminar evaluación"
              >
                {deletingId === ev.id ? '...' : '×'}
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const commonProps = {
    patient,
    userId,
    initialData: loadedEval?.form_data ?? undefined,
    evalId: loadedEval?.id,
    onSaved: (id: string) => handleSaved(id, activeProtocol),
    onNewEval: handleNewEval,
  }

  if (activeProtocol === 'lca') {
    return (
      <div>
        <ProtocolHeader />
        <ProtocolHistory />
        <RtsEvaluationForm
          key={loadedEval?.id ?? 'nueva'}
          patient={patient}
          userId={userId}
          lastDynamo={lastDynamo}
          lastKoos={lastKoos}
          lastAclRsi={lastAclRsi}
          previousEvals={evalsList.filter(e => e.protocol_type === 'lca') as unknown as RtsEvaluation[]}
          initialEval={loadedEval?.protocol_type === 'lca' ? loadedEval as unknown as RtsEvaluation : undefined}
          onSaved={(id) => handleSaved(id, 'lca')}
          onNewEval={handleNewEval}
        />
      </div>
    )
  }

  // key = id de la evaluación cargada: fuerza el remonte del formulario al pasar
  // de una evaluación guardada a otra dentro del mismo protocolo (initialData solo
  // se lee al montar).
  const formKey = loadedEval?.id ?? 'nueva'

  if (activeProtocol === 'hamstring') return <div><ProtocolHeader /><ProtocolHistory /><HamstringProtocol key={formKey} {...commonProps} latestQuestionnaires={latestQuestionnaires} /></div>
  if (activeProtocol === 'ankle') return <div><ProtocolHeader /><ProtocolHistory /><AnkleProtocol key={formKey} {...commonProps} latestQuestionnaires={latestQuestionnaires} /></div>
  if (activeProtocol === 'pfp') return <div><ProtocolHeader /><ProtocolHistory /><PfpProtocol key={formKey} {...commonProps} latestQuestionnaires={latestQuestionnaires} /></div>
  if (activeProtocol === 'tendinopathy') return <div><ProtocolHeader /><ProtocolHistory /><TendinopathyProtocol key={formKey} {...commonProps} latestQuestionnaires={latestQuestionnaires} /></div>
  if (activeProtocol === 'groin') return <div><ProtocolHeader /><ProtocolHistory /><GroinProtocol key={formKey} {...commonProps} latestQuestionnaires={latestQuestionnaires} /></div>
  if (activeProtocol === 'shoulder') return <div><ProtocolHeader /><ProtocolHistory /><ShoulderProtocol key={formKey} {...commonProps} latestQuestionnaires={latestQuestionnaires} /></div>

  return null
}
