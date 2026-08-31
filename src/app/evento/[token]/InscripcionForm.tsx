'use client'

import { useState } from 'react'
import Link from 'next/link'

function fmtLong(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function InscripcionForm({ token, eventTitle, startsAt, paymentInstructions = null }: { token: string; eventTitle: string; startsAt: string; paymentInstructions?: string | null }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!name.trim() || !email.trim()) { setError('Completá tu nombre y email.'); return }
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/eventos/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'No se pudo completar la inscripción.'); setSubmitting(false); return }
      setDone(true)
    } catch {
      setError('No se pudo completar la inscripción. Probá de nuevo.')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-6 text-center">
        <div className="text-[32px] mb-2">✅</div>
        <h2 className="text-[19px] font-medium mb-2">¡Quedaste inscripto!</h2>
        <p className="text-[15px] text-text-secondary leading-[1.6]">
          Gracias por inscribirte a <strong className="text-text-primary">{eventTitle}</strong>, que se realizará el <span className="capitalize">{fmtLong(startsAt)}</span>. Te esperamos.
        </p>
        {paymentInstructions && (
          <div className="mt-4 text-left bg-bg-primary border-[0.5px] border-border rounded-lg p-3">
            <div className="text-[13px] font-medium mb-1">Para confirmar tu lugar, pagá:</div>
            <p className="text-[13px] text-text-secondary leading-[1.55] whitespace-pre-line">{paymentInstructions}</p>
          </div>
        )}
        <p className="text-[13px] text-text-tertiary leading-[1.6] mt-4 border-t-[0.5px] border-border pt-4">
          Te creamos una cuenta gratuita en Reason con <strong className="text-text-secondary">{email}</strong> — la plataforma clínica para kinesiólogos. Entrá cuando quieras desde{' '}
          <Link href="/login" className="text-accent no-underline">iniciar sesión</Link> (te llega un código por mail).
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-[17px] font-medium mb-1">Inscribite</h2>
      <p className="text-[13px] text-text-secondary mb-4">Con tu inscripción quedás con una cuenta gratuita en Reason.</p>
      <div className="flex flex-col gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre y apellido" autoComplete="name"
          className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-3 text-[15px] focus:outline-none focus:border-accent" />
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="tu@email.com" autoComplete="email"
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-3 text-[15px] focus:outline-none focus:border-accent" />
        {error && <p className="text-[13px] text-red-400">{error}</p>}
        <button onClick={submit} disabled={submitting}
          className="w-full bg-accent text-bg-primary py-3 rounded-lg text-[15px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
          {submitting ? 'Inscribiendo…' : 'Inscribirme'}
        </button>
        <p className="text-[11px] text-text-tertiary text-center">Al inscribirte aceptás que creemos tu cuenta en Reason con estos datos.</p>
      </div>
    </div>
  )
}
