import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PYMEZ_URL  = process.env.PYMEZ360_SUPABASE_URL
const PYMEZ_KEY  = process.env.PYMEZ360_SUPABASE_SERVICE_KEY
function pymez() {
  if (!PYMEZ_URL || !PYMEZ_KEY) return null
  return createClient(PYMEZ_URL, PYMEZ_KEY, { auth: { persistSession: false } })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pymez-sync?action=companies          → lista empresas + sus tokens
// GET /api/pymez-sync?action=sync&company_id=x&period=YYYY-MM&token=ABC123
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const db = pymez()
  if (!db) {
    return NextResponse.json({ error: 'PyMEZ 360 no configurado.' }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'companies'

  // ── 1. Listar empresas (solo nombre/id — el token lo ve el dueño en PyMEZ) ──
  if (action === 'companies') {
    const { data: companies, error } = await db
      .from('companies')
      .select('id, name, cuit, fiscal_condition')
      .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ companies: companies ?? [] })
  }

  // ── 2. Sincronizar período ─────────────────────────────────────────────────
  if (action === 'sync') {
    const period    = searchParams.get('period')
    const companyId = searchParams.get('company_id')
    const token     = searchParams.get('token')?.trim().toUpperCase()

    if (!period || !companyId || !token) {
      return NextResponse.json(
        { error: 'Se requieren period, company_id y token.' },
        { status: 400 },
      )
    }

    // Verificar token contra companies.sync_token en PyMEZ 360
    const { data: companyRow } = await db
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('sync_token', token)
      .single()

    if (!companyRow) {
      return NextResponse.json(
        { error: 'Código incorrecto. Verificá el código que aparece en PyMEZ 360 → Mi Empresa.' },
        { status: 403 },
      )
    }

    // Token válido → traer datos
    const [year, month] = period.split('-').map(Number)
    const dateFrom = `${period}-01`
    const dateTo   = new Date(year, month, 0).toISOString().split('T')[0]

    const [salesRes, purchasesRes, customersRes, suppliersRes] = await Promise.all([
      db.from('sales')
        .select('id, date, total, iva_rate, document_type, doc_number, status, customer_id')
        .eq('company_id', companyId)
        .gte('date', dateFrom).lte('date', dateTo)
        .neq('status', 'anulado'),
      db.from('purchases')
        .select('id, date, total, iva_rate, document_type, doc_number, status, supplier_id, supplier_doc')
        .eq('company_id', companyId)
        .gte('date', dateFrom).lte('date', dateTo)
        .neq('status', 'anulado'),
      db.from('customers').select('id, name').eq('company_id', companyId),
      db.from('suppliers').select('id, name').eq('company_id', companyId),
    ])

    if (salesRes.error)     return NextResponse.json({ error: salesRes.error.message },     { status: 500 })
    if (purchasesRes.error) return NextResponse.json({ error: purchasesRes.error.message }, { status: 500 })

    const custMap: Record<string, string> = {}
    for (const c of customersRes.data ?? []) custMap[c.id] = c.name
    const suppMap: Record<string, string> = {}
    for (const s of suppliersRes.data ?? []) suppMap[s.id] = s.name

    const invoices = (salesRes.data ?? []).map(s => {
      const net    = s.total ?? 0
      const rate   = s.iva_rate ?? 0
      const ivaAmt = Math.round(net * rate * 100) / 100
      return {
        id:            `pymez_${s.id}`,
        period,
        invoice_type:  docTypeToInvoiceType(s.document_type),
        invoice_date:  s.date,
        doc_number:    s.doc_number ? String(s.doc_number) : null,
        customer_name: custMap[s.customer_id] ?? 'Cliente',
        subtotal:      Math.round(net * 100) / 100,
        iva_rate:      rate,
        iva_amount:    ivaAmt,
        total:         Math.round((net + ivaAmt) * 100) / 100,
        status:        'active',
        source:        'pymez360' as const,
      }
    })

    const purchases = (purchasesRes.data ?? []).map(p => {
      const net    = p.total ?? 0
      const rate   = p.iva_rate ?? 0
      const ivaAmt = Math.round(net * rate * 100) / 100
      const type   = docTypeToInvoiceType(p.document_type)
      return {
        id:                `pymez_${p.id}`,
        period,
        invoice_type:      type,
        purchase_date:     p.date,
        doc_number:        p.doc_number ? String(p.doc_number) : null,
        supplier_name:     suppMap[p.supplier_id] ?? 'Proveedor',
        supplier_cuit:     p.supplier_doc ?? null,
        subtotal:          Math.round(net * 100) / 100,
        iva_rate:          rate,
        iva_amount:        ivaAmt,
        total:             Math.round((net + ivaAmt) * 100) / 100,
        is_iva_computable: type === 'A' && rate > 0,
        status:            'active',
        source:            'pymez360' as const,
      }
    })

    const debitoFiscal  = invoices.reduce((s, i) => s + i.iva_amount, 0)
    const creditoFiscal = purchases.filter(p => p.is_iva_computable).reduce((s, p) => s + p.iva_amount, 0)

    return NextResponse.json({
      period, companyId,
      invoices, purchases,
      summary: {
        invoicesCount:  invoices.length,
        purchasesCount: purchases.length,
        debitoFiscal:   Math.round(debitoFiscal * 100) / 100,
        creditoFiscal:  Math.round(creditoFiscal * 100) / 100,
        ivaProvisorio:  Math.round((debitoFiscal - creditoFiscal) * 100) / 100,
      },
    })
  }

  // ── 3. Resumen IIBB: suma de ventas netas para base imponible ─────────────
  if (action === 'iibb-summary') {
    const token  = searchParams.get('token')?.trim().toUpperCase()
    const period = searchParams.get('period')

    if (!token || !period) {
      return NextResponse.json({ error: 'Se requieren token y period.' }, { status: 400 })
    }

    const { data: company } = await db
      .from('companies')
      .select('id, name, cuit')
      .eq('sync_token', token)
      .maybeSingle()

    if (!company) {
      return NextResponse.json(
        { error: 'Código incorrecto. Verificá el código en PyMEZ 360 → Mi Empresa.' },
        { status: 403 },
      )
    }

    const [year, month] = period.split('-').map(Number)
    const dateFrom = `${period}-01`
    const dateTo   = new Date(year, month, 0).toISOString().split('T')[0]

    const { data: sales, error: salesErr } = await db
      .from('sales')
      .select('total, iva_rate, document_type, status')
      .eq('company_id', company.id)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .neq('status', 'anulado')

    if (salesErr) return NextResponse.json({ error: salesErr.message }, { status: 500 })

    // Base IIBB: para RI = precio neto sin IVA; para Monotributista/Autónomo = precio total facturado.
    // En PyMEZ, sales.total es el precio base (IVA separado como sales.total * iva_rate),
    // por lo que el campo es correcto para ambos casos: si iva_rate=0 (monotributista),
    // sales.total ya es el precio de venta completo.
    const totalSalesNet = (sales ?? []).reduce((sum, s) => sum + (s.total ?? 0), 0)

    return NextResponse.json({
      ok: true,
      company_name:    company.name,
      company_cuit:    company.cuit,
      period,
      total_sales_net: Math.round(totalSalesNet * 100) / 100,
      invoice_count:   (sales ?? []).length,
    })
  }

  return NextResponse.json({ error: 'action no reconocida' }, { status: 400 })
}

function docTypeToInvoiceType(docType: string | null): string {
  switch (docType) {
    case 'factura_a': return 'A'
    case 'factura_b': return 'B'
    case 'factura_c': return 'C'
    case 'factura_m': return 'M'
    case 'recibo':    return 'X'
    case 'ticket':    return 'T'
    default:          return 'B'
  }
}
