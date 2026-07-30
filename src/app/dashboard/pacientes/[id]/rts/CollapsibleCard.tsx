'use client'

import { useState } from 'react'

// Tarjeta colapsable con botón de quitar. Se usa para envolver secciones
// opcionales del RTS de LCA (el form grande), manteniendo su JSX en su lugar.
export function CollapsibleCard({
  label,
  category,
  onRemove,
  children,
}: {
  label: string
  category?: string
  onRemove: () => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-[0.5px] border-border rounded-xl overflow-hidden bg-bg-secondary/40">
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left text-text-secondary hover:text-text-primary transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${open ? '' : '-rotate-90'}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span className="text-[14px] font-medium text-text-primary">{label}</span>
          {category && <span className="text-[10px] uppercase tracking-[0.05em] text-text-secondary">{category}</span>}
        </button>
        <button type="button" onClick={onRemove} title="Quitar" className="px-2 text-text-secondary hover:text-warning transition-colors text-[16px] leading-none shrink-0">×</button>
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// Menú "+ Agregar" para volver a mostrar secciones ocultas.
export function AddSectionMenu({
  available,
  onAdd,
}: {
  available: { id: string; label: string; category?: string }[]
  onAdd: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  if (available.length === 0) return null

  const grouped = available.reduce<Record<string, { id: string; label: string }[]>>((acc, m) => {
    const cat = m.category ?? 'Otros'
    ;(acc[cat] ??= []).push(m)
    return acc
  }, {})

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)} className="text-[13px] text-accent hover:opacity-80 flex items-center gap-1.5">
        <span className="text-[16px] leading-none">+</span> Agregar sección de evaluación
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-2 w-[300px] max-h-[60vh] overflow-auto bg-bg-primary border-[0.5px] border-border rounded-xl shadow-lg py-1">
            {Object.entries(grouped).map(([cat, mods]) => (
              <div key={cat}>
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.05em] text-text-secondary">{cat}</div>
                {mods.map(m => (
                  <button key={m.id} type="button" onClick={() => { onAdd(m.id); setOpen(false) }}
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
  )
}
