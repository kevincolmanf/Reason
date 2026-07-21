'use client'

import { useState } from 'react'

interface Props {
  token: string
  patientName: string
  startTime: string
  endTime: string
  area: string
  orgName: string | null
  initialStatus: string
}

function formatFecha(iso: string): string {
  const d = new Date(iso)
  const s = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export default function ConfirmTurnoClient({
  token,
  patientName,
  startTime,
  endTime,
  area,
  orgName,
  initialStatus,
}: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState<'confirmar' | 'cancelar' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const alreadyAttended = status === 'presente' || status === 'ausente'

  async function submit(action: 'confirmar' | 'cancelar') {
    setLoading(action)
    setError(null)
    try {
      const res = await fetch(`/api/turno/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Ocurrió un error. Intentá de nuevo.')
        return
      }
      setStatus(data.status)
    } catch {
      setError('No pudimos conectar. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  const firstName = patientName.split(' ')[0]

  return (
    <div>
      <h1 className="text-[22px] font-medium tracking-[-0.01em] text-text-primary">
        Hola {firstName} 👋
      </h1>
      <p className="text-[14px] text-text-secondary mt-1">
        {orgName ? `Este es tu turno en ${orgName}.` : 'Este es tu turno.'}
      </p>

      {/* Detalle del turno */}
      <div className="mt-6 rounded-2xl border-[0.5px] border-border bg-bg-secondary/40 p-5">
        <dl className="space-y-3">
          <div className="flex justify-between gap-4">
            <dt className="text-[13px] text-text-tertiary">Fecha</dt>
            <dd className="text-[14px] text-text-primary text-right capitalize">{formatFecha(startTime)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[13px] text-text-tertiary">Hora</dt>
            <dd className="text-[14px] text-text-primary text-right">{formatHora(startTime)} – {formatHora(endTime)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[13px] text-text-tertiary">Área</dt>
            <dd className="text-[14px] text-text-primary text-right">{area}</dd>
          </div>
        </dl>
      </div>

      {/* Estado / acciones */}
      <div className="mt-6">
        {status === 'confirmado' ? (
          <div className="rounded-2xl border-[0.5px] border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
            <p className="text-[15px] font-medium text-emerald-300">✓ Confirmaste que vas a asistir</p>
            <p className="text-[13px] text-text-secondary mt-1">¡Te esperamos! Nos vemos pronto.</p>
            {!alreadyAttended && (
              <button
                onClick={() => submit('cancelar')}
                disabled={loading !== null}
                className="mt-4 text-[13px] text-text-tertiary underline underline-offset-2 hover:text-text-secondary disabled:opacity-50"
              >
                {loading === 'cancelar' ? 'Guardando…' : 'En realidad no voy a asistir'}
              </button>
            )}
          </div>
        ) : status === 'cancelado' ? (
          <div className="rounded-2xl border-[0.5px] border-red-500/40 bg-red-500/10 p-5 text-center">
            <p className="text-[15px] font-medium text-red-300">Avisaste que no vas a asistir</p>
            <p className="text-[13px] text-text-secondary mt-1">Gracias por avisar con tiempo.</p>
            {!alreadyAttended && (
              <button
                onClick={() => submit('confirmar')}
                disabled={loading !== null}
                className="mt-4 text-[13px] text-text-tertiary underline underline-offset-2 hover:text-text-secondary disabled:opacity-50"
              >
                {loading === 'confirmar' ? 'Guardando…' : 'En realidad sí voy a asistir'}
              </button>
            )}
          </div>
        ) : alreadyAttended ? (
          <div className="rounded-2xl border-[0.5px] border-border bg-bg-secondary/40 p-5 text-center">
            <p className="text-[14px] text-text-secondary">Este turno ya no se puede modificar desde acá.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => submit('confirmar')}
              disabled={loading !== null}
              className="w-full rounded-xl bg-accent text-white text-[15px] font-medium py-3.5 transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading === 'confirmar' ? 'Guardando…' : 'Asistiré'}
            </button>
            <button
              onClick={() => submit('cancelar')}
              disabled={loading !== null}
              className="w-full rounded-xl border-[0.5px] border-border bg-transparent text-text-secondary text-[15px] py-3.5 transition-colors hover:bg-bg-secondary/60 disabled:opacity-50"
            >
              {loading === 'cancelar' ? 'Guardando…' : 'No asistiré'}
            </button>
          </div>
        )}

        {error && <p className="text-[13px] text-red-400 mt-3 text-center">{error}</p>}
      </div>

      <p className="text-[12px] text-text-tertiary mt-8 text-center">
        Si necesitás reprogramar, respondé el mensaje de WhatsApp y te ayudamos.
      </p>
    </div>
  )
}
