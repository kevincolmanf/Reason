'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

interface Patient {
  id: string
  name: string
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
  showPersonalSection?: boolean
  autoOpen?: boolean
}

export default function PacientesClient({ userId, isActiveUser, isPro, orgId, orgName, showPersonalSection = false, autoOpen = false }: Props) {
  const [orgPatients, setOrgPatients] = useState<Patient[]>([])
  const [personalPatients, setPersonalPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  // Si autoOpen y el usuario tiene ambos contextos disponibles → selector de contexto primero
  const hasBothContexts = !!orgId && showPersonalSection
  const [contextPicker, setContextPicker] = useState(autoOpen && hasBothContexts)
  const defaultForm = autoOpen && !hasBothContexts
    ? (orgId ? 'org' : 'personal')
    : null
  const [showForm, setShowForm] = useState<'org' | 'personal' | null>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ name: '', age: '', occupation: '' })

  const supabaseRef = useRef(createClient())

  const atFreeLimit = !isActiveUser && personalPatients.length >= 1
  const atSubscriberLimit = isActiveUser && !isPro && personalPatients.length >= 20

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    const sb = supabaseRef.current

    if (orgId) {
      const [{ data: orgData }, { data: personalData }] = await Promise.all([
        sb.from('patients').select('id, name, age, occupation, created_at, user_id').eq('org_id', orgId).order('created_at', { ascending: true }),
        showPersonalSection
          ? sb.from('patients').select('id, name, age, occupation, created_at, user_id').eq('user_id', userId).is('org_id', null).order('created_at', { ascending: true })
          : Promise.resolve({ data: [] }),
      ])

      const withCounts = async (rows: Patient[]) => Promise.all(
        rows.map(async (p) => {
          const { count } = await sb.from('exercise_plans').select('id', { count: 'exact', head: true }).eq('patient_id', p.id)
          return { ...p, plan_count: count || 0 }
        })
      )
      const [orgWithCounts, personalWithCounts] = await Promise.all([
        withCounts((orgData || []) as Patient[]),
        withCounts((personalData || []) as Patient[]),
      ])
      setOrgPatients(orgWithCounts)
      setPersonalPatients(personalWithCounts)
    } else {
      const { data } = await sb.from('patients').select('id, name, age, occupation, created_at, user_id').eq('user_id', userId).order('created_at', { ascending: true })
      const rows = (data || []) as Patient[]
      const withCounts = await Promise.all(
        rows.map(async (p) => {
          const { count } = await sb.from('exercise_plans').select('id', { count: 'exact', head: true }).eq('patient_id', p.id)
          return { ...p, plan_count: count || 0 }
        })
      )
      setPersonalPatients(withCounts)
    }

    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, orgId, showPersonalSection])

  useEffect(() => { fetchPatients() }, [fetchPatients])

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const { error } = await supabaseRef.current.from('patients').insert({
      user_id: userId,
      org_id: showForm === 'org' ? orgId : null,
      name: form.name.trim(),
      age: form.age ? parseInt(form.age) : null,
      occupation: form.occupation.trim() || null,
    })
    if (!error) {
      setForm({ name: '', age: '', occupation: '' })
      setShowForm(null)
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

  const closeForm = () => { setShowForm(null); setForm({ name: '', age: '', occupation: '' }) }

  const filter = (list: Patient[]) =>
    search.trim() ? list.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.occupation?.toLowerCase().includes(search.toLowerCase())
    ) : list

  if (loading) return <div className="text-text-secondary text-[14px]">Cargando pacientes...</div>

  const allPatients = [...orgPatients, ...personalPatients]
  const patientToDelete = deleteConfirm ? allPatients.find(p => p.id === deleteConfirm) : null
  const filteredOrg = filter(orgPatients)
  const filteredPersonal = filter(personalPatients)

  // ── FORM ──────────────────────────────────────────────────────
  const renderForm = (pool: 'org' | 'personal') => (
    <div className="bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6 mb-6">
      <p className="text-[13px] text-text-secondary mb-4">
        {pool === 'org' ? `Se agregará como paciente de ${orgName || 'el equipo'}` : 'Se guardará en tus pacientes personales'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nombre *</label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="Nombre y apellido" autoFocus className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Edad</label>
          <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="Ej: 34" min="1" max="120" className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Ocupación</label>
          <input type="text" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="Ej: Docente" className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={handleCreate} disabled={saving || !form.name.trim()} className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button onClick={closeForm} className="text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary">Cancelar</button>
      </div>
    </div>
  )

  // ── GRID ──────────────────────────────────────────────────────
  const renderGrid = (list: Patient[], pool: 'org' | 'personal') => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((p, idx) => {
        const locked = pool === 'personal' && atFreeLimit && idx > 0
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
                <p className="text-[13px] text-text-secondary flex-grow">{p.age ? `${p.age} años` : ''}{p.age && p.occupation ? ' · ' : ''}{p.occupation || ''}</p>
                <div className="mt-4 pt-4 border-t-[0.5px] border-border flex justify-between items-center">
                  <span className="text-[12px] text-text-secondary">{p.plan_count} plan{p.plan_count !== 1 ? 'es' : ''}</span>
                  <span className="text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver →</span>
                </div>
              </div>
            </Link>
            {(pool === 'personal' || isPro || p.user_id === userId) && (
              <button onClick={() => setDeleteConfirm(p.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-text-secondary hover:text-red-400 bg-bg-primary border-[0.5px] border-border rounded-lg px-2 py-1">
                Eliminar
              </button>
            )}
          </div>
        )
      })}
    </div>
  )

  // ── DELETE MODAL ──────────────────────────────────────────────
  const renderDeleteModal = () => patientToDelete && (
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
  )

  // ── NO ORG MODE ───────────────────────────────────────────────
  if (!orgId) {
    return (
      <div>
        {renderDeleteModal()}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-text-secondary">{personalPatients.length} paciente{personalPatients.length !== 1 ? 's' : ''}</span>
            {personalPatients.length > 0 && (
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="bg-bg-secondary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent w-[200px]" />
            )}
          </div>
          {atFreeLimit ? (
            <a href="/paywall" className="bg-accent/10 text-accent border-[0.5px] border-accent/40 px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-accent/20 transition-colors">Suscribite para agregar más</a>
          ) : atSubscriberLimit ? (
            <a href="/paywall" className="bg-accent/10 text-accent border-[0.5px] border-accent/40 px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-accent/20 transition-colors">Actualizá a Plan Pro</a>
          ) : (
            <button onClick={() => hasBothContexts ? setContextPicker(true) : setShowForm('personal')} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">+ Nuevo Paciente</button>
          )}
        </div>

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

        {showForm === 'personal' && renderForm('personal')}

        {personalPatients.length === 0 ? (
          <div className="text-center py-16 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
            <p className="text-[16px] font-medium mb-2">Todavía no tenés pacientes</p>
            <p className="text-[13px] text-text-secondary">Usá el botón de arriba para agregar el primero.</p>
          </div>
        ) : filteredPersonal.length === 0 ? (
          <p className="text-[14px] text-text-secondary py-8 text-center">Sin resultados para &quot;{search}&quot;</p>
        ) : renderGrid(filteredPersonal, 'personal')}
      </div>
    )
  }

  // ── ORG MODE ──────────────────────────────────────────────────
  return (
    <div>
      {/* Selector de contexto — aparece cuando el usuario tiene ambos espacios y hace click en "Nuevo paciente" */}
      {contextPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setContextPicker(false)}>
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl p-6 w-full max-w-[400px] shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[16px] font-medium mb-1">¿Para quién es este paciente?</h2>
            <p className="text-[13px] text-text-secondary mb-5">El ownership del paciente se define al crearlo y no se puede cambiar después.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setShowForm('org'); setContextPicker(false) }}
                className="w-full text-left bg-bg-primary border-[0.5px] border-border rounded-xl px-4 py-4 hover:border-accent transition-colors"
              >
                <p className="text-[14px] font-medium">{orgName || 'El equipo'}</p>
                <p className="text-[12px] text-text-secondary mt-0.5">Visible para todos los integrantes del workspace</p>
              </button>
              <button
                onClick={() => { setShowForm('personal'); setContextPicker(false) }}
                className="w-full text-left bg-bg-primary border-[0.5px] border-border rounded-xl px-4 py-4 hover:border-accent transition-colors"
              >
                <p className="text-[14px] font-medium">Mi espacio personal</p>
                <p className="text-[12px] text-text-secondary mt-0.5">Solo vos podés verlo</p>
              </button>
            </div>
            <button onClick={() => setContextPicker(false)} className="mt-4 text-[12px] text-text-secondary hover:text-text-primary">Cancelar</button>
          </div>
        </div>
      )}

      {renderDeleteModal()}

      {allPatients.length > 2 && (
        <div className="mb-8">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente..." className="bg-bg-secondary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent w-full sm:w-[280px]" />
        </div>
      )}

      {/* ── Sección equipo ── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase tracking-[0.08em] text-accent font-medium">Equipo</span>
            </div>
            <h2 className="text-[22px] font-medium">{orgName || 'Pacientes del equipo'}</h2>
            <p className="text-[13px] text-text-secondary mt-0.5">{orgPatients.length} paciente{orgPatients.length !== 1 ? 's' : ''} compartidos</p>
          </div>
          {showForm !== 'org' && (
            <button onClick={() => { setShowForm('org'); setForm({ name: '', age: '', occupation: '' }) }} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">
              + Nuevo paciente
            </button>
          )}
        </div>

        {showForm === 'org' && renderForm('org')}

        {orgPatients.length === 0 && showForm !== 'org' ? (
          <div className="text-center py-10 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
            <p className="text-[14px] text-text-secondary">No hay pacientes del equipo todavía.</p>
          </div>
        ) : filteredOrg.length === 0 && search ? (
          <p className="text-[14px] text-text-secondary py-8 text-center">Sin resultados para &quot;{search}&quot;</p>
        ) : renderGrid(filteredOrg, 'org')}
      </div>

      {/* ── Sección personal (solo si aplica) ── */}
      {showPersonalSection && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 border-t-[0.5px] border-border" />
            <span className="text-[11px] uppercase tracking-[0.08em] text-text-tertiary">Mis pacientes personales</span>
            <div className="flex-1 border-t-[0.5px] border-border" />
          </div>

          <div className="mb-5 flex items-center justify-between">
            <p className="text-[13px] text-text-secondary">{personalPatients.length} paciente{personalPatients.length !== 1 ? 's' : ''} — solo los ves vos</p>
            {!atFreeLimit && !atSubscriberLimit && showForm !== 'personal' && (
              <button onClick={() => { setShowForm('personal'); setForm({ name: '', age: '', occupation: '' }) }} className="text-[13px] text-text-secondary border-[0.5px] border-border px-3 py-1.5 rounded-lg hover:border-accent hover:text-accent transition-colors">
                + Agregar personal
              </button>
            )}
          </div>

          {atFreeLimit && (
            <div className="bg-accent/5 border-[0.5px] border-accent/30 rounded-xl px-5 py-4 mb-5 flex items-center justify-between gap-4">
              <p className="text-[13px] text-text-secondary">Plan gratuito — máximo 1 paciente personal. <a href="/paywall" className="text-accent underline">Suscribite</a> para agregar más.</p>
            </div>
          )}
          {atSubscriberLimit && (
            <div className="bg-accent/5 border-[0.5px] border-accent/30 rounded-xl px-5 py-4 mb-5 flex items-center justify-between gap-4">
              <p className="text-[13px] text-text-secondary">Límite de 20 pacientes personales. <a href="/paywall" className="text-accent underline">Ver Plan Pro</a>.</p>
            </div>
          )}

          {showForm === 'personal' && renderForm('personal')}

          {personalPatients.length === 0 && showForm !== 'personal' ? (
            <div className="text-center py-10 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
              <p className="text-[13px] text-text-secondary">No tenés pacientes personales.</p>
            </div>
          ) : filteredPersonal.length === 0 && search ? (
            <p className="text-[14px] text-text-secondary py-8 text-center">Sin resultados para &quot;{search}&quot;</p>
          ) : renderGrid(filteredPersonal, 'personal')}
        </>
      )}
    </div>
  )
}
