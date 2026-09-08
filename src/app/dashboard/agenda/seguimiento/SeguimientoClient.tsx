'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useConfirm, useToast } from '@/components/Dialogs'
import { buildAbsenceWhatsAppUrl } from '../whatsapp'

interface LapsingPatient {
  patient_id: string
  name: string
  phone: string | null
  last_visit: string
  days_since: number
  absence_reminder_sent_at: string | null
}

interface Props {
  userId: string
  orgName: string | null
  thresholdDays: number
}

const SNOOZE_DAYS = 30

function daysAgoLabel(days: number): string {
  if (days <= 0) return 'hoy'
  if (days === 1) return 'hace 1 día'
  if (days < 30) return `hace ${days} días`
  const months = Math.floor(days / 30)
  return months === 1 ? 'hace 1 mes' : `hace ${months} meses`
}

function sentAgoLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  return `hace ${days} días`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function SeguimientoClient({ userId, orgName, thresholdDays }: Props) {
  const { confirm, confirmDialog } = useConfirm()
  const { notify, toast } = useToast()
  const supabaseRef = useRef(createClient())

  const [rows, setRows] = useState<LapsingPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabaseRef.current
      .rpc('get_lapsing_patients', { p_threshold_days: thresholdDays })
    if (error) {
      notify('No se pudo cargar el seguimiento: ' + error.message, 'error')
      setLoading(false)
      return
    }
    setRows((data ?? []) as LapsingPatient[])
    setLoading(false)
  }, [thresholdDays, notify])

  useEffect(() => { fetchRows() }, [fetchRows])

  // Avisar por WhatsApp: marca la fecha de aviso (queda "avisado hace X") pero
  // el paciente sigue en el panel hasta que retome (le den un turno) o lo saquen.
  const markReminded = useCallback((p: LapsingPatient) => {
    const now = new Date().toISOString()
    setRows(prev => prev.map(r => r.patient_id === p.patient_id ? { ...r, absence_reminder_sent_at: now } : r))
    supabaseRef.current.from('patients').update({ absence_reminder_sent_at: now }).eq('id', p.patient_id).then(({ error }) => {
      if (error) notify('No se pudo guardar el aviso', 'error')
    })
  }, [notify])

  const darDeAlta = useCallback(async (p: LapsingPatient) => {
    if (!(await confirm({
      title: 'Dar de alta',
      message: `Se registra el alta de ${p.name} (terminó el tratamiento) y deja de aparecer en el seguimiento. Queda como hito "Alta" en su historial.`,
      confirmLabel: 'Dar de alta',
    }))) return
    setBusyId(p.patient_id)
    const { error } = await supabaseRef.current
      .from('patients').update({ discharged_at: new Date().toISOString() }).eq('id', p.patient_id)
    if (error) { setBusyId(null); notify('No se pudo dar de alta: ' + error.message, 'error'); return }
    // Hito en el historial (no bloqueante: si falla, el alta ya quedó registrada).
    await supabaseRef.current.from('patient_events').insert({
      patient_id: p.patient_id,
      user_id: userId,
      event_date: new Date().toISOString().split('T')[0],
      type: 'alta',
      title: 'Alta',
    })
    setRows(prev => prev.filter(r => r.patient_id !== p.patient_id))
    setBusyId(null)
    notify(`${p.name} dado de alta`)
  }, [confirm, notify, userId])

  const pausar = useCallback(async (p: LapsingPatient) => {
    setBusyId(p.patient_id)
    const until = new Date(Date.now() + SNOOZE_DAYS * 86_400_000).toISOString()
    const { error } = await supabaseRef.current
      .from('patients').update({ absence_snoozed_until: until }).eq('id', p.patient_id)
    if (error) { setBusyId(null); notify('No se pudo pausar el aviso: ' + error.message, 'error'); return }
    setRows(prev => prev.filter(r => r.patient_id !== p.patient_id))
    setBusyId(null)
    notify(`Aviso pausado ${SNOOZE_DAYS} días`)
  }, [notify])

  return (
    <div>
      {confirmDialog}
      {toast}

      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-[22px] font-semibold text-text-primary flex items-center gap-2">
          <span>👋</span> Seguimiento de ausencias
        </h1>
        <Link href="/dashboard/agenda" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors">
          ← Volver a la agenda
        </Link>
      </div>
      <p className="text-[13px] text-text-secondary mb-5">
        Pacientes que hace {thresholdDays} días o más que no vienen y no tienen un próximo turno agendado.
      </p>

      {/* Conteo */}
      <div className="mb-3 text-[13px] text-text-secondary">
        <span className="text-text-primary font-medium">{rows.length}</span>{' '}
        {rows.length === 1 ? 'paciente en riesgo de perderse' : 'pacientes en riesgo de perderse'}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => <div key={i} className="h-[84px] rounded-xl bg-bg-secondary/60 animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-text-secondary text-[14px]">
          ✅ ¡Al día! Ningún paciente activo quedó sin próximo turno hace más de {thresholdDays} días.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(p => {
            const busy = busyId === p.patient_id
            const waUrl = p.phone ? buildAbsenceWhatsAppUrl(p.phone, p.name, orgName) : null
            return (
              <div key={p.patient_id} className="rounded-xl border-[0.5px] border-border bg-bg-secondary px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/pacientes/${p.patient_id}`}
                      className="text-[14px] font-medium text-text-primary hover:text-accent transition-colors no-underline truncate block"
                    >
                      {p.name}
                    </Link>
                    <p className="text-[12px] text-text-tertiary mt-0.5">
                      <span className="text-red-300 font-medium">{daysAgoLabel(p.days_since)}</span> sin venir
                      <span className="mx-1.5 text-border">·</span>
                      última visita {formatDate(p.last_visit)}
                    </p>
                    {p.absence_reminder_sent_at && (
                      <p className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        avisado {sentAgoLabel(p.absence_reminder_sent_at)}
                      </p>
                    )}
                  </div>
                  {waUrl ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markReminded(p)}
                      className="shrink-0 bg-green-500/15 border-[0.5px] border-green-500/40 text-green-300 hover:bg-green-500/25 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1.5"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      Avisar
                    </a>
                  ) : (
                    <span className="shrink-0 text-[11px] text-text-tertiary self-center">Sin teléfono</span>
                  )}
                </div>
                {/* Acciones secundarias */}
                <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t-[0.5px] border-border">
                  <button
                    onClick={() => darDeAlta(p)}
                    disabled={busy}
                    className="text-[12px] text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors"
                  >
                    Dar de alta
                  </button>
                  <span className="text-border">·</span>
                  <button
                    onClick={() => pausar(p)}
                    disabled={busy}
                    className="text-[12px] text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors"
                    title={`No aparece por ${SNOOZE_DAYS} días`}
                  >
                    Pausar aviso
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
