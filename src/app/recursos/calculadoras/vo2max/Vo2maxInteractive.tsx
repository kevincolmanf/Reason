'use client'

import { useState } from 'react'

type Sexo = 'masculino' | 'femenino'
type Method = 'rockport' | 'fc'

interface AgeNorm {
  ageRange: string
  excelente: string
  bueno: string
  promedio: string
  bajoPromedio: string
  malo: string
}

const NORMS_MALE: AgeNorm[] = [
  { ageRange: '20–29', excelente: '>52', bueno: '46–52', promedio: '38–41', bajoPromedio: '35–37', malo: '<35' },
  { ageRange: '30–39', excelente: '>50', bueno: '43–50', promedio: '35–39', bajoPromedio: '31–34', malo: '<31' },
  { ageRange: '40–49', excelente: '>45', bueno: '39–45', promedio: '32–35', bajoPromedio: '28–31', malo: '<28' },
  { ageRange: '50–59', excelente: '>40', bueno: '36–40', promedio: '29–32', bajoPromedio: '25–28', malo: '<25' },
  { ageRange: '60+',   excelente: '>37', bueno: '32–37', promedio: '25–28', bajoPromedio: '21–24', malo: '<21' },
]

const NORMS_FEMALE: AgeNorm[] = [
  { ageRange: '20–29', excelente: '>44', bueno: '39–44', promedio: '31–34', bajoPromedio: '28–30', malo: '<28' },
  { ageRange: '30–39', excelente: '>41', bueno: '35–41', promedio: '28–32', bajoPromedio: '24–27', malo: '<24' },
  { ageRange: '40–49', excelente: '>38', bueno: '31–38', promedio: '24–28', bajoPromedio: '20–23', malo: '<20' },
  { ageRange: '50–59', excelente: '>34', bueno: '28–34', promedio: '21–25', bajoPromedio: '17–20', malo: '<17' },
  { ageRange: '60+',   excelente: '>30', bueno: '23–30', promedio: '18–22', bajoPromedio: '14–17', malo: '<14' },
]

function getNormRow(age: number, sexo: Sexo): AgeNorm {
  const norms = sexo === 'masculino' ? NORMS_MALE : NORMS_FEMALE
  if (age < 30) return norms[0]
  if (age < 40) return norms[1]
  if (age < 50) return norms[2]
  if (age < 60) return norms[3]
  return norms[4]
}

function getAgeRangeLabel(age: number): string {
  if (age < 30) return '20–29'
  if (age < 40) return '30–39'
  if (age < 50) return '40–49'
  if (age < 60) return '50–59'
  return '60+'
}

export default function Vo2maxInteractive() {
  const [method, setMethod] = useState<Method>('rockport')

  // Shared
  const [sexo, setSexo] = useState<Sexo>('masculino')
  const [edad, setEdad] = useState<string>('')

  // Rockport
  const [pesoKg, setPesoKg] = useState<string>('')
  const [tiempoMin, setTiempoMin] = useState<string>('')
  const [tiempoSeg, setTiempoSeg] = useState<string>('')
  const [fcFinal, setFcFinal] = useState<string>('')

  // FC method
  const [fcReposo, setFcReposo] = useState<string>('')

  let vo2: number | null = null

  const e = parseInt(edad)

  if (method === 'rockport') {
    const p = parseFloat(pesoKg)
    const mm = parseInt(tiempoMin)
    const ss = parseInt(tiempoSeg)
    const fc = parseInt(fcFinal)
    const validRockport = !isNaN(e) && e > 0 && !isNaN(p) && p > 0 && !isNaN(mm) && !isNaN(ss) && !isNaN(fc) && fc > 0
    if (validRockport) {
      const pesoLb = p * 2.20462
      const sexNum = sexo === 'masculino' ? 1 : 0
      const tMin = mm + (isNaN(ss) ? 0 : ss) / 60
      vo2 = 132.853 - (0.0769 * pesoLb) - (0.3877 * e) + (6.315 * sexNum) - (3.2649 * tMin) - (0.1565 * fc)
    }
  } else {
    const fcR = parseInt(fcReposo)
    const validFc = !isNaN(e) && e > 0 && !isNaN(fcR) && fcR > 0
    if (validFc) {
      const fcMax = 208 - (0.7 * e)
      vo2 = 15 * (fcMax / fcR)
    }
  }

  const vo2Rounded = vo2 !== null ? Math.round(vo2 * 10) / 10 : null
  const normRow = (vo2Rounded !== null && !isNaN(e) && e > 0) ? getNormRow(e, sexo) : null
  const ageLabel = (!isNaN(e) && e > 0) ? getAgeRangeLabel(e) : ''

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">

        {/* Method tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-bg-secondary rounded-lg w-fit">
          <button
            onClick={() => setMethod('rockport')}
            className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors ${method === 'rockport' ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Test de Rockport
          </button>
          <button
            onClick={() => setMethod('fc')}
            className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors ${method === 'fc' ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Fórmula por FC (Uth)
          </button>
        </div>

        {/* Shared: Sexo + Edad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-[13px] uppercase tracking-[0.05em] text-text-secondary mb-2">Sexo</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSexo('masculino')}
                className={`flex-1 py-3 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${sexo === 'masculino' ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}
              >
                Masculino
              </button>
              <button
                onClick={() => setSexo('femenino')}
                className={`flex-1 py-3 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${sexo === 'femenino' ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}
              >
                Femenino
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[13px] uppercase tracking-[0.05em] text-text-secondary mb-2">Edad (años)</label>
            <input
              type="number"
              value={edad}
              onChange={e => setEdad(e.target.value)}
              placeholder="Ej: 35"
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {method === 'rockport' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-[13px] uppercase tracking-[0.05em] text-text-secondary mb-2">Peso (kg)</label>
              <input
                type="number"
                value={pesoKg}
                onChange={e => setPesoKg(e.target.value)}
                placeholder="Ej: 70"
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[13px] uppercase tracking-[0.05em] text-text-secondary mb-2">FC al finalizar (lpm)</label>
              <input
                type="number"
                value={fcFinal}
                onChange={e => setFcFinal(e.target.value)}
                placeholder="Ej: 145"
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] focus:outline-none focus:border-accent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[13px] uppercase tracking-[0.05em] text-text-secondary mb-2">Tiempo caminata 1.6 km</label>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  value={tiempoMin}
                  onChange={e => setTiempoMin(e.target.value)}
                  placeholder="mm"
                  min="0"
                  className="w-24 bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] focus:outline-none focus:border-accent text-center"
                />
                <span className="text-text-secondary text-[18px] font-medium">:</span>
                <input
                  type="number"
                  value={tiempoSeg}
                  onChange={e => setTiempoSeg(e.target.value)}
                  placeholder="ss"
                  min="0"
                  max="59"
                  className="w-24 bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] focus:outline-none focus:border-accent text-center"
                />
                <span className="text-[13px] text-text-secondary">minutos : segundos</span>
              </div>
            </div>
          </div>
        )}

        {method === 'fc' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-[13px] uppercase tracking-[0.05em] text-text-secondary mb-2">FC Reposo (lpm)</label>
              <input
                type="number"
                value={fcReposo}
                onChange={e => setFcReposo(e.target.value)}
                placeholder="Ej: 60"
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] focus:outline-none focus:border-accent"
              />
            </div>
            {!isNaN(e) && e > 0 && (
              <div className="flex items-end pb-3">
                <p className="text-[13px] text-text-secondary">FC máx estimada: <span className="text-text-primary font-medium">{Math.round(208 - 0.7 * e)} lpm</span> <span className="text-[11px]">(208 − 0.7 × {e})</span></p>
              </div>
            )}
          </div>
        )}

        {vo2Rounded !== null && normRow && (
          <div className="mt-6 bg-bg-secondary border-[0.5px] border-accent rounded-xl p-6">
            <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-2">VO2max Estimado</div>
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-[48px] font-medium tracking-[-0.02em] text-accent">{vo2Rounded}</span>
              <span className="text-[18px] text-text-secondary">ml/kg/min</span>
            </div>

            <div className="mb-4">
              <div className="text-[13px] font-medium mb-3">
                Tabla de referencia — {sexo === 'masculino' ? 'Hombres' : 'Mujeres'}, {ageLabel} años
              </div>
              <div className="space-y-1">
                {[
                  { label: 'Excelente', value: normRow.excelente },
                  { label: 'Bueno', value: normRow.bueno },
                  { label: 'Por encima del promedio', value: '—' },
                  { label: 'Promedio', value: normRow.promedio },
                  { label: 'Por debajo del promedio', value: normRow.bajoPromedio },
                  { label: 'Malo', value: normRow.malo },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-1.5 px-3 rounded text-[13px] border-b-[0.5px] border-border/30 last:border-0">
                    <span className="text-text-secondary">{row.label}</span>
                    <span className="font-medium tabular-nums">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[12px] text-text-secondary mt-4">
              Referencia: ACSM Guidelines for Exercise Testing and Prescription.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
