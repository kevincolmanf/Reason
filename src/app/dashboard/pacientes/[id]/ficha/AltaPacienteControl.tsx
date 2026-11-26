'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useConfirm, useToast } from '@/components/Dialogs'
import { dischargePatient, reopenPatient, DISCHARGE_REASON_LABELS, type DischargeReason } from '@/lib/patientDischarge'

interface Status {
  discharged_at: string | null
  discharge_reason: string | null
}

const REASON_ORDER: DischargeReason[] = ['alta', 'derivacion', 'pausa_acordada', 'abandono']

export default function AltaPacienteControl({
  patientId, userId,
}: {
  patientId: string
  userId: string
}) {
  const { confirm, confirmDialog } = useConfirm()
  const { notify, toast } = useToast()
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [pickingReason, setPickingReason] = useState(false)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    let cancelled = false
    supabaseRef.current
      .from('patients')
      .select('discharged_at, discharge_reason')
      .eq('id', patientId)
      .single()
      .then(({ data }) => { if (!cancelled && data) setStatus(data) })
    return () => { cancelled = true }
  }, [patientId])

  const handleDischarge = async (reason: DischargeReason) => {
    setPickingReason(false)
    if (!(await confirm({
      title: DISCHARGE_REASON_LABELS[reason],
      message: `Se registra "${DISCHARGE_REASON_LABELS[reason]}" y el paciente deja de aparecer como activo. Queda como hito en su historial.`,
      confirmLabel: 'Confirmar',
      danger: reason === 'abandono',
    }))) return
    setBusy(true)
    const { error } = await dischargePatient(supabaseRef.current, patientId, userId, reason)
    setBusy(false)
    if (error) { notify('No se pudo registrar: ' + error, 'error'); return }
    setStatus({ discharged_at: new Date().toISOString(), discharge_reason: reason })
    notify(`Registrado: ${DISCHARGE_REASON_LABELS[reason]}`)
  }

  const handleReopen = async () => {
    if (!(await confirm({ message: '¿Reabrir el tratamiento? Vuelve a aparecer como paciente activo.' }))) return
    setBusy(true)
    const { error } = await reopenPatient(supabaseRef.current, patientId)
    setBusy(false)
    if (error) { notify('No se pudo reabrir: ' + error, 'error'); return }
    setStatus({ discharged_at: null, discharge_reason: null })
    notify('Tratamiento reabierto')
  }

  if (!status) return null

  const label = status.discharge_reason
    ? DISCHARGE_REASON_LABELS[status.discharge_reason as DischargeReason] ?? status.discharge_reason
    : null

  return (
    <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5 mb-6 flex items-center justify-between gap-3 flex-wrap">
      {confirmDialog}
      {toast}
      <div>
        <span className="text-[12px] uppercase tracking-[0.05em] text-text-tertiary">Estado del tratamiento</span>
        <p className="text-[14px] mt-0.5">
          {status.discharged_at ? (
            <>Cerrado · <span className="font-medium">{label ?? 'Sin motivo'}</span></>
          ) : (
            <span className="text-[#3b82f6] font-medium">Activo</span>
          )}
        </p>
      </div>

      {status.discharged_at ? (
        <button onClick={handleReopen} disabled={busy}
          className="text-[13px] text-text-secondary hover:text-text-primary underline disabled:opacity-40">
          Reabrir tratamiento
        </button>
      ) : (
        <div className="relative">
          <button onClick={() => setPickingReason(o => !o)} disabled={busy}
            className="bg-bg-secondary border-[0.5px] border-border-strong rounded-lg px-3.5 py-2 text-[13px] font-medium hover:border-accent transition-colors disabled:opacity-40">
            Cerrar tratamiento…
          </button>
          {pickingReason && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-bg-primary border-[0.5px] border-border rounded-xl shadow-lg py-1.5 z-20">
              {REASON_ORDER.map(reason => (
                <button key={reason} onClick={() => handleDischarge(reason)}
                  className="w-full text-left px-3.5 py-2 text-[13px] hover:bg-bg-secondary transition-colors">
                  {DISCHARGE_REASON_LABELS[reason]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
