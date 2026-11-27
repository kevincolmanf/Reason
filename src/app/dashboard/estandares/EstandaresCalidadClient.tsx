'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/components/Dialogs'
import { FEATURE_KEY_ESTANDARES_CALIDAD, type EstandaresCalidadConfig, type AreaConfig } from '@/lib/qualityStandards/defaults'
import { newFieldKey, type IntakeFieldType } from '@/lib/qualityStandards/intakeFields'

export interface ProRow {
  professionalId: string
  professionalName: string
  area: string
  sesiones: string
  nuevosSinCuestionario: number
  altas: number
  derivaciones: number
  pausas: number
  abandonos: number
  desconocido: number
  pacientesAbiertos: number
  nuevosSinPlan: number
  evaluacionesIncompletas: number
  pasesSinInforme: number
}

const th = "text-left text-[11px] uppercase tracking-wide text-text-tertiary font-medium px-3 py-2"
const td = "px-3 py-2.5 text-[13px]"
const FIELD_TYPE_LABELS: Record<IntakeFieldType, string> = { texto: 'Texto', numero: 'Número', calidad: 'Calidad' }

export default function EstandaresCalidadClient({
  orgId, orgName, enabled: initialEnabled, config: initialConfig, agendaAreas, team,
}: {
  orgId: string
  orgName: string
  enabled: boolean
  config: EstandaresCalidadConfig
  agendaAreas: string[]
  team: ProRow[]
}) {
  const router = useRouter()
  const { notify, toast } = useToast()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [cfg, setCfg] = useState(initialConfig)
  const [saving, setSaving] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState<Record<string, string>>({})
  const [newFieldType, setNewFieldType] = useState<Record<string, IntakeFieldType>>({})
  const supabaseRef = useRef(createClient())

  const save = async (nextEnabled: boolean, nextConfig: EstandaresCalidadConfig) => {
    setSaving(true)
    const { error } = await supabaseRef.current.rpc('set_org_feature_setting', {
      p_org_id: orgId,
      p_feature_key: FEATURE_KEY_ESTANDARES_CALIDAD,
      p_enabled: nextEnabled,
      p_config: nextConfig,
    })
    setSaving(false)
    if (error) { notify('No se pudo guardar: ' + error.message, 'error'); return }
    notify('Guardado')
    router.refresh()
  }

  const updateArea = (area: string, patch: Partial<AreaConfig>) => {
    const next: EstandaresCalidadConfig = {
      areas: { ...cfg.areas, [area]: { ...(cfg.areas[area] ?? {}), ...patch } },
    }
    setCfg(next)
  }

  const addField = (area: string) => {
    const label = (newFieldLabel[area] ?? '').trim()
    if (!label) return
    const type = newFieldType[area] ?? 'texto'
    const current = cfg.areas[area]?.campos_evaluacion_ingreso ?? []
    const key = newFieldKey(label)
    if (current.some(f => f.key === key)) return
    updateArea(area, { campos_evaluacion_ingreso: [...current, { key, label, type }] })
    setNewFieldLabel({ ...newFieldLabel, [area]: '' })
  }

  const removeField = (area: string, key: string) => {
    const current = cfg.areas[area]?.campos_evaluacion_ingreso ?? []
    updateArea(area, { campos_evaluacion_ingreso: current.filter(f => f.key !== key) })
  }

  return (
    <div>
      {toast}
      <div className="mb-10">
        <h1 className="text-[28px] font-medium tracking-[-0.01em] mb-1">Estándares de calidad</h1>
        <p className="text-text-secondary text-[14px]">{orgName} · indicadores por profesional y área del mes en curso</p>
      </div>

      {/* Toggle */}
      <section className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-medium">Función activa para este centro</h2>
            <p className="text-[12px] text-text-secondary mt-0.5">
              {enabled ? 'Los profesionales ven sus propios pendientes en el dashboard.' : 'Apagada: nadie en este centro ve nada nuevo, y la tabla de abajo queda oculta.'}
            </p>
          </div>
          <button
            onClick={() => { setEnabled(!enabled); save(!enabled, cfg) }}
            disabled={saving}
            className={`shrink-0 relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-accent' : 'bg-border-strong'} disabled:opacity-50`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </section>

      {/* Config por área */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-medium">Configuración por área</h2>
          <Link href="/dashboard/agenda" className="text-[13px] text-accent hover:underline" title="Guardá los cambios de acá abajo antes de ir, si hiciste alguno">¿Falta un área? Agregala en Agenda →</Link>
        </div>

        {agendaAreas.length === 0 ? (
          <p className="text-[13px] text-text-tertiary">Este centro todavía no configuró áreas en su agenda.</p>
        ) : (
          <div className="space-y-6">
            {agendaAreas.map(area => {
              const areaCfg = cfg.areas[area] ?? {}
              const fields = areaCfg.campos_evaluacion_ingreso ?? []
              const hasConfig = Object.keys(areaCfg).length > 0
              return (
                <details key={area} open={hasConfig} className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-6">
                  <summary className="text-[15px] font-medium mb-4 cursor-pointer select-none">
                    {area}
                    {!hasConfig && <span className="ml-2 text-[11px] font-normal text-text-tertiary">— sin configurar (usa los valores por defecto)</span>}
                  </summary>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-1">
                    <div>
                      <label className="block text-[12px] text-text-secondary mb-1">Días máx. para cuestionario de ingreso</label>
                      <input type="number" placeholder="Sin verificar" value={areaCfg.dias_max_cuestionario_ingreso ?? ''}
                        onChange={e => updateArea(area, { dias_max_cuestionario_ingreso: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                      <label className="block text-[12px] text-text-secondary mb-1">Días sin sesión = paciente abierto</label>
                      <input type="number" placeholder="21 (default)" value={areaCfg.dias_paciente_abierto ?? ''}
                        onChange={e => updateArea(area, { dias_paciente_abierto: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                      <label className="block text-[12px] text-text-secondary mb-1">Días máx. para plan cargado</label>
                      <input type="number" placeholder="Sin verificar" value={areaCfg.dias_max_plan ?? ''}
                        onChange={e => updateArea(area, { dias_max_plan: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
                    </div>
                  </div>
                  <p className="text-[11px] text-text-tertiary mb-5">
                    Vacío = no se verifica ese indicador para esta área, salvo &quot;paciente abierto&quot;, que si queda vacío usa 21 días igual.
                  </p>

                  <div>
                    <label className="block text-[12px] text-text-secondary mb-2">Campos obligatorios de la evaluación de ingreso</label>
                    {fields.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {fields.map(f => (
                          <span key={f.key} className="flex items-center gap-1.5 bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-1.5 text-[13px]">
                            {f.label} <span className="text-text-tertiary">({FIELD_TYPE_LABELS[f.type]})</span>
                            <button onClick={() => removeField(area, f.key)} className="text-text-tertiary hover:text-warning ml-1">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input value={newFieldLabel[area] ?? ''} onChange={e => setNewFieldLabel({ ...newFieldLabel, [area]: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && addField(area)}
                        placeholder="Ej: Calidad de sentadilla"
                        className="flex-1 bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
                      <select value={newFieldType[area] ?? 'texto'} onChange={e => setNewFieldType({ ...newFieldType, [area]: e.target.value as IntakeFieldType })}
                        title="Texto o Número: se completa libre. Calidad: muestra las opciones Buena/Aceptable/Deficiente en la ficha."
                        className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent">
                        <option value="texto">Texto</option>
                        <option value="numero">Número</option>
                        <option value="calidad">Calidad (Buena/Aceptable/Deficiente)</option>
                      </select>
                      <button onClick={() => addField(area)} className="bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-4 text-[13px] font-medium hover:border-accent transition-colors">
                        + Agregar
                      </button>
                    </div>
                  </div>
                </details>
              )
            })}
          </div>
        )}

        <button
          onClick={() => save(enabled, cfg)}
          disabled={saving}
          className="mt-5 bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-all active:scale-[0.97]"
        >
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </section>

      {!enabled ? (
        <div className="bg-bg-secondary rounded-xl p-12 text-center border-[0.5px] border-dashed border-border">
          <p className="text-[14px] text-text-secondary">Activá la función arriba para ver los indicadores del equipo.</p>
        </div>
      ) : (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[18px] font-medium">Equipo</h2>
            <div className="flex gap-3">
              <a href={`/api/estandares/export?orgId=${orgId}&format=csv`} className="text-[13px] text-accent hover:underline">Descargar CSV (última semana)</a>
              <a href={`/api/estandares/export?orgId=${orgId}&format=json`} className="text-[13px] text-accent hover:underline">Descargar JSON</a>
            </div>
          </div>
          {team.length === 0 ? (
            <p className="text-[13px] text-text-tertiary">Sin datos de ningún profesional todavía este mes.</p>
          ) : (
            <div className="overflow-x-auto border-[0.5px] border-border rounded-xl">
              <table className="w-full border-collapse">
                <thead className="bg-bg-secondary">
                  <tr>
                    <th className={th}>Área</th>
                    <th className={th}>Profesional</th>
                    <th className={th}>Sesiones completas</th>
                    <th className={th}>Nuevos sin cuestionario</th>
                    <th className={th}>Altas</th>
                    <th className={th}>Derivaciones</th>
                    <th className={th}>Pausas</th>
                    <th className={th}>Abandonos</th>
                    <th className={th} title="Altas sin motivo registrado — generalmente de antes de usar este motivo de alta">Desconocido</th>
                    <th className={th}>Pacientes abiertos</th>
                    <th className={th}>Sin plan</th>
                    <th className={th}>Evaluaciones incompletas</th>
                    <th className={th}>Pases sin informe</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map(r => (
                    <tr key={`${r.area}-${r.professionalId}`} className="border-t-[0.5px] border-border">
                      <td className={td}>{r.area}</td>
                      <td className={`${td} font-medium`}>{r.professionalName}</td>
                      <td className={td}>{r.sesiones}</td>
                      <td className={td}>{r.nuevosSinCuestionario}</td>
                      <td className={td}>{r.altas}</td>
                      <td className={td}>{r.derivaciones}</td>
                      <td className={td}>{r.pausas}</td>
                      <td className={td}>{r.abandonos}</td>
                      <td className={td}>{r.desconocido}</td>
                      <td className={td}>{r.pacientesAbiertos}</td>
                      <td className={td}>{r.nuevosSinPlan}</td>
                      <td className={td}>{r.evaluacionesIncompletas}</td>
                      <td className={td}>{r.pasesSinInforme}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
