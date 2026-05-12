'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Patient {
  id: string
  name: string
  age: number | null
  occupation: string | null
  created_at: string
  plan_count?: number
}

export default function PacientesClient({ userId, isActiveUser }: { userId: string; isActiveUser: boolean }) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [limitError, setLimitError] = useState(false)
  const [search, setSearch] = useState('')
  const searchParams = useSearchParams()

  const atFreeLimit = !isActiveUser && patients.length >= 1

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      if (atFreeLimit) {
        setShowForm(false)
        setLimitError(true)
      } else {
        setShowForm(true)
      }
    }
  }, [searchParams, atFreeLimit])
  const [form, setForm] = useState({ name: '', age: '', occupation: '' })

  const supabaseRef = useRef(createClient())

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabaseRef.current
      .from('patients')
      .select('id, name, age, occupation, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      // Fetch plan count per patient
      const patientsWithCount = await Promise.all(
        data.map(async (p) => {
          const { count } = await supabaseRef.current
            .from('exercise_plans')
            .select('id', { count: 'exact', head: true })
            .eq('patient_id', p.id)
          return { ...p, plan_count: count || 0 }
        })
      )
      setPatients(patientsWithCount)
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  const handleCreate = async () => {
    if (!form.name.trim()) return
    if (atFreeLimit) { setLimitError(true); return }
    setSaving(true)

    const { error } = await supabaseRef.current.from('patients').insert({
      user_id: userId,
      name: form.name.trim(),
      age: form.age ? parseInt(form.age) : null,
      occupation: form.occupation.trim() || null,
    })

    if (!error) {
      setForm({ name: '', age: '', occupation: '' })
      setShowForm(false)
      await fetchPatients()
    }
    setSaving(false)
  }

  const filteredPatients = search.trim()
    ? patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.occupation?.toLowerCase().includes(search.toLowerCase())
      )
    : patients

  if (loading) {
    return <div className="text-text-secondary text-[14px]">Cargando pacientes...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-[14px] text-text-secondary shrink-0">{patients.length} paciente{patients.length !== 1 ? 's' : ''}</span>
          {patients.length > 0 && (
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar paciente..."
              className="bg-bg-secondary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent w-full sm:w-[220px]"
            />
          )}
        </div>
        {atFreeLimit ? (
          <a
            href="/paywall"
            className="bg-accent/10 text-accent border-[0.5px] border-accent/40 px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-accent/20 transition-colors"
          >
            Suscribite para agregar más
          </a>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            + Nuevo Paciente
          </button>
        )}
      </div>

      {limitError && (
        <div className="bg-red-500/10 border-[0.5px] border-red-500/30 rounded-xl px-5 py-4 mb-4 flex items-center justify-between gap-4">
          <p className="text-[13px] text-text-primary">Con el plan gratuito solo podés tener 1 paciente. Suscribite para agregar más.</p>
          <div className="flex gap-2 shrink-0">
            <a href="/paywall" className="bg-accent text-bg-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity">Ver planes</a>
            <button onClick={() => setLimitError(false)} className="text-text-secondary text-[12px] px-2 hover:text-text-primary">✕</button>
          </div>
        </div>
      )}

      {atFreeLimit && (
        <div className="bg-accent/5 border-[0.5px] border-accent/30 rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-medium text-text-primary mb-0.5">Plan gratuito — 1 paciente</p>
            <p className="text-[13px] text-text-secondary">Suscribite para agregar pacientes ilimitados y acceder a todos los módulos.</p>
          </div>
          <a href="/paywall" className="shrink-0 bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">
            Ver planes
          </a>
        </div>
      )}

      {/* FORM NUEVO PACIENTE */}
      {showForm && (
        <div className="bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6 mb-8">
          <h2 className="text-[16px] font-medium mb-4">Nuevo Paciente</h2>
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
              onClick={() => { setShowForm(false); setForm({ name: '', age: '', occupation: '' }) }}
              className="text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* LISTA */}
      {patients.length === 0 ? (
        <div className="text-center py-16 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
          <p className="text-[16px] font-medium text-text-primary mb-2">Todavía no tenés pacientes</p>
          <p className="text-[13px] text-text-secondary">Usá el botón de arriba para agregar el primero.</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-16 bg-bg-secondary rounded-xl border-[0.5px] border-dashed border-border">
          <p className="text-[14px] text-text-secondary">No se encontró ningún paciente con &quot;{search}&quot;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((p, idx) => {
            const locked = atFreeLimit && idx > 0
            if (locked) {
              return (
                <div key={p.id} className="relative rounded-xl overflow-hidden cursor-default select-none">
                  <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 h-full flex flex-col opacity-40 pointer-events-none">
                    <h3 className="text-[18px] font-medium text-text-primary mb-2">{p.name}</h3>
                    <div className="text-[13px] text-text-secondary space-y-1 flex-grow">
                      {p.age && <p>Edad: {p.age} años</p>}
                      {p.occupation && <p>Ocupación: {p.occupation}</p>}
                    </div>
                    <div className="mt-4 pt-4 border-t-[0.5px] border-border flex justify-between items-center">
                      <span className="text-[12px] text-text-secondary">
                        {p.plan_count} plan{p.plan_count !== 1 ? 'es' : ''}
                      </span>
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
              <Link key={p.id} href={`/dashboard/pacientes/${p.id}`} className="block no-underline">
                <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full flex flex-col group">
                  <h3 className="text-[18px] font-medium text-text-primary mb-2">{p.name}</h3>
                  <div className="text-[13px] text-text-secondary space-y-1 flex-grow">
                    {p.age && <p>Edad: {p.age} años</p>}
                    {p.occupation && <p>Ocupación: {p.occupation}</p>}
                  </div>
                  <div className="mt-4 pt-4 border-t-[0.5px] border-border flex justify-between items-center">
                    <span className="text-[12px] text-text-secondary">
                      {p.plan_count} plan{p.plan_count !== 1 ? 'es' : ''}
                    </span>
                    <span className="text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Ver →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
