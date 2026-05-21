'use client'

import { useEffect, useState, useRef } from 'react'

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

interface FixResult {
  ok: boolean
  source?: string
  email?: string
  role?: string
  plan?: string
  status?: string
  expires_at?: string
  mp_subscription_id?: string
  warning?: string
  error?: string
}

export default function SuscripcionesPage() {
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [done, setDone] = useState(false)

  // Fix individual user
  const [fixEmail, setFixEmail] = useState('')
  const [fixLoading, setFixLoading] = useState(false)
  const [fixResult, setFixResult] = useState<FixResult | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

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

  async function fixUser() {
    if (!fixEmail.trim()) return
    setFixLoading(true)
    setFixResult(null)
    const res = await fetch('/api/admin/fix-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fixEmail.trim() }),
    })
    const data = await res.json()
    setFixResult(data)
    setFixLoading(false)
    // Re-audit after fix
    if (data.ok) audit()
  }

  useEffect(() => { audit() }, [])

  return (
    <div className="p-8 max-w-[960px]">
      <div className="mb-8">
        <h1 className="text-[28px] font-medium tracking-[-0.02em] mb-1">Suscripciones</h1>
        <p className="text-[14px] text-text-secondary">Auditoría y corrección de roles de suscripción.</p>
      </div>

      {/* ── CORREGIR USUARIO INDIVIDUAL ── */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5 mb-8">
        <p className="text-[13px] font-medium text-text-primary mb-1">Corregir usuario por email</p>
        <p className="text-[12px] text-text-secondary mb-4">Consulta Mercado Pago en tiempo real y sincroniza el rol y la fecha de vencimiento exacta del pago.</p>
        <div className="flex gap-2">
          <input
            ref={emailRef}
            type="email"
            value={fixEmail}
            onChange={e => setFixEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fixUser()}
            placeholder="email@ejemplo.com"
            className="flex-1 bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent"
          />
          <button
            onClick={fixUser}
            disabled={fixLoading || !fixEmail.trim()}
            className="px-4 py-2 bg-accent text-bg-primary rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {fixLoading ? 'Buscando...' : 'Sincronizar'}
          </button>
        </div>

        {fixResult && (
          <div className={`mt-4 rounded-lg p-4 text-[13px] ${fixResult.ok ? 'bg-green-500/10 border-[0.5px] border-green-500/30' : 'bg-red-500/10 border-[0.5px] border-red-500/30'}`}>
            {fixResult.ok ? (
              <div className="space-y-1">
                <p className="font-medium text-green-500">✓ Sincronizado correctamente</p>
                <p className="text-text-secondary"><span className="text-text-primary">Email:</span> {fixResult.email}</p>
                <p className="text-text-secondary"><span className="text-text-primary">Rol asignado:</span> {ROLE_LABEL[fixResult.role!] ?? fixResult.role}</p>
                <p className="text-text-secondary"><span className="text-text-primary">Plan:</span> {PLAN_LABEL[fixResult.plan!] ?? fixResult.plan}</p>
                <p className="text-text-secondary"><span className="text-text-primary">Estado en MP:</span> {STATUS_LABEL[fixResult.status!] ?? fixResult.status}</p>
                <p className="text-text-secondary"><span className="text-text-primary">Próximo cobro:</span> {fixResult.expires_at ? new Date(fixResult.expires_at).toLocaleDateString('es-AR') : '—'}</p>
                {fixResult.source === 'db_only' && <p className="text-yellow-500 text-[12px] mt-1">⚠ {fixResult.warning}</p>}
              </div>
            ) : (
              <p className="text-red-400">{fixResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* ── RECONCILIACIÓN MASIVA ── */}
      <p className="text-[13px] font-medium text-text-primary mb-3">Desincronizaciones detectadas</p>
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
