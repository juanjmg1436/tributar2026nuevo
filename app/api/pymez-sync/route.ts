import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PYMEZ_URL = process.env.PYMEZ360_SUPABASE_URL
const PYMEZ_KEY = process.env.PYMEZ360_SUPABASE_SERVICE_KEY

function getPymezClient() {
  if (!PYMEZ_URL || !PYMEZ_KEY) return null
  return createClient(PYMEZ_URL, PYMEZ_KEY, { auth: { persistSession: false } })
}

// GET /api/pymez-sync?action=companies
// GET /api/pymez-sync?action=sync&company_id=xxx&period=2026-06
export async function GET(req: NextRequest) {
  const pymez = getPymezClient()
  if (!pymez) {
    return NextResponse.json(
      { error: 'PyMEZ 360 no configurado en variables de entorno.' },
      { status: 503 },
    )
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'companies'

  // ── Listar empresas disponibles ──────────────────────────────────────────
  if (action === 'companies') {
    const { data, error } = await pymez
      .from('companies')
      .select('id, name, cuit, fiscal_condition')
      .order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ companies: data ?? [] })
  }

  // ── Sincronizar período ──────────────────────────────────────────────────
  if (action === 'sync') {
    const period    = searchParams.get('period')     // YYYY-MM
    const companyId = searchParams.get('company_id')

    if (!period || !companyId) {
      return NextResponse.json(
        { error: 'Se requieren period (YYYY-MM) y company_id' },
        { status: 400 },
      )
    }

    const [year, month] = period.split('-').map(Number)
    const dateFrom = `${period}-01`
    const dateTo   = new Date(year, month, 0).toISOString().split('T')[0]

    const [salesRes, purchasesRes, customersRes, suppliersRes] = await Promise.all([
      pymez.from('sales')
        .select('id, date, total, iva_rate, document_type, doc_number, status, customer_id')
        .eq('company_id', companyId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .neq('status', 'anulado'),

      pymez.from('purchases')
        .select('id, date, total, iva_rate, document_type, doc_number, status, supplier_id, supplier_doc')
        .eq('company_id', companyId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .neq('status', 'anulado'),

      pymez.from('customers').select('id, name').eq('company_id', companyId),
      pymez.from('suppliers').select('id, name').eq('company_id', companyId),
    ])

    if (salesRes.error)     return NextResponse.json({ error: salesRes.error.message },     { status: 500 })
    if (purchasesRes.error) return NextResponse.json({ error: purchasesRes.error.message }, { status: 500 })

    const custMap: Record<string, string> = {}
    for (const c of customersRes.data ?? []) custMap[c.id] = c.name

    const suppMap: Record<string, string> = {}
    for (const s of suppliersRes.data ?? []) suppMap[s.id] = s.name

    // Mapeo → formato TRIBUT.AR
    // En PyMEZ 360: sales.total = neto SIN IVA; iva_amount = total × iva_rate
    const invoices = (salesRes.data ?? []).map(s => {
      const net    = s.total ?? 0
      const rate   = s.iva_rate ?? 0
      const ivaAmt = Math.round(net * rate * 100) / 100
      const type   = docTypeToInvoiceType(s.document_type)
      return {
        id:            `pymez_${s.id}`,
        period,
        invoice_type:  type,
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
      // Solo facturas A de proveedores son IVA crédito computable
      const computable = type === 'A' && rate > 0
      return {
        id:             `pymez_${p.id}`,
        period,
        invoice_type:   type,
        purchase_date:  p.date,
        doc_number:     p.doc_number ? String(p.doc_number) : null,
        supplier_name:  suppMap[p.supplier_id] ?? 'Proveedor',
        supplier_cuit:  p.supplier_doc ?? null,
        subtotal:       Math.round(net * 100) / 100,
        iva_rate:       rate,
        iva_amount:     ivaAmt,
        total:          Math.round((net + ivaAmt) * 100) / 100,
        is_iva_computable: computable,
        status:         'active',
        source:         'pymez360' as const,
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
