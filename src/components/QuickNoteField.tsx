'use client'

import { useEffect, useRef, useState } from 'react'

// Nota rápida para tablet: campo de texto + chips de frases frecuentes (un toque
// las inserta) + dictado por voz nativo (Web Speech API). Pensado para registrar
// una observación en pocos segundos, sin dejar de mirar al paciente.
//
// Reutilizable: se le pasan las frases según el contexto (evolución de sesión,
// diagnóstico, plan, etc.). El dictado se oculta solo si el dispositivo no lo
// soporta.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = any

interface CustomPhrase { id: string; label: string }

interface Props {
  value: string
  onChange: (v: string) => void
  phrases?: string[]
  placeholder?: string
  rows?: number
  lang?: string
  /** clases del <textarea> — por defecto matchea el estilo de la ficha */
  textClassName?: string
  /** frases propias (además de las preestablecidas), borrables y persistentes */
  customPhrases?: CustomPhrase[]
  onAddPhrase?: (label: string) => void | Promise<void>
  onDeletePhrase?: (id: string) => void | Promise<void>
  /** Si se pasa, las frases preestablecidas se pueden ocultar (× por chip),
   *  guardado en este dispositivo bajo esta clave. Con opción de restaurar. */
  presetHideKey?: string
}

const DEFAULT_TEXTAREA =
  'w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y'

export default function QuickNoteField({
  value,
  onChange,
  phrases = [],
  placeholder,
  rows = 2,
  lang = 'es-AR',
  textClassName,
  customPhrases,
  onAddPhrase,
  onDeletePhrase,
  presetHideKey,
}: Props) {
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newPhrase, setNewPhrase] = useState('')
  const [savingPhrase, setSavingPhrase] = useState(false)

  // Preestablecidas ocultadas en este dispositivo (solo si presetHideKey)
  const storageKey = presetHideKey ? `hidden_presets_${presetHideKey}` : null
  const [hiddenPresets, setHiddenPresets] = useState<string[]>([])
  useEffect(() => {
    if (!storageKey) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setHiddenPresets(JSON.parse(raw))
    } catch { /* noop */ }
  }, [storageKey])
  const persistHidden = (next: string[]) => {
    setHiddenPresets(next)
    if (storageKey) { try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* noop */ } }
  }
  const hidePreset = (p: string) => persistHidden([...hiddenPresets, p])
  const restorePresets = () => persistHidden([])
  const visiblePhrases = storageKey ? phrases.filter(p => !hiddenPresets.includes(p)) : phrases

  const submitNewPhrase = async () => {
    const label = newPhrase.trim()
    if (!label || !onAddPhrase) return
    setSavingPhrase(true)
    await onAddPhrase(label)
    setSavingPhrase(false)
    setNewPhrase('')
    setAdding(false)
  }
  const recRef = useRef<AnyRec>(null)
  // Referencia siempre-fresca al valor, para que voz y chips agreguen sobre lo último.
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: AnyRec; webkitSpeechRecognition?: AnyRec }
    setVoiceSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
    return () => { try { recRef.current?.stop?.() } catch { /* noop */ } }
  }, [])

  // Agrega un fragmento al final, con separador prolijo según lo que ya haya.
  const appendText = (chunk: string) => {
    const cur = valueRef.current.trimEnd()
    const sep = cur.length === 0 ? '' : (/[.\n,;:]$/.test(cur) ? ' ' : '. ')
    onChange(cur + sep + chunk)
  }

  const toggleVoice = () => {
    const w = window as unknown as { SpeechRecognition?: AnyRec; webkitSpeechRecognition?: AnyRec }
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return
    if (listening) { try { recRef.current?.stop() } catch { /* noop */ } return }

    const rec = new SR()
    rec.lang = lang
    rec.interimResults = false
    rec.continuous = true
    rec.onresult = (e: AnyRec) => {
      let finalChunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalChunk += e.results[i][0].transcript
      }
      const clean = finalChunk.trim()
      if (clean) appendText(clean.charAt(0).toUpperCase() + clean.slice(1))
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    try { rec.start(); setListening(true) } catch { setListening(false) }
  }

  const canManagePhrases = !!onAddPhrase

  return (
    <div>
      {(visiblePhrases.length > 0 || (customPhrases?.length ?? 0) > 0 || canManagePhrases || voiceSupported || hiddenPresets.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {visiblePhrases.map(p => (
            storageKey ? (
              // Ocultable: insertar al tocar, ocultar con la ×
              <span key={p} className="inline-flex items-center rounded-full border-[0.5px] border-accent/35 bg-accent/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => appendText(p)}
                  className="text-[12px] pl-2.5 pr-1.5 py-1.5 text-accent hover:bg-accent/20 active:bg-accent/25 transition-colors"
                >
                  + {p}
                </button>
                <button
                  type="button"
                  onClick={() => hidePreset(p)}
                  title="Ocultar esta frase sugerida (en este dispositivo)"
                  className="text-[13px] leading-none px-1.5 py-1.5 text-accent/60 hover:text-warning hover:bg-accent/20 transition-colors"
                >
                  ×
                </button>
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => appendText(p)}
                className="text-[12px] px-2.5 py-1.5 rounded-full border-[0.5px] border-accent/35 bg-accent/10 text-accent hover:bg-accent/20 active:bg-accent/25 transition-colors"
              >
                + {p}
              </button>
            )
          ))}
          {/* Frases propias del equipo: insertar al tocar, borrar con la × */}
          {customPhrases?.map(cp => (
            <span key={cp.id} className="inline-flex items-center rounded-full border-[0.5px] border-accent/35 bg-accent/10 overflow-hidden">
              <button
                type="button"
                onClick={() => appendText(cp.label)}
                className="text-[12px] pl-2.5 pr-1.5 py-1.5 text-accent hover:bg-accent/20 active:bg-accent/25 transition-colors"
              >
                + {cp.label}
              </button>
              {onDeletePhrase && (
                <button
                  type="button"
                  onClick={() => onDeletePhrase(cp.id)}
                  title="Borrar frase"
                  className="text-[13px] leading-none px-1.5 py-1.5 text-accent/60 hover:text-warning hover:bg-accent/20 transition-colors"
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {/* Crear una frase nueva */}
          {canManagePhrases && (
            adding ? (
              <span className="inline-flex items-center gap-1">
                <input
                  autoFocus
                  value={newPhrase}
                  onChange={e => setNewPhrase(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitNewPhrase() } else if (e.key === 'Escape') { setAdding(false); setNewPhrase('') } }}
                  placeholder="Nueva frase…"
                  maxLength={80}
                  className="text-[12px] px-2.5 py-1.5 rounded-full border-[0.5px] border-border-strong bg-bg-primary focus:outline-none focus:border-accent w-[150px]"
                />
                <button type="button" onClick={submitNewPhrase} disabled={savingPhrase || !newPhrase.trim()} className="text-[12px] px-2.5 py-1.5 rounded-full bg-accent text-bg-primary font-medium disabled:opacity-40">
                  {savingPhrase ? '…' : 'Guardar'}
                </button>
                <button type="button" onClick={() => { setAdding(false); setNewPhrase('') }} className="text-[12px] px-1.5 py-1.5 text-text-secondary hover:text-text-primary">×</button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                title="Crear una frase propia del equipo"
                className="text-[12px] px-2.5 py-1.5 rounded-full border-[0.5px] border-dashed border-border-strong text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
              >
                + Frase
              </button>
            )
          )}
          {storageKey && hiddenPresets.length > 0 && (
            <button
              type="button"
              onClick={restorePresets}
              title="Volver a mostrar las frases sugeridas ocultadas"
              className="text-[12px] px-2.5 py-1.5 rounded-full border-[0.5px] border-dashed border-border-strong text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
            >
              ↺ Restaurar sugeridas
            </button>
          )}
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              title={listening ? 'Detener dictado' : 'Dictar por voz'}
              className={`ml-auto text-[12px] font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 border-[0.5px] transition-colors ${
                listening
                  ? 'bg-red-500/15 border-red-500/40 text-red-400 animate-pulse'
                  : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
              {listening ? 'Escuchando…' : 'Dictar'}
            </button>
          )}
        </div>
      )}
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={textClassName ?? DEFAULT_TEXTAREA}
      />
    </div>
  )
}
