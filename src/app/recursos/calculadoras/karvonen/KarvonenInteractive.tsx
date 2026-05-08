'use client'

import { useState, useEffect } from 'react'

const ZONES = [
  { zone: 'Z1', pctLow: 50, pctHigh: 60, name: 'Recuperación activa', color: '#22c55e' },
  { zone: 'Z2', pctLow: 60, pctHigh: 70, name: 'Base aeróbica', color: '#84cc16' },
  { zone: 'Z3', pctLow: 70, pctHigh: 80, name: 'Aeróbico moderado', color: '#f59e0b' },
  { zone: 'Z4', pctLow: 80, pctHigh: 90, name: 'Umbral anaeróbico', color: '#f97316' },
  { zone: 'Z5', pctLow: 90, pctHigh: 100, name: 'Capacidad máxima', color: '#ef4444' },
]

export default function KarvonenInteractive() {
  const [edad, setEdad] = useState<string>('')
  const [fcReposo, setFcReposo] = useState<string>('')
  const [fcMax, setFcMax] = useState<string>('')
  const [fcMaxManuallyEdited, setFcMaxManuallyEdited] = useState(false)

  useEffect(() => {
    if (!fcMaxManuallyEdited) {
      const e = parseInt(edad)
      if (!isNaN(e) && e > 0) {
        setFcMax(String(220 - e))
      } else {
        setFcMax('')
      }
    }
  }, [edad, fcMaxManuallyEdited])

  const e = parseInt(edad)
  const rest = parseInt(fcReposo)
  const max = parseInt(fcMax)

  const isValid = !isNaN(e) && e > 0 && !isNaN(rest) && rest > 0 && !isNaN(max) && max > 0 && max > rest

  const fcr = isValid ? max - rest : 0

  return (
    <div>
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-[13px] uppercase tracking-[0.05em] text-text-secondary mb-2">Edad (años)</label>
            <input
              type="number"
              value={edad}
              onChange={e => { setEdad(e.target.value); setFcMaxManuallyEdited(false) }}
              placeholder="Ej: 30"
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] focus:outline-none focus:border-accent"
            />
          </div>
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
          <div>
            <label className="block text-[13px] uppercase tracking-[0.05em] text-text-secondary mb-2">
              FC Máxima (lpm)
              <span className="ml-2 text-[11px] normal-case text-text-secondary font-normal">(editable)</span>
            </label>
            <input
              type="number"
              value={fcMax}
              onChange={e => { setFcMax(e.target.value); setFcMaxManuallyEdited(true) }}
              placeholder="Ej: 190"
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[16px] focus:outline-none focus:border-accent"
            />
            {!fcMaxManuallyEdited && edad && (
              <p className="text-[11px] text-text-secondary mt-1">Auto: 220 − {edad} = {fcMax} lpm</p>
            )}
          </div>
        </div>

        {isValid && (
          <div className="mt-4">
            <div className="text-[12px] uppercase tracking-[0.05em] text-text-secondary mb-1">FC de Reserva (FCR)</div>
            <div className="text-[24px] font-medium mb-6">{fcr} <span className="text-[14px] text-text-secondary font-normal">lpm</span></div>

            <div className="space-y-3">
              {ZONES.map(z => {
                const fcLow = Math.round(rest + (z.pctLow / 100) * fcr)
                const fcHigh = Math.round(rest + (z.pctHigh / 100) * fcr)
                return (
                  <div
                    key={z.zone}
                    className="flex items-center gap-4 bg-bg-secondary border-[0.5px] border-border rounded-lg p-4"
                    style={{ borderLeft: `3px solid ${z.color}` }}
                  >
                    <div className="w-8 text-[13px] font-medium" style={{ color: z.color }}>{z.zone}</div>
                    <div className="flex-grow">
                      <div className="text-[14px] font-medium">{z.name}</div>
                      <div className="text-[12px] text-text-secondary">{z.pctLow}–{z.pctHigh}% FCR</div>
                    </div>
                    <div className="text-[15px] font-medium tabular-nums">
                      {fcLow} – {fcHigh} <span className="text-[12px] text-text-secondary font-normal">lpm</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 p-4 bg-bg-secondary border-[0.5px] border-border rounded-lg">
              <p className="text-[13px] text-text-secondary leading-[1.6]">
                <span className="text-text-primary font-medium">Ejemplo de uso clínico:</span> Para rehabilitación cardíaca fase II, trabajar en Z2. Para mejora VO2max, alternar Z3-Z4.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
