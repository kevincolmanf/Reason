'use client'

import { useState } from 'react'

interface ImcCategory {
  label: string
  color: string
  min: number
  max: number
}

const CATEGORIES: ImcCategory[] = [
  { label: 'Bajo peso', color: '#60a5fa', min: 0, max: 18.5 },
  { label: 'Normopeso', color: '#22c55e', min: 18.5, max: 25 },
  { label: 'Sobrepeso', color: '#f59e0b', min: 25, max: 30 },
  { label: 'Obesidad Grado I', color: '#f97316', min: 30, max: 35 },
  { label: 'Obesidad Grado II', color: '#ef4444', min: 35, max: 40 },
  { label: 'Obesidad Grado III', color: '#dc2626', min: 40, max: Infinity },
]

function getCategory(imc: number): ImcCategory {
  return CATEGORIES.find(c => imc >= c.min && imc < c.max) ?? CATEGORIES[CATEGORIES.length - 1]
}

export default function ImcInteractive() {
  const [peso, setPeso] = useState<string>('')
  const [talla, setTalla] = useState<string>('')

  const p = parseFloat(peso)
  const t = parseFloat(talla)

  const isValid = !isNaN(p) && p > 0 && !isNaN(t) && t > 0

  const tallaMt = t / 100
  const imc = isValid ? p / (tallaMt * tallaMt) : 0
  const imcStr = imc.toFixed(1)
  const category = isValid ? getCategory(imc) : null

  // Gradient bar: clamp imc between 0 and 40
  const barPct = isValid ? Math.min((imc / 40) * 100, 100) : 0

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-[13px] uppercase tracking-[0.05em] text-text-secondary mb-2">Peso (kg)</label>
            <input
              type="number"
              value={peso}
              onChange={e => setPeso(e.target.value)}
              placeholder="Ej: 70"
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[13px] uppercase tracking-[0.05em] text-text-secondary mb-2">Talla (cm)</label>
            <input
              type="number"
              value={talla}
              onChange={e => setTalla(e.target.value)}
              placeholder="Ej: 170"
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {isValid && category && (
          <div className="mt-4 bg-bg-secondary border-[0.5px] border-border rounded-xl p-6">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-[48px] font-medium tracking-[-0.02em]" style={{ color: category.color }}>{imcStr}</span>
              <span className="text-[18px] text-text-secondary">kg/m²</span>
            </div>
            <div className="text-[16px] font-medium mb-6" style={{ color: category.color }}>{category.label}</div>

            {/* Gradient bar */}
            <div className="mb-6">
              <div className="relative h-3 rounded-full overflow-hidden mb-1" style={{
                background: 'linear-gradient(to right, #60a5fa 0%, #22c55e 18.5%, #f59e0b 37.5%, #f97316 50%, #ef4444 62.5%, #dc2626 80%, #7f1d1d 100%)'
              }}>
                <div
                  className="absolute top-[-2px] w-3 h-[calc(100%+4px)] bg-white rounded-sm shadow-lg"
                  style={{ left: `calc(${barPct}% - 6px)` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-text-secondary">
                <span>0</span>
                <span>18.5</span>
                <span>25</span>
                <span>30</span>
                <span>35</span>
                <span>40+</span>
              </div>
            </div>

            {/* Category table */}
            <div className="space-y-2 mb-6">
              {CATEGORIES.map(c => (
                <div
                  key={c.label}
                  className={`flex justify-between items-center px-3 py-2 rounded-lg text-[13px] transition-colors ${c.label === category.label ? 'bg-bg-primary border-[0.5px]' : ''}`}
                  style={c.label === category.label ? { borderColor: c.color } : {}}
                >
                  <span className="font-medium" style={{ color: c.label === category.label ? c.color : undefined }}>{c.label}</span>
                  <span className="text-text-secondary tabular-nums">
                    {c.max === Infinity ? `≥ ${c.min}` : `${c.min} – ${c.max}`}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-bg-primary border-[0.5px] border-border rounded-lg">
              <p className="text-[13px] text-text-secondary leading-[1.6]">
                <span className="text-text-primary font-medium">Nota clínica:</span> El IMC es un indicador poblacional. En atletas con alta masa muscular puede sobreestimar adiposidad. Complementar con circunferencia de cintura y pliegues cutáneos.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
