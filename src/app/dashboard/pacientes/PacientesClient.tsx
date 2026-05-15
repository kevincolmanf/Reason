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
  plan_count?: number
}

interface Props {
  userId: string
  isActiveUser: boolean
  isPro: boolean
  orgId?: string | null
  orgName?: string | null
  showPersonalSection?: boolean
}

export default function PacientesClient({ userId, isActiveUser, isPro, orgId, orgName, showPersonalSection = false }: Props) {
  const [orgPatients, setOrgPatients] = useState<Patient[]>([])
  const [personalPatients, setPersonalPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState<'org' | 'personal' | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ name: '', age: '', occupation: '' })

  const supabaseRef = useRef(createClient())

  const allPatients = orgId ? [...orgPatients, ...personalPatients] : personalPatients

  const atFreeLimit = !isActiveUser && personalPatients.length >= 1
  const atSubscriberLimit = isActiveUser && !isPro && personalPatients.length >= 20

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    const sb = supabaseRef.current

    if (orgId) {
      const [{ data: orgData }, { data: personalData }] = await Promise.all([
        sb.from('patients').select('id, name, age, occupation, created_at').eq('org_id', orgId).order('created_at', { ascending: true }),
        showPersonalSection
          ? sb.from('patients').select('id, name, age, occupation, created_at').eq('user_id', userId).is('org_id', null).order('created_at', { ascending: true })
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
      const { data } = await sb.from('patients').select('id, name, age, occupation, created_at').eq('user_id', userId).order('created_at', { ascending: true })
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
  }, [userId, orgId])

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

  const filterList = (list: Patient[]) =>
    search.trim()
      ? list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.occupation?.toLowerCase().includes(search.toLowerCase()))
      : list

  if (loading) return <div className="text-text-secondary text-[14px]">Cargando pacientes...</div>

  const patientToDelete = deleteConfirm ? allPatients.find(p => p.id === deleteConfirm) : null

  const PatientCard = ({ p, idx, pool }: { p: Patient; idx: number; pool: 'org' | 'personal' }) => {
    const locked = pool === 'personal' && atFreeLimit && idx > 0
    if (locked) {
      return (
        <div className="relative rounded-xl overflow-hidden cursor-default select-none">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 h-full flex flex-col opacity-40 pointer-events-none">
            <h3 className="text-[18px] font-medium text-text-primary mb-2">{p.name}</h3>
            <div className="text-[13px] text-text-secondary space-y-1 flex-grow">
              {p.age && <p>Edad: {p.age} años</p>}
              {p.occupation && <p>Ocupación: {p.occupation}</p>}
            </div>
            <div className="mt-4 pt-4 border-t-[0.5px] border-border">
              <span className="text-[12px] text-text-secondary">{p.plan_count} plan{p.plan_count !== 1 ? 'es' : ''}</span>
            </div>
          </div>
          <a href="/paywall" className="absolute inset-0 flex items-center justify-center group">
            <span className="bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-1.5 text-[12px] font-medium text-text-secondary group-hover:text-text-primary group-hover:border-accent transition-colors flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Suscribite para acceder
            </span>
          </a>
        </div>
      )
    }
    return (
      <div className="relative group">
        <Link href={`/dashboard/pacientes/${p.id}`} className="block no-underline">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full flex flex-col">
            <h3 className="text-[18px] font-medium text-text-primary mb-2">{p.name}</h3>
            <div className="text-[13px] text-text-secondary space-y-1 flex-grow">
              {p.age && <p>Edad: {p.age} años</p>}
              {p.occupation && <p>Ocupación: {p.occupation}</p>}
            </div>
            <div className="mt-4 pt-4 border-t-[0.5px] border-border flex justify-between items-center">
              <span className="text-[12px] text-text-secondary">{p.plan_count} plan{p.plan_count !== 1 ? 'es' : ''}</span>
              <span className="text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver →</span>
            </div>
          </div>
        </Link>
        {!isPro && pool === 'personal' && (
          <button
            onClick={e => { e.preventDefault(); setDeleteConfirm(p.id) }}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-text-secondary hover:text-red-400 bg-bg-primary border-[0.5px] border-border rounded-lg px-2 py-1"
          >
            Eliminar
          </button>
        )}
      </div>
    )
  }

  const CreateForm = ({ pool }: { pool: 'org' | 'personal' }) => (
    <div className="bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6 mb-6">
      <h2 className="text-[15px] font-medium mb-4">
        {pool === 'org' ? `Nuevo paciente en ${orgName || 'el equipo'}` : 'Nuevo paciente personal'}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nombre *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Nombre y apellido"
            autoFocus
            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Edad</label>
          <input
            type="number"
            value={form.age}
            onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
            placeholder="Ej: 34"
            min="1" max="120"
            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Ocupación</label>
          <input
            type="text"
            value={form.occupation}
            onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Ej: Docente"
            className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleCreate}
          disabled={saving || !form.name.trim()}
          className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          onClick={() => { setShowForm(null); setForm({ name: '', age: '', occupation: '' }) }}
          className="text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary"
        >
          Cancelar
        </button>
      </div>
    </div>
  )

  const SectionHeader = ({ label, count, pool, canAdd }: { label: string; count: number; pool: 'org' | 'personal'; canAdd: boolean }) => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-[18px] font-medium">{label}</h2>
        <span className="text-[13px] text-text-secondary">{count} paciente{count !== 1 ? 's' : ''}</span>
      </div>
      {canAdd && showForm !== pool && (
        <button
          onClick={() => { setShowForm(pool); setForm({ name: '', age: '', occupation: '' }) }}
          className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          + Nuevo paciente
        </button>
      )}
    </div>
  )

  // ── NON-ORG MODE ─────────────────────────────────────────────
  if (!orgId) {
    const filtered = filterList(personalPatients)
    return (
      <div>
        {deleteConfirm && patientToDelete && <DeleteModal patient={patientToDelete} onConfirm={() => handleDelete(deleteConfirm)} onCancel={() => setDeleteConfirm(null)} deleting={deleting} isPro={isPro} />}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-[14px] text-text-secondary shrink-0">{personalPatients.length} paciente{personalPatients.length !== 1 ? 's' : ''}</span>
            {personalPatients.length > 0 && (
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente..." className="bg-bg-secondary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent w-full sm:w-[220px]" />
            )}
          </div>
          {atFreeLimit ? (
            <a href="/paywall" className="bg-accent/10 text-accent border-[0.5px] border-accent/40 px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-accent/20 transition-colors">Suscribite para agregar más</a>
          ) : atSubscriberLimit ? (
            <a href="/paywall" className="bg-accent/10 text-accent border-[0.5px] border-accent/40 px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-accent/20 transition-colors">Actualizá a Plan Pro</a>
          ) : (
            <button onClick={() => setShowForm('personal')} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">+ Nuevo Paciente</button>
          )}
        </div>

        {atFreeLimit && <LimitBanner type="free" />}
        {atSubscriberLimit && <LimitBanner type="subscriber" />}

        {showForm === 'personal' && <CreateForm pool="personal" />}

        {personalPatients.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <NoResults search={search} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p, idx) => <PatientCard key={p.id} p={p} idx={idx} pool="personal" />)}
          </div>
        )}
      </div>
    )
  }

  // ── ORG MODE ─────────────────────────────────────────────────
  const filteredOrg = filterList(orgPatients)
  const filteredPersonal = filterList(personalPatients)

  return (
    <div>
      {deleteConfirm && patientToDelete && <DeleteModal patient={patientToDelete} onConfirm={() => handleDelete(deleteConfirm)} onCancel={() => setDeleteConfirm(null)} deleting={deleting} isPro={isPro} />}

      {/* Search global */}
      {allPatients.length > 0 && (
        <div className="mb-8">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente..." className="bg-bg-secondary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent w-full sm:w-[280px]" />
        </div>
      )}

      {/* Sección equipo */}
      <div className="mb-10">
        <SectionHeader label={orgName || 'Equipo'} count={orgPatients.length} pool="org" canAdd={true} />
        {showForm === 'org' && <CreateForm pool="org" />}
        {orgPatients.length === 0 && showForm !== 'org' ? (
          <div className="text-center py-10 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
            <p className="text-[14px] text-text-secondary">No hay pacientes del equipo todavía.</p>
          </div>
        ) : filteredOrg.length === 0 && search ? (
          <NoResults search={search} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrg.map((p, idx) => <PatientCard key={p.id} p={p} idx={idx} pool="org" />)}
          </div>
        )}
      </div>

      {/* Sección personal — solo para el dueño del equipo */}
      {showPersonalSection && <div className="border-t-[0.5px] border-border mb-10" />}
      {showPersonalSection && <div>
        <SectionHeader label="Mis Pacientes Personales" count={personalPatients.length} pool="personal" canAdd={!atFreeLimit && !atSubscriberLimit} />
        {atFreeLimit && <LimitBanner type="free" />}
        {atSubscriberLimit && <LimitBanner type="subscriber" />}
        {showForm === 'personal' && <CreateForm pool="personal" />}
        {personalPatients.length === 0 && showForm !== 'personal' ? (
          <div className="text-center py-10 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
            <p className="text-[14px] text-text-secondary">No tenés pacientes personales.</p>
          </div>
        ) : filteredPersonal.length === 0 && search ? (
          <NoResults search={search} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPersonal.map((p, idx) => <PatientCard key={p.id} p={p} idx={idx} pool="personal" />)}
          </div>
        )}
      </div>}
    </div>
  )
}

function DeleteModal({ patient, onConfirm, onCancel, deleting, isPro }: { patient: Patient; onConfirm: () => void; onCancel: () => void; deleting: boolean; isPro: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl p-8 max-w-[420px] w-full shadow-xl">
        <h3 className="text-[18px] font-medium mb-2">Eliminar paciente</h3>
        <p className="text-[14px] text-text-secondary mb-1">Estás por eliminar a <strong className="text-text-primary">{patient.name}</strong>.</p>
        <p className="text-[13px] text-warning mb-6">Esta acción es permanente e irreversible. Se borrarán todos sus planes de ejercicio, fichas clínicas, cuestionarios y registros de carga.</p>
        {!isPro && (
          <div className="bg-accent/5 border-[0.5px] border-accent/30 rounded-lg px-4 py-3 mb-6">
            <p className="text-[12px] text-text-secondary">Con el <strong>Plan Pro</strong> nunca necesitás borrar pacientes — tenés ilimitados y conservás el historial completo para siempre.</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={deleting} className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-[13px] font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
            {deleting ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
          <button onClick={onCancel} disabled={deleting} className="text-text-secondary px-4 py-2.5 text-[13px] hover:text-text-primary">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function LimitBanner({ type }: { type: 'free' | 'subscriber' }) {
  return (
    <div className="bg-accent/5 border-[0.5px] border-accent/30 rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4">
      <div>
        {type === 'free' ? (
          <>
            <p className="text-[14px] font-medium text-text-primary mb-0.5">Plan gratuito — 1 paciente</p>
            <p className="text-[13px] text-text-secondary">Suscribite para agregar hasta 20 pacientes y acceder a todos los módulos.</p>
          </>
        ) : (
          <>
            <p className="text-[14px] font-medium text-text-primary mb-0.5">Límite del plan individual — 20 pacientes</p>
            <p className="text-[13px] text-text-secondary">Para agregar uno nuevo tenés que eliminar otro. Con el Plan Pro tenés pacientes ilimitados.</p>
          </>
        )}
      </div>
      <a href="/paywall" className="shrink-0 bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">
        {type === 'free' ? 'Ver planes' : 'Ver Plan Pro'}
      </a>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
      <p className="text-[16px] font-medium text-text-primary mb-2">Todavía no tenés pacientes</p>
      <p className="text-[13px] text-text-secondary">Usá el botón de arriba para agregar el primero.</p>
    </div>
  )
}

function NoResults({ search }: { search: string }) {
  return (
    <div className="text-center py-16 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
      <p className="text-[14px] text-text-secondary">No se encontró ningún paciente con &quot;{search}&quot;</p>
    </div>
  )
}
