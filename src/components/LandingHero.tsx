'use client'

import { useState } from 'react'

type Audience = 'solo' | 'centro'

const HERO = {
  solo: {
    eyebrow: 'Para el kinesiólogo independiente',
    title: (
      <>
        Tu consultorio, con criterio<br />clínico y sin planillas.
      </>
    ),
    subtitle:
      'Planes de ejercicio con 1800+ videos, monitoreo de carga, protocolos RTS y ficha kinésica digital. Todo tu razonamiento clínico en un solo lugar, sin llevarte trabajo a casa.',
    ctaLabel: 'Probá gratis 7 días',
    ctaHref: '/login',
    secondaryLabel: 'Ver funcionalidades →',
    secondaryHref: '#funcionalidades',
    highlights: [
      { k: '1800+', v: 'ejercicios con video' },
      { k: 'Ficha', v: 'kinésica digital exportable' },
      { k: 'RTS', v: 'retorno al deporte + LSI' },
      { k: 'Carga', v: 'monitoreo sesión a sesión' },
    ],
  },
  centro: {
    eyebrow: 'Para centros y equipos interdisciplinarios',
    title: (
      <>
        Ordená todo tu centro<br />en una sola plataforma.
      </>
    ),
    subtitle:
      'Agenda por profesional, recordatorios por WhatsApp, pacientes e historial compartidos entre todo el equipo y control de acceso por profesional. La historia clínica del centro, estandarizada.',
    ctaLabel: 'Ver el plan Pro',
    ctaHref: '#pricing',
    secondaryLabel: 'Cómo funciona el modo equipo →',
    secondaryHref: '#modo-equipo',
    highlights: [
      { k: 'Agenda', v: 'por profesional + WhatsApp' },
      { k: 'Equipo', v: 'pacientes y planes compartidos' },
      { k: 'Historial', v: 'permanente del centro' },
      { k: 'Acceso', v: 'granular por profesional' },
    ],
  },
} as const

export default function LandingHero() {
  const [audience, setAudience] = useState<Audience>('solo')
  const data = HERO[audience]

  return (
    <>
      {/* Hero con bifurcación de audiencia */}
      <section className="pt-[96px] pb-[72px]">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          {/* Pregunta + selector */}
          <div className="mb-12">
            <div className="text-[13px] text-text-secondary mb-4 tracking-[-0.01em]">
              ¿Cómo trabajás?
            </div>
            <div
              role="tablist"
              aria-label="Elegí tu tipo de práctica"
              className="inline-flex flex-col sm:flex-row gap-2 w-full sm:w-auto"
            >
              <button
                role="tab"
                aria-selected={audience === 'solo'}
                onClick={() => setAudience('solo')}
                className={`text-left px-5 py-4 rounded-xl border-[0.5px] transition-colors ${
                  audience === 'solo'
                    ? 'border-accent bg-[rgba(194,90,44,0.08)]'
                    : 'border-border bg-bg-secondary hover:border-border-strong'
                }`}
              >
                <div className="text-[15px] font-medium text-text-primary">
                  Trabajo solo
                </div>
                <div className="text-[13px] text-text-secondary mt-0.5">
                  Kinesiólogo o profesional independiente
                </div>
              </button>
              <button
                role="tab"
                aria-selected={audience === 'centro'}
                onClick={() => setAudience('centro')}
                className={`text-left px-5 py-4 rounded-xl border-[0.5px] transition-colors ${
                  audience === 'centro'
                    ? 'border-accent bg-[rgba(194,90,44,0.08)]'
                    : 'border-border bg-bg-secondary hover:border-border-strong'
                }`}
              >
                <div className="text-[15px] font-medium text-text-primary flex items-center gap-2">
                  Tengo un centro o trabajo en equipo
                  <span className="text-[10px] font-medium text-accent border-[0.5px] border-accent rounded px-1.5 py-0.5 tracking-[0.04em] uppercase">
                    Pro
                  </span>
                </div>
                <div className="text-[13px] text-text-secondary mt-0.5">
                  Centro de rehabilitación o equipo interdisciplinario
                </div>
              </button>
            </div>
          </div>

          {/* Contenido del hero según la audiencia */}
          <div className="max-w-[760px]" key={audience}>
            <div className="text-[11px] font-medium text-accent tracking-[0.05em] uppercase mb-4">
              {data.eyebrow}
            </div>
            <h1 className="text-[44px] sm:text-[64px] font-medium tracking-[-0.02em] leading-[1.1] mb-6">
              {data.title}
            </h1>
            <p className="text-[20px] text-text-secondary leading-[1.5] max-w-[620px] mb-10">
              {data.subtitle}
            </p>
            <div className="flex gap-4 items-center flex-wrap">
              <a
                href={data.ctaHref}
                className="bg-accent text-bg-primary py-[14px] px-7 rounded-lg text-[14px] font-medium no-underline inline-block border-none cursor-pointer"
              >
                {data.ctaLabel}
              </a>
              <a
                href={data.secondaryHref}
                className="text-text-primary text-[14px] no-underline py-[14px] px-0"
              >
                {data.secondaryLabel}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Franja de highlights según la audiencia */}
      <section className="py-10 border-t-[0.5px] border-border border-b-[0.5px] bg-bg-secondary">
        <div className="w-full max-w-[1080px] mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8" key={audience}>
            {data.highlights.map((h) => (
              <div key={h.k}>
                <div className="font-mono text-[32px] font-medium text-text-primary tracking-[-0.02em]">
                  {h.k}
                </div>
                <div className="text-[13px] text-text-secondary mt-1">{h.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
