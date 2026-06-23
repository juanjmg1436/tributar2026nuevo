import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// API pública — llamada desde PyMEZ 360 para validar y vincular un POS
// La seguridad viene de la unicidad del pymez_link_code (similar a sync_token)
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const code   = searchParams.get('code')?.trim().toUpperCase()

  if (!code) {
    return NextResponse.json({ error: 'Se requiere el parámetro code.' }, { status: 400 })
  }

  const { data: pos } = await (db as any)
    .from('points_of_sale')
    .select('id, pos_number, name, status, pymez_linked_at, pymez_company_name')
    .eq('pymez_link_code', code)
    .maybeSingle()

  if (!pos) {
    return NextResponse.json(
      { error: 'Código inválido. Verificá el código en TRIBUT.AR → Puntos de venta.' },
      { status: 404 },
    )
  }

  if (pos.status !== 'active') {
    return NextResponse.json(
      { error: 'El punto de venta está inactivo en TRIBUT.AR. Activalo primero.' },
      { status: 403 },
    )
  }

  // ── validate: solo consulta, sin efectos ──────────────────────────────────
  if (action === 'validate') {
    return NextResponse.json({
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

    return NextResponse.json({
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

    return NextResponse.json({ ok: true, message: 'Vinculación eliminada.' })
  }

  return NextResponse.json({ error: 'Acción no reconocida. Usá: validate | link | unlink' }, { status: 400 })
}
