import { createAdminClient } from '@/utils/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import InscripcionForm from './InscripcionForm'
import { Linkify } from '@/components/Linkify'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { token: string } }) {
  const admin = createAdminClient()
  const { data } = await admin.from('events').select('title').eq('public_token', params.token).maybeSingle()
  return { title: data?.title ? `${data.title} · Reason` : 'Evento · Reason' }
}

function fmtLong(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export default async function EventoPublicPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient()
  const { data: event } = await admin
    .from('events')
    .select('id, title, description, location, starts_at, ends_at, cover_emoji, capacity, price, payment_instructions, published')
    .eq('public_token', params.token)
    .maybeSingle()

  if (!event || !event.published) notFound()

  const { count } = await admin.from('event_registrations').select('*', { count: 'exact', head: true }).eq('event_id', event.id)
  const taken = count ?? 0
  const full = event.capacity != null && taken >= event.capacity
  const past = new Date(event.starts_at).getTime() < Date.now() - 6 * 60 * 60 * 1000

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="py-6 border-b-[0.5px] border-border">
        <div className="w-full max-w-[640px] mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="text-[20px] font-medium tracking-[-0.01em] no-underline text-text-primary">reason<span className="text-accent">.</span></Link>
          <span className="text-[12px] text-text-tertiary">Inscripción</span>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[640px] mx-auto px-4 py-10">
        <div className="text-[52px] leading-none mb-5">{event.cover_emoji}</div>
        <h1 className="text-[30px] sm:text-[36px] font-medium tracking-[-0.02em] leading-[1.1]">{event.title}</h1>

        <div className="flex flex-col gap-2 mt-5 text-[15px] text-text-secondary">
          <div className="flex items-center gap-2.5"><span className="text-text-tertiary">🗓️</span><span className="capitalize">{fmtLong(event.starts_at)}{event.ends_at ? ` – ${new Date(event.ends_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : ''} hs</span></div>
          {event.location && <div className="flex items-center gap-2.5"><span className="text-text-tertiary">📍</span><span>{event.location}</span></div>}
          {event.price > 0 && <div className="flex items-center gap-2.5"><span className="text-text-tertiary">🎟️</span><span>{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(event.price)}</span></div>}
        </div>

        {event.description && (
          <p className="text-[15px] text-text-secondary leading-[1.6] mt-6 whitespace-pre-line">{event.description}</p>
        )}

        {event.price > 0 && event.payment_instructions && !past && !full && (
          <div className="mt-7 bg-bg-secondary border-[0.5px] border-border rounded-xl p-4">
            <div className="text-[13px] font-medium mb-1">💳 Cómo pagar · {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(event.price)}</div>
            <p className="text-[14px] text-text-secondary leading-[1.6] whitespace-pre-line"><Linkify text={event.payment_instructions} /></p>
            <p className="text-[11px] text-text-tertiary mt-2">El pago es directo al organizador. Primero inscribite acá abajo; después seguí estas instrucciones para pagar.</p>
          </div>
        )}

        <div className="mt-8 border-t-[0.5px] border-border pt-8">
          {past ? (
            <p className="text-[15px] text-text-secondary">Este evento ya pasó.</p>
          ) : full ? (
            <p className="text-[15px] text-text-secondary">El cupo está completo. ¡Gracias por el interés!</p>
          ) : (
            <InscripcionForm token={params.token} eventTitle={event.title} startsAt={event.starts_at} paymentInstructions={event.price > 0 ? event.payment_instructions : null} />
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-[12px] text-text-tertiary">
        Organizado con <Link href="/" className="text-text-secondary no-underline hover:text-text-primary">Reason</Link> — la plataforma clínica para kinesiólogos.
      </footer>
    </div>
  )
}
