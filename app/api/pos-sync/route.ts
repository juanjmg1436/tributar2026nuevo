import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const code = searchParams.get('code')
  const company = searchParams.get('company')

  // Permitir CORS desde PyMEZ 360
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // Validar parámetros básicos
  if (!action || !code) {
    return NextResponse.json(
      { ok: false, error: 'action y code son requeridos' },
      { status: 400, headers }
    )
  }

  try {
    const supabase = await createClient()

    switch (action) {
      case 'validate': {
        // Validar que el código de PV existe en TRIBUT.AR
        const { data: posData, error } = await (supabase as any)
          .from('puntos_venta')
          .select('id, numero, nombre')
          .eq('codigo', code.toUpperCase())
          .single()

        if (error || !posData) {
          return NextResponse.json(
            { ok: false, error: 'Código inválido. Verificá el código en TRIBUT.AR → Puntos de venta.' },
            { status: 400, headers }
          )
        }

        return NextResponse.json(
          {
            ok: true,
            pos_number: posData.numero,
            pos_name: posData.nombre,
            codigo: posData.codigo,
          },
          { status: 200, headers }
        )
      }

      case 'link': {
        // Registrar que el PV fue vinculado a PyMEZ 360
        if (!company) {
          return NextResponse.json(
            { ok: false, error: 'company es requerido para link' },
            { status: 400, headers }
          )
        }

        const { data: posData, error: posError } = await (supabase as any)
          .from('puntos_venta')
          .select('id')
          .eq('codigo', code.toUpperCase())
          .single()

        if (posError || !posData) {
          return NextResponse.json(
            { ok: false, error: 'Código de PV no encontrado' },
            { status: 404, headers }
          )
        }

        // Registrar la vinculación en TRIBUT.AR
        const { error: linkError } = await (supabase as any)
          .from('puntos_venta')
          .update({
            pymez_linked_company: company,
            pymez_linked_at: new Date().toISOString(),
          })
          .eq('id', posData.id)

        if (linkError) {
          throw linkError
        }

        return NextResponse.json(
          { ok: true, message: 'PV vinculado a PyMEZ 360' },
          { status: 200, headers }
        )
      }

      case 'unlink': {
        // Desvincular el PV de PyMEZ 360
        const { data: posData, error: posError } = await (supabase as any)
          .from('puntos_venta')
          .select('id')
          .eq('codigo', code.toUpperCase())
          .single()

        if (posError || !posData) {
          return NextResponse.json(
            { ok: false, error: 'Código de PV no encontrado' },
            { status: 404, headers }
          )
        }

        const { error: unlinkError } = await (supabase as any)
          .from('puntos_venta')
          .update({
            pymez_linked_company: null,
            pymez_linked_at: null,
          })
          .eq('id', posData.id)

        if (unlinkError) {
          throw unlinkError
        }

        return NextResponse.json(
          { ok: true, message: 'PV desvinculado de PyMEZ 360' },
          { status: 200, headers }
        )
      }

      default:
        return NextResponse.json(
          { ok: false, error: 'action desconocida' },
          { status: 400, headers }
        )
    }
  } catch (error) {
    console.error('pos-sync error:', error)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500, headers }
    )
  }
}

// Manejar OPTIONS para CORS preflight
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
