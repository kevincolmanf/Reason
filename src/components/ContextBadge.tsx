'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { switchContext } from '@/app/actions/context'
import type { ActiveContext } from '@/lib/context'
import { workspaceSubtitle, type WorkspaceKind } from '@/lib/context/describe'

export interface AvailableContext {
  type: 'personal' | 'org'
  orgId: string | null
  label: string
  kind: WorkspaceKind
}

interface Props {
  current: ActiveContext
  currentLabel: string
  available: AvailableContext[]
}

// Ícono según el tipo de workspace: persona para el espacio propio, equipo para
// un centro. Ayuda a distinguir de un vistazo dónde estás parado.
function WorkspaceIcon({ kind, className = '' }: { kind: WorkspaceKind; className?: string }) {
  if (kind === 'personal') {
    return (
      <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    )
  }
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export default function ContextBadge({ current, currentLabel, available }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const canSwitch = available.length > 1

  const currentKind: WorkspaceKind =
    available.find(a => a.type === current.type && a.orgId === current.orgId)?.kind ??
    (current.type === 'personal' ? 'personal' : 'member')
  const isCenter = currentKind !== 'personal'

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

  // El centro va con tinte terracota; el espacio propio, neutro. Distinguir el
  // "modo equipo" de un vistazo es justo lo que se pedía.
  const tint = isCenter
    ? 'bg-accent/10 border-accent/40 text-accent'
    : 'bg-bg-secondary border-border text-text-secondary'
  const baseClass = `hidden sm:inline-flex items-center gap-1.5 text-[12px] font-medium border-[0.5px] rounded-lg px-2.5 py-1.5 max-w-[200px] transition-colors ${tint}`

  if (!canSwitch) {
    return (
      <span className={baseClass} title={workspaceSubtitle(currentKind)}>
        <WorkspaceIcon kind={currentKind} className="shrink-0" />
        <span className="truncate">{currentLabel}</span>
      </span>
    )
  }

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={isPending}
        className={`${baseClass} ${isCenter ? 'hover:bg-accent/15' : 'hover:border-border-strong'} cursor-pointer`}
      >
        <WorkspaceIcon kind={currentKind} className="shrink-0" />
        <span className="truncate">{isPending ? '…' : currentLabel}</span>
        <span className="text-[8px] opacity-50 shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-bg-primary border-[0.5px] border-border rounded-xl shadow-lg py-2 z-30">
          <p className="px-3 pt-1 pb-2 text-[10px] uppercase tracking-wider text-text-tertiary">
            En qué workspace trabajás
          </p>
          {available.map(ctx => {
            const isActive = ctx.type === current.type && ctx.orgId === current.orgId
            return (
              <button
                key={ctx.orgId ?? 'personal'}
                onClick={() => !isActive && handleSwitch(ctx)}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors ${
                  isActive ? 'cursor-default bg-bg-secondary' : 'hover:bg-bg-secondary'
                }`}
              >
                <span className={`mt-0.5 shrink-0 ${ctx.kind === 'personal' ? 'text-text-secondary' : 'text-accent'}`}>
                  <WorkspaceIcon kind={ctx.kind} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] font-medium truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>
                    {ctx.label}
                  </span>
                  <span className="block text-[11px] text-text-tertiary leading-snug">
                    {workspaceSubtitle(ctx.kind)}
                  </span>
                </span>
                {isActive && <span className="text-[11px] text-accent shrink-0 mt-0.5">✓</span>}
              </button>
            )
          })}
          <p className="px-3 pt-2 mt-1 border-t-[0.5px] border-border text-[11px] text-text-tertiary leading-snug">
            Los pacientes de un centro se comparten con el equipo. Tu espacio es solo tuyo.
          </p>
        </div>
      )}
    </div>
  )
}
