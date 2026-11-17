'use client'

import { useMemo, useRef, useState } from 'react'

export interface CatalogComboboxOption {
  id: string
  nombre: string
  sublabel?: string // ej. código CIE-10
}

interface ExtraFieldOption { value: string; label: string }

export default function CatalogCombobox({
  value, onChange, options, placeholder, extraFieldLabel, extraFieldOptions, onCreate, disabled,
}: {
  value: string | null
  onChange: (id: string) => void
  options: CatalogComboboxOption[]
  placeholder: string
  extraFieldLabel: string
  extraFieldOptions: ExtraFieldOption[]
  onCreate: (nombre: string, extraValue: string) => Promise<CatalogComboboxOption>
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creatingExtra, setCreatingExtra] = useState<string | null>(null) // nombre pendiente de crear
  const [saving, setSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.id === value) ?? null

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options.slice(0, 30)
    return options.filter(o => o.nombre.toLowerCase().includes(q)).slice(0, 30)
  }, [query, options])

  const exactMatch = matches.some(o => o.nombre.toLowerCase() === query.trim().toLowerCase())

  const pick = (opt: CatalogComboboxOption) => {
    onChange(opt.id)
    setQuery('')
    setOpen(false)
    setCreatingExtra(null)
  }

  const startCreate = () => setCreatingExtra(query.trim())

  const confirmCreate = async (extraValue: string) => {
    if (!creatingExtra) return
    setSaving(true)
    try {
      const created = await onCreate(creatingExtra, extraValue)
      pick(created)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      {!open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="w-full text-left bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent disabled:opacity-50"
        >
          {selected ? (
            <span>
              {selected.nombre}
              {selected.sublabel && <span className="text-text-tertiary text-[12px] ml-2">{selected.sublabel}</span>}
            </span>
          ) : (
            <span className="text-text-tertiary">{placeholder}</span>
          )}
        </button>
      ) : (
        <div className="bg-bg-primary border-[0.5px] border-accent rounded-lg shadow-lg absolute z-20 w-full">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setCreatingExtra(null) }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full bg-bg-primary border-b-[0.5px] border-border p-3 text-[14px] focus:outline-none rounded-t-lg"
          />
          {creatingExtra ? (
            <div className="p-3 space-y-2">
              <p className="text-[12px] text-text-secondary">Crear &quot;{creatingExtra}&quot; — elegí {extraFieldLabel.toLowerCase()}:</p>
              <div className="flex flex-wrap gap-2">
                {extraFieldOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={saving}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => confirmCreate(opt.value)}
                    className="px-3 py-1.5 rounded-lg text-[13px] border-[0.5px] border-border-strong bg-bg-secondary text-text-primary hover:border-accent disabled:opacity-40 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="max-h-[240px] overflow-y-auto">
              {matches.map(opt => (
                <li key={opt.id}>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => pick(opt)}
                    className="w-full text-left px-3 py-2 text-[14px] hover:bg-bg-secondary transition-colors"
                  >
                    {opt.nombre}
                    {opt.sublabel && <span className="text-text-tertiary text-[12px] ml-2">{opt.sublabel}</span>}
                  </button>
                </li>
              ))}
              {query.trim() && !exactMatch && (
                <li>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={startCreate}
                    className="w-full text-left px-3 py-2 text-[14px] text-accent hover:bg-bg-secondary transition-colors border-t-[0.5px] border-border"
                  >
                    + Crear &quot;{query.trim()}&quot;
                  </button>
                </li>
              )}
              {matches.length === 0 && !query.trim() && (
                <li className="px-3 py-2 text-[13px] text-text-tertiary">Escribí para buscar…</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
