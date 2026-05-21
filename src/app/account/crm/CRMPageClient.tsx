'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

const AnalyticsClient = dynamic(() => import('./AnalyticsClient'), { ssr: false })

export type CRMPatient = {
  id: string
  name: string
  age: number | null
  dni: string | null
  phone: string | null
  email: string | null
  professionalName: string | null
  lastTurnoDate: string | null
  active: boolean
}

export type RawTurno = {
  status: string
  appointment_type: string | null
  professional_name: string | null
  start_time: string
  end_time: string
  area: string | null
}

export type Analytics = {
  thisMonthLabel: string
  lastMonthLabel: string
  thisMonthKey: string
  lastMonthKey: string
  rawTurnos: RawTurno[]
  upcoming: number
  totalPatients: number
  activePatients: number
}

function exportCSV(patients: CRMPatient[]) {
  const headers = ['Nombre', 'Edad', 'DNI', 'Teléfono', 'Email', 'Profesional', 'Último turno', 'Estado']
  const rows = patients.map(p => [
    p.name,
    p.age ?? '',
    p.dni ?? '',
    p.phone ?? '',
    p.email ?? '',
    p.professionalName ?? '',
    p.lastTurnoDate ? new Date(p.lastTurnoDate).toLocaleDateString('es-AR') : '',
    p.active ? 'Activo' : 'Inactivo',
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pacientes-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function CRMPageClient({ patients, analytics }: { patients: CRMPatient[]; analytics: Analytics }) {
  const [tab, setTab] = useState<'pacientes' | 'analitica'>('pacientes')
  const [filterProf, setFilterProf] = useState('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')

  const professionals = useMemo(() => {
    const names = Array.from(new Set(patients.map(p => p.professionalName).filter((n): n is string => !!n)))
    return names as string[]
  }, [patients])

  const filtered = useMemo(() => {
    return patients.filter(p => {
      if (filterProf !== 'all' && p.professionalName !== filterProf) return false
      if (filterStatus === 'active' && !p.active) return false
      if (filterStatus === 'inactive' && p.active) return false
      if (search) {
        const q = search.toLowerCase()
        if (!p.name.toLowerCase().includes(q) &&
            !(p.dni ?? '').includes(q) &&
            !(p.phone ?? '').includes(q) &&
            !(p.email ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [patients, filterProf, filterStatus, search])

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b-[0.5px] border-border mb-8">
        <button
          onClick={() => setTab('pacientes')}
          className={`pb-3 pr-6 text-[14px] font-medium transition-colors border-b-[1.5px] -mb-[0.5px] ${tab === 'pacientes' ? 'border-text-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Pacientes
        </button>
        <button
          onClick={() => setTab('analitica')}
          className={`pb-3 px-6 text-[14px] font-medium transition-colors border-b-[1.5px] -mb-[0.5px] ${tab === 'analitica' ? 'border-text-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Analítica
        </button>
      </div>

      {tab === 'pacientes' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6 items-center justify-between">
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, DNI, teléfono…"
                className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent w-[260px]"
              />
              {professionals.length > 0 && (
                <select
                  value={filterProf}
                  onChange={e => setFilterProf(e.target.value)}
                  className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary focus:outline-none focus:border-accent"
                >
                  <option value="all">Todos los profesionales</option>
                  {professionals.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              )}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary focus:outline-none focus:border-accent"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-text-secondary">{filtered.length} paciente{filtered.length !== 1 ? 's' : ''}</span>
              <button
                onClick={() => exportCSV(filtered)}
                className="bg-bg-secondary border-[0.5px] border-border rounded-lg px-4 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors"
              >
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-[14px] text-text-secondary">No hay pacientes que coincidan con los filtros.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-[0.5px] border-border">
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em]">Nombre</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em]">Edad</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em]">DNI</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em]">Teléfono</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em]">Email</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em]">Profesional</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em]">Último turno</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-[0.05em]">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <tr key={p.id} className={`border-b-[0.5px] border-border last:border-b-0 ${i % 2 === 1 ? 'bg-bg-secondary/40' : ''}`}>
                        <td className="px-4 py-3 text-[13px] font-medium text-text-primary">{p.name}</td>
                        <td className="px-4 py-3 text-[13px] text-text-secondary">{p.age ?? '—'}</td>
                        <td className="px-4 py-3 text-[13px] text-text-secondary font-mono">{p.dni ?? '—'}</td>
                        <td className="px-4 py-3 text-[13px] text-text-secondary font-mono">{p.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-[13px] text-text-secondary">{p.email ?? '—'}</td>
                        <td className="px-4 py-3 text-[13px] text-text-secondary">{p.professionalName ?? '—'}</td>
                        <td className="px-4 py-3 text-[13px] text-text-secondary">
                          {p.lastTurnoDate ? new Date(p.lastTurnoDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${p.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-bg-secondary text-text-tertiary'}`}>
                            {p.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'analitica' && <AnalyticsClient analytics={analytics} />}
    </div>
  )
}
