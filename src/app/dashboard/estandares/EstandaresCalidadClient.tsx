'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/components/Dialogs'
import { FEATURE_KEY_ESTANDARES_CALIDAD, type EstandaresCalidadConfig } from '@/lib/qualityStandards/defaults'
import { INTAKE_FIELD_CATALOG } from '@/lib/qualityStandards/intakeFields'

export interface KineProRow {
  id: string
  name: string
  sesiones: string
  nuevosSinCuestionario: number
  altas: number
  derivaciones: number
  pausas: number
  abandonos: number
  desconocido: number
  pacientesAbiertos: number
  pasesSinInforme: number
}

export interface EntrenoProRow {
  id: string
  name: string
  alumnosNuevos: number
  nuevosSinPlan: number
  evaluacionesIncompletas: number
  pasesSinInforme: number
}

const th = "text-left text-[11px] uppercase tracking-wide text-text-tertiary font-medium px-3 py-2"
const td = "px-3 py-2.5 text-[13px]"

export default function EstandaresCalidadClient({
  orgId, orgName, enabled: initialEnabled, config: initialConfig, kineTeam, entrenoTeam,
}: {
  orgId: string
  orgName: string
  enabled: boolean
  config: EstandaresCalidadConfig
  kineTeam: KineProRow[]
  entrenoTeam: EntrenoProRow[]
}) {
  const router = useRouter()
  const { notify, toast } = useToast()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [cfg, setCfg] = useState(initialConfig)
  const [saving, setSaving] = useState(false)
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

  const toggleField = (key: string) => {
    const has = cfg.campos_obligatorios_evaluacion_ingreso.includes(key)
    const next = has
      ? cfg.campos_obligatorios_evaluacion_ingreso.filter(k => k !== key)
      : [...cfg.campos_obligatorios_evaluacion_ingreso, key]
    setCfg({ ...cfg, campos_obligatorios_evaluacion_ingreso: next })
  }

  return (
    <div>
      {toast}
      <div className="mb-10">
        <h1 className="text-[28px] font-medium tracking-[-0.01em] mb-1">Estándares de calidad</h1>
        <p className="text-text-secondary text-[14px]">{orgName} · indicadores por profesional del mes en curso</p>
      </div>

      {/* Toggle + configuración */}
      <section className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-6 mb-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[15px] font-medium">Función activa para este centro</h2>
            <p className="text-[12px] text-text-secondary mt-0.5">
              {enabled ? 'Los profesionales ven sus propios pendientes en el dashboard.' : 'Apagada: nadie en este centro ve nada nuevo.'}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Días máx. para cuestionario de ingreso</label>
            <input type="number" value={cfg.dias_max_cuestionario_ingreso}
              onChange={e => setCfg({ ...cfg, dias_max_cuestionario_ingreso: Number(e.target.value) || 0 })}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Días sin sesión = paciente abierto</label>
            <input type="number" value={cfg.dias_paciente_abierto}
              onChange={e => setCfg({ ...cfg, dias_paciente_abierto: Number(e.target.value) || 0 })}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Días máx. para plan de entrenamiento</label>
            <input type="number" value={cfg.dias_max_plan_entrenamiento}
              onChange={e => setCfg({ ...cfg, dias_max_plan_entrenamiento: Number(e.target.value) || 0 })}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-[12px] text-text-secondary mb-2">Campos obligatorios de la evaluación de ingreso (entrenamiento)</label>
          <div className="flex flex-wrap gap-2">
            {INTAKE_FIELD_CATALOG.map(f => {
              const sel = cfg.campos_obligatorios_evaluacion_ingreso.includes(f.key)
              return (
                <button key={f.key} type="button" onClick={() => toggleField(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] border-[0.5px] transition-colors ${sel ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border-strong text-text-secondary hover:text-text-primary'}`}
                >{f.label}</button>
              )
            })}
          </div>
        </div>

        <button
          onClick={() => save(enabled, cfg)}
          disabled={saving}
          className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-all active:scale-[0.97]"
        >
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </section>

      {!enabled ? (
        <div className="bg-bg-secondary rounded-xl p-12 text-center border-[0.5px] border-dashed border-border">
          <p className="text-[14px] text-text-secondary">Activá la función arriba para ver los indicadores del equipo.</p>
        </div>
      ) : (
        <div className="space-y-12">
          <section>
            <h2 className="text-[18px] font-medium mb-4">Kinesiología</h2>
            {kineTeam.length === 0 ? (
              <p className="text-[13px] text-text-tertiary">Sin pacientes de kinesiología en este centro todavía.</p>
            ) : (
              <div className="overflow-x-auto border-[0.5px] border-border rounded-xl">
                <table className="w-full border-collapse">
                  <thead className="bg-bg-secondary">
                    <tr>
                      <th className={th}>Profesional</th>
                      <th className={th}>Sesiones completas</th>
                      <th className={th}>Nuevos sin cuestionario</th>
                      <th className={th}>Altas</th>
                      <th className={th}>Derivaciones</th>
                      <th className={th}>Pausas</th>
                      <th className={th}>Abandonos</th>
                      <th className={th}>Desconocido</th>
                      <th className={th}>Pacientes abiertos</th>
                      <th className={th}>Pases sin informe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kineTeam.map(r => (
                      <tr key={r.id} className="border-t-[0.5px] border-border">
                        <td className={`${td} font-medium`}>{r.name}</td>
                        <td className={td}>{r.sesiones}</td>
                        <td className={td}>{r.nuevosSinCuestionario}</td>
                        <td className={td}>{r.altas}</td>
                        <td className={td}>{r.derivaciones}</td>
                        <td className={td}>{r.pausas}</td>
                        <td className={td}>{r.abandonos}</td>
                        <td className={td}>{r.desconocido}</td>
                        <td className={td}>{r.pacientesAbiertos}</td>
                        <td className={td}>{r.pasesSinInforme}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-[18px] font-medium mb-4">Entrenamiento</h2>
            {entrenoTeam.length === 0 ? (
              <p className="text-[13px] text-text-tertiary">Sin alumnos de entrenamiento en este centro todavía.</p>
            ) : (
              <div className="overflow-x-auto border-[0.5px] border-border rounded-xl">
                <table className="w-full border-collapse">
                  <thead className="bg-bg-secondary">
                    <tr>
                      <th className={th}>Profesional</th>
                      <th className={th}>Alumnos nuevos</th>
                      <th className={th}>Sin plan</th>
                      <th className={th}>Evaluaciones incompletas</th>
                      <th className={th}>Pases sin informe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entrenoTeam.map(r => (
                      <tr key={r.id} className="border-t-[0.5px] border-border">
                        <td className={`${td} font-medium`}>{r.name}</td>
                        <td className={td}>{r.alumnosNuevos}</td>
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
        </div>
      )}
    </div>
  )
}
