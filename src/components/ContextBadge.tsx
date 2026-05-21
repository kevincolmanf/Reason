'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { switchContext } from '@/app/actions/context'
import type { ActiveContext } from '@/lib/context'

export interface AvailableContext {
  type: 'personal' | 'org'
  orgId: string | null
  label: string
}

interface Props {
  current: ActiveContext
  currentLabel: string
  available: AvailableContext[]
}

export default function ContextBadge({ current, currentLabel, available }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const canSwitch = available.length > 1

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSwitch = (ctx: AvailableContext) => {
    setOpen(false)
    startTransition(async () => {
      const result = await switchContext({ type: ctx.type, orgId: ctx.orgId })
      if ('ok' in result) router.refresh()
    })
  }

  const baseClass =
    'hidden sm:inline-flex items-center gap-1 text-[11px] text-text-secondary bg-bg-secondary border-[0.5px] border-border rounded-md px-2 py-1 max-w-[160px] truncate transition-colors'

  if (!canSwitch) {
    return (
      <span className={baseClass}>
        {currentLabel}
      </span>
    )
  }

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={isPending}
        className={`${baseClass} hover:border-border-strong cursor-pointer`}
      >
        <span className="truncate">{isPending ? '…' : currentLabel}</span>
        <span className="text-[8px] opacity-40 shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-bg-primary border-[0.5px] border-border rounded-xl shadow-lg py-2 z-30">
          <p className="px-3 pt-1 pb-2 text-[10px] uppercase tracking-wider text-text-tertiary">
            Cambiar workspace
          </p>
          {available.map(ctx => {
            const isActive = ctx.type === current.type && ctx.orgId === current.orgId
            return (
              <button
                key={ctx.orgId ?? 'personal'}
                onClick={() => !isActive && handleSwitch(ctx)}
                className={`w-full text-left px-3 py-2.5 text-[13px] transition-colors flex items-center justify-between ${
                  isActive
                    ? 'text-accent cursor-default'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
              >
                <span className="truncate">{ctx.label}</span>
                {isActive && <span className="text-[10px] shrink-0 ml-2">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
