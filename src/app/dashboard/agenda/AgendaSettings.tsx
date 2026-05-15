'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const DEFAULT_AREAS = [
  'Kinesiología',
  'Entrenamiento adultos',
  'Entrenamiento niños',
  'RPG',
  'Pilates',
  'Yoga',
  'Nutrición',
  'Traumatología',
  'Análisis de la marcha',
]

interface Props {
  orgId: string | null
  userId: string
  isOwner: boolean
  initialAreas: string[]
  shareToken: string | null
  shareEnabled: boolean
  onClose: () => void
  onSaved: (areas: string[]) => void
}

export default function AgendaSettings({
  orgId,
  userId,
  isOwner,
  initialAreas,
  shareToken,
  shareEnabled: initialShareEnabled,
  onClose,
  onSaved,
}: Props) {
  const [areas, setAreas] = useState<string[]>(initialAreas)
  const [newArea, setNewArea] = useState('')
  const [shareEnabled, setShareEnabled] = useState(initialShareEnabled)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const supabase = createClient()

  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/agenda/share/${shareToken}`
    : null

  const addArea = () => {
    const val = newArea.trim()
    if (!val || areas.includes(val)) return
    setAreas(a => [...a, val])
    setNewArea('')
  }

  const removeArea = (area: string) => {
    setAreas(a => a.filter(x => x !== area))
  }

  const resetAreas = () => setAreas(DEFAULT_AREAS)

  const copyLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    setSaving(true)

    if (orgId && isOwner) {
      await supabase.rpc('set_org_agenda_areas', { p_org_id: orgId, p_areas: areas })
      await supabase.rpc('set_org_agenda_share', { p_org_id: orgId, p_enabled: shareEnabled })
    } else {
      await supabase.from('users').update({ agenda_areas: areas }).eq('id', userId)
    }

    setSaving(false)
    onSaved(areas)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl p-6 w-full max-w-[480px] shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-[16px] font-medium">Configuración de agenda</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-[18px] leading-none">×</button>
        </div>

        {/* Areas */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-[11px] uppercase tracking-[0.05em] text-text-secondary">Áreas / especialidades</label>
            <button onClick={resetAreas} className="text-[11px] text-text-secondary hover:text-text-primary underline">Restablecer</button>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {areas.map(area => (
              <span key={area} className="flex items-center gap-1 bg-bg-primary border-[0.5px] border-border rounded-md px-2 py-1 text-[12px]">
                {area}
                <button
                  onClick={() => removeArea(area)}
                  className="text-text-tertiary hover:text-red-400 leading-none ml-0.5"
                >×</button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newArea}
              onChange={e => setNewArea(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addArea()}
              placeholder="Nueva área..."
              className="flex-1 bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent"
            />
            <button
              onClick={addArea}
              className="bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary"
            >
              + Agregar
            </button>
          </div>
        </div>

        {/* Sharing — org owners only */}
        {orgId && isOwner && shareUrl && (
          <div className="mb-6 border-t-[0.5px] border-border pt-5">
            <label className="text-[11px] uppercase tracking-[0.05em] text-text-secondary block mb-3">Compartir agenda (solo lectura)</label>

            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] text-text-primary">Permitir acceso al link público</span>
              <button
                onClick={() => setShareEnabled(e => !e)}
                className={`relative w-10 h-5 rounded-full transition-colors ${shareEnabled ? 'bg-accent' : 'bg-border-strong'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${shareEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {shareEnabled && (
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[11px] text-text-secondary truncate focus:outline-none"
                />
                <button
                  onClick={copyLink}
                  className="bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[12px] text-text-secondary hover:text-text-primary whitespace-nowrap"
                >
                  {copied ? 'Copiado ✓' : 'Copiar'}
                </button>
              </div>
            )}

            <p className="text-[11px] text-text-secondary mt-2">
              Quien tenga el link puede ver la agenda pero no puede editar ni agregar turnos.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-accent text-bg-primary px-5 py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={onClose} className="text-text-secondary px-4 py-2.5 text-[13px] hover:text-text-primary">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
