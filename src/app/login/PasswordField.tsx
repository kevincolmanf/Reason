'use client'

import { useState } from 'react'

// Campo de contraseña con mostrar/ocultar. Mantiene name="password" para que el
// form action del login lo reciba igual.
export default function PasswordField() {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        id="password"
        name="password"
        type={show ? 'text' : 'password'}
        placeholder="••••••••"
        required
        className="w-full p-4 pr-12 bg-bg-primary border-[0.5px] border-border-strong rounded-lg text-[15px] focus:outline-none focus:border-accent transition-colors"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors p-1"
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        )}
      </button>
    </div>
  )
}
