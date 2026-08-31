'use client'

export default function CertificadoActions() {
  return (
    <div className="no-print" style={{ marginTop: '1.6rem', display: 'flex', gap: '.8rem' }}>
      <button
        onClick={() => window.print()}
        style={{ background: '#b2560f', color: '#fff', border: 'none', borderRadius: 8, padding: '.7rem 1.3rem', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
      >
        Descargar / Imprimir
      </button>
    </div>
  )
}
