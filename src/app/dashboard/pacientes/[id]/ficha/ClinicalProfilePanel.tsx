'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import CatalogCombobox, { type CatalogComboboxOption } from '@/components/CatalogCombobox'
import {
  fetchOccupationCatalog, createCustomOccupation,
  type OccupationOption, type NivelEsfuerzo,
} from '@/lib/clinicalCatalog'

interface ClinicalProfile {
  sexo: 'masculino' | 'femenino' | 'otro' | null
  nivel_actividad_fisica: 'sedentario' | 'activo' | 'muy_activo' | null
  tabaquismo: 'no_fuma' | 'fuma' | 'ex_fumador' | null
  consumo_alcohol: 'no' | 'ocasional' | 'habitual' | null
  diabetes: boolean | null
  hipertension: boolean | null
  obesidad: boolean | null
  enf_cardiovascular: boolean | null
  osteoporosis: boolean | null
  cirugia_previa: boolean | null
  peso_kg: number | null
  talla_cm: number | null
  nivel_socioeconomico: 'bajo' | 'medio' | 'alto' | null
  occupation_id: string | null
  occupation_source: 'global' | 'custom' | null
}

const emptyProfile: ClinicalProfile = {
  sexo: null, nivel_actividad_fisica: null, tabaquismo: null, consumo_alcohol: null,
  diabetes: null, hipertension: null, obesidad: null, enf_cardiovascular: null,
  osteoporosis: null, cirugia_previa: null, peso_kg: null, talla_cm: null,
  nivel_socioeconomico: null, occupation_id: null, occupation_source: null,
}

const COMORBILIDADES: { key: keyof ClinicalProfile; label: string }[] = [
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'hipertension', label: 'Hipertensión' },
  { key: 'obesidad', label: 'Obesidad' },
  { key: 'enf_cardiovascular', label: 'Enf. cardiovascular' },
  { key: 'osteoporosis', label: 'Osteoporosis' },
  { key: 'cirugia_previa', label: 'Cirugía previa en la zona' },
]

const NIVEL_ESFUERZO_OPTIONS: { value: NivelEsfuerzo; label: string }[] = [
  { value: 'sedentaria', label: 'Sedentaria' },
  { value: 'de_pie', label: 'De pie' },
  { value: 'esfuerzo_fisico', label: 'Esfuerzo físico' },
]

function summaryChips(p: ClinicalProfile, occupationName: string | null): string[] {
  const chips: string[] = []
  if (p.sexo) chips.push(p.sexo === 'masculino' ? 'Masculino' : p.sexo === 'femenino' ? 'Femenino' : 'Otro')
  if (p.nivel_actividad_fisica) chips.push(p.nivel_actividad_fisica.charAt(0).toUpperCase() + p.nivel_actividad_fisica.slice(1))
  if (p.tabaquismo === 'fuma') chips.push('Fumador')
  if (p.tabaquismo === 'ex_fumador') chips.push('Ex-fumador')
  if (p.diabetes) chips.push('Diabetes')
  if (p.hipertension) chips.push('Hipertensión')
  if (occupationName) chips.push(occupationName)
  return chips
}

export default function ClinicalProfilePanel({
  patientId, userId, orgId,
}: {
  patientId: string
  userId: string
  orgId: string | null
}) {
  const [profile, setProfile] = useState<ClinicalProfile>(emptyProfile)
  const [loaded, setLoaded] = useState(false)
  const [occupations, setOccupations] = useState<OccupationOption[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const supabaseRef = useRef(createClient())
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const profileRef = useRef<ClinicalProfile>(emptyProfile)

  useEffect(() => {
    let cancelled = false
    const supabase = supabaseRef.current
    ;(async () => {
      const [{ data: existing }, occs] = await Promise.all([
        supabase.from('patient_clinical_profile').select('*').eq('patient_id', patientId).maybeSingle(),
        fetchOccupationCatalog(supabase),
      ])
      if (cancelled) return
      const loadedProfile = existing ? { ...emptyProfile, ...existing } : emptyProfile
      profileRef.current = loadedProfile
      setProfile(loadedProfile)
      setOccupations(occs)
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [patientId])

  const persist = (next: ClinicalProfile) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSaveStatus('saving')
    timeoutRef.current = setTimeout(async () => {
      const { error } = await supabaseRef.current
        .from('patient_clinical_profile')
        .upsert({ patient_id: patientId, ...next })
      setSaveStatus(error ? 'error' : 'saved')
    }, 1500)
  }

  const update = <K extends keyof ClinicalProfile>(key: K, value: ClinicalProfile[K]) => {
    const next = { ...profileRef.current, [key]: value }
    profileRef.current = next
    setProfile(next)
    persist(next)
  }

  const occupationOptions: CatalogComboboxOption[] = occupations.map(o => ({ id: o.id, nombre: o.nombre }))
  const selectedOccupation = occupations.find(o => o.id === profile.occupation_id) ?? null
  const chips = summaryChips(profile, selectedOccupation?.nombre ?? null)
  const imc = profile.peso_kg && profile.talla_cm
    ? (profile.peso_kg / ((profile.talla_cm / 100) ** 2)).toFixed(1)
    : null

  if (!loaded) return null

  return (
    <details className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-6" open={chips.length === 0}>
      <summary className="cursor-pointer select-none list-none">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-medium tracking-[-0.01em] inline">Perfil del paciente</h2>
            <span className="text-[11px] text-text-tertiary ml-2">no cambia por consulta</span>
          </div>
          {saveStatus === 'saving' && <span className="text-[12px] text-text-secondary">Guardando…</span>}
          {saveStatus === 'saved' && <span className="text-[12px] text-[#3b82f6]">✓ Guardado</span>}
        </div>
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {chips.map(c => (
              <span key={c} className="text-[12px] bg-bg-secondary border-[0.5px] border-border rounded-full px-2.5 py-0.5 text-text-secondary">{c}</span>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-text-tertiary mt-1">Completar una vez — ayuda a las estadísticas.</p>
        )}
      </summary>

      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Sexo</label>
            <select value={profile.sexo ?? ''} onChange={e => update('sexo', (e.target.value || null) as ClinicalProfile['sexo'])}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent">
              <option value="">Sin especificar</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Nivel socioeconómico</label>
            <select value={profile.nivel_socioeconomico ?? ''} onChange={e => update('nivel_socioeconomico', (e.target.value || null) as ClinicalProfile['nivel_socioeconomico'])}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent">
              <option value="">Sin especificar</option>
              <option value="bajo">Bajo</option>
              <option value="medio">Medio</option>
              <option value="alto">Alto</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Actividad física</label>
            <select value={profile.nivel_actividad_fisica ?? ''} onChange={e => update('nivel_actividad_fisica', (e.target.value || null) as ClinicalProfile['nivel_actividad_fisica'])}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent">
              <option value="">Sin especificar</option>
              <option value="sedentario">Sedentario</option>
              <option value="activo">Activo</option>
              <option value="muy_activo">Muy activo</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Tabaquismo</label>
            <select value={profile.tabaquismo ?? ''} onChange={e => update('tabaquismo', (e.target.value || null) as ClinicalProfile['tabaquismo'])}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent">
              <option value="">Sin especificar</option>
              <option value="no_fuma">No fuma</option>
              <option value="fuma">Fuma</option>
              <option value="ex_fumador">Ex-fumador</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Consumo de alcohol</label>
            <select value={profile.consumo_alcohol ?? ''} onChange={e => update('consumo_alcohol', (e.target.value || null) as ClinicalProfile['consumo_alcohol'])}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent">
              <option value="">Sin especificar</option>
              <option value="no">No</option>
              <option value="ocasional">Ocasional</option>
              <option value="habitual">Habitual</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[12px] text-text-secondary mb-2">Antecedentes médicos</label>
          <div className="flex flex-wrap gap-2">
            {COMORBILIDADES.map(({ key, label }) => {
              const sel = profile[key] === true
              return (
                <button key={key} type="button" onClick={() => update(key, !sel as never)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] border-[0.5px] transition-colors ${sel ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border-strong text-text-secondary hover:text-text-primary'}`}
                >{label}</button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Peso (kg)</label>
            <input type="number" step="0.1" value={profile.peso_kg ?? ''} onChange={e => update('peso_kg', e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Talla (cm)</label>
            <input type="number" step="0.1" value={profile.talla_cm ?? ''} onChange={e => update('talla_cm', e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
          </div>
          <div className="text-[13px] text-text-secondary pb-2.5">
            {imc ? <>IMC: <span className="text-text-primary font-medium">{imc}</span></> : 'IMC: —'}
          </div>
        </div>

        <div>
          <label className="block text-[12px] text-text-secondary mb-1">Ocupación</label>
          <CatalogCombobox
            value={profile.occupation_id}
            onChange={id => {
              const occ = occupations.find(o => o.id === id)
              const next = { ...profile, occupation_id: id, occupation_source: occ?.source ?? 'global' }
              setProfile(next)
              persist(next)
            }}
            options={occupationOptions}
            placeholder="Buscar ocupación…"
            extraFieldLabel="Nivel de esfuerzo"
            extraFieldOptions={NIVEL_ESFUERZO_OPTIONS}
            onCreate={async (nombre, extraValue) => {
              const created = await createCustomOccupation(supabaseRef.current, {
                nombre, nivelEsfuerzo: extraValue as NivelEsfuerzo, userId, orgId,
              })
              setOccupations(prev => [...prev, created])
              return { id: created.id, nombre: created.nombre }
            }}
          />
        </div>
      </div>
    </details>
  )
}
