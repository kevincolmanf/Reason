'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useConfirm, useToast } from '@/components/Dialogs'

export default function PortalClient({
  patientId, patientName, initialLoadShareToken, initialFollowUpMode,
}: {
  patientId: string
  patientName: string
  initialLoadShareToken: string | null
  initialFollowUpMode: string | null
}) {
  const { confirm, confirmDialog } = useConfirm()
  const { notify, toast } = useToast()
  const [loadShareToken, setLoadShareToken] = useState(initialLoadShareToken)
  const [followUpMode, setFollowUpModeState] = useState(initialFollowUpMode ?? 'presencial')
  const [generatingToken, setGeneratingToken] = useState(false)
  const [modeSaving, setModeSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const generatePortalToken = async () => {
    setGeneratingToken(true)
    const token = crypto.randomUUID()
    const supabase = createClient()
    const { data, error } = await supabase
      .from('patients')
      .update({ load_share_token: token })
      .eq('id', patientId)
      .select('load_share_token')
      .single()
    if (!error && data) setLoadShareToken(data.load_share_token)
    setGeneratingToken(false)
  }

  const revokePortalToken = async () => {
    if (!(await confirm({ title: 'Revocar link del portal', message: 'El paciente ya no podrá acceder con el link actual. ¿Revocar?', danger: true, confirmLabel: 'Revocar' }))) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('patients')
      .update({ load_share_token: null })
      .eq('id', patientId)
      .select('load_share_token')
      .single()
    if (!error && data) setLoadShareToken(data.load_share_token)
  }

  const setFollowUpMode = async (mode: 'presencial' | 'online' | 'hibrido') => {
    const prev = followUpMode
    if (mode === prev) return
    setFollowUpModeState(mode)
    setModeSaving('saving')
    try {
      const res = await fetch('/api/pacientes/modalidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, mode }),
      })
      if (!res.ok) throw new Error()
      setModeSaving('saved')
      setTimeout(() => setModeSaving('idle'), 2500)
    } catch {
      setFollowUpModeState(prev)
      setModeSaving('error')
    }
  }

  const opts: { value: 'presencial' | 'online' | 'hibrido'; label: string; desc: string }[] = [
    { value: 'presencial', label: 'Presencial', desc: 'Lo ves en el centro. El registro lo llevás vos con notas — al paciente no se le pide cargar sesiones.' },
    { value: 'online',     label: 'Online',     desc: 'Se entrena a distancia. Registra un check-in corto desde su portal.' },
    { value: 'hibrido',    label: 'Híbrido',    desc: 'Combina presencial y a distancia. Registra el check-in corto los días que no viene.' },
  ]

  return (
    <div>
      {confirmDialog}
      {toast}
      <div data-tour="ficha-portal" className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[14px] font-medium">Portal del Paciente</h2>
        </div>

        <div className="mb-4 pb-4 border-b-[0.5px] border-border">
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary">Modalidad de seguimiento</label>
            {modeSaving === 'saving' && <span className="text-[11px] text-text-secondary">Guardando…</span>}
            {modeSaving === 'saved' && <span className="text-[11px] text-[#4ade80]">✓ Guardado</span>}
            {modeSaving === 'error' && <span className="text-[11px] text-warning">Error al guardar — reintentá</span>}
          </div>
          <div className="flex gap-1.5 mb-2">
            {opts.map(o => (
              <button key={o.value} onClick={() => setFollowUpMode(o.value)}
                className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${followUpMode === o.value ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-text-secondary">{opts.find(o => o.value === followUpMode)?.desc}</p>
        </div>

        {loadShareToken ? (
          <div>
            <p className="text-[13px] text-text-secondary mb-3">
              Compartí este link con {patientName} para que vea sus ejercicios y registre sesiones desde el celular.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/paciente/${loadShareToken}`); notify('Link copiado') }}
                className="bg-[#24342A] border-[0.5px] border-[#34D399]/50 text-[#34D399] px-4 py-2 rounded-lg text-[13px] font-medium flex-grow truncate"
              >
                Enviar link al paciente
              </button>
              <button onClick={revokePortalToken} className="bg-bg-secondary border-[0.5px] border-border px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-warning" title="Revocar">
                X
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[13px] text-text-secondary mb-3">
              Generá un link único para que {patientName} pueda ver sus ejercicios y registrar sus sesiones desde el celular.
            </p>
            <button onClick={generatePortalToken} disabled={generatingToken} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40">
              {generatingToken ? 'Generando...' : 'Generar link para el paciente'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
