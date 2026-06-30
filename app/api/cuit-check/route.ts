import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TRIBUTAR_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const TRIBUTAR_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const TRIBUTAR_SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const PYMEZ_URL = 'https://cqloepucatpusvusheel.supabase.co'
const PYMEZ_KEY = process.env.PYMEZ360_SUPABASE_SERVICE_KEY!

function tributarAnon() {
  return createClient(TRIBUTAR_URL, TRIBUTAR_ANON, { auth: { persistSession: false } })
}
function tributarAdmin() {
  return createClient(TRIBUTAR_URL, TRIBUTAR_SVC, { auth: { persistSession: false } })
}
function pymez() {
  if (!PYMEZ_KEY) return null
  return createClient(PYMEZ_URL, PYMEZ_KEY, { auth: { persistSession: false } })
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: { user } } = await tributarAnon().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = tributarAdmin()

  // 1. TRIBUT.AR CUIT (active taxpayer_profile)
  const { data: tp } = await (admin as any)
    .from('taxpayer_profiles')
    .select('cuit')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  const tributarCuit: string | null = tp?.cuit ?? null

  // 2. Sueldos 360 CUIT (from cached import)
  const { data: s360 } = await (admin as any)
    .from('sueldos360_imports')
    .select('company_cuit')
    .eq('user_id', user.id)
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const sueldosCuit: string | null = s360?.company_cuit ?? null

  // 3. PyMEZ 360 CUIT (via linked POS → PyMEZ companies)
  let pymezCuit: string | null = null
  const { data: posList } = await (admin as any)
    .from('points_of_sale')
    .select('pymez_link_code')
    .eq('user_id', user.id)
    .not('pymez_linked_at', 'is', null)
    .limit(1)

  const linkCode: string | undefined = posList?.[0]?.pymez_link_code
  if (linkCode) {
    const db = pymez()
    if (db) {
      const { data: company } = await (db as any)
        .from('companies')
        .select('cuit')
        .eq('tribut_pos_link_code', linkCode)
        .maybeSingle()
      pymezCuit = company?.cuit ?? null
    }
  }

  // Build mismatch list
  const cuitsPresent: { app: string; cuit: string }[] = []
  if (tributarCuit) cuitsPresent.push({ app: 'TRIBUT.AR', cuit: tributarCuit })
  if (pymezCuit)    cuitsPresent.push({ app: 'PyMEZ 360', cuit: pymezCuit })
  if (sueldosCuit)  cuitsPresent.push({ app: 'Sueldos 360', cuit: sueldosCuit })

  const uniqueCuits = [...new Set(cuitsPresent.map(c => c.cuit))]
  const hasConflict = uniqueCuits.length > 1

  return NextResponse.json({
    tributar_cuit:  tributarCuit,
    pymez_cuit:     pymezCuit,
    sueldos_cuit:   sueldosCuit,
    has_conflict:   hasConflict,
    details:        cuitsPresent,
  })
}
