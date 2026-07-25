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

interface Props {
  value: string
  onChange: (v: string) => void
  phrases?: string[]
  placeholder?: string
  rows?: number
  lang?: string
  /** clases del <textarea> — por defecto matchea el estilo de la ficha */
  textClassName?: string
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
}: Props) {
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
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

  return (
    <div>
      {(phrases.length > 0 || voiceSupported) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {phrases.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => appendText(p)}
              className="text-[12px] px-2.5 py-1.5 rounded-full border-[0.5px] border-accent/35 bg-accent/10 text-accent hover:bg-accent/20 active:bg-accent/25 transition-colors"
            >
              + {p}
            </button>
          ))}
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
