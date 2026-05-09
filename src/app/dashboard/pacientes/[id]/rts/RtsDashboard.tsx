'use client'

import { RtsEvaluation, computeMetrics, getLSIColor, getStatusIcon } from './rtsUtils'

interface RtsDashboardProps {
  evaluation: RtsEvaluation
  previousEvals: RtsEvaluation[]
  onNewEvaluation: () => void
  onSave?: () => void
  isSaved: boolean
  isSaving: boolean
}

function ProgressBar({ value, color }: { value: number; color: 'green' | 'orange' | 'red' | 'gray' }) {
  const colorMap = {
    green: 'bg-[#4ade80]',
    orange: 'bg-[#fb923c]',
    red: 'bg-[#f87171]',
    gray: 'bg-[#6b7280]',
  }
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorMap[color]}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-[13px] text-text-secondary w-10 text-right">{Math.round(value)}%</span>
    </div>
  )
}

export default function RtsDashboard({ evaluation, previousEvals, onNewEvaluation, onSave, isSaved, isSaving }: RtsDashboardProps) {
  const metrics = computeMetrics(evaluation)
  const { monthsSince, totalCriteria, passedCriteria } = metrics

  // Build criteria rows
  type CriteriaRow = {
    label: string
    value: string
    cutoff: string
    status: 'pass' | 'warn' | 'fail' | 'na'
    source: string
    section: string
  }

  const rows: CriteriaRow[] = []

  // --- FASE PREVIA ---
  if (evaluation.effusion !== null && evaluation.effusion !== undefined) {
    rows.push({
      section: 'Fase Previa',
      label: 'Derrame articular',
      value: ['Ninguno', 'Traza', 'Moderado', 'Severo'][evaluation.effusion] ?? String(evaluation.effusion),
      cutoff: '≤ Traza',
      status: evaluation.effusion <= 1 ? 'pass' : 'fail',
      source: 'Criterios clásicos',
    })
  }
  if (evaluation.rom_extension !== null && evaluation.rom_extension !== undefined) {
    rows.push({
      section: 'Fase Previa',
      label: 'Déficit extensión',
      value: `${evaluation.rom_extension}°`,
      cutoff: '0°',
      status: evaluation.rom_extension === 0 ? 'pass' : 'fail',
      source: 'Grindem 2016',
    })
  }
  if (evaluation.rom_flexion !== null && evaluation.rom_flexion !== undefined) {
    rows.push({
      section: 'Fase Previa',
      label: 'Flexión alcanzada',
      value: `${evaluation.rom_flexion}°`,
      cutoff: '≥ 120°',
      status: evaluation.rom_flexion >= 120 ? 'pass' : evaluation.rom_flexion >= 100 ? 'warn' : 'fail',
      source: 'Criterios clásicos',
    })
  }
  if (evaluation.pain_vas !== null && evaluation.pain_vas !== undefined) {
    rows.push({
      section: 'Fase Previa',
      label: 'Dolor EVA (reposo)',
      value: `${evaluation.pain_vas}/10`,
      cutoff: '≤ 2',
      status: evaluation.pain_vas <= 2 ? 'pass' : evaluation.pain_vas <= 4 ? 'warn' : 'fail',
      source: 'Criterios clásicos',
    })
  }

  // --- FUERZA ---
  if (metrics.quadLSI !== null) {
    rows.push({
      section: 'Fuerza',
      label: 'LSI Cuádriceps',
      value: `${metrics.quadLSI.toFixed(1)}%`,
      cutoff: '≥ 90%',
      status: metrics.quadLSI >= 90 ? 'pass' : metrics.quadLSI >= 80 ? 'warn' : 'fail',
      source: 'Grindem 2016',
    })
  }
  if (metrics.hamstringLSI !== null) {
    rows.push({
      section: 'Fuerza',
      label: 'LSI Isquiotibiales',
      value: `${metrics.hamstringLSI.toFixed(1)}%`,
      cutoff: '≥ 90%',
      status: metrics.hamstringLSI >= 90 ? 'pass' : metrics.hamstringLSI >= 80 ? 'warn' : 'fail',
      source: 'Grindem 2016',
    })
  }
  if (metrics.hqRatio !== null) {
    rows.push({
      section: 'Fuerza',
      label: 'Ratio H:Q',
      value: metrics.hqRatio.toFixed(2),
      cutoff: '≥ 0.60',
      status: metrics.hqRatio >= 0.60 ? 'pass' : metrics.hqRatio >= 0.50 ? 'warn' : 'fail',
      source: 'Kyritsis 2016',
    })
  }

  // --- SALTOS HORIZONTALES ---
  const hopTests: Array<{ key: keyof typeof metrics; label: string }> = [
    { key: 'singleHopLSI', label: 'Single Hop' },
    { key: 'tripleHopLSI', label: 'Triple Hop' },
    { key: 'crossoverLSI', label: 'Triple Crossover' },
    { key: 'timedHopLSI', label: '6m Timed Hop' },
  ]
  for (const ht of hopTests) {
    const val = metrics[ht.key] as number | null
    if (val !== null) {
      rows.push({
        section: 'Saltos Horizontales',
        label: ht.label,
        value: `${val.toFixed(1)}%`,
        cutoff: '≥ 90%',
        status: val >= 90 ? 'pass' : val >= 80 ? 'warn' : 'fail',
        source: 'Noyes 1991',
      })
    }
  }

  // --- SALTOS VERTICALES ---
  if (metrics.slcmjLSI !== null) {
    rows.push({
      section: 'Saltos Verticales',
      label: 'SL-CMJ LSI',
      value: `${metrics.slcmjLSI.toFixed(1)}%`,
      cutoff: '≥ 90%',
      status: metrics.slcmjLSI >= 90 ? 'pass' : metrics.slcmjLSI >= 80 ? 'warn' : 'fail',
      source: 'Kyritsis 2016',
    })
  }
  if (evaluation.drop_jump_quality) {
    rows.push({
      section: 'Saltos Verticales',
      label: 'Drop Jump — Calidad',
      value: evaluation.drop_jump_quality === 'good' ? 'Buena' : evaluation.drop_jump_quality === 'moderate' ? 'Moderada' : 'Pobre',
      cutoff: 'Buena calidad',
      status: evaluation.drop_jump_quality === 'good' ? 'pass' : evaluation.drop_jump_quality === 'moderate' ? 'warn' : 'fail',
      source: 'Kyritsis 2016',
    })
  }

  // --- CUESTIONARIOS ---
  if (evaluation.koos_sport !== null && evaluation.koos_sport !== undefined) {
    rows.push({
      section: 'Cuestionarios',
      label: 'KOOS-Sport',
      value: `${evaluation.koos_sport}/100`,
      cutoff: '≥ 89',
      status: evaluation.koos_sport >= 89 ? 'pass' : evaluation.koos_sport >= 70 ? 'warn' : 'fail',
      source: 'van Yperen 2018',
    })
  }
  if (evaluation.acl_rsi !== null && evaluation.acl_rsi !== undefined) {
    rows.push({
      section: 'Cuestionarios',
      label: 'ACL-RSI',
      value: `${evaluation.acl_rsi}/100`,
      cutoff: '≥ 65',
      status: evaluation.acl_rsi >= 65 ? 'pass' : evaluation.acl_rsi >= 50 ? 'warn' : 'fail',
      source: 'Webster 2018',
    })
  }
  if (evaluation.grs !== null && evaluation.grs !== undefined) {
    rows.push({
      section: 'Cuestionarios',
      label: 'GRS',
      value: `${evaluation.grs}/100`,
      cutoff: '≥ 90',
      status: evaluation.grs >= 90 ? 'pass' : evaluation.grs >= 75 ? 'warn' : 'fail',
      source: 'Barber-Westin 2011',
    })
  }

  const sections = ['Fase Previa', 'Fuerza', 'Saltos Horizontales', 'Saltos Verticales', 'Cuestionarios']

  const statusColor = (s: CriteriaRow['status']) => {
    if (s === 'pass') return 'text-[#4ade80]'
    if (s === 'warn') return 'text-[#fb923c]'
    if (s === 'fail') return 'text-[#f87171]'
    return 'text-text-secondary'
  }
  const statusLabel = (s: CriteriaRow['status']) => {
    if (s === 'pass') return '✓'
    if (s === 'warn') return '⚠'
    if (s === 'fail') return '✗'
    return '—'
  }

  // Domain scores for bar chart
  const domainScores: Array<{ label: string; pct: number; color: 'green' | 'orange' | 'red' | 'gray' }> = []

  // Time domain
  const timePct = monthsSince !== null ? Math.min(100, (monthsSince / 9) * 100) : 0
  domainScores.push({
    label: 'Tiempo post-cirugía',
    pct: timePct,
    color: timePct >= 100 ? 'green' : timePct >= 66 ? 'orange' : 'red',
  })

  // Strength domain
  const strengthVals = [metrics.quadLSI, metrics.hamstringLSI].filter((v): v is number => v !== null)
  if (strengthVals.length > 0) {
    const avg = strengthVals.reduce((a, b) => a + b, 0) / strengthVals.length
    domainScores.push({ label: 'Fuerza (LSI)', pct: avg, color: getLSIColor(avg) })
  }

  // Hop domain
  const hopVals = [metrics.singleHopLSI, metrics.tripleHopLSI, metrics.crossoverLSI, metrics.timedHopLSI].filter((v): v is number => v !== null)
  if (hopVals.length > 0) {
    const avg = hopVals.reduce((a, b) => a + b, 0) / hopVals.length
    domainScores.push({ label: 'Saltos Horizontales', pct: avg, color: getLSIColor(avg) })
  }

  // Vertical domain
  const vertVals: number[] = []
  if (metrics.slcmjLSI !== null) vertVals.push(metrics.slcmjLSI)
  if (evaluation.drop_jump_quality) vertVals.push(evaluation.drop_jump_quality === 'good' ? 100 : evaluation.drop_jump_quality === 'moderate' ? 75 : 40)
  if (vertVals.length > 0) {
    const avg = vertVals.reduce((a, b) => a + b, 0) / vertVals.length
    domainScores.push({ label: 'Saltos Verticales', pct: avg, color: getLSIColor(avg) })
  }

  // Questionnaire domain
  const qVals: number[] = []
  if (evaluation.koos_sport !== null && evaluation.koos_sport !== undefined) qVals.push(evaluation.koos_sport)
  if (evaluation.acl_rsi !== null && evaluation.acl_rsi !== undefined) qVals.push(evaluation.acl_rsi)
  if (evaluation.grs !== null && evaluation.grs !== undefined) qVals.push(evaluation.grs)
  if (qVals.length > 0) {
    const avg = qVals.reduce((a, b) => a + b, 0) / qVals.length
    domainScores.push({ label: 'Cuestionarios', pct: avg, color: getLSIColor(avg) })
  }

  // Analysis insights
  const insights = generateAnalysis(evaluation, metrics)

  const allPassed = passedCriteria === totalCriteria && totalCriteria > 0

  const graftLabel: Record<string, string> = {
    htb: 'HTB (hueso-tendón patelar-hueso)',
    stg: 'Semitendinoso + Gracilis',
    qt: 'Tendón cuadricipital',
    other: 'Otro',
  }

  return (
    <div className="space-y-8">
      {/* HEADER — RESUMEN EJECUTIVO */}
      <div className={`rounded-xl border-[0.5px] p-6 ${allPassed ? 'border-[#4ade80] bg-[#4ade8010]' : 'border-[#f87171] bg-[#f8717110]'}`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className={`text-[13px] font-semibold uppercase tracking-[0.08em] mb-1 ${allPassed ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
              {allPassed ? 'CRITERIOS CUMPLIDOS' : 'CRITERIOS PENDIENTES'}
            </div>
            <div className="text-[28px] font-medium tracking-[-0.02em]">
              {passedCriteria} / {totalCriteria}
            </div>
            <div className="text-[14px] text-text-secondary mt-1">
              {allPassed
                ? 'El paciente cumple todos los criterios evaluados para el retorno al deporte.'
                : `Faltan ${totalCriteria - passedCriteria} criterio${totalCriteria - passedCriteria > 1 ? 's' : ''} para aprobar el protocolo.`}
            </div>
          </div>
          {evaluation.graft_type && (
            <div className="text-[13px] text-text-secondary bg-bg-secondary border-[0.5px] border-border rounded-lg px-3 py-2">
              <div className="text-[11px] uppercase tracking-[0.05em] mb-0.5">Injerto</div>
              <div className="text-text-primary">{graftLabel[evaluation.graft_type] ?? evaluation.graft_type}</div>
            </div>
          )}
        </div>
      </div>

      {/* PANEL DE TIEMPO */}
      {monthsSince !== null && (
        <div className={`rounded-xl border-[0.5px] p-6 ${monthsSince >= 9 ? 'border-[#4ade80] bg-[#4ade8008]' : 'border-[#f87171] bg-[#f8717108]'}`}>
          <div className="flex items-center gap-6">
            <div className={`text-[48px] font-medium leading-none ${monthsSince >= 9 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
              {monthsSince}
            </div>
            <div>
              <div className="text-[16px] font-medium">meses desde la cirugía</div>
              <div className={`text-[13px] mt-0.5 ${monthsSince >= 9 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                {monthsSince >= 9 ? '✓ Tiempo suficiente' : '✗ Menos de 9 meses — riesgo elevado'}
              </div>
              <div className="text-[12px] text-text-secondary mt-1">
                Grindem 2016: cada mes adicional entre 6-9 meses reduce el riesgo de relesión un 51%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERFIL POR DOMINIOS (barras horizontales) */}
      {domainScores.length > 0 && (
        <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
          <h2 className="text-[16px] font-medium mb-5">Perfil por Dominio</h2>
          <div className="space-y-4">
            {domainScores.map(d => (
              <div key={d.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[13px] text-text-secondary">{d.label}</span>
                </div>
                <ProgressBar value={d.pct} color={d.color} />
              </div>
            ))}
          </div>
          <div className="mt-4 text-[11px] text-text-secondary">
            Los valores representan porcentaje de cumplimiento respecto al criterio de corte de cada dominio.
          </div>
        </div>
      )}

      {/* TABLA DE CRITERIOS */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b-[0.5px] border-border">
          <h2 className="text-[16px] font-medium">Criterios Evaluados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b-[0.5px] border-border">
                <th className="text-left px-6 py-3 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-normal">Criterio</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-normal">Valor</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-normal">Corte</th>
                <th className="text-center px-4 py-3 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-normal">Estado</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-normal">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(section => {
                const sectionRows = rows.filter(r => r.section === section)
                if (sectionRows.length === 0) return null
                return (
                  <>
                    <tr key={`sec-${section}`} className="bg-bg-secondary">
                      <td colSpan={5} className="px-6 py-2 text-[11px] uppercase tracking-[0.06em] text-text-secondary font-medium">
                        {section}
                      </td>
                    </tr>
                    {sectionRows.map((row, i) => (
                      <tr key={`${section}-${i}`} className="border-t-[0.5px] border-border hover:bg-bg-secondary transition-colors">
                        <td className="px-6 py-3 text-text-primary">{row.label}</td>
                        <td className="px-4 py-3 font-medium text-text-primary">{row.value}</td>
                        <td className="px-4 py-3 text-text-secondary">{row.cutoff}</td>
                        <td className={`px-4 py-3 text-center font-bold text-[15px] ${statusColor(row.status)}`}>
                          {statusLabel(row.status)}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-[11px]">{row.source}</td>
                      </tr>
                    ))}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ANÁLISIS CLÍNICO */}
      {insights.length > 0 && (
        <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
          <h2 className="text-[16px] font-medium mb-4">Análisis Clínico</h2>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="text-[14px] text-text-secondary leading-relaxed p-3 bg-bg-secondary rounded-lg border-[0.5px] border-border">
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPARACIÓN LONGITUDINAL */}
      {previousEvals.length > 1 && (
        <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
          <h2 className="text-[16px] font-medium mb-4">Evolución Longitudinal</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b-[0.5px] border-border">
                  <th className="text-left py-2 pr-4 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-normal">Fecha</th>
                  <th className="text-right py-2 px-4 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-normal">LSI Quad</th>
                  <th className="text-right py-2 px-4 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-normal">LSI Isquio</th>
                  <th className="text-right py-2 px-4 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-normal">Single Hop</th>
                  <th className="text-right py-2 px-4 text-[11px] uppercase tracking-[0.05em] text-text-secondary font-normal">Criterios</th>
                </tr>
              </thead>
              <tbody>
                {previousEvals.map(ev => {
                  const m = computeMetrics(ev)
                  return (
                    <tr key={ev.id} className="border-t-[0.5px] border-border">
                      <td className="py-2 pr-4 text-text-secondary">
                        {new Date(ev.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={`py-2 px-4 text-right font-medium ${m.quadLSI !== null ? (m.quadLSI >= 90 ? 'text-[#4ade80]' : m.quadLSI >= 80 ? 'text-[#fb923c]' : 'text-[#f87171]') : 'text-text-secondary'}`}>
                        {m.quadLSI !== null ? `${m.quadLSI.toFixed(1)}%` : '—'}
                      </td>
                      <td className={`py-2 px-4 text-right font-medium ${m.hamstringLSI !== null ? (m.hamstringLSI >= 90 ? 'text-[#4ade80]' : m.hamstringLSI >= 80 ? 'text-[#fb923c]' : 'text-[#f87171]') : 'text-text-secondary'}`}>
                        {m.hamstringLSI !== null ? `${m.hamstringLSI.toFixed(1)}%` : '—'}
                      </td>
                      <td className={`py-2 px-4 text-right font-medium ${m.singleHopLSI !== null ? (m.singleHopLSI >= 90 ? 'text-[#4ade80]' : m.singleHopLSI >= 80 ? 'text-[#fb923c]' : 'text-[#f87171]') : 'text-text-secondary'}`}>
                        {m.singleHopLSI !== null ? `${m.singleHopLSI.toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2 px-4 text-right text-text-secondary">
                        {m.passedCriteria}/{m.totalCriteria}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FOOTER — ACCIONES */}
      <div className="flex gap-3 flex-wrap pb-8">
        {!isSaved && onSave && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="bg-accent text-bg-primary px-6 py-2.5 rounded-lg text-[14px] font-medium hover:opacity-90 disabled:opacity-40"
          >
            {isSaving ? 'Guardando...' : 'Guardar evaluación'}
          </button>
        )}
        {isSaved && (
          <span className="text-[13px] text-[#4ade80] py-2.5 px-2 flex items-center gap-1">
            ✓ Evaluación guardada
          </span>
        )}
        <button
          onClick={onNewEvaluation}
          className="bg-bg-secondary border-[0.5px] border-border text-text-primary px-6 py-2.5 rounded-lg text-[14px] hover:bg-bg-primary transition-colors"
        >
          Nueva evaluación
        </button>
      </div>
    </div>
  )
}

function generateAnalysis(evaluation: RtsEvaluation, metrics: ReturnType<typeof computeMetrics>): string[] {
  const insights: string[] = []
  const { monthsSince, quadLSI, hamstringLSI, hqRatio, singleHopLSI, tripleHopLSI, crossoverLSI, timedHopLSI, slcmjLSI } = metrics

  // Tiempo
  if (monthsSince !== null && monthsSince < 9) {
    insights.push(`⚠ Con ${monthsSince} meses post-cirugía, el riesgo de relesión es significativamente mayor. Grindem et al. (2016) demuestran que el retorno antes de los 9 meses se asocia a 7× más riesgo. Se recomienda continuar la rehabilitación independientemente del estado funcional.`)
  }

  // Fuerza — cuádriceps
  if (quadLSI !== null && quadLSI < 90) {
    insights.push(`⚠ El LSI de cuádriceps (${quadLSI.toFixed(1)}%) no alcanza el umbral mínimo del 90%. Este déficit, si persiste al RTS, se asocia directamente a mayor riesgo de relesión. Priorizar ejercicio de fuerza excéntrico y isométrico de alta carga.`)
  }

  // Ratio H:Q
  if (hqRatio !== null && hqRatio < 0.60) {
    insights.push(`🚨 El ratio H:Q (${hqRatio.toFixed(2)}) es el predictor más potente de ruptura de injerto. Kyritsis et al. (2016) reportan HR 10.6 por cada 10% de reducción. Fortalecer isquiotibiales es prioritario.`)
  }

  // Injerto específico
  if (evaluation.graft_type === 'stg') {
    insights.push(`ℹ Injerto de semitendinoso/gracilis: déficits de isquiotibiales pueden persistir 12-24 meses post-cirugía debido a la extracción del injerto. Considerar este factor al interpretar el LSI de isquiotibiales.`)
  }
  if (evaluation.graft_type === 'htb') {
    insights.push(`ℹ Injerto HTB: el cuádriceps puede verse afectado por la extracción del bloque patelar. El timeline para alcanzar criterios funcionales es típicamente 12 semanas mayor que con isquiotibiales.`)
  }

  // Hop tests
  const hopLSIs = [singleHopLSI, tripleHopLSI, crossoverLSI, timedHopLSI].filter((v): v is number => v !== null)
  const allHopsPassed = hopLSIs.length > 0 && hopLSIs.every(lsi => lsi >= 90)
  if (hopLSIs.length > 0 && !allHopsPassed) {
    insights.push(`⚠ Los hop tests horizontales no están todos dentro del rango. Recordar que estas pruebas son preplaneadas y no evalúan movimiento reactivo — su aprobación es necesaria pero no suficiente para garantizar seguridad en el juego real.`)
  }

  // Saltos verticales
  if (slcmjLSI !== null && slcmjLSI < 90) {
    insights.push(`⚠ El Single Leg CMJ (LSI ${slcmjLSI.toFixed(1)}%) refleja déficit en la transferencia de fuerza del cuádriceps en el plano vertical. Este test es más sensible a déficits residuales de cuádriceps que los hop tests horizontales.`)
  }

  if (evaluation.drop_jump_quality === 'poor') {
    insights.push(`🚨 Calidad de aterrizaje en Drop Jump comprometida. El valgo dinámico en aterrizaje se asocia a OR 3.3 de relesión (Kyritsis, 2016). Trabajar control neuromuscular y estabilidad de core antes del RTS.`)
  }

  // Psicológico
  if (evaluation.acl_rsi !== null && evaluation.acl_rsi !== undefined && evaluation.acl_rsi < 65) {
    insights.push(`⚠ ACL-RSI < 65: el readiness psicológico es insuficiente. Los atletas con scores bajos tienen 3-4× menos probabilidad de retornar exitosamente al deporte previo. Considerar abordaje psicológico específico.`)
  }

  // Wellsandt warning sobre LSI
  if (quadLSI !== null || hamstringLSI !== null) {
    insights.push(`ℹ El LSI puede sobreestimar la recuperación si el miembro sano también perdió fuerza durante la rehabilitación. Comparar con valores preoperatorios cuando estén disponibles. (Wellsandt et al., 2017)`)
  }

  // Todo aprobado
  if (metrics.passedCriteria === metrics.totalCriteria && metrics.totalCriteria > 0) {
    insights.push(`✓ El paciente cumple los criterios de retorno al deporte según la batería Delaware-Oslo (Grindem 2016) y los criterios de Kyritsis (2016). Recordar que incluso pasando todos los criterios, el riesgo de relesión es ~5.6% (vs 38.2% sin criterios). Continuar con progresión gradual de carga deportiva.`)
  }

  return insights
}

// re-export getStatusIcon so it's available for imports
export { getStatusIcon }
