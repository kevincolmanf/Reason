import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Reason'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F0F0E',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            fontSize: 128,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: '#F5F4F0',
          }}
        >
          reason
          <span style={{ color: '#C25A2C' }}>.</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
