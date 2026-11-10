'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// Resuelve quién atendió realmente a un paciente hoy — por el turno de
// agenda asignado ese día, no por la sesión logueada. Necesario en equipos
// donde los profesionales comparten un único login (ej. tablet de consultorio):
// ahí `auth.uid()` siempre es la misma cuenta, así que no alcanza para saber
// si fue Kevin, Seba o Simón. Si hay un solo turno con profesional asignado
// para este paciente hoy, lo usa sin pedir nada. Si no hay turno, hay más de
// uno, o alguien quiere corregirlo (cambio de último momento que la agenda
// no refleja), deja elegir a mano de la lista del equipo.

export interface AttributedProfessional { id: string; name: string | null }

function todayAR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}

export default function AttributionPicker({
  patientId, fallbackUserId, onChange,
}: {
  patientId: string
  fallbackUserId: string
  onChange: (p: AttributedProfessional) => void
}) {
  const [professionals, setProfessionals] = useState<AttributedProfessional[]>([])
  const [current, setCurrent] = useState<AttributedProfessional | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    const today = todayAR()
    const from = `${today}T00:00:00-03:00`
    const to = `${today}T23:59:59-03:00`

    ;(async () => {
      const [{ data: turnos }, { data: patient }] = await Promise.all([
        supabase.from('turnos')
          .select('professional_id, professional_name')
          .eq('patient_id', patientId)
          .gte('start_time', from).lte('start_time', to)
          .not('professional_id', 'is', null),
        supabase.from('patients').select('org_id').eq('id', patientId).maybeSingle(),
      ])

      let profs: AttributedProfessional[] = []
      if (patient?.org_id) {
        const [{ data: org }, { data: members }] = await Promise.all([
          supabase.from('organizations').select('owner_id').eq('id', patient.org_id).single(),
          supabase.from('organization_members').select('users(id, full_name, email)').eq('org_id', patient.org_id),
        ])
        interface MemberRow { users: { id: string; full_name: string | null; email: string } | null }
        profs = ((members ?? []) as unknown as MemberRow[])
          .filter(m => m.users)
          .map(m => ({ id: m.users!.id, name: m.users!.full_name ?? m.users!.email }))
        if (org?.owner_id && !profs.some(p => p.id === org.owner_id)) {
          const { data: ownerUser } = await supabase.from('users').select('id, full_name, email').eq('id', org.owner_id).single()
          if (ownerUser) profs.unshift({ id: ownerUser.id, name: ownerUser.full_name ?? ownerUser.email })
        }
      }
      if (profs.length === 0) {
        // Paciente sin organización (kine solo): no hay de quién elegir, el
        // fallback es la única opción posible.
        const { data: me } = await supabase.from('users').select('id, full_name, email').eq('id', fallbackUserId).maybeSingle()
        if (me) profs = [{ id: me.id, name: me.full_name ?? me.email }]
      }
      if (cancelled) return
      setProfessionals(profs)

      const distinctTurnoProfIds = new Set((turnos ?? []).map(t => t.professional_id))
      let resolved: AttributedProfessional
      if (distinctTurnoProfIds.size === 1 && turnos && turnos[0].professional_id) {
        resolved = { id: turnos[0].professional_id as string, name: turnos[0].professional_name as string | null }
      } else {
        resolved = profs.find(p => p.id === fallbackUserId) ?? { id: fallbackUserId, name: null }
      }
      setCurrent(resolved)
      onChange(resolved)
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  const pick = (p: AttributedProfessional) => { setCurrent(p); onChange(p); setEditing(false) }

  if (!current) return null

  return (
    <div className="flex items-center gap-1.5 mb-3 text-[12px]">
      <span className="text-text-secondary">Atendiendo:</span>
      {editing ? (
        <select
          value={current.id}
          onChange={e => { const p = professionals.find(x => x.id === e.target.value); if (p) pick(p) }}
          onBlur={() => setEditing(false)}
          autoFocus
          className="bg-bg-secondary border-[0.5px] border-border-strong rounded px-2 py-1 text-[12px] text-text-primary focus:outline-none focus:border-accent"
        >
          {professionals.map(p => <option key={p.id} value={p.id}>{p.name ?? p.id}</option>)}
        </select>
      ) : (
        <button onClick={() => setEditing(true)} className="font-medium text-text-primary hover:text-accent transition-colors">
          {current.name ?? 'Elegir'} <span className="text-text-tertiary">▾</span>
        </button>
      )}
    </div>
  )
}
