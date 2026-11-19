'use client'

import { useState, useMemo } from 'react'

type Row = { id: string; accessedAt: string; professionalName: string; patientName: string }

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AuditoriaClient({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => r.professionalName.toLowerCase().includes(q) || r.patientName.toLowerCase().includes(q))
  }, [rows, query])

  if (rows.length === 0) {
    return (
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-8 text-center">
        <p className="text-[13px] text-text-secondary">Todavía no hay accesos registrados.</p>
      </div>
    )
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por profesional o paciente..."
        className="w-full bg-bg-secondary border-[0.5px] border-border rounded-lg px-4 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary mb-5 focus:outline-none focus:border-accent/50"
      />

      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b-[0.5px] border-border text-left text-text-tertiary text-[11px] uppercase tracking-[0.05em]">
              <th className="px-5 py-3 font-medium">Fecha</th>
              <th className="px-5 py-3 font-medium">Profesional</th>
              <th className="px-5 py-3 font-medium">Paciente</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b-[0.5px] border-border last:border-b-0">
                <td className="px-5 py-3 text-text-secondary whitespace-nowrap">{formatDateTime(r.accessedAt)}</td>
                <td className="px-5 py-3 text-text-primary">{r.professionalName}</td>
                <td className="px-5 py-3 text-text-primary">{r.patientName}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-[13px] text-text-secondary text-center py-8">Sin resultados para &ldquo;{query}&rdquo;.</p>
        )}
      </div>
    </div>
  )
}
