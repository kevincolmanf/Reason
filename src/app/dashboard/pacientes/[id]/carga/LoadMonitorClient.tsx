'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'

interface LoadSession {
  id: string
  session_date: string
  activity: string | null
  duration_minutes: number
  rpe: number
  load_units: number
  vas_pre: number | null
  vas_during: number | null
  vas_post: number | null
  notes: string | null
  source: string
}

const RPE_LABELS: Record<number, string> = {
  0: 'Reposo',
  1: 'Muy suave',
  2: 'Suave',
  3: 'Moderado',
  4: 'Algo intenso',
  5: 'Intenso',
  6: 'Intenso+',
  7: 'Muy intenso',
  8: 'Muy intenso+',
  9: 'Casi máximo',
  10: 'Máximo',
}

function vasColor(value: number): string {
  if (value <= 20) return 'text-green-500'
  if (value <= 40) return 'text-yellow-500'
  if (value <= 60) return 'text-orange-500'
  return 'text-red-500'
}

function vasDotColor(value: number): string {
  if (value <= 20) return 'bg-green-500'
  if (value <= 40) return 'bg-yellow-500'
  if (value <= 60) return 'bg-orange-500'
  return 'bg-red-500'
}

/** Returns the ISO string of the Monday of the week containing the given date string (YYYY-MM-DD) */
function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() // 0=Sun,1=Mon,...
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime()
  const db = new Date(b + 'T00:00:00').getTime()
  return Math.abs((da - db) / 86400000)
}

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  colorClass?: string
}

function KpiCard({ label, value, sub, colorClass }: KpiCardProps) {
  return (
    <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5 flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-[0.05em] text-text-secondary">{label}</span>
      <span className={`text-[28px] font-medium leading-none ${colorClass ?? 'text-text-primary'}`}>{value}</span>
      {sub && <span className="text-[12px] text-text-secondary">{sub}</span>}
    </div>
  )
}

function VasSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-[12px] text-text-secondary">{label}</label>
        <span className={`text-[14px] font-medium ${vasColor(value)}`}>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
      <div className="flex justify-between text-[10px] text-text-secondary mt-0.5">
        <span>Sin dolor — 0</span>
        <span>Máximo dolor — 100</span>
      </div>
    </div>
  )
}

function SourceBadge({ source }: { source: string }) {
  if (source === 'patient') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent border-[0.5px] border-accent/30 whitespace-nowrap">
        Paciente
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary border-[0.5px] border-border whitespace-nowrap">
      Kinesiólogo
    </span>
  )
}

export default function LoadMonitorClient({
  patientId,
  userId,
  initialSessions,
}: {
  patientId: string
  userId: string
  initialSessions: LoadSession[]
}) {
  const supabase = createClient()
  const [sessions, setSessions] = useState<LoadSession[]>(initialSessions)
  const [formOpen, setFormOpen] = useState(initialSessions.length === 0)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formDate, setFormDate] = useState(todayStr())
  const [formActivity, setFormActivity] = useState('')
  const [formDuration, setFormDuration] = useState('')
  const [formRpe, setFormRpe] = useState<number | null>(null)
  const [formVasPre, setFormVasPre] = useState(0)
  const [formVasDuring, setFormVasDuring] = useState(0)
  const [formVasPost, setFormVasPost] = useState(0)
  const [formNotes, setFormNotes] = useState('')

  const today = todayStr()

  // ─── Metrics ────────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const acute = sessions
      .filter(s => daysBetween(s.session_date, today) <= 7)
      .reduce((sum, s) => sum + s.load_units, 0)

    const last28 = sessions.filter(s => daysBetween(s.session_date, today) <= 28)
    const chronic = last28.reduce((sum, s) => sum + s.load_units, 0) / 4

    const acwr = chronic > 0 ? acute / chronic : null
    const validAcwr = last28.length >= 4

    const sessionsThisWeek = sessions.filter(s => daysBetween(s.session_date, today) <= 7)
    const vasPostThisWeek = sessionsThisWeek.filter(s => s.vas_post !== null)
    const avgVasPost =
      vasPostThisWeek.length > 0
        ? vasPostThisWeek.reduce((sum, s) => sum + (s.vas_post ?? 0), 0) / vasPostThisWeek.length
        : null

    // Monotony & Strain (last 7 days, daily loads)
    const dailyLoads: number[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(today + 'T00:00:00')
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const dayLoad = sessions
        .filter(s => s.session_date === ds)
        .reduce((sum, s) => sum + s.load_units, 0)
      dailyLoads.push(dayLoad)
    }
    const meanDaily = dailyLoads.reduce((a, b) => a + b, 0) / 7
    const stdDaily = Math.sqrt(
      dailyLoads.reduce((sum, v) => sum + Math.pow(v - meanDaily, 2), 0) / 7
    )
    const monotony = stdDaily > 0 ? meanDaily / stdDaily : null
    const strain = monotony !== null ? acute * monotony : null

    return { acute, chronic, acwr, validAcwr, sessionsThisWeek: sessionsThisWeek.length, avgVasPost, monotony, strain }
  }, [sessions, today])

  // ─── Consejo de carga ──────────────────────────────────────────────────────

  const advice = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => b.session_date.localeCompare(a.session_date))
    if (sorted.length < 3) return null

    const last5 = sorted.slice(0, 5)
    const vasLast5 = last5.filter(s => s.vas_post !== null)
    const avgVas5 = vasLast5.length > 0
      ? vasLast5.reduce((sum, s) => sum + (s.vas_post ?? 0), 0) / vasLast5.length
      : null
    const avgRpe5 = last5.reduce((sum, s) => sum + s.rpe, 0) / last5.length

    // Consecutive high-pain sessions (VAS post > 50)
    let consecutiveHighPain = 0
    for (const s of sorted) {
      if (s.vas_post !== null && s.vas_post > 50) consecutiveHighPain++
      else break
    }

    const reasons: string[] = []
    const alerts: string[] = []

    // ACWR base
    let action: 'bajar' | 'mantener' | 'subir' = 'mantener'
    const { acwr, validAcwr } = metrics

    if (!validAcwr) {
      reasons.push('Historial insuficiente para calcular ACWR — se necesitan al menos 4 semanas de datos.')
    } else if (acwr === null) {
      reasons.push('Sin carga crónica registrada.')
    } else if (acwr < 0.8) {
      action = 'subir'
      reasons.push(`ACWR ${acwr.toFixed(2)} — subcarga. El cuerpo está por debajo del estímulo óptimo.`)
    } else if (acwr <= 1.3) {
      action = 'mantener'
      reasons.push(`ACWR ${acwr.toFixed(2)} — zona segura (0.8–1.3).`)
    } else if (acwr <= 1.5) {
      action = 'mantener'
      reasons.push(`ACWR ${acwr.toFixed(2)} — zona de precaución. Evitar aumentos bruscos.`)
    } else {
      action = 'bajar'
      reasons.push(`ACWR ${acwr.toFixed(2)} — zona de riesgo (> 1.5). Reducir carga 10–15%.`)
    }

    // Pain override
    if (avgVas5 !== null) {
      if (avgVas5 > 50) {
        action = 'bajar'
        reasons.push(`Dolor post-sesión promedio ${avgVas5.toFixed(0)}/100 (últimas 5 sesiones) — nivel elevado.`)
      } else if (avgVas5 > 30) {
        if (action === 'subir') action = 'mantener'
        else if (action === 'mantener') action = 'bajar'
        reasons.push(`Dolor post-sesión promedio ${avgVas5.toFixed(0)}/100 — moderado. Se baja un nivel de recomendación.`)
      } else {
        reasons.push(`Dolor post-sesión promedio ${avgVas5.toFixed(0)}/100 — bajo.`)
      }
    }

    // Promote to subir if pain is low and acwr in safe zone
    if (validAcwr && acwr !== null && acwr >= 0.8 && acwr <= 1.3 && (avgVas5 === null || avgVas5 <= 20) && avgRpe5 <= 7) {
      action = 'subir'
      reasons.push('Buena tolerancia: sin dolor y RPE controlado. Se puede progresar.')
    }

    // RPE
    if (avgRpe5 > 8) {
      if (action === 'subir') action = 'mantener'
      alerts.push(`RPE promedio ${avgRpe5.toFixed(1)}/10 (últimas 5 sesiones) — esfuerzo muy alto sostenido.`)
    } else if (avgRpe5 < 3 && action === 'subir') {
      reasons.push(`RPE promedio ${avgRpe5.toFixed(1)}/10 — sesiones muy suaves, hay margen de progresión.`)
    } else {
      reasons.push(`RPE promedio ${avgRpe5.toFixed(1)}/10.`)
    }

    // Consecutive high pain alert
    if (consecutiveHighPain >= 2) {
      action = 'bajar'
      alerts.push(`${consecutiveHighPain} sesiones consecutivas con dolor post > 50/100.`)
    }

    return { action, reasons, alerts }
  }, [sessions, metrics])

  // ─── Weekly chart data — last 8 weeks ──────────────────────────────────────

  const weeklyData = useMemo(() => {
    const weeks: { monday: string; label: string; total: number }[] = []
    for (let w = 7; w >= 0; w--) {
      const d = new Date(today + 'T00:00:00')
      d.setDate(d.getDate() - w * 7)
      const monday = getMondayOfWeek(d.toISOString().split('T')[0])
      const sunday = new Date(monday + 'T00:00:00')
      sunday.setDate(sunday.getDate() + 6)
      const sundayStr = sunday.toISOString().split('T')[0]

      const total = sessions
        .filter(s => s.session_date >= monday && s.session_date <= sundayStr)
        .reduce((sum, s) => sum + s.load_units, 0)

      weeks.push({ monday, label: formatShortDate(monday), total })
    }
    return weeks
  }, [sessions, today])

  const maxWeeklyLoad = Math.max(...weeklyData.map(w => w.total), 1)
  const last4WeeksAvg =
    weeklyData.slice(-4).reduce((sum, w) => sum + w.total, 0) / 4

  // ─── VAS post evolution — last 4 weeks ─────────────────────────────────────

  const vasEvolution = useMemo(() => {
    return sessions
      .filter(s => {
        if (s.vas_post === null) return false
        return daysBetween(s.session_date, today) <= 28
      })
      .slice()
      .sort((a, b) => (a.session_date > b.session_date ? 1 : -1))
  }, [sessions, today])

  // ─── ACWR display ──────────────────────────────────────────────────────────

  function acwrColor(v: number): string {
    if (v < 0.8) return 'text-blue-500'
    if (v <= 1.3) return 'text-green-500'
    if (v <= 1.5) return 'text-orange-500'
    return 'text-red-500'
  }

  function acwrLabel(v: number): string {
    if (v < 0.8) return 'Subcarga'
    if (v <= 1.3) return 'Zona segura'
    if (v <= 1.5) return 'Precaución'
    return 'Riesgo de lesión'
  }

  // Position of marker on ACWR bar: domain 0–2.5
  function acwrMarkerPct(v: number): number {
    return Math.min(Math.max((v / 2.5) * 100, 0), 100)
  }

  // ─── Handle form submit ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!formDate || !formDuration || formRpe === null) return
    const duration = parseInt(formDuration)
    if (isNaN(duration) || duration <= 0) return

    setSaving(true)
    const loadUnits = formRpe * duration

    const { data, error } = await supabase
      .from('load_sessions')
      .insert({
        user_id: userId,
        patient_id: patientId,
        session_date: formDate,
        activity: formActivity.trim() || null,
        duration_minutes: duration,
        rpe: formRpe,
        load_units: loadUnits,
        vas_pre: formVasPre,
        vas_during: formVasDuring,
        vas_post: formVasPost,
        notes: formNotes.trim() || null,
        source: 'clinician',
      })
      .select('id, session_date, activity, duration_minutes, rpe, load_units, vas_pre, vas_during, vas_post, notes, source')
      .single()

    if (!error && data) {
      setSessions(prev =>
        [data, ...prev].sort((a, b) => (a.session_date < b.session_date ? 1 : -1))
      )
      // Reset form
      setFormDate(todayStr())
      setFormActivity('')
      setFormDuration('')
      setFormRpe(null)
      setFormVasPre(0)
      setFormVasDuring(0)
      setFormVasPost(0)
      setFormNotes('')
      setFormOpen(false)
    }
    setSaving(false)
  }

  const handleDeleteSession = async (id: string) => {
    if (!confirm('¿Eliminar esta sesión? No se puede deshacer.')) return
    const { error } = await supabase.from('load_sessions').delete().eq('id', id)
    if (!error) setSessions(prev => prev.filter(s => s.id !== id))
  }

  const calculatedLoad =
    formRpe !== null && formDuration
      ? formRpe * (parseInt(formDuration) || 0)
      : null

  const adviceConfig = {
    bajar: { label: 'Bajar carga', sub: 'Reducir volumen o intensidad', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: '↓' },
    mantener: { label: 'Mantener carga', sub: 'Continuar la misma dosis', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: '→' },
    subir: { label: 'Progresar carga', sub: 'Aumentar gradualmente', bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: '↑' },
  }

  return (
    <div className="space-y-10">

      {/* ── 0. Consejo de carga ────────────────────────────────────────────── */}
      {advice ? (
        <div className={`border-[0.5px] rounded-xl p-5 ${adviceConfig[advice.action].bg} ${adviceConfig[advice.action].border}`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Consejo para la próxima semana</div>
              <div className={`text-[24px] font-medium ${adviceConfig[advice.action].text}`}>
                {adviceConfig[advice.action].icon} {adviceConfig[advice.action].label}
              </div>
              <div className="text-[13px] text-text-secondary">{adviceConfig[advice.action].sub}</div>
            </div>
          </div>
          <ul className="space-y-1.5 mb-3">
            {advice.reasons.map((r, i) => (
              <li key={i} className="text-[13px] text-text-primary flex gap-2">
                <span className="text-text-secondary mt-0.5">·</span>{r}
              </li>
            ))}
          </ul>
          {advice.alerts.length > 0 && (
            <div className="bg-warning/10 border-[0.5px] border-warning/30 rounded-lg px-4 py-3 space-y-1 mb-3">
              {advice.alerts.map((a, i) => (
                <p key={i} className="text-[13px] text-warning">⚠ {a}</p>
              ))}
            </div>
          )}
          <p className="text-[11px] text-text-secondary">Basado en ACWR, dolor y RPE de las últimas 5 sesiones. Siempre aplicar criterio clínico.</p>
        </div>
      ) : sessions.length > 0 ? (
        <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 text-[13px] text-text-secondary">
          Se necesitan al menos 3 sesiones registradas para generar una recomendación de carga.
        </div>
      ) : null}

      {/* ── 1. KPIs ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label="Carga semanal"
          value={`${metrics.acute} UA`}
          sub="últimos 7 días"
        />
        <KpiCard
          label="ACWR"
          value={
            metrics.acwr !== null && metrics.validAcwr
              ? metrics.acwr.toFixed(2)
              : '—'
          }
          sub={
            metrics.acwr !== null && metrics.validAcwr
              ? acwrLabel(metrics.acwr)
              : 'Datos insuficientes'
          }
          colorClass={
            metrics.acwr !== null && metrics.validAcwr
              ? acwrColor(metrics.acwr)
              : undefined
          }
        />
        <KpiCard
          label="Sesiones esta semana"
          value={String(metrics.sessionsThisWeek)}
        />
        <KpiCard
          label="VAS post promedio"
          value={
            metrics.avgVasPost !== null
              ? metrics.avgVasPost.toFixed(1)
              : '—'
          }
          sub="esta semana"
          colorClass={
            metrics.avgVasPost !== null ? vasColor(metrics.avgVasPost) : undefined
          }
        />
      </div>

      {/* ── 2. Formulario ──────────────────────────────────────────────────── */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setFormOpen(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-[15px] font-medium text-text-primary hover:bg-bg-secondary transition-colors"
        >
          <span>{formOpen ? '▾' : '▸'} Registrar sesión</span>
        </button>

        {formOpen && (
          <div className="px-6 pb-6 border-t-[0.5px] border-border pt-5 space-y-5">
            {/* Row: fecha + actividad + duración */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Actividad</label>
                <input
                  type="text"
                  value={formActivity}
                  onChange={e => setFormActivity(e.target.value)}
                  placeholder="Ej: Fútbol, Pesas, Caminata..."
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Duración (min)</label>
                <input
                  type="number"
                  value={formDuration}
                  onChange={e => setFormDuration(e.target.value)}
                  min={1}
                  placeholder="60"
                  className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* RPE */}
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">RPE — Esfuerzo percibido (0–10)</label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 11 }, (_, i) => i).map(n => (
                  <button
                    key={n}
                    onClick={() => setFormRpe(n)}
                    className={`w-10 h-10 rounded-lg text-[14px] font-medium border-[0.5px] transition-colors ${
                      formRpe === n
                        ? 'bg-accent text-bg-primary border-accent'
                        : 'bg-bg-secondary border-border text-text-primary hover:border-border-strong'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {formRpe !== null && (
                <p className="text-[12px] text-text-secondary mt-2">
                  RPE {formRpe} — {RPE_LABELS[formRpe]}
                </p>
              )}
              {calculatedLoad !== null && calculatedLoad > 0 && (
                <p className="text-[13px] font-medium text-accent mt-1">
                  Carga calculada: {calculatedLoad} UA (unidades arbitrarias)
                </p>
              )}
            </div>

            {/* VAS sliders */}
            <div className="space-y-4">
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary">Dolor (VAS 0–100)</label>
              <VasSlider label="Dolor pre-sesión" value={formVasPre} onChange={setFormVasPre} />
              <VasSlider label="Dolor durante la sesión" value={formVasDuring} onChange={setFormVasDuring} />
              <VasSlider label="Dolor post-sesión" value={formVasPost} onChange={setFormVasPost} />
            </div>

            {/* Notas */}
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Notas</label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Observaciones..."
                className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving || !formDate || !formDuration || formRpe === null}
              className="bg-accent text-bg-primary px-6 py-2.5 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {saving ? 'Guardando...' : 'Registrar sesión'}
            </button>
          </div>
        )}
      </div>

      {/* ── 3. Gráfico semanal ─────────────────────────────────────────────── */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
        <h2 className="text-[16px] font-medium mb-6">Carga semanal — últimas 8 semanas</h2>

        <div className="flex items-end gap-3 h-[120px] mb-2">
          {weeklyData.map(week => {
            const heightPct = maxWeeklyLoad > 0 ? (week.total / maxWeeklyLoad) * 100 : 0
            return (
              <div key={week.monday} className="flex flex-col items-center flex-1 gap-1 h-full justify-end">
                <span className="text-[10px] text-text-secondary">{week.total > 0 ? week.total : ''}</span>
                <div
                  className="w-full rounded-t bg-accent transition-all duration-300"
                  style={{ height: `${Math.max(heightPct, week.total > 0 ? 4 : 0)}%` }}
                  title={`${week.label}: ${week.total} UA`}
                />
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          {weeklyData.map(week => (
            <div key={week.monday} className="flex-1 text-center text-[10px] text-text-secondary">
              {week.label}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t-[0.5px] border-border">
          <span className="text-[12px] text-text-secondary">
            Promedio crónico (últimas 4 semanas):{' '}
            <span className="text-text-primary font-medium">{last4WeeksAvg.toFixed(0)} UA/sem</span>
          </span>
        </div>
      </div>

      {/* ── 4. ACWR ────────────────────────────────────────────────────────── */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
        <h2 className="text-[16px] font-medium mb-4">ACWR — Ratio Agudo:Crónico</h2>

        {!metrics.validAcwr ? (
          <div className="text-[13px] text-text-secondary bg-bg-secondary rounded-lg px-4 py-3 border-[0.5px] border-border">
            Se necesitan al menos 4 semanas de datos para calcular el ACWR con precisión.
          </div>
        ) : metrics.acwr === null ? (
          <div className="text-[13px] text-text-secondary">Sin carga crónica registrada.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className={`text-[48px] font-medium leading-none ${acwrColor(metrics.acwr)}`}>
                {metrics.acwr.toFixed(2)}
              </span>
              <span className={`text-[16px] font-medium ${acwrColor(metrics.acwr)}`}>
                {acwrLabel(metrics.acwr)}
              </span>
            </div>

            {/* Colored bar */}
            <div className="relative h-5 rounded-full overflow-hidden flex">
              <div className="flex-[0.32] bg-blue-400 opacity-80" title="Subcarga (<0.8)" />
              <div className="flex-[0.2] bg-green-400 opacity-80" title="Zona segura (0.8–1.3)" />
              <div className="flex-[0.08] bg-orange-400 opacity-80" title="Precaución (1.3–1.5)" />
              <div className="flex-[0.4] bg-red-400 opacity-80" title="Riesgo (>1.5)" />
              {/* Marker */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-text-primary rounded-full"
                style={{ left: `calc(${acwrMarkerPct(metrics.acwr)}% - 2px)` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-text-secondary">
              <span>0</span>
              <span>0.8</span>
              <span>1.3</span>
              <span>1.5</span>
              <span>2.5+</span>
            </div>

            {/* Monotony & Strain */}
            <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t-[0.5px] border-border">
              <div>
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-secondary">Monotonía</span>
                <div className="text-[20px] font-medium mt-0.5">
                  {metrics.monotony !== null ? metrics.monotony.toFixed(2) : '—'}
                </div>
                {metrics.monotony !== null && (
                  <div className="text-[11px] text-text-secondary">
                    {metrics.monotony > 2
                      ? 'Entrenamiento monótono — mayor riesgo'
                      : 'Variabilidad adecuada'}
                  </div>
                )}
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-secondary">Strain</span>
                <div className="text-[20px] font-medium mt-0.5">
                  {metrics.strain !== null ? Math.round(metrics.strain) : '—'}
                </div>
                <div className="text-[11px] text-text-secondary">Carga × monotonía (Foster 2001)</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Evolución VAS post ──────────────────────────────────────────── */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
        <h2 className="text-[16px] font-medium mb-4">Evolución de síntomas — VAS post (últimas 4 semanas)</h2>

        {vasEvolution.length === 0 ? (
          <p className="text-[13px] text-text-secondary">Sin datos de dolor registrados.</p>
        ) : (
          <div className="flex flex-wrap gap-3 items-end">
            {vasEvolution.map(s => (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <span className={`text-[12px] font-medium ${vasColor(s.vas_post!)}`}>
                  {s.vas_post}
                </span>
                <div
                  className={`w-4 h-4 rounded-full ${vasDotColor(s.vas_post!)}`}
                  title={`${s.session_date}: VAS post ${s.vas_post}`}
                />
                <span className="text-[10px] text-text-secondary">{formatShortDate(s.session_date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 6. Historial ──────────────────────────────────────────────────── */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6">
        <h2 className="text-[16px] font-medium mb-4">Historial de sesiones</h2>

        {sessions.length === 0 ? (
          <p className="text-[13px] text-text-secondary">Sin sesiones registradas todavía.</p>
        ) : (
          <div className="space-y-2">
            {/* Header — solo desktop */}
            <div className="hidden sm:grid grid-cols-[100px_1fr_80px_60px_80px_80px_90px_60px] gap-3 px-3 py-1">
              {['Fecha', 'Actividad', 'Duración', 'RPE', 'Carga', 'VAS post', 'Origen', ''].map(h => (
                <span key={h} className="text-[11px] uppercase tracking-[0.05em] text-text-secondary">{h}</span>
              ))}
            </div>

            {sessions.slice(0, 20).map(s => (
              <div key={s.id} className="group border-[0.5px] border-border rounded-lg hover:bg-bg-secondary transition-colors">
                {/* Mobile layout */}
                <div className="sm:hidden px-4 py-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[13px] text-text-primary truncate flex-1">{s.activity || '—'}</span>
                    <span className="text-[12px] text-text-secondary shrink-0">{formatShortDate(s.session_date)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-text-secondary">
                    {s.duration_minutes && <span>{s.duration_minutes} min</span>}
                    <span>RPE <span className="text-text-primary font-medium">{s.rpe}</span></span>
                    <span><span className="text-text-primary font-medium">{s.load_units}</span> UA</span>
                    {s.vas_post !== null && <span>VAS <span className={`font-medium ${vasColor(s.vas_post)}`}>{s.vas_post}</span></span>}
                    <SourceBadge source={s.source} />
                  </div>
                  <button onClick={() => handleDeleteSession(s.id)} className="text-text-secondary hover:text-warning text-[11px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Eliminar
                  </button>
                </div>
                {/* Desktop layout */}
                <div className="hidden sm:grid grid-cols-[100px_1fr_80px_60px_80px_80px_90px_60px] gap-3 items-center px-3 py-3">
                  <span className="text-[13px] text-text-primary">{formatShortDate(s.session_date)}</span>
                  <span className="text-[13px] text-text-secondary truncate">{s.activity || '—'}</span>
                  <span className="text-[13px] text-text-secondary">{s.duration_minutes} min</span>
                  <span className="text-[13px] text-text-primary">{s.rpe}/10</span>
                  <span className="text-[13px] text-text-primary">{s.load_units} UA</span>
                  <span className={`text-[13px] ${s.vas_post !== null ? vasColor(s.vas_post) : 'text-text-secondary'}`}>
                    {s.vas_post !== null ? s.vas_post : '—'}
                  </span>
                  <SourceBadge source={s.source} />
                  <button onClick={() => handleDeleteSession(s.id)} className="text-text-secondary hover:text-warning text-[12px] opacity-0 group-hover:opacity-100 transition-opacity text-right">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
