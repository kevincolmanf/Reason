'use client'

import { Criterion } from './shared'

export function Field({ label, unit, children }: { label: string; unit?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">{label}{unit && <span className="normal-case ml-1 text-text-secondary/60">({unit})</span>}</label>
      {children}
    </div>
  )
}

export function NumInput({ value, onChange, placeholder, min, max }: {
  value: string; onChange: (v: string) => void; placeholder?: string; min?: string; max?: string
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? '—'}
      min={min}
      max={max}
      className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] focus:border-accent outline-none"
    />
  )
}

export function TextInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? '—'}
      className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] focus:border-accent outline-none"
    />
  )
}

export function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-[13px] focus:border-accent outline-none appearance-none"
    >
      <option value="">Seleccionar...</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function YesNoInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {[{ v: 'yes', label: 'Sí' }, { v: 'no', label: 'No' }].map(opt => (
        <button
          key={opt.v}
          type="button"
          onClick={() => onChange(opt.v)}
          className={`flex-1 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${value === opt.v ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border text-text-secondary hover:border-accent/50'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function LsiDisplay({ label, val }: { label: string; val: number | null }) {
  const color = val === null ? 'text-text-secondary' : val >= 90 ? 'text-[#4ade80]' : val >= 80 ? 'text-[#fb923c]' : 'text-red-400'
  return (
    <div className="bg-bg-primary rounded-lg p-3 border-[0.5px] border-border text-center">
      <div className="text-[10px] text-text-secondary uppercase tracking-[0.05em] mb-1">{label}</div>
      <div className={`text-[18px] font-medium ${color}`}>{val !== null ? `${val.toFixed(1)}%` : '—'}</div>
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-medium text-text-secondary uppercase tracking-[0.05em] border-b-[0.5px] border-border pb-2 mb-4">{children}</h3>
  )
}

export function CriteriaResults({ criteria, notes, onNewEval }: { criteria: Criterion[], notes?: string, onNewEval: () => void }) {
  const passed = criteria.filter(c => c.passed === true).length
  const total = criteria.filter(c => c.passed !== null).length
  const allPass = passed === total && total > 0
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0

  return (
    <div>
      <div className={`rounded-xl border-[0.5px] p-6 mb-6 text-center ${allPass ? 'bg-[#4ade80]/10 border-[#4ade80]/30' : pct >= 80 ? 'bg-[#fb923c]/10 border-[#fb923c]/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className={`text-[36px] font-medium mb-1 ${allPass ? 'text-[#4ade80]' : pct >= 80 ? 'text-[#fb923c]' : 'text-red-400'}`}>
          {passed}/{criteria.filter(c => c.passed !== null).length}
        </div>
        <div className="text-[14px] text-text-secondary">criterios aprobados</div>
        {allPass && <div className="text-[13px] font-medium text-[#4ade80] mt-2">Criterios de retorno cumplidos</div>}
        {!allPass && <div className="text-[13px] text-text-secondary mt-2">Faltan {total - passed} criterio{total - passed !== 1 ? 's' : ''} para el retorno</div>}
      </div>

      <div className="space-y-2 mb-6">
        {criteria.map((c, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary border-[0.5px] border-border">
            <span className={`text-[15px] shrink-0 mt-0.5 font-medium ${c.passed === true ? 'text-[#4ade80]' : c.passed === false ? 'text-red-400' : 'text-text-secondary'}`}>
              {c.passed === true ? '✓' : c.passed === false ? '✗' : '—'}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] text-text-primary">{c.label}</div>
              {c.detail && <div className="text-[12px] text-text-secondary mt-0.5">{c.detail}</div>}
            </div>
          </div>
        ))}
      </div>

      {notes && (
        <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4 mb-6">
          <div className="text-[11px] text-text-secondary uppercase tracking-[0.05em] mb-1">Notas</div>
          <div className="text-[13px] text-text-primary">{notes}</div>
        </div>
      )}

      <button
        onClick={onNewEval}
        className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary transition-colors"
      >
        + Nueva evaluación
      </button>
    </div>
  )
}
