import { createAdminClient } from '@/utils/supabase/admin'
import { notFound } from 'next/navigation'
import CertificadoActions from './CertificadoActions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Certificado · Reason' }

function fmtLong(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function CertificadoPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient()
  const { data: reg } = await admin
    .from('event_registrations')
    .select('name, checked_in, event_id')
    .eq('cert_token', params.token)
    .maybeSingle()
  if (!reg) notFound()

  const { data: event } = await admin
    .from('events')
    .select('title, starts_at, location, cert_entity, cert_signer, cert_signer_role')
    .eq('id', reg.event_id)
    .maybeSingle()
  if (!event) notFound()

  // El certificado se otorga a quien asistió (check-in).
  if (!reg.checked_in) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f4f1ea', color: '#3a352c', fontFamily: 'Georgia, serif', padding: '2rem', textAlign: 'center' }}>
        <div>
          <p style={{ fontSize: 18 }}>Este certificado todavía no está disponible.</p>
          <p style={{ fontSize: 14, color: '#8a8276', marginTop: 8 }}>Se emite una vez confirmada la asistencia al evento.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="cert-page">
      <style dangerouslySetInnerHTML={{ __html: `
        .cert-page { min-height: 100vh; background: #ece7db; display: flex; flex-direction: column; align-items: center; padding: 2.5rem 1rem; }
        .cert { background: #fdfbf6; width: 100%; max-width: 840px; aspect-ratio: 1.414 / 1; border: 1px solid #d9d0bd; box-shadow: 0 10px 40px rgba(60,50,30,.14); position: relative; display: flex; flex-direction: column; text-align: center; padding: 5.5% 8%; color: #2c281f; font-family: Georgia, 'Times New Roman', serif; }
        .cert::before { content: ''; position: absolute; inset: 16px; border: 1.5px solid #c8b78f; pointer-events: none; }
        .cert .brand { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 15px; letter-spacing: .02em; color: #b2560f; font-weight: 600; }
        .cert .mid { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 0; }
        .cert .kicker { font-family: ui-sans-serif, system-ui, sans-serif; text-transform: uppercase; letter-spacing: .32em; font-size: 12px; color: #a08a5e; margin-bottom: 1rem; }
        .cert h1 { font-size: clamp(1.6rem, 4.2vw, 2.7rem); font-weight: 400; margin: 0 0 1.2rem; letter-spacing: .01em; line-height: 1.1; }
        .cert .to { font-size: 12px; color: #6b6455; font-family: ui-sans-serif, system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase; }
        .cert .name { font-size: clamp(1.5rem, 4.6vw, 2.4rem); font-weight: 700; margin: .3rem 0 1.1rem; border-bottom: 1px solid #d9cfb8; padding-bottom: .7rem; display: inline-block; min-width: 55%; }
        .cert .body { font-size: clamp(.9rem, 2vw, 1.1rem); line-height: 1.55; color: #4a4437; max-width: 74%; margin: 0 auto; }
        .cert .body b { color: #2c281f; }
        .cert .sign { margin-top: 1.8rem; display: flex; gap: 3.5rem; justify-content: center; font-family: ui-sans-serif, system-ui, sans-serif; }
        .cert .sign .col { text-align: center; }
        .cert .sign .line { width: 160px; border-top: 1px solid #8a8168; margin: 0 auto .4rem; }
        .cert .sign .who { font-size: 13px; font-weight: 600; color: #2c281f; }
        .cert .sign .role { font-size: 11px; color: #8a8276; }
        .cert .foot { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 10.5px; color: #a89f88; letter-spacing: .03em; }
        @media (max-width: 640px) {
          .cert { aspect-ratio: auto; padding: 2.2rem 1.4rem; }
          .cert .mid { justify-content: flex-start; padding: 1.4rem 0; }
          .cert h1 { font-size: 1.55rem; }
          .cert .to { font-size: 11px; }
          .cert .name { font-size: 1.55rem; min-width: 82%; }
          .cert .body { max-width: 94%; font-size: .95rem; }
          .cert .sign { flex-direction: column; gap: 1.5rem; margin-top: 1.6rem; }
          .cert .sign .line { width: 200px; }
          .cert::before { inset: 12px; }
        }
        @media print {
          @page { size: landscape; margin: 0; }
          .cert-page { background: #fff; padding: 0; display: block; }
          .cert { box-shadow: none; border: none; border-radius: 0; max-width: none; width: 100vw; height: 100vh; min-height: 100vh; aspect-ratio: auto; margin: 0; padding: 7% 9%; }
          .cert::before { inset: 22px; }
          .no-print { display: none !important; }
        }
      ` }} />

      <div className="cert">
        <div className="brand">reason<span style={{ color: '#c8b78f' }}>.</span></div>
        <div className="mid">
          <div className="kicker">Certificado de participación</div>
          <h1>{event.title}</h1>
          <div className="to">Se otorga a</div>
          <div className="name">{reg.name}</div>
          <p className="body">
            Por su participación en <b>{event.title}</b>, realizado el <b>{fmtLong(event.starts_at)}</b>{event.location ? <> en <b>{event.location}</b></> : null}.
          </p>
          {(event.cert_signer || event.cert_entity) && (
            <div className="sign">
              {event.cert_signer && (
                <div className="col">
                  <div className="line"></div>
                  <div className="who">{event.cert_signer}</div>
                  {event.cert_signer_role && <div className="role">{event.cert_signer_role}</div>}
                </div>
              )}
              {event.cert_entity && (
                <div className="col">
                  <div className="line"></div>
                  <div className="who">{event.cert_entity}</div>
                  <div className="role">Organizador</div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="foot">Emitido a través de Reason — reason.com.ar</div>
      </div>

      <CertificadoActions />
    </div>
  )
}
