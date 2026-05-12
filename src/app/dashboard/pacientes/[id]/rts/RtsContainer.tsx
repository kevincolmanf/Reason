'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { PROTOCOL_OPTIONS, formatDate } from './protocols/shared'
import HamstringProtocol from './protocols/HamstringProtocol'
import AnkleProtocol from './protocols/AnkleProtocol'
import PfpProtocol from './protocols/PfpProtocol'
import TendinopathyProtocol from './protocols/TendinopathyProtocol'
import GroinProtocol from './protocols/GroinProtocol'
import ShoulderProtocol from './protocols/ShoulderProtocol'
import RtsEvaluationForm from './RtsEvaluationForm'
import { RtsEvaluation } from './rtsUtils'

interface SavedEval {
  id: string
  created_at: string
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
  previousEvals: SavedEval[]
}

function protocolLabel(type: string) {
  return PROTOCOL_OPTIONS.find(p => p.value === type)?.label ?? type
}

export default function RtsContainer({ patient, userId, lastDynamo, lastKoos, lastAclRsi, previousEvals }: Props) {
  const [activeProtocol, setActiveProtocol] = useState<string>('')
  const [evalsList, setEvalsList] = useState<SavedEval[]>(previousEvals)
  const [loadedEval, setLoadedEval] = useState<SavedEval | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = useRef(createClient())

  const handleSaved = (id: string, protocol: string) => {
    setEvalsList(prev => {
      if (prev.find(e => e.id === id)) return prev
      return [{ id, created_at: new Date().toISOString(), protocol_type: protocol, affected_side: '', notes: null, form_data: null }, ...prev]
    })
  }

  const handleNewEval = () => {
    setActiveProtocol('')
    setLoadedEval(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta evaluación? Esta acción no se puede deshacer.')) return
    setDeletingId(id)
    await supabase.current.from('rts_evaluations').delete().eq('id', id)
    setEvalsList(prev => prev.filter(e => e.id !== id))
    if (loadedEval?.id === id) { setLoadedEval(null); setActiveProtocol('') }
    setDeletingId(null)
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
                  {evalsList.map(ev => (
                    <div key={ev.id} className="flex items-center hover:bg-bg-secondary transition-colors">
                      <button
                        onClick={() => loadEval(ev)}
                        className="flex-1 text-left px-4 py-3 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="text-[13px] font-medium text-text-primary">{protocolLabel(ev.protocol_type)}</div>
                          <div className="text-[12px] text-text-secondary mt-0.5">{formatDate(ev.created_at)}{ev.affected_side ? ` · ${ev.affected_side === 'left' ? 'Izquierdo' : ev.affected_side === 'right' ? 'Derecho' : ev.affected_side}` : ''}</div>
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
  )

  // Protocol history (shown inline when requested)
  const ProtocolHistory = () => {
    const protocolEvals = evalsList.filter(e => e.protocol_type === activeProtocol)
    if (!showHistory || protocolEvals.length === 0) return null
    return (
      <div className="border-[0.5px] border-border rounded-xl overflow-hidden mb-8">
        <div className="divide-y-[0.5px] divide-border">
          {protocolEvals.map(ev => (
            <div key={ev.id} className="flex items-center hover:bg-bg-secondary transition-colors">
              <button onClick={() => loadEval(ev)} className="flex-1 text-left px-4 py-3 flex justify-between items-center">
                <div className="text-[13px] text-text-secondary">{formatDate(ev.created_at)}</div>
                <span className="text-[12px] text-accent">Cargar →</span>
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

  if (activeProtocol === 'hamstring') return <div><ProtocolHeader /><ProtocolHistory /><HamstringProtocol {...commonProps} /></div>
  if (activeProtocol === 'ankle') return <div><ProtocolHeader /><ProtocolHistory /><AnkleProtocol {...commonProps} /></div>
  if (activeProtocol === 'pfp') return <div><ProtocolHeader /><ProtocolHistory /><PfpProtocol {...commonProps} /></div>
  if (activeProtocol === 'tendinopathy') return <div><ProtocolHeader /><ProtocolHistory /><TendinopathyProtocol {...commonProps} /></div>
  if (activeProtocol === 'groin') return <div><ProtocolHeader /><ProtocolHistory /><GroinProtocol {...commonProps} /></div>
  if (activeProtocol === 'shoulder') return <div><ProtocolHeader /><ProtocolHistory /><ShoulderProtocol {...commonProps} /></div>

  return null
}
