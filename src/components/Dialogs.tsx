'use client'

import { useState, useCallback, useRef } from 'react'

// ─── Confirmación estilizada (reemplaza al confirm() nativo) ──────────────────
// Uso:
//   const { confirm, confirmDialog } = useConfirm()
//   if (!(await confirm({ message: '¿Eliminar?', danger: true }))) return
//   ...y renderizar {confirmDialog} en el JSX del componente.

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>(resolve => {
    resolver.current = resolve
    setOpts(o)
  }), [])

  const close = (v: boolean) => {
    setOpts(null)
    resolver.current?.(v)
    resolver.current = null
  }

  const confirmDialog = opts ? (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => close(false)}>
      <div className="bg-bg-secondary border-[0.5px] border-border rounded-2xl w-full max-w-[400px] shadow-xl p-6" onClick={e => e.stopPropagation()}>
        {opts.title && <h3 className="text-[16px] font-medium mb-2">{opts.title}</h3>}
        <p className="text-[13px] text-text-secondary mb-5 leading-[1.5]">{opts.message}</p>
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => close(false)} className="px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">
            {opts.cancelLabel ?? 'Cancelar'}
          </button>
          <button
            onClick={() => close(true)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${opts.danger ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-accent text-bg-primary hover:opacity-90'}`}
          >
            {opts.confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, confirmDialog }
}

// ─── Toast transitorio (reemplaza al alert() nativo) ──────────────────────────
// Uso:
//   const { notify, toast } = useToast()
//   notify('Copiado')                       // éxito
//   notify('Error al guardar', 'error')     // error
//   ...y renderizar {toast} en el JSX del componente.

type ToastKind = 'success' | 'error'

export function useToast() {
  const [msg, setMsg] = useState<{ text: string; kind: ToastKind } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notify = useCallback((text: string, kind: ToastKind = 'success') => {
    if (timer.current) clearTimeout(timer.current)
    setMsg({ text, kind })
    timer.current = setTimeout(() => setMsg(null), kind === 'error' ? 4500 : 2500)
  }, [])

  const toast = msg ? (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] pointer-events-none">
      <div className={`px-4 py-2.5 rounded-xl text-[13px] font-medium shadow-lg border-[0.5px] ${
        msg.kind === 'error'
          ? 'bg-bg-secondary border-warning/40 text-warning'
          : 'bg-bg-secondary border-border text-text-primary'
      }`}>
        {msg.text}
      </div>
    </div>
  ) : null

  return { notify, toast }
}
