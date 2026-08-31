import React from 'react'

// Convierte las URLs sueltas dentro de un texto en enlaces clickeables, preservando
// el resto del texto y los saltos de línea (el contenedor debe usar whitespace-pre-line).
// Se usa en las instrucciones de pago de un evento: el organizador pega su link de cobro
// (Mercado Pago, alias, etc.) y el inscripto tiene que poder tocarlo directamente.
const URL_SPLIT = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
const IS_URL = /^(https?:\/\/|www\.)/i

export function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_SPLIT)
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null
        if (IS_URL.test(part)) {
          // Separar la puntuación final (". , ) etc.) para no meterla dentro del link.
          const m = part.match(/^([\s\S]*?)([.,;:!?)]*)$/)
          const url = m ? m[1] : part
          const trail = m ? m[2] : ''
          const href = url.startsWith('http') ? url : `https://${url}`
          return (
            <React.Fragment key={i}>
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline break-all">{url}</a>
              {trail}
            </React.Fragment>
          )
        }
        return <React.Fragment key={i}>{part}</React.Fragment>
      })}
    </>
  )
}
