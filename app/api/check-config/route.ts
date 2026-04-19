import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return NextResponse.json({
    urlSet: !!url,
    keySet: !!key,
    urlPreview: url ? url.substring(0, 40) + '...' : null,
    keyPreview: key ? key.substring(0, 20) + '...' : null,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV ?? 'not-vercel',
  })
}
