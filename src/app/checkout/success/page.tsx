'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type SyncStatus = 'processing' | 'done' | 'timeout'

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const [status, setStatus] = useState<SyncStatus>('processing')

  useEffect(() => {
    let attempts = 0
    const maxAttempts = 10 // hasta ~53 segundos de espera
    let cancelled = false

    async function checkSync() {
      if (cancelled) return
      try {
        const res = await fetch('/api/subscription/sync', { method: 'POST' })
        const data = await res.json()

        if (data.role && data.role !== 'free') {
          setStatus('done')
          setTimeout(() => router.push('/dashboard'), 1500)
          return
        }
      } catch {
        // ignorar errores de red, seguir intentando
      }

      attempts++
      if (attempts >= maxAttempts) {
        setStatus('timeout')
        setTimeout(() => router.push('/dashboard'), 3000)
        return
      }

      setTimeout(checkSync, 5000)
    }

    // Dar 3 segundos antes del primer intento para que MP procese
    const initialTimer = setTimeout(checkSync, 3000)
    return () => {
      cancelled = true
      clearTimeout(initialTimer)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <div className="text-center max-w-sm px-8">
        {status === 'processing' && (
          <>
            <div
              className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-6"
              aria-label="Cargando"
            />
            <p className="text-[18px] font-medium tracking-[-0.01em] mb-2">Procesando tu pago</p>
            <p className="text-[13px] text-text-secondary">Esto puede tomar unos segundos.</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[18px] font-medium tracking-[-0.01em] mb-2 text-green-500">Suscripcion activada</p>
            <p className="text-[13px] text-text-secondary">Redirigiendo al dashboard...</p>
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[18px] font-medium tracking-[-0.01em] mb-2">Tu pago esta siendo procesado</p>
            <p className="text-[13px] text-text-secondary">
              Puede tomar unos minutos. Si en 5 minutos tu cuenta no se actualiza, contanos por WhatsApp.
            </p>
            <p className="text-[12px] text-text-tertiary mt-4">Redirigiendo...</p>
          </>
        )}
      </div>
    </div>
  )
}
