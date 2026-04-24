import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return new Response('Missing url parameter', { status: 400 })
  }

  // Security: only proxy TMDB image CDN
  if (!url.startsWith('https://image.tmdb.org/')) {
    return new Response('Forbidden: only TMDB image URLs allowed', { status: 403 })
  }

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'CineGacha/1.0' },
    })

    if (!upstream.ok) {
      return new Response('Upstream image fetch failed', { status: 502 })
    }

    const buffer = await upstream.arrayBuffer()
    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg'

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    })
  } catch {
    return new Response('Proxy error', { status: 502 })
  }
}
