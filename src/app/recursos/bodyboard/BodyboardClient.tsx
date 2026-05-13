'use client'

import { useState, useRef } from 'react'

const VB_W = 180
const VB_H = 440

const CATEGORIAS = [
  { id: 'individual',    label: 'Factores individuales',          color: '#D97706' },
  { id: 'cognitivo',    label: 'Cognitivo-emocional',            color: '#0891B2' },
  { id: 'biomecanico',  label: 'Factores biomecánicos',          color: '#16A34A' },
  { id: 'nociceptivo',  label: 'Nociceptivo / Sistema nervioso', color: '#7C3AED' },
  { id: 'tisular',      label: 'Daño tisular / Patología',       color: '#EA580C' },
  { id: 'conducta',     label: 'Conducta / Estilo de vida',      color: '#DB2777' },
  { id: 'contextual',   label: 'Contextual / Laboral',           color: '#2563EB' },
  { id: 'comorbilidad', label: 'Comorbilidades',                 color: '#6B7280' },
  { id: 'funcionalidad',label: 'Discapacidad / Funcionalidad',   color: '#DC2626' },
]

type ViewType = 'anterior' | 'posterior'

interface BodyMarker {
  id: string
  x: number
  y: number
  view: ViewType
  categoriaId: string
  label: string
}

interface PanelItem {
  id: string
  categoriaId: string
  label: string
}

function HumanBodySVG({
  view,
  markers,
  onBodyClick,
  selectedCat,
}: {
  view: ViewType
  markers: BodyMarker[]
  onBodyClick: (x: number, y: number) => void
  selectedCat: string | null
}) {
  const svgRef = useRef<SVGSVGElement>(null)

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!selectedCat) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * VB_W
    const y = ((e.clientY - rect.top) / rect.height) * VB_H
    onBodyClick(x, y)
  }

  const stroke = '#555'
  const fill = '#1e1e1c'

  const visibleMarkers = markers.filter(m => m.view === view)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={`w-full h-full select-none ${selectedCat ? 'cursor-crosshair' : 'cursor-default'}`}
      onClick={handleClick}
    >
      <g stroke={stroke} strokeWidth="1.5" fill={fill}>
        {/* Cabeza */}
        <ellipse cx="90" cy="36" rx="24" ry="28" />
        {/* Cuello */}
        <rect x="82" y="62" width="16" height="14" rx="3" />
        {/* Torso */}
        <rect x="53" y="74" width="74" height="86" rx="8" />
        {/* Pelvis */}
        <rect x="50" y="157" width="80" height="30" rx="10" />
        {/* Brazo superior izquierdo */}
        <rect x="29" y="76" width="22" height="70" rx="11" />
        {/* Antebrazo izquierdo */}
        <rect x="24" y="147" width="18" height="62" rx="9" />
        {/* Mano izquierda */}
        <ellipse cx="33" cy="219" rx="11" ry="14" />
        {/* Brazo superior derecho */}
        <rect x="129" y="76" width="22" height="70" rx="11" />
        {/* Antebrazo derecho */}
        <rect x="138" y="147" width="18" height="62" rx="9" />
        {/* Mano derecha */}
        <ellipse cx="147" cy="219" rx="11" ry="14" />
        {/* Muslo izquierdo */}
        <rect x="54" y="185" width="32" height="88" rx="12" />
        {/* Muslo derecho */}
        <rect x="94" y="185" width="32" height="88" rx="12" />
        {/* Pierna izquierda */}
        <rect x="56" y="271" width="26" height="88" rx="10" />
        {/* Pierna derecha */}
        <rect x="98" y="271" width="26" height="88" rx="10" />
        {/* Pie izquierdo */}
        <ellipse cx="69" cy="369" rx="20" ry="9" />
        {/* Pie derecho */}
        <ellipse cx="111" cy="369" rx="20" ry="9" />
      </g>

      {/* Detalles vista posterior */}
      {view === 'posterior' && (
        <g stroke={stroke} strokeWidth="1" fill="none" opacity="0.35">
          <line x1="90" y1="80" x2="90" y2="155" strokeDasharray="3 2" />
          <ellipse cx="71" cy="102" rx="13" ry="18" />
          <ellipse cx="109" cy="102" rx="13" ry="18" />
          <path d="M54,185 Q72,179 90,181 Q108,179 126,185" />
        </g>
      )}

      {/* Marcadores */}
      {visibleMarkers.map(marker => {
        const cat = CATEGORIAS.find(c => c.id === marker.categoriaId)
        if (!cat) return null
        return (
          <g key={marker.id}>
            <circle
              cx={marker.x}
              cy={marker.y}
              r="7"
              fill={cat.color}
              opacity="0.9"
              stroke="white"
              strokeWidth="1.5"
            />
            {marker.label && (
              <text
                x={marker.x + 11}
                y={marker.y + 4}
                fontSize="9"
                fill={cat.color}
                fontFamily="system-ui, sans-serif"
                fontWeight="700"
                stroke="#0d0d0b"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {marker.label}
              </text>
            )}
          </g>
        )
      })}

      {/* Label vista */}
      <text x="90" y="408" textAnchor="middle" fontSize="9" fill={stroke} opacity="0.5" fontFamily="system-ui, sans-serif">
        {view === 'anterior' ? 'Vista anterior' : 'Vista posterior'}
      </text>
    </svg>
  )
}

export default function BodyboardClient() {
  const [view, setView] = useState<ViewType>('anterior')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [labelInput, setLabelInput] = useState('')
  const [markers, setMarkers] = useState<BodyMarker[]>([])
  const [panelItems, setPanelItems] = useState<PanelItem[]>([])

  const selectedCatData = CATEGORIAS.find(c => c.id === selectedCat)

  const handleBodyClick = (x: number, y: number) => {
    if (!selectedCat) return
    setMarkers(prev => [...prev, {
      id: crypto.randomUUID(),
      x, y,
      view,
      categoriaId: selectedCat,
      label: labelInput.trim(),
    }])
    setLabelInput('')
  }

  const handleAddToPanel = () => {
    if (!selectedCat || !labelInput.trim()) return
    setPanelItems(prev => [...prev, {
      id: crypto.randomUUID(),
      categoriaId: selectedCat,
      label: labelInput.trim(),
    }])
    setLabelInput('')
  }

  const handleClear = () => {
    if (!confirm('¿Limpiar todo el tablero?')) return
    setMarkers([])
    setPanelItems([])
    setSelectedCat(null)
    setLabelInput('')
  }

  const panelByCat = CATEGORIAS
    .map(cat => ({ ...cat, items: panelItems.filter(i => i.categoriaId === cat.id) }))
    .filter(cat => cat.items.length > 0)

  const bodyMarkers = markers.filter(m => m.view === view)

  return (
    <div className="space-y-4">

      {/* Selector de categoría */}
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4">
        <p className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3 font-medium">
          Seleccioná una categoría y hacé clic en el cuerpo o agregá al panel lateral
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {CATEGORIAS.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCat(prev => prev === cat.id ? null : cat.id); setLabelInput('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[0.5px] text-[12px] font-medium transition-all"
              style={{
                borderColor: cat.color,
                background: selectedCat === cat.id ? cat.color : 'transparent',
                color: selectedCat === cat.id ? 'white' : cat.color,
              }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: selectedCat === cat.id ? 'white' : cat.color }} />
              {cat.label}
            </button>
          ))}
        </div>

        {selectedCat && (
          <div className="flex gap-2 items-center pt-3 border-t-[0.5px] border-border">
            <input
              type="text"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddToPanel()}
              placeholder="Etiqueta (ej: Kinesiofobia, Hernia L4-L5)..."
              autoFocus
              className="flex-grow bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleAddToPanel}
              disabled={!labelInput.trim()}
              className="shrink-0 px-4 py-2 rounded-lg text-[12px] font-medium border-[0.5px] disabled:opacity-30 transition-colors"
              style={{ borderColor: selectedCatData?.color, color: selectedCatData?.color }}
              title="Agregar al panel lateral (sin localización)"
            >
              + Panel
            </button>
            <span className="text-[12px] text-text-secondary shrink-0">o clic en el cuerpo</span>
          </div>
        )}
      </div>

      {/* Board principal */}
      <div className="flex gap-4 min-h-[520px]">

        {/* Cuerpo */}
        <div className="flex-1 bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[12px] uppercase tracking-[0.05em] text-text-secondary font-medium">Cuerpo</span>
            <div className="flex bg-bg-primary rounded-lg p-1 border-[0.5px] border-border">
              {(['anterior', 'posterior'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 text-[11px] rounded-md transition-colors capitalize ${view === v ? 'bg-bg-secondary text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  {v === 'anterior' ? 'Anterior' : 'Posterior'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center flex-grow">
            <div className="w-[220px]">
              <HumanBodySVG
                view={view}
                markers={markers}
                onBodyClick={handleBodyClick}
                selectedCat={selectedCat}
              />
            </div>
          </div>

          {/* Leyenda de marcadores en esta vista */}
          {bodyMarkers.length > 0 && (
            <div className="mt-4 pt-4 border-t-[0.5px] border-border space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.05em] text-text-secondary font-medium mb-2">Marcadores — {view === 'anterior' ? 'vista anterior' : 'vista posterior'}</p>
              {bodyMarkers.map(m => {
                const cat = CATEGORIAS.find(c => c.id === m.categoriaId)
                return (
                  <div key={m.id} className="flex items-center gap-2 group">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat?.color }} />
                    <span className="text-[12px] text-text-primary flex-1 truncate">{m.label || cat?.label}</span>
                    <button
                      onClick={() => setMarkers(prev => prev.filter(x => x.id !== m.id))}
                      className="text-text-secondary hover:text-warning opacity-0 group-hover:opacity-100 text-[16px] transition-opacity shrink-0"
                    >×</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel lateral */}
        <div className="w-[300px] shrink-0 bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 flex flex-col">
          <span className="text-[12px] uppercase tracking-[0.05em] text-text-secondary font-medium block mb-4">
            Factores sin localización anatómica
          </span>

          {panelByCat.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-text-secondary text-[13px] border-[0.5px] border-dashed border-border rounded-xl p-6">
                Seleccioná una categoría, escribí un factor y usá <strong>&quot;+ Panel&quot;</strong>
              </div>
            </div>
          ) : (
            <div className="space-y-5 overflow-y-auto flex-1">
              {panelByCat.map(cat => (
                <div key={cat.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                    <span className="text-[10px] uppercase tracking-[0.05em] font-medium" style={{ color: cat.color }}>
                      {cat.label}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {cat.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-bg-primary rounded-lg px-3 py-2 group">
                        <span className="text-[13px] text-text-primary">{item.label}</span>
                        <button
                          onClick={() => setPanelItems(prev => prev.filter(x => x.id !== item.id))}
                          className="text-text-secondary hover:text-warning opacity-0 group-hover:opacity-100 text-[16px] transition-opacity ml-2 shrink-0"
                        >×</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleClear}
          className="text-[13px] text-text-secondary hover:text-warning transition-colors"
        >
          Limpiar tablero
        </button>
        <button
          onClick={() => window.print()}
          className="bg-accent text-bg-primary px-5 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          Imprimir / Exportar
        </button>
      </div>
    </div>
  )
}
