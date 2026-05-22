'use client'

import { useState } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type CalcId = '1rm' | 'imc' | 'fc' | 'vo2max' | 'itb' | 'rpe'

interface Calc {
  id: CalcId
  name: string
  description: string
  color: string
}

// ─── Calc definitions ───────────────────────────────────────────────────────

const CALCS: Calc[] = [
  { id: '1rm', name: '1RM — Fórmula Epley', description: 'Estima el máximo de una repetición a partir del peso y las repeticiones realizadas.', color: '#0891B2' },
  { id: 'imc', name: 'Índice de Masa Corporal (IMC)', description: 'Clasifica el estado nutricional según peso y talla.', color: '#7C3AED' },
  { id: 'fc', name: 'Zonas de Frecuencia Cardíaca', description: 'Calcula las zonas de entrenamiento a partir de la FC máxima estimada.', color: '#EA580C' },
  { id: 'vo2max', name: 'VO₂max — Test de Cooper', description: 'Estima el consumo máximo de oxígeno a partir del test de 12 minutos.', color: '#16A34A' },
  { id: 'itb', name: 'Índice Tobillo-Brazo (ITB)', description: 'Cribado de enfermedad arterial periférica mediante presión sistólica.', color: '#DC2626' },
  { id: 'rpe', name: 'RPE → % 1RM', description: 'Convierte la Escala de Esfuerzo Percibido (RPE) al porcentaje estimado del 1RM.', color: '#D97706' },
]

// ─── RPE Table (Zourdos) ────────────────────────────────────────────────────

const RPE_TABLE: Record<number, number> = {
  10: 100, 9.5: 97, 9: 95, 8.5: 93, 8: 91, 7.5: 89, 7: 87, 6.5: 85, 6: 83,
}

// ─── Result badge ────────────────────────────────────────────────────────────

function ResultBadge({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div className="bg-bg-primary border-[0.5px] border-border rounded-xl px-5 py-4 text-center">
      <div className="text-[11px] text-text-secondary mb-1">{label}</div>
      <div className="text-[28px] font-light tracking-[-0.02em]" style={color ? { color } : {}}>
        {value}{unit && <span className="text-[16px] text-text-secondary ml-1">{unit}</span>}
      </div>
    </div>
  )
}

function ColorBadge({ label, color }: { label: string; color: string }) {
  const cls =
    color === 'green' ? 'text-[#16a34a] bg-[#16a34a]/10 border-[#16a34a]/30' :
    color === 'yellow' ? 'text-[#d97706] bg-[#d97706]/10 border-[#d97706]/30' :
    color === 'orange' ? 'text-[#ea580c] bg-[#ea580c]/10 border-[#ea580c]/30' :
    'text-[#dc2626] bg-[#dc2626]/10 border-[#dc2626]/30'
  return (
    <span className={`inline-block px-4 py-2 rounded-xl border-[0.5px] text-[14px] font-medium ${cls}`}>{label}</span>
  )
}

// ─── Input helper ──────────────────────────────────────────────────────────

function NumInput({ label, value, onChange, unit, placeholder, min, max, step }: {
  label: string; value: string; onChange: (v: string) => void
  unit?: string; placeholder?: string; min?: number; max?: number; step?: number
}) {
  return (
    <div>
      <label className="text-[12px] text-text-secondary block mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '0'}
          min={min}
          max={max}
          step={step ?? 0.1}
          className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-accent pr-10"
        />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-text-secondary pointer-events-none">{unit}</span>}
      </div>
    </div>
  )
}

// ─── Individual calculators ─────────────────────────────────────────────────

function Calc1RM() {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

  const w = parseFloat(weight)
  const r = parseFloat(reps)
  const valid = !isNaN(w) && !isNaN(r) && w > 0 && r >= 1
  const epley = valid ? Math.round(w * (1 + r / 30) * 10) / 10 : null
  const brzycki = valid && r > 1 ? Math.round((w / (1.0278 - 0.0278 * r)) * 10) / 10 : null

  const percentages = epley
    ? [100, 95, 90, 85, 80, 75, 70].map(p => ({ p, kg: Math.round(epley * p / 100 * 10) / 10 }))
    : []

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <NumInput label="Peso levantado" value={weight} onChange={setWeight} unit="kg" placeholder="80" min={1} />
        <NumInput label="Repeticiones realizadas" value={reps} onChange={setReps} placeholder="5" min={1} max={30} step={1} />
      </div>
      {epley && (
        <>
          <div className="flex gap-3 flex-wrap">
            <ResultBadge label="1RM (Epley)" value={String(epley)} unit="kg" color="#0891B2" />
            {brzycki && <ResultBadge label="1RM (Brzycki)" value={String(brzycki)} unit="kg" />}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium mb-2">Cargas por porcentaje</p>
            <div className="grid grid-cols-4 gap-2">
              {percentages.map(({ p, kg }) => (
                <div key={p} className="bg-bg-primary border-[0.5px] border-border rounded-lg px-3 py-2 text-center">
                  <div className="text-[10px] text-text-secondary">{p}%</div>
                  <div className="text-[15px] font-medium">{kg} kg</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CalcIMC() {
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')

  const w = parseFloat(weight)
  const h = parseFloat(height) / 100 // cm → m
  const valid = !isNaN(w) && !isNaN(h) && w > 0 && h > 0
  const imc = valid ? Math.round((w / (h * h)) * 10) / 10 : null

  const category = imc === null ? null :
    imc < 18.5 ? { label: 'Bajo peso', color: 'yellow' } :
    imc < 25 ? { label: 'Peso normal', color: 'green' } :
    imc < 30 ? { label: 'Sobrepeso', color: 'yellow' } :
    imc < 35 ? { label: 'Obesidad grado I', color: 'orange' } :
    imc < 40 ? { label: 'Obesidad grado II', color: 'red' } :
    { label: 'Obesidad grado III', color: 'red' }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <NumInput label="Peso" value={weight} onChange={setWeight} unit="kg" placeholder="70" min={1} />
        <NumInput label="Talla" value={height} onChange={setHeight} unit="cm" placeholder="170" min={100} max={250} />
      </div>
      {imc !== null && category && (
        <div className="flex gap-3 flex-wrap items-center">
          <ResultBadge label="IMC" value={String(imc)} unit="kg/m²" color="#7C3AED" />
          <ColorBadge label={category.label} color={category.color} />
        </div>
      )}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-4">
        <p className="text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium mb-3">Clasificación OMS</p>
        {[
          { range: '< 18.5', label: 'Bajo peso', color: '#d97706' },
          { range: '18.5 – 24.9', label: 'Peso normal', color: '#16a34a' },
          { range: '25 – 29.9', label: 'Sobrepeso', color: '#d97706' },
          { range: '30 – 34.9', label: 'Obesidad I', color: '#ea580c' },
          { range: '35 – 39.9', label: 'Obesidad II', color: '#dc2626' },
          { range: '≥ 40', label: 'Obesidad III', color: '#dc2626' },
        ].map(row => (
          <div key={row.range} className={`flex items-center justify-between py-1.5 border-b-[0.5px] border-border last:border-0 ${imc !== null && ((row.range === '< 18.5' && imc < 18.5) || (row.range === '18.5 – 24.9' && imc >= 18.5 && imc < 25) || (row.range === '25 – 29.9' && imc >= 25 && imc < 30) || (row.range === '30 – 34.9' && imc >= 30 && imc < 35) || (row.range === '35 – 39.9' && imc >= 35 && imc < 40) || (row.range === '≥ 40' && imc >= 40)) ? 'opacity-100' : 'opacity-40'}`}>
            <span className="text-[13px] text-text-secondary font-mono">{row.range}</span>
            <span className="text-[13px] font-medium" style={{ color: row.color }}>{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalcFC() {
  const [age, setAge] = useState('')
  const [hrRest, setHrRest] = useState('')

  const a = parseFloat(age)
  const validAge = !isNaN(a) && a > 0
  const fcMax = validAge ? Math.round(220 - a) : null
  const hrR = parseFloat(hrRest)
  const hasHrRest = !isNaN(hrR) && hrR > 0 && fcMax !== null

  const zones = fcMax
    ? [
        { label: 'Zona 1 — Muy ligera', pMin: 0.50, pMax: 0.60, color: '#60a5fa' },
        { label: 'Zona 2 — Ligera (aeróbica base)', pMin: 0.60, pMax: 0.70, color: '#34d399' },
        { label: 'Zona 3 — Aeróbica moderada', pMin: 0.70, pMax: 0.80, color: '#fbbf24' },
        { label: 'Zona 4 — Umbral anaeróbico', pMin: 0.80, pMax: 0.90, color: '#f97316' },
        { label: 'Zona 5 — Máxima intensidad', pMin: 0.90, pMax: 1.00, color: '#ef4444' },
      ].map(z => ({
        ...z,
        minBpm: Math.round(fcMax * z.pMin),
        maxBpm: Math.round(fcMax * z.pMax),
        // Karvonen if resting HR provided
        karMin: hasHrRest ? Math.round(hrR + (fcMax - hrR) * z.pMin) : null,
        karMax: hasHrRest ? Math.round(hrR + (fcMax - hrR) * z.pMax) : null,
      }))
    : []

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <NumInput label="Edad" value={age} onChange={setAge} unit="años" placeholder="30" min={10} max={100} step={1} />
        <NumInput label="FC reposo (opcional — para Karvonen)" value={hrRest} onChange={setHrRest} unit="bpm" placeholder="60" min={30} max={120} step={1} />
      </div>
      {fcMax && (
        <>
          <ResultBadge label="FC Máxima estimada (220 - edad)" value={String(fcMax)} unit="bpm" color="#EA580C" />
          <div className="space-y-2">
            {zones.map(z => (
              <div key={z.label} className="flex items-center gap-4 bg-bg-primary border-[0.5px] border-border rounded-xl px-4 py-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: z.color }} />
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-text-primary">{z.label}</div>
                  <div className="text-[11px] text-text-secondary mt-0.5">{Math.round(z.pMin * 100)}% – {Math.round(z.pMax * 100)}% FC Máx</div>
                </div>
                <div className="text-right">
                  <div className="text-[15px] font-medium" style={{ color: z.color }}>{z.minBpm} – {z.maxBpm} <span className="text-[12px] font-normal text-text-secondary">bpm</span></div>
                  {z.karMin && <div className="text-[11px] text-text-secondary">Karvonen: {z.karMin} – {z.karMax}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function CalcVO2() {
  const [distance, setDistance] = useState('')

  const d = parseFloat(distance)
  const valid = !isNaN(d) && d > 0
  const vo2 = valid ? Math.round(((d - 504.9) / 44.73) * 10) / 10 : null

  const category = vo2 === null ? null :
    vo2 < 28 ? { label: 'Muy pobre', color: 'red' } :
    vo2 < 34 ? { label: 'Pobre', color: 'orange' } :
    vo2 < 42 ? { label: 'Regular', color: 'yellow' } :
    vo2 < 52 ? { label: 'Bueno', color: 'green' } :
    { label: 'Excelente', color: 'green' }

  return (
    <div className="space-y-5">
      <div>
        <NumInput label="Distancia recorrida en 12 minutos" value={distance} onChange={setDistance} unit="m" placeholder="2400" min={500} max={5000} step={10} />
        <p className="text-[11px] text-text-secondary mt-1">Fórmula: VO₂max = (distancia_metros − 504.9) / 44.73</p>
      </div>
      {vo2 !== null && category && (
        <div className="flex gap-3 flex-wrap items-center">
          <ResultBadge label="VO₂max estimado" value={String(vo2)} unit="mL/kg/min" color="#16A34A" />
          <ColorBadge label={category.label} color={category.color} />
        </div>
      )}
    </div>
  )
}

function CalcITB() {
  const [ankleR, setAnkleR] = useState('')
  const [ankleL, setAnkleL] = useState('')
  const [brachial, setBrachial] = useState('')

  const ar = parseFloat(ankleR)
  const al = parseFloat(ankleL)
  const br = parseFloat(brachial)

  const validR = !isNaN(ar) && !isNaN(br) && ar > 0 && br > 0
  const validL = !isNaN(al) && !isNaN(br) && al > 0 && br > 0

  const itbR = validR ? Math.round((ar / br) * 100) / 100 : null
  const itbL = validL ? Math.round((al / br) * 100) / 100 : null

  const getCategory = (itb: number) =>
    itb > 1.3 ? { label: 'Arteria no compresible', color: 'orange' } :
    itb > 1.0 ? { label: 'Normal', color: 'green' } :
    itb >= 0.9 ? { label: 'Límite inferior', color: 'yellow' } :
    itb >= 0.7 ? { label: 'EAP leve', color: 'orange' } :
    itb >= 0.4 ? { label: 'EAP moderada', color: 'red' } :
    { label: 'EAP severa', color: 'red' }

  return (
    <div className="space-y-5">
      <div>
        <NumInput label="PA sistólica braquial (brazo)" value={brachial} onChange={setBrachial} unit="mmHg" placeholder="120" min={60} max={250} step={1} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <NumInput label="PA sistólica tobillo derecho" value={ankleR} onChange={setAnkleR} unit="mmHg" placeholder="110" min={40} max={250} step={1} />
        <NumInput label="PA sistólica tobillo izquierdo" value={ankleL} onChange={setAnkleL} unit="mmHg" placeholder="110" min={40} max={250} step={1} />
      </div>
      {(itbR !== null || itbL !== null) && (
        <div className="flex gap-4 flex-wrap">
          {itbR !== null && (
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl px-5 py-4 text-center">
              <div className="text-[11px] text-text-secondary mb-1">ITB Derecho</div>
              <div className="text-[28px] font-light tracking-[-0.02em] text-[#DC2626]">{itbR}</div>
              <ColorBadge label={getCategory(itbR).label} color={getCategory(itbR).color} />
            </div>
          )}
          {itbL !== null && (
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl px-5 py-4 text-center">
              <div className="text-[11px] text-text-secondary mb-1">ITB Izquierdo</div>
              <div className="text-[28px] font-light tracking-[-0.02em] text-[#DC2626]">{itbL}</div>
              <ColorBadge label={getCategory(itbL).label} color={getCategory(itbL).color} />
            </div>
          )}
        </div>
      )}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-4">
        <p className="text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium mb-3">Interpretación ITB</p>
        {[
          { range: '> 1.3', label: 'Arteria no compresible', color: '#ea580c' },
          { range: '1.0 – 1.3', label: 'Normal', color: '#16a34a' },
          { range: '0.9 – 1.0', label: 'Límite inferior de normal', color: '#d97706' },
          { range: '0.7 – 0.9', label: 'EAP leve', color: '#ea580c' },
          { range: '0.4 – 0.7', label: 'EAP moderada', color: '#dc2626' },
          { range: '< 0.4', label: 'EAP severa', color: '#dc2626' },
        ].map(row => (
          <div key={row.range} className="flex items-center justify-between py-1.5 border-b-[0.5px] border-border last:border-0">
            <span className="text-[13px] text-text-secondary font-mono">{row.range}</span>
            <span className="text-[13px] font-medium" style={{ color: row.color }}>{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalcRPE() {
  const [rpe, setRpe] = useState<number>(8)
  const [rm1, setRm1] = useState('')

  const pct = RPE_TABLE[rpe] ?? null
  const rm = parseFloat(rm1)
  const targetKg = pct && !isNaN(rm) && rm > 0 ? Math.round(rm * pct / 100 * 10) / 10 : null

  return (
    <div className="space-y-5">
      <div>
        <label className="text-[12px] text-text-secondary block mb-1.5">RPE seleccionado</label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(RPE_TABLE).map(v => {
            const val = parseFloat(v)
            return (
              <button
                key={v}
                onClick={() => setRpe(val)}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${rpe === val ? 'bg-accent text-bg-primary border-accent' : 'border-border text-text-secondary hover:border-accent/50'}`}
              >
                {v}
              </button>
            )
          })}
        </div>
      </div>
      {pct !== null && (
        <ResultBadge label={`RPE ${rpe}`} value={`${pct}%`} unit="del 1RM" color="#D97706" />
      )}
      <div className="border-t-[0.5px] border-border pt-5">
        <NumInput label="1RM conocido (opcional — para calcular carga objetivo)" value={rm1} onChange={setRm1} unit="kg" placeholder="100" min={1} />
        {targetKg !== null && pct !== null && (
          <div className="mt-3">
            <ResultBadge label={`Carga para RPE ${rpe} (${pct}% de ${rm}kg)`} value={String(targetKg)} unit="kg" color="#D97706" />
          </div>
        )}
      </div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-4">
        <p className="text-[11px] uppercase tracking-[0.05em] text-text-secondary font-medium mb-3">Tabla RPE → % 1RM (Zourdos)</p>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(RPE_TABLE).map(([r, p]) => (
            <div key={r} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${parseFloat(r) === rpe ? 'bg-accent/10 border-[0.5px] border-accent/40' : 'bg-bg-secondary border-[0.5px] border-border'}`}>
              <span className="text-[13px] text-text-secondary">RPE {r}</span>
              <span className="text-[13px] font-medium text-text-primary">{p}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function CalculadorasClient() {
  const [active, setActive] = useState<CalcId>('1rm')

  const activeCalc = CALCS.find(c => c.id === active)!

  const renderCalc = () => {
    switch (active) {
      case '1rm': return <Calc1RM />
      case 'imc': return <CalcIMC />
      case 'fc': return <CalcFC />
      case 'vo2max': return <CalcVO2 />
      case 'itb': return <CalcITB />
      case 'rpe': return <CalcRPE />
    }
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-[240px] shrink-0 space-y-1">
        {CALCS.map(c => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all border-[0.5px] ${active === c.id ? 'border-border bg-bg-secondary' : 'border-transparent hover:bg-bg-secondary/60'}`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color, opacity: active === c.id ? 1 : 0.4 }} />
              <span className={`text-[13px] font-medium transition-colors ${active === c.id ? 'text-text-primary' : 'text-text-secondary'}`}>{c.name}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: activeCalc.color }} />
            <h2 className="text-[20px] font-medium tracking-[-0.02em]">{activeCalc.name}</h2>
          </div>
          <p className="text-[13px] text-text-secondary">{activeCalc.description}</p>
        </div>
        <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-6">
          {renderCalc()}
        </div>
      </div>
    </div>
  )
}
