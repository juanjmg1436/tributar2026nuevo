import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
}

async function handleValidate(code: string) {
  const supabase = await createClient()

  const { data: posData, error } = await (supabase as any)
    .from('points_of_sale')
    .select('id, pos_number, name')
    .eq('pymez_link_code', code.toUpperCase())
    .single()

  if (error || !posData) {
    return NextResponse.json(
      { ok: false, error: 'Código inválido. Verificá el código en TRIBUT.AR → Puntos de venta.' },
      { status: 400, headers: corsHeaders }
    )
  }

  return NextResponse.json(
    {
      ok: true,
      pos_number: posData.pos_number,
      pos_name: posData.name,
    },
    { status: 200, headers: corsHeaders }
  )
}

async function handleLink(code: string, company: string) {
  const supabase = await createClient()

  if (!company) {
    return NextResponse.json(
      { ok: false, error: 'company es requerido para link' },
      { status: 400, headers: corsHeaders }
    )
  }

  const { data: posData, error: posError } = await (supabase as any)
    .from('points_of_sale')
    .select('id')
    .eq('pymez_link_code', code.toUpperCase())
    .single()

  if (posError || !posData) {
    return NextResponse.json(
      { ok: false, error: 'Código de PV no encontrado' },
      { status: 404, headers: corsHeaders }
    )
  }

  const { error: linkError } = await (supabase as any)
    .from('points_of_sale')
    .update({
      pymez_company_name: company,
      pymez_linked_at: new Date().toISOString(),
    })
    .eq('id', posData.id)

  if (linkError) {
    throw linkError
  }

  return NextResponse.json(
    { ok: true, message: 'PV vinculado a PyMEZ 360' },
    { status: 200, headers: corsHeaders }
  )
}

async function handleUnlink(code: string) {
  const supabase = await createClient()

  const { data: posData, error: posError } = await (supabase as any)
    .from('points_of_sale')
    .select('id')
    .eq('pymez_link_code', code.toUpperCase())
    .single()

  if (posError || !posData) {
    return NextResponse.json(
      { ok: false, error: 'Código de PV no encontrado' },
      { status: 404, headers: corsHeaders }
    )
  }

  const { error: unlinkError } = await (supabase as any)
    .from('points_of_sale')
    .update({
      pymez_company_name: null,
      pymez_linked_at: null,
    })
    .eq('id', posData.id)

  if (unlinkError) {
    throw unlinkError
  }

  return NextResponse.json(
    { ok: true, message: 'PV desvinculado de PyMEZ 360' },
    { status: 200, headers: corsHeaders }
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const code = searchParams.get('code')
  const company = searchParams.get('company')

  if (!action || !code) {
    return NextResponse.json(
      { ok: false, error: 'action y code son requeridos' },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    switch (action) {
      case 'validate':
        return await handleValidate(code)
      case 'link':
        return await handleLink(code, company || '')
      case 'unlink':
        return await handleUnlink(code)
      default:
        return NextResponse.json(
          { ok: false, error: 'action desconocida' },
          { status: 400, headers: corsHeaders }
        )
    }
  } catch (error) {
    console.error('pos-sync error:', error)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}
