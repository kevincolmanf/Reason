'use client'

import { useEffect, useState } from 'react'

interface Sub {
  userId: string
  email: string
  currentRole: string
  correctRole: string
  plan: string
  status: string
}

interface Result {
  dryRun: boolean
  fixes: Sub[]
  error?: string
}

const ROLE_LABEL: Record<string, string> = {
  free: 'Free',
  subscriber: 'Suscriptor',
  pro: 'Pro',
  admin: 'Admin',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  cancelled: 'Cancelada',
  expired: 'Expirada',
  pending: 'Pendiente',
}

const PLAN_LABEL: Record<string, string> = {
  monthly: 'Mensual',
  annual: 'Anual',
  pro_monthly: 'Pro Mensual',
  pro_annual: 'Pro Anual',
}

export default function SuscripcionesPage() {
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [done, setDone] = useState(false)

  async function audit() {
    setLoading(true)
    setDone(false)
    const res = await fetch('/api/admin/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dryRun: true }) })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  async function fix() {
    setFixing(true)
    const res = await fetch('/api/admin/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dryRun: false }) })
    const data = await res.json()
    setResult(data)
    setFixing(false)
    setDone(true)
  }

  useEffect(() => { audit() }, [])

  return (
    <div className="p-8 max-w-[960px]">
      <div className="mb-8">
        <h1 className="text-[28px] font-medium tracking-[-0.02em] mb-1">Suscripciones</h1>
        <p className="text-[14px] text-text-secondary">Usuarios con desincronización entre su suscripción en la DB y su rol asignado.</p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={audit}
          disabled={loading || fixing}
          className="px-4 py-2 bg-bg-primary border-[0.5px] border-border rounded-lg text-[13px] font-medium hover:border-text-secondary transition-colors disabled:opacity-40"
        >
          {loading ? 'Revisando...' : 'Revisar ahora'}
        </button>

        {result && result.fixes && result.fixes.length > 0 && !done && (
          <button
            onClick={fix}
            disabled={fixing}
            className="px-4 py-2 bg-accent text-bg-primary rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {fixing ? 'Corrigiendo...' : `Corregir ${result.fixes.length} usuario${result.fixes.length !== 1 ? 's' : ''}`}
          </button>
        )}

        {done && (
          <span className="text-[13px] text-green-500 font-medium">✓ Roles corregidos</span>
        )}
      </div>

      {result && result.error && (
        <div className="bg-bg-primary border-[0.5px] border-red-500/30 rounded-xl p-6 text-[13px] text-red-400">
          Error: {result.error}
        </div>
      )}

      {result && !result.error && (
        !result.fixes || result.fixes.length === 0 ? (
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 text-center">
            <p className="text-[15px] font-medium text-text-primary mb-1">Todo está sincronizado</p>
            <p className="text-[13px] text-text-secondary">No se encontraron desincronizaciones entre suscripciones y roles.</p>
          </div>
        ) : (
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b-[0.5px] border-border bg-bg-secondary">
              <span className="text-[12px] uppercase tracking-[0.05em] text-text-secondary">
                {result.fixes.length} desincronización{result.fixes.length !== 1 ? 'es' : ''} encontrada{result.fixes.length !== 1 ? 's' : ''}
              </span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b-[0.5px] border-border">
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium">Email</th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium">Plan</th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium">Estado suscripción</th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium">Rol actual</th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium">Rol correcto</th>
                </tr>
              </thead>
              <tbody className="divide-y-[0.5px] divide-border">
                {result.fixes.map(f => (
                  <tr key={f.userId}>
                    <td className="px-5 py-3 text-[13px] text-text-primary">{f.email}</td>
                    <td className="px-5 py-3 text-[13px] text-text-secondary">{PLAN_LABEL[f.plan] ?? f.plan}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${f.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-text-secondary/10 text-text-secondary'}`}>
                        {STATUS_LABEL[f.status] ?? f.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                        {ROLE_LABEL[f.currentRole] ?? f.currentRole}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                        {ROLE_LABEL[f.correctRole] ?? f.correctRole}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
