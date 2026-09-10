'use client'

import { useState } from 'react'
import Link from 'next/link'

// Vista de bloque del Modo Kinesiología: los pacientes de kine con turno en el
// mismo horario, juntos, cada uno con un check rápido de síntoma para registrar
// la atención en 1–2 toques. El detalle (sesión, continuidad) se abre en la ficha.

export interface BloquePaciente {
  patientId: string
  name: string
  area: string | null
  status: string
  professionalName: string | null
  attended: boolean
}
export interface Bloque {
  time: string
  pacientes: BloquePaciente[]
}

type Symptom = 'peor' | 'igual' | 'mejor'
const SYM: { id: Symptom; label: string; color: string; soft: string }[] = [
  { id: 'peor', label: 'Peor', color: '#f87171', soft: 'rgba(248,113,113,0.12)' },
  { id: 'igual', label: 'Igual', color: '#fbbf24', soft: 'rgba(251,191,36,0.12)' },
  { id: 'mejor', label: 'Mejor', color: '#4ade80', soft: 'rgba(74,222,128,0.12)' },
]

function PacienteCard({ p }: { p: BloquePaciente }) {
  const [symptom, setSymptom] = useState<Symptom | null>(null)
  const [saving, setSaving] = useState(false)
  const [attended, setAttended] = useState(p.attended)
  const [error, setError] = useState(false)

  const register = async () => {
    if (!symptom) return
    setSaving(true); setError(false)
    try {
      const res = await fetch('/api/pacientes/atencion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: p.patientId, symptom, manageSymptoms: false, modalities: [], note: '' }),
      })
      if (!res.ok) throw new Error()
      setAttended(true)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-bg-primary border-[0.5px] border-border rounded-lg p-3.5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <Link href={`/dashboard/pacientes/${p.patientId}`} className="text-[14px] font-medium text-text-primary no-underline hover:underline">
            {p.name}
          </Link>
          <div className="text-[11.5px] text-text-secondary mt-0.5 truncate">
            {p.area || 'Kinesiología'}{p.professionalName ? ` · ${p.professionalName}` : ''}
          </div>
        </div>
        {attended
          ? <span className="shrink-0 text-[11px] font-medium text-[#4ade80] bg-[#4ade80]/10 border-[0.5px] border-[#4ade80]/30 rounded-full px-2.5 py-1">✓ Atendido</span>
          : <span className="shrink-0 text-[11px] text-text-secondary bg-bg-secondary border-[0.5px] border-border rounded-full px-2.5 py-1">Pendiente</span>}
      </div>

      {!attended && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-2.5">
            {SYM.map(s => {
              const on = symptom === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setSymptom(s.id)}
                  className="rounded-lg py-2 text-[12.5px] font-medium border-[0.5px] transition-colors"
                  style={on
                    ? { borderColor: s.color, background: s.soft, color: s.color }
                    : { borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={register}
              disabled={!symptom || saving}
              className="bg-accent text-bg-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {saving ? 'Registrando…' : 'Registrar'}
            </button>
            <Link href={`/dashboard/pacientes/${p.patientId}`} className="text-[12px] text-text-secondary hover:text-text-primary no-underline">
              Abrir ficha para ajustar el plan →
            </Link>
            {error && <span className="text-[11.5px] text-warning">No se pudo — reintentá</span>}
          </div>
        </>
      )}

      {attended && (
        <Link href={`/dashboard/pacientes/${p.patientId}`} className="text-[12px] text-accent no-underline hover:underline">
          Abrir ficha →
        </Link>
      )}
    </div>
  )
}

export default function BloqueAtencion({ bloques }: { bloques: Bloque[] }) {
  const total = bloques.reduce((n, b) => n + b.pacientes.length, 0)

  if (total === 0) {
    return (
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-8 text-center">
        <p className="text-[14px] text-text-primary font-medium mb-1">No hay pacientes de kinesiología con turno este día</p>
        <p className="text-[13px] text-text-secondary">Aparecen acá los pacientes en modo kine que tengan turno. Prendé el modo kine desde la ficha del paciente.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {bloques.map(b => (
        <section key={b.time}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[15px] font-medium tabular-nums">{b.time}</span>
            <span className="text-[12px] text-text-secondary">· {b.pacientes.length} {b.pacientes.length === 1 ? 'paciente' : 'en simultáneo'}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {b.pacientes.map(p => <PacienteCard key={p.patientId} p={p} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
