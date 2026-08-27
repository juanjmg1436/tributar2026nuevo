import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// API pública — llamada desde PyMEZ 360 para validar y vincular un POS
// La seguridad viene de la unicidad del pymez_link_code (similar a sync_token)
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// La llama el navegador desde otro origen (pymez-360.vercel.app), así que
// toda respuesta necesita CORS o el fetch del cliente falla con "Failed to fetch".
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400',
}

function json(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, { status: init?.status ?? 200, headers: CORS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const code   = searchParams.get('code')?.trim().toUpperCase()

  if (!code) {
    return json({ error: 'Se requiere el parámetro code.' }, { status: 400 })
  }

  const { data: pos } = await (db as any)
    .from('points_of_sale')
    .select('id, pos_number, name, status, pymez_linked_at, pymez_company_name')
    .eq('pymez_link_code', code)
    .maybeSingle()

  if (!pos) {
    return json(
      { error: 'Código inválido. Verificá el código en TRIBUT.AR → Puntos de venta.' },
      { status: 404 },
    )
  }

  if (pos.status !== 'active') {
    return json(
      { error: 'El punto de venta está inactivo en TRIBUT.AR. Activalo primero.' },
      { status: 403 },
    )
  }

  // ── validate: solo consulta, sin efectos ──────────────────────────────────
  if (action === 'validate') {
    return json({
      ok:           true,
      pos_number:   pos.pos_number,
      pos_name:     pos.name,
      linked:       !!pos.pymez_linked_at,
      company_name: pos.pymez_company_name ?? null,
    })
  }

  // ── link: PyMEZ 360 registra la vinculación ───────────────────────────────
  if (action === 'link') {
    const company = searchParams.get('company')?.trim() ?? 'PyMEZ 360'

    await (db as any)
      .from('points_of_sale')
      .update({
        pymez_linked_at:    new Date().toISOString(),
        pymez_company_name: company,
      })
      .eq('id', pos.id)

    return json({
      ok:         true,
      pos_number: pos.pos_number,
      pos_name:   pos.name,
      message:    `Punto de venta ${pos.pos_number} habilitado para ventas en ${company}.`,
    })
  }

  // ── unlink: desvincula PyMEZ 360 ─────────────────────────────────────────
  if (action === 'unlink') {
    await (db as any)
      .from('points_of_sale')
      .update({ pymez_linked_at: null, pymez_company_name: null })
      .eq('id', pos.id)

    return json({ ok: true, message: 'Vinculación eliminada.' })
  }

  return json({ error: 'Acción no reconocida. Usá: validate | link | unlink' }, { status: 400 })
}
