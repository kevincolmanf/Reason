'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

interface Patient {
  id: string
  name: string
  dni: string | null
  age: number | null
  occupation: string | null
  created_at: string
  user_id: string
  plan_count?: number
}

interface Props {
  userId: string
  isActiveUser: boolean
  isPro: boolean
  orgId?: string | null
  orgName?: string | null
  autoOpen?: boolean
}

export default function PacientesClient({ userId, isActiveUser, isPro, orgId, orgName, autoOpen = false }: Props) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(autoOpen)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ name: '', dni: '', age: '', occupation: '' })
  const [dniError, setDniError] = useState<string | null>(null)

  const supabaseRef = useRef(createClient())

  const isOrgContext = !!orgId
  const atFreeLimit = !isActiveUser && patients.length >= 1
  const atSubscriberLimit = isActiveUser && !isPro && !isOrgContext && patients.length >= 20

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    const sb = supabaseRef.current

    const query = isOrgContext
      ? sb.from('patients').select('id, name, dni, age, occupation, created_at, user_id').eq('org_id', orgId).order('created_at', { ascending: true })
      : sb.from('patients').select('id, name, dni, age, occupation, created_at, user_id').eq('user_id', userId).is('org_id', null).order('created_at', { ascending: true })

    const { data } = await query
    const rows = (data ?? []) as Patient[]

    const withCounts = await Promise.all(
      rows.map(async (p) => {
        const { count } = await sb.from('exercise_plans').select('id', { count: 'exact', head: true }).eq('patient_id', p.id)
        return { ...p, plan_count: count ?? 0 }
      })
    )

    setPatients(withCounts)
    setLoading(false)
  }, [userId, orgId, isOrgContext])

  useEffect(() => { fetchPatients() }, [fetchPatients])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.dni.trim()) return
    setDniError(null)
    setSaving(true)

    // Check for duplicate DNI within same context
    let dupQuery = supabaseRef.current
      .from('patients')
      .select('id')
      .eq('dni', form.dni.trim())
    if (isOrgContext) dupQuery = dupQuery.eq('org_id', orgId!)
    else             dupQuery = dupQuery.eq('user_id', userId).is('org_id', null)
    const { data: existing } = await dupQuery.maybeSingle()
    if (existing) {
      setDniError('Ya existe un paciente registrado con ese DNI.')
      setSaving(false)
      return
    }

    const { error } = await supabaseRef.current.from('patients').insert({
      user_id: userId,
      org_id: isOrgContext ? orgId : null,
      name: form.name.trim(),
      dni: form.dni.trim(),
      age: form.age ? parseInt(form.age) : null,
      occupation: form.occupation.trim() || null,
    })
    if (!error) {
      setForm({ name: '', dni: '', age: '', occupation: '' })
      setShowForm(false)
      await fetchPatients()
    }
    setSaving(false)
  }

  const handleDelete = async (patientId: string) => {
    setDeleting(true)
    await supabaseRef.current.from('patients').delete().eq('id', patientId)
    setDeleteConfirm(null)
    setDeleting(false)
    await fetchPatients()
  }

  const closeForm = () => { setShowForm(false); setForm({ name: '', dni: '', age: '', occupation: '' }); setDniError(null) }

  const filtered = search.trim()
    ? patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.occupation?.toLowerCase().includes(search.toLowerCase()) ||
        p.dni?.includes(search.trim())
      )
    : patients

  if (loading) return <div className="text-text-secondary text-[14px]">Cargando pacientes...</div>

  const patientToDelete = deleteConfirm ? patients.find(p => p.id === deleteConfirm) : null

  return (
    <div>
      {/* Delete modal */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl p-8 max-w-[420px] w-full shadow-xl">
            <h3 className="text-[18px] font-medium mb-2">Eliminar paciente</h3>
            <p className="text-[14px] text-text-secondary mb-1">Estás por eliminar a <strong className="text-text-primary">{patientToDelete.name}</strong>.</p>
            <p className="text-[13px] text-warning mb-6">Esta acción es permanente e irreversible. Se borrarán todos sus planes y registros.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm!)} disabled={deleting} className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-[13px] font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting} className="text-text-secondary px-4 py-2.5 text-[13px] hover:text-text-primary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-[14px] text-text-secondary">{patients.length} paciente{patients.length !== 1 ? 's' : ''}</span>
          {patients.length > 3 && (
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="bg-bg-secondary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent w-[200px]"
            />
          )}
        </div>

        {atFreeLimit ? (
          <a href="/paywall" className="bg-accent/10 text-accent border-[0.5px] border-accent/40 px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-accent/20 transition-colors">
            Suscribite para agregar más
          </a>
        ) : atSubscriberLimit ? (
          <a href="/paywall" className="bg-accent/10 text-accent border-[0.5px] border-accent/40 px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-accent/20 transition-colors">
            Actualizá a Plan Pro
          </a>
        ) : !showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            + Nuevo Paciente
          </button>
        ) : null}
      </div>

      {/* Paywall banners */}
      {atFreeLimit && (
        <div className="bg-accent/5 border-[0.5px] border-accent/30 rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-medium mb-0.5">Plan gratuito — 1 paciente</p>
            <p className="text-[13px] text-text-secondary">Suscribite para agregar hasta 20 pacientes.</p>
          </div>
          <a href="/paywall" className="shrink-0 bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">Ver planes</a>
        </div>
      )}
      {atSubscriberLimit && (
        <div className="bg-accent/5 border-[0.5px] border-accent/30 rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-medium mb-0.5">Límite del plan individual — 20 pacientes</p>
            <p className="text-[13px] text-text-secondary">Con el Plan Pro tenés pacientes ilimitados.</p>
          </div>
          <a href="/paywall" className="shrink-0 bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">Ver Plan Pro</a>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6 mb-6">
          {isOrgContext && (
            <p className="text-[12px] text-text-secondary mb-4">
              Se agregará como paciente de <strong className="text-text-primary">{orgName || 'el equipo'}</strong>
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nombre *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre y apellido" autoFocus className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">DNI *</label>
              <input
                type="text"
                value={form.dni}
                onChange={e => { setForm(f => ({ ...f, dni: e.target.value.replace(/\D/g, '') })); setDniError(null) }}
                placeholder="Ej: 12345678"
                inputMode="numeric"
                className={`w-full bg-bg-primary border-[0.5px] rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent ${dniError ? 'border-red-500/60' : 'border-border-strong'}`}
              />
              {dniError && <p className="text-[11px] text-red-400 mt-1">{dniError}</p>}
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Edad</label>
              <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="Ej: 34" min="1" max="120" className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Ocupación</label>
              <input type="text" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} placeholder="Ej: Docente" className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving || !form.name.trim() || !form.dni.trim()} className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={closeForm} className="text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary">Cancelar</button>
          </div>
        </div>
      )}

      {/* Patient grid */}
      {patients.length === 0 && !showForm ? (
        <div className="bg-bg-secondary rounded-xl p-12 text-center border-[0.5px] border-dashed border-border">
          <p className="text-[16px] font-medium mb-2">Todavía no hay pacientes</p>
          <p className="text-[13px] text-text-secondary mb-5">
            {isOrgContext
              ? `Creá el primer paciente del equipo ${orgName ? `"${orgName}"` : ''}.`
              : 'Creá tu primer paciente para empezar a trabajar clínicamente con Reason.'}
          </p>
          {!atFreeLimit && !atSubscriberLimit && (
            <button onClick={() => setShowForm(true)} className="bg-accent text-bg-primary px-5 py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 inline-block">
              + Crear primer paciente
            </button>
          )}
        </div>
      ) : filtered.length === 0 && search ? (
        <p className="text-[14px] text-text-secondary py-8 text-center">Sin resultados para &quot;{search}&quot;</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, idx) => {
            const locked = !isOrgContext && atFreeLimit && idx > 0
            if (locked) {
              return (
                <div key={p.id} className="relative rounded-xl overflow-hidden cursor-default select-none">
                  <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 h-full flex flex-col opacity-40 pointer-events-none">
                    <p className="text-[17px] font-medium mb-1">{p.name}</p>
                    <p className="text-[13px] text-text-secondary flex-grow">{p.age ? `${p.age} años` : ''}{p.age && p.occupation ? ' · ' : ''}{p.occupation || ''}</p>
                    <p className="text-[12px] text-text-secondary mt-4 pt-4 border-t-[0.5px] border-border">{p.plan_count} plan{p.plan_count !== 1 ? 'es' : ''}</p>
                  </div>
                  <a href="/paywall" className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-1.5 text-[12px] font-medium text-text-secondary flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Suscribite para acceder
                    </span>
                  </a>
                </div>
              )
            }
            return (
              <div key={p.id} className="relative group">
                <Link href={`/dashboard/pacientes/${p.id}`} className="block no-underline">
                  <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full flex flex-col">
                    <p className="text-[17px] font-medium text-text-primary mb-1">{p.name}</p>
                    <p className="text-[13px] text-text-secondary flex-grow">
                      {p.dni ? `DNI ${p.dni}` : ''}{p.dni && (p.age || p.occupation) ? ' · ' : ''}{p.age ? `${p.age} años` : ''}{p.age && p.occupation ? ' · ' : ''}{p.occupation || ''}
                    </p>
                    <div className="mt-4 pt-4 border-t-[0.5px] border-border flex justify-between items-center">
                      <span className="text-[12px] text-text-secondary">{p.plan_count} plan{p.plan_count !== 1 ? 'es' : ''}</span>
                      <span className="text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver →</span>
                    </div>
                  </div>
                </Link>
                {(isPro || p.user_id === userId) && (
                  <button onClick={() => setDeleteConfirm(p.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-text-secondary hover:text-red-400 bg-bg-primary border-[0.5px] border-border rounded-lg px-2 py-1">
                    Eliminar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
