'use client'

import { useState } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface RedFlag {
  id: string
  text: string
  detail?: string
}

interface Region {
  id: string
  label: string
  color: string
  flags: RedFlag[]
}

// ─── Red flag data ──────────────────────────────────────────────────────────

const REGIONS: Region[] = [
  {
    id: 'raquis',
    label: 'Raquis / Columna',
    color: '#DC2626',
    flags: [
      { id: 'r1', text: 'Dolor nocturno intenso que no cede con el reposo', detail: 'Posible neoplasia, infección o fractura por insuficiencia.' },
      { id: 'r2', text: 'Pérdida de peso inexplicada (> 5 kg en 3 meses)', detail: 'Signo sistémico asociado a neoplasias.' },
      { id: 'r3', text: 'Fiebre o sudoración nocturna persistente', detail: 'Posible espondilodiscitis, tuberculosis ósea, neoplasia.' },
      { id: 'r4', text: 'Historia de neoplasia conocida', detail: 'Metástasis vertebrales, mieloma múltiple.' },
      { id: 'r5', text: 'Déficit neurológico progresivo (pérdida de fuerza o sensibilidad)', detail: 'Compresión medular o radicular severa.' },
      { id: 'r6', text: 'Síndrome de cauda equina: incontinencia vesical/intestinal, anestesia en silla de montar', detail: 'Emergencia quirúrgica. Derivación inmediata.' },
      { id: 'r7', text: 'Trauma de alta energía (accidente vehicular, caída de altura)', detail: 'Fractura vertebral traumática.' },
      { id: 'r8', text: 'Uso crónico de corticosteroides sistémicos u osteoporosis severa', detail: 'Fractura vertebral por compresión.' },
      { id: 'r9', text: 'Rigidez matutina > 1 hora, mejoría con actividad (< 45 años)', detail: 'Espondiloartropatía inflamatoria (ej. espondilitis anquilosante).' },
      { id: 'r10', text: 'Edad > 50 años con inicio agudo de dolor sin causa mecánica clara', detail: 'Fractura osteoporótica, neoplasia.' },
      { id: 'r11', text: 'Dolor torácico profundo no relacionado con movimiento', detail: 'Disección aórtica, patología visceral.' },
      { id: 'r12', text: 'Inmunosupresión (VIH, trasplantado, quimioterapia)', detail: 'Infección oportunista de columna.' },
    ],
  },
  {
    id: 'hombro',
    label: 'Hombro',
    color: '#D97706',
    flags: [
      { id: 'h1', text: 'Dolor que irradia hacia el brazo con parestesias (C5-C6)', detail: 'Posible radiculopatía cervical o síndrome del desfiladero torácico.' },
      { id: 'h2', text: 'Debilidad o atrofia muscular proximal rápidamente progresiva', detail: 'Síndrome de Parsonage-Turner (neuritis del plexo braquial), lesión del nervio espinal accesorio.' },
      { id: 'h3', text: 'Masa palpable o cambios de piel sobre el hombro o axila', detail: 'Neoplasia ósea o de partes blandas.' },
      { id: 'h4', text: 'Dolor de hombro asociado a dolor torácico o disnea', detail: 'Infarto agudo de miocardio (dolor referido), patología pleural.' },
      { id: 'h5', text: 'Dolor de hombro con fiebre, eritema local, calor', detail: 'Artritis séptica glenohumeral — emergencia ortopédica.' },
      { id: 'h6', text: 'Fractura no reconocida / historia de trauma significativo', detail: 'Fractura de húmero proximal, luxación glenoidea.' },
      { id: 'h7', text: 'Pérdida completa de fuerza en abducción tras trauma (> 90°)', detail: 'Ruptura masiva irreparable del manguito rotador.' },
      { id: 'h8', text: 'Dolor cervical asociado con limitación del rango cervical', detail: 'Causa cervicogénica — evaluar columna cervical primero.' },
      { id: 'h9', text: 'Sudoración nocturna, pérdida de peso, fatiga sistémica', detail: 'Neoplasia secundaria, linfoma.' },
      { id: 'h10', text: 'Síndrome de Pancoast: dolor hombro/axila + Horner + debilidad mano', detail: 'Tumor del ápex pulmonar — derivación urgente.' },
    ],
  },
  {
    id: 'rodilla',
    label: 'Rodilla',
    color: '#7C3AED',
    flags: [
      { id: 'k1', text: 'Derrame articular agudo con fiebre, eritema o calor intenso', detail: 'Artritis séptica — emergencia ortopédica, derivación inmediata.' },
      { id: 'k2', text: 'Hemartrosis postraumática (derrame hemático agudo)', detail: 'Ruptura LCA, fractura osteocondral, luxación patelar con avulsión.' },
      { id: 'k3', text: 'Fractura de rótula, tibia proximal o fémur distal', detail: 'Trauma directo o indirecto significativo.' },
      { id: 'k4', text: 'Dolor nocturno intenso o en reposo sin posición de alivio', detail: 'Neoplasia ósea primaria o secundaria (condrosarcoma, osteosarcoma).' },
      { id: 'k5', text: 'Masa palpable en rodilla o muslo distal', detail: 'Neoplasia de partes blandas o ósea.' },
      { id: 'k6', text: 'Inestabilidad con incapacidad total de carga postraumática', detail: 'Lesión multiligamentaria, luxación de rodilla (lesión vascular asociada).' },
      { id: 'k7', text: 'Déficit neurovascular distal (pulso, sensibilidad, movilidad del pie)', detail: 'Lesión de arteria poplítea en luxación de rodilla — emergencia vascular.' },
      { id: 'k8', text: 'Dolor en rodilla referido desde la cadera (cadera excluida)', detail: 'Epifisiólisis femoral proximal en adolescentes, necrosis avascular.' },
      { id: 'k9', text: 'Pérdida de peso, fatiga, sudoración nocturna en paciente joven', detail: 'Neoplasia ósea primaria (osteosarcoma frecuente en metáfisis distal de fémur).' },
      { id: 'k10', text: 'Artritis reumatoide u otra enfermedad inflamatoria sistémica activa', detail: 'Evaluar actividad inflamatoria antes de tratar mecánicamente.' },
    ],
  },
]

// ─── Main component ─────────────────────────────────────────────────────────

export default function BanderasRojasClient() {
  const [activeRegion, setActiveRegion] = useState<string>('raquis')
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const region = REGIONS.find(r => r.id === activeRegion)!
  const checkedInRegion = region.flags.filter(f => checked[f.id])
  const hasWarning = checkedInRegion.length > 0

  const toggleFlag = (id: string) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const clearRegion = () => {
    const ids = region.flags.map(f => f.id)
    setChecked(prev => {
      const n = { ...prev }
      ids.forEach(id => delete n[id])
      return n
    })
  }

  const totalChecked = (r: Region) => r.flags.filter(f => checked[f.id]).length

  return (
    <div className="flex gap-6">
      {/* Region tabs */}
      <div className="w-[200px] shrink-0 space-y-1">
        {REGIONS.map(r => {
          const count = totalChecked(r)
          return (
            <button
              key={r.id}
              onClick={() => setActiveRegion(r.id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all border-[0.5px] ${activeRegion === r.id ? 'border-border bg-bg-secondary' : 'border-transparent hover:bg-bg-secondary/60'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color, opacity: activeRegion === r.id ? 1 : 0.4 }} />
                  <span className={`text-[13px] font-medium transition-colors ${activeRegion === r.id ? 'text-text-primary' : 'text-text-secondary'}`}>{r.label}</span>
                </div>
                {count > 0 && (
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: r.color }}>{count}</span>
                )}
              </div>
            </button>
          )
        })}
        <div className="pt-4 border-t-[0.5px] border-border mt-4">
          <p className="text-[11px] text-text-secondary leading-[1.6] px-1">
            Marcá los signos presentes. Si alguno está activo, considerá derivación urgente o estudios complementarios.
          </p>
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ background: region.color }} />
            <h2 className="text-[20px] font-medium tracking-[-0.02em]">{region.label}</h2>
            <span className="text-[13px] text-text-secondary">{region.flags.length} señales de alarma</span>
          </div>
          {checkedInRegion.length > 0 && (
            <button onClick={clearRegion} className="text-[12px] text-text-secondary hover:text-warning transition-colors">
              Limpiar selección
            </button>
          )}
        </div>

        {/* Warning banner */}
        {hasWarning && (
          <div className="bg-[#dc2626]/10 border-[0.5px] border-[#dc2626]/40 rounded-xl p-4 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#dc2626] flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-white text-[11px] font-bold">!</span>
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#dc2626] mb-1">
                {checkedInRegion.length === 1
                  ? '1 bandera roja detectada — considerar derivación urgente'
                  : `${checkedInRegion.length} banderas rojas detectadas — considerar derivación urgente`}
              </p>
              <p className="text-[13px] text-[#dc2626]/70">
                La presencia de uno o más de estos signos requiere evaluación médica prioritaria o complementación diagnóstica antes de iniciar o continuar el tratamiento kinésico.
              </p>
            </div>
          </div>
        )}

        {/* Flags list */}
        <div className="space-y-2">
          {region.flags.map(flag => {
            const isChecked = checked[flag.id] ?? false
            const isExpanded = collapsed[flag.id] ?? false
            return (
              <div
                key={flag.id}
                className={`border-[0.5px] rounded-xl transition-all ${isChecked ? 'bg-[#dc2626]/8 border-[#dc2626]/40' : 'bg-bg-secondary border-border'}`}
              >
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleFlag(flag.id)}
                    className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer accent-[#dc2626]"
                  />
                  <div className="flex-1">
                    <p className={`text-[13px] font-medium leading-snug cursor-pointer ${isChecked ? 'text-[#dc2626]' : 'text-text-primary'}`} onClick={() => toggleFlag(flag.id)}>
                      {flag.text}
                    </p>
                    {flag.detail && (
                      <>
                        <button
                          onClick={() => setCollapsed(prev => ({ ...prev, [flag.id]: !prev[flag.id] }))}
                          className="text-[11px] text-text-secondary hover:text-text-primary transition-colors mt-1"
                        >
                          {isExpanded ? '▲ Ocultar' : '▼ Ver contexto clínico'}
                        </button>
                        {isExpanded && (
                          <p className="text-[12px] text-text-secondary mt-1.5 leading-[1.6]">{flag.detail}</p>
                        )}
                      </>
                    )}
                  </div>
                  {isChecked && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white bg-[#dc2626] shrink-0 mt-0.5">!</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary of checked flags */}
        {checkedInRegion.length > 0 && (
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5">
            <p className="text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium mb-3">Resumen — Señales presentes</p>
            <ul className="space-y-1.5">
              {checkedInRegion.map(f => (
                <li key={f.id} className="flex items-start gap-2">
                  <span className="text-[#dc2626] mt-0.5 shrink-0">•</span>
                  <span className="text-[13px] text-text-primary">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
