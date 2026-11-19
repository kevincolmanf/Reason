'use client'

import { useState } from 'react'
import { previewAddOverageBlock, addOverageBlock, removeOverageBlock } from './overageActions'

const RISK_TEXT = 'El precio en pesos de este recargo queda fijo al tipo de cambio de hoy y no se reajusta solo (igual que el resto de tu suscripción). Es un cargo recurrente que se suma a tu factura mensual hasta que lo saques. No hay reembolso parcial si después borrás pacientes.'

function formatArs(n: number): string {
  return `$${n.toLocaleString('es-AR')}`
}

type AddPreview = { blockArs: number; currentAmount: number; newAmount: number; blockSize: number }

export default function OveragePanel({ activeBlocksCount }: { activeBlocksCount: number }) {
  const [blocks, setBlocks] = useState(activeBlocksCount)
  const [preview, setPreview] = useState<AddPreview | null>(null)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<number | null>(null)
  const [justRemoved, setJustRemoved] = useState<number | null>(null)

  const limitTotal = 20 + blocks * 10

  const startAdd = async () => {
    setLoading(true); setError(null); setJustAdded(null)
    try {
      const p = await previewAddOverageBlock()
      setPreview(p)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo calcular el recargo.')
    } finally {
      setLoading(false)
    }
  }

  const confirmAdd = async () => {
    if (!preview) return
    setLoading(true); setError(null)
    try {
      const result = await addOverageBlock()
      setBlocks(b => b + 1)
      setJustAdded(result.blockArs)
      setPreview(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo aplicar el recargo.')
    } finally {
      setLoading(false)
    }
  }

  const confirmRemove = async () => {
    setLoading(true); setError(null); setJustRemoved(null)
    try {
      const result = await removeOverageBlock()
      setBlocks(b => Math.max(0, b - 1))
      setJustRemoved(result.removedArs)
      setConfirmingRemove(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo sacar el bloque.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-bg-secondary rounded-xl border-[0.5px] border-border overflow-hidden mb-8">
      <div className="p-8">
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-[16px] font-medium">Pacientes extra</h2>
          <span className="text-[13px] text-text-secondary">Límite actual: {limitTotal} pacientes</span>
        </div>
        <p className="text-[13px] text-text-secondary mb-5">
          {blocks > 0
            ? `Tenés ${blocks} bloque${blocks > 1 ? 's' : ''} de 10 pacientes extra activo${blocks > 1 ? 's' : ''}.`
            : 'Si necesitás más de 20 pacientes, podés sumar bloques de 10 por un recargo en tu suscripción.'}
        </p>

        {error && <p className="text-[13px] text-warning mb-4">{error}</p>}
        {justAdded != null && <p className="text-[13px] text-[#4ade80] mb-4">✓ Sumaste un bloque (+{formatArs(justAdded)}/mes).</p>}
        {justRemoved != null && <p className="text-[13px] text-[#4ade80] mb-4">✓ Sacaste el último bloque (-{formatArs(justRemoved)}/mes desde tu próximo cobro).</p>}

        {preview ? (
          <div className="bg-bg-primary border-[0.5px] border-accent/30 rounded-lg p-5 mb-2">
            <p className="text-[14px] text-text-primary mb-1">
              Vas a sumar <strong>10 pacientes</strong> por <strong>+{formatArs(preview.blockArs)}/mes</strong>.
            </p>
            <p className="text-[13px] text-text-secondary mb-4">
              Tu nuevo total mensual sería {formatArs(preview.newAmount)} (hoy: {formatArs(preview.currentAmount)}).
            </p>
            <p className="text-[12.5px] text-text-secondary mb-5">{RISK_TEXT}</p>
            <div className="flex gap-3">
              <button onClick={confirmAdd} disabled={loading} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition-all">
                {loading ? 'Aplicando…' : 'Confirmar recargo'}
              </button>
              <button onClick={() => setPreview(null)} disabled={loading} className="text-text-secondary px-4 py-2 text-[13px] hover:text-text-primary">Cancelar</button>
            </div>
          </div>
        ) : confirmingRemove ? (
          <div className="bg-bg-primary border-[0.5px] border-border rounded-lg p-5 mb-2">
            <p className="text-[14px] text-text-primary mb-4">¿Sacar el último bloque de 10 pacientes? El cobro más bajo rige desde tu próximo ciclo, no hay reembolso del actual.</p>
            <div className="flex gap-3">
              <button onClick={confirmRemove} disabled={loading} className="bg-red-600 text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                {loading ? 'Sacando…' : 'Sí, sacar bloque'}
              </button>
              <button onClick={() => setConfirmingRemove(false)} disabled={loading} className="text-text-secondary px-4 py-2 text-[13px] hover:text-text-primary">Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={startAdd} disabled={loading} className="bg-bg-primary border-[0.5px] border-border rounded-lg px-4 py-2 text-[13px] font-medium text-text-primary hover:border-accent/50 transition-colors disabled:opacity-50">
              {loading ? 'Calculando…' : 'Sumar 10 pacientes más'}
            </button>
            {blocks > 0 && (
              <button onClick={() => setConfirmingRemove(true)} className="text-[13px] text-text-secondary hover:text-warning transition-colors">
                Quitar el último bloque
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
