'use client'

import { useState } from 'react'

// Un "módulo" es un test o cuestionario opcional del RTS. El profesional los va
// agregando con el botón "+ Agregar"; cada uno aparece como tarjeta colapsable.
export interface RtsModule {
  id: string
  label: string
  category?: string // para agrupar en el menú (ej: 'Tests funcionales', 'Cuestionarios')
  hasData: boolean // true si alguno de sus campos ya tiene dato (se auto-muestra al recargar)
  onClear: () => void // resetea los campos del módulo (al quitarlo)
  render: () => React.ReactNode
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${open ? '' : '-rotate-90'}`}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function ModularSections({ modules }: { modules: RtsModule[] }) {
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [menuOpen, setMenuOpen] = useState(false)

  // Se muestra si el profesional lo agregó, o si ya tiene datos (evaluación recargada).
  const isShown = (m: RtsModule) => m.hasData || added.has(m.id)
  const shown = modules.filter(isShown)
  const available = modules.filter(m => !isShown(m))

  const add = (id: string) => {
    setAdded(prev => new Set(prev).add(id))
    setCollapsed(prev => { const n = new Set(prev); n.delete(id); return n })
    setMenuOpen(false)
  }
  const remove = (m: RtsModule) => {
    m.onClear()
    setAdded(prev => { const n = new Set(prev); n.delete(m.id); return n })
  }
  const toggle = (id: string) => setCollapsed(prev => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  // Agrupar el menú "disponibles" por categoría.
  const grouped = available.reduce<Record<string, RtsModule[]>>((acc, m) => {
    const cat = m.category ?? 'Otros'
    ;(acc[cat] ??= []).push(m)
    return acc
  }, {})

  return (
    <div>
      {shown.length === 0 && (
        <p className="text-[13px] text-text-secondary mb-3">
          Agregá los tests y cuestionarios que vas a usar en esta evaluación.
        </p>
      )}

      <div className="space-y-3">
        {shown.map(m => {
          const open = !collapsed.has(m.id)
          return (
            <div key={m.id} className="border-[0.5px] border-border rounded-xl overflow-hidden bg-bg-secondary/40">
              <div className="flex items-center gap-2 px-4 py-3">
                <button type="button" onClick={() => toggle(m.id)} className="flex items-center gap-2 flex-1 text-left text-text-secondary hover:text-text-primary transition-colors">
                  <Chevron open={open} />
                  <span className="text-[13px] font-medium text-text-primary">{m.label}</span>
                  {m.category && <span className="text-[10px] uppercase tracking-[0.05em] text-text-secondary">{m.category}</span>}
                </button>
                <button type="button" onClick={() => remove(m)} title="Quitar" className="px-2 text-text-secondary hover:text-warning transition-colors text-[16px] leading-none shrink-0">×</button>
              </div>
              {open && <div className="px-4 pb-4">{m.render()}</div>}
            </div>
          )
        })}
      </div>

      {available.length > 0 && (
        <div className="relative mt-3">
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="text-[13px] text-accent hover:opacity-80 flex items-center gap-1.5"
          >
            <span className="text-[16px] leading-none">+</span> Agregar test o cuestionario
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute z-20 mt-2 w-[280px] max-h-[60vh] overflow-auto bg-bg-primary border-[0.5px] border-border rounded-xl shadow-lg py-1">
                {Object.entries(grouped).map(([cat, mods]) => (
                  <div key={cat}>
                    <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.05em] text-text-secondary">{cat}</div>
                    {mods.map(m => (
                      <button key={m.id} type="button" onClick={() => add(m.id)}
                        className="w-full text-left px-3 py-2 text-[13px] text-text-primary hover:bg-bg-secondary transition-colors">
                        {m.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
