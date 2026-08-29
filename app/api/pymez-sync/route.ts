import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PYMEZ_URL  = process.env.PYMEZ360_SUPABASE_URL
const PYMEZ_KEY  = process.env.PYMEZ360_SUPABASE_SERVICE_KEY
/**
 * En PyMEZ 360, sales.total y purchases.total son el importe BRUTO (IVA
 * incluido). Así lo trata su propio motor contable (lib/accounting/entries.ts):
 * extrae el IVA de adentro con total * rate / (1 + rate) y acredita el neto en
 * la cuenta 4.1.1 Ventas. Replicar ese mismo desglose acá es lo que hace que la
 * base imponible coincida con el saldo del libro mayor de Ventas.
 */
function desglosarIva(total: number | null, ivaRate: number | null) {
  const bruto = total ?? 0
  const raw   = ivaRate ?? 0
  const rate  = raw >= 1 ? raw / 100 : raw   // acepta 21 o 0.21
  const iva   = rate > 0 ? Math.round(bruto * rate / (1 + rate) * 100) / 100 : 0
  return { bruto, rate, iva, neto: Math.round((bruto - iva) * 100) / 100 }
}

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

  // ── 1. Listar empresas (incluye modo para validación cross-app) ────────────
  if (action === 'companies') {
    const { data: companies, error } = await db
      .from('companies')
      .select('id, name, cuit, fiscal_condition, microemprendimiento_mode')
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
      const { rate, iva: ivaAmt, neto: net, bruto } = desglosarIva(s.total, s.iva_rate)
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
        total:         bruto,
        status:        'active',
        source:        'pymez360' as const,
      }
    })

    const purchases = (purchasesRes.data ?? []).map(p => {
      const { rate, iva: ivaAmt, neto: net, bruto } = desglosarIva(p.total, p.iva_rate)
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
        total:             bruto,
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

  // ── 3. Resumen IIBB: base imponible = neto de ventas = saldo del mayor de 4.1.1 Ventas ──
  if (action === 'iibb-summary') {
    const token  = searchParams.get('token')?.trim().toUpperCase()
    const period = searchParams.get('period')

    if (!token || !period) {
      return NextResponse.json({ error: 'Se requieren token y period.' }, { status: 400 })
    }

    const { data: company } = await db
      .from('companies')
      .select('id, name, cuit, microemprendimiento_mode')
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
      .select('total, iva_rate, status')
      .eq('company_id', company.id)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .neq('status', 'anulado')

    if (salesErr) return NextResponse.json({ error: salesErr.message }, { status: 500 })

    // sales.total ya viene con el IVA adentro, así que el IVA se extrae, no se suma.
    // La base imponible resultante es el neto, que es exactamente lo que PyMEZ 360
    // acredita en la cuenta 4.1.1 Ventas: por eso coincide con el saldo del mayor.
    // Fórmula explícita para el alumno:
    //   ivaDebito = SUM(total × rate ÷ (1 + rate))
    //   baseIIBB  = SUM(total) − ivaDebito
    let totalBruto = 0
    let ivaDebito  = 0
    for (const s of sales ?? []) {
      const { bruto, iva } = desglosarIva(s.total, s.iva_rate)
      totalBruto += bruto
      ivaDebito  += iva
    }
    const baseImponible = totalBruto - ivaDebito

    return NextResponse.json({
      ok:                true,
      company_name:      company.name,
      company_cuit:      company.cuit,
      period,
      total_bruto:       Math.round(totalBruto  * 100) / 100,
      iva_debito_fiscal: Math.round(ivaDebito   * 100) / 100,
      total_sales_net:   Math.round(Math.max(0, baseImponible) * 100) / 100,
      invoice_count:     (sales ?? []).length,
    })
  }

  // ── 4. Resumen Monotributo: ingresos anuales para recategorización ──────────
  if (action === 'monotributo-summary') {
    const token = searchParams.get('token')?.trim().toUpperCase()
    if (!token) {
      return NextResponse.json({ error: 'Se requiere token.' }, { status: 400 })
    }

    const { data: company } = await db
      .from('companies')
      .select('id, name, cuit, microemprendimiento_mode')
      .eq('sync_token', token)
      .maybeSingle()

    if (!company) {
      return NextResponse.json(
        { error: 'Código incorrecto. Verificá el código en PyMEZ 360 → Mi Empresa.' },
        { status: 403 },
      )
    }

    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1)
    const dateFrom = twelveMonthsAgo.toISOString().split('T')[0]

    const { data: sales, error: salesErr } = await db
      .from('sales')
      .select('total, iva_rate, date')
      .eq('company_id', company.id)
      .gte('date', dateFrom)
      .neq('status', 'anulado')

    if (salesErr) return NextResponse.json({ error: salesErr.message }, { status: 500 })

    // El parametro de recategorizacion son los ingresos, y el IVA no es ingreso:
    // es un impuesto que la empresa percibe y le debe al fisco. Se acumula el neto,
    // que es lo mismo que PyMEZ 360 acredita en la cuenta 4.1.1 Ventas.
    // Si la empresa factura como monotributista (sin IVA discriminado), neto = bruto
    // y el total no cambia; si factura con IVA, deja de estar inflado.
    const monthlyMap: Record<string, number> = {}
    let brutoTotal = 0
    let ivaTotal   = 0
    for (const s of sales ?? []) {
      const { bruto, iva, neto } = desglosarIva(s.total, s.iva_rate)
      const period = s.date.substring(0, 7)
      monthlyMap[period] = (monthlyMap[period] ?? 0) + neto
      brutoTotal += bruto
      ivaTotal   += iva
    }

    const annualTotal = Object.values(monthlyMap).reduce((sum, v) => sum + v, 0)
    const months = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, total]) => ({ period, total: Math.round(total * 100) / 100 }))

    return NextResponse.json({
      ok:                      true,
      company_name:            company.name,
      company_cuit:            company.cuit,
      microemprendimiento_mode: (company as any).microemprendimiento_mode ?? false,
      // annual_total es el ingreso neto: es el que se compara contra el limite.
      annual_total:            Math.round(annualTotal * 100) / 100,
      annual_total_facturado:  Math.round(brutoTotal  * 100) / 100,
      annual_iva:              Math.round(ivaTotal    * 100) / 100,
      invoice_count:           sales?.length ?? 0,
      months,
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
