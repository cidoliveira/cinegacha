import { NextRequest, NextResponse } from 'next/server'
import { seedCardPool } from '@/lib/card-pool/builder'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_API_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const authorization = request.headers.get('authorization')
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await seedCardPool()
    return NextResponse.json(summary)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[api/admin/seed] Seed failed:', error)
    return NextResponse.json({ error: 'Seed failed', message }, { status: 500 })
  }
}
