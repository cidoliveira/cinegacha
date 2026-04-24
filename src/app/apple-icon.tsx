import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
    <rect x="5" y="2" width="22" height="28" rx="3.5" fill="#e63946"/>
    <path d="M16 7L18.2 13.3 24 16l-5.8 2.7L16 25l-2.2-6.3L8 16l5.8-2.7Z" fill="#fff" fill-opacity=".93"/>
  </svg>`

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0908',
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
        }}
      />
    </div>,
    { ...size }
  )
}
