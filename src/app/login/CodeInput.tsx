'use client'

import { useRef, useState } from 'react'

// Input de código segmentado: una casilla por dígito, con auto-avance, borrado
// hacia atrás y pegado del código completo. El valor combinado va en un input
// oculto name="code" para que lo tome el server action. Sin cursor titilando en
// el medio: cada dígito tiene su casilla. Largo = el del OTP del proyecto (8).
export default function CodeInput({ length = 8 }: { length?: number }) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const code = digits.join('')

  const focusAt = (i: number) => refs.current[Math.max(0, Math.min(i, length - 1))]?.focus()

  const handleChange = (i: number, raw: string) => {
    const clean = raw.replace(/\D/g, '')
    if (!clean) {
      setDigits(prev => { const n = [...prev]; n[i] = ''; return n })
      return
    }
    // Si pega/escribe varios en una casilla, los repartimos desde acá.
    setDigits(prev => {
      const n = [...prev]
      for (let k = 0; k < clean.length && i + k < length; k++) n[i + k] = clean[k]
      return n
    })
    focusAt(i + clean.length)
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault()
      setDigits(prev => { const n = [...prev]; n[i - 1] = ''; return n })
      focusAt(i - 1)
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focusAt(i - 1)
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      focusAt(i + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    e.preventDefault()
    const n = Array(length).fill('')
    for (let k = 0; k < pasted.length; k++) n[k] = pasted[k]
    setDigits(n)
    focusAt(pasted.length)
  }

  return (
    <>
      <input type="hidden" name="code" value={code} />
      <div className="flex gap-1.5" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => { refs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={length}
            value={d}
            autoFocus={i === 0}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Dígito ${i + 1}`}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="flex-1 min-w-0 aspect-square bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[20px] text-center font-mono text-text-primary focus:outline-none focus:border-accent transition-colors"
          />
        ))}
      </div>
    </>
  )
}
