'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Printer, ArrowLeft } from 'lucide-react'
import type { Invoice, InvoiceItem, TaxpayerProfile } from '@/types'

export default function ImprimirComprobantePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useUser()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [taxpayer, setTaxpayer] = useState<TaxpayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user || !id) return
    load()
  }, [user, id])

  async function load() {
    setLoading(true)
    const [invRes, itemsRes, tpRes] = await Promise.all([
      supabase.from('invoices').select('*').eq('id', id).eq('user_id', user!.id).single(),
      supabase.from('invoice_items').select('*').eq('invoice_id', id).order('created_at'),
      supabase.from('taxpayer_profiles').select('*').eq('user_id', user!.id).limit(1).maybeSingle(),
    ])
    setInvoice(invRes.data)
    setItems(itemsRes.data || [])
    setTaxpayer(tpRes.data)
    setLoading(false)
  }

  useEffect(() => {
    if (!loading && invoice) {
      // Auto-print después de que el contenido cargue (opcional)
      // window.print()
    }
  }, [loading, invoice])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Preparando comprobante…</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Comprobante no encontrado.</p>
          <a href="/comprobantes" className="text-primary-600 text-sm hover:underline">← Volver</a>
        </div>
      </div>
    )
  }

  const typeLabel: Record<string, string> = { A: 'A', B: 'B', C: 'C', X: 'X', DEMO: 'DEMO' }
  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0)
  const iva = invoice.invoice_type === 'A' ? subtotal * 0.21 : 0
  const total = subtotal + iva

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Toolbar — solo en pantalla, oculta al imprimir */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <a href="/comprobantes" className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver a comprobantes
        </a>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Printer className="w-4 h-4" />
          Guardar / Imprimir PDF
        </button>
      </div>

      {/* Hoja A4 */}
      <div className="p-8 print:p-0">
        <div className="max-w-[794px] mx-auto bg-white shadow-xl print:shadow-none relative overflow-hidden"
          style={{ minHeight: '1123px' }}>

          {/* ── SELLO DE AGUA ── */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ zIndex: 0 }}>
            <div style={{
              transform: 'rotate(-35deg)',
              opacity: 0.04,
              fontSize: '72px',
              fontWeight: 900,
              color: '#1e3a5f',
              letterSpacing: '-2px',
              lineHeight: 1.2,
              textAlign: 'center',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}>
              TRIBUT.AR<br />SIMULADOR<br />EDUCATIVO<br />SIN VALIDEZ FISCAL
            </div>
          </div>

          <div className="relative" style={{ zIndex: 1 }}>
            {/* ── ENCABEZADO ── */}
            <div className="border-b-4 border-primary-700 p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 bg-primary-700 rounded-lg flex items-center justify-center">
                      <span className="text-white font-black text-sm">T</span>
                    </div>
                    <div>
                      <h1 className="text-xl font-black text-primary-900 leading-none">TRIBUT.AR</h1>
                      <p className="text-xs text-slate-500">Simulador Educativo</p>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-slate-700">
                    <p className="font-semibold">{taxpayer?.entity_name ?? 'Empresa Simulada'}</p>
                    <p className="text-slate-500">CUIT: {taxpayer?.cuit ?? '00-00000000-0'}</p>
                    <p className="text-slate-500">{taxpayer?.fiscal_address ?? 'Domicilio fiscal simulado'}</p>
                  </div>
                </div>

                {/* Tipo de comprobante */}
                <div className="text-right">
                  <div className="inline-flex items-center justify-center w-20 h-20 border-4 border-primary-700 rounded-lg mb-2">
                    <span className="text-4xl font-black text-primary-700">{typeLabel[invoice.invoice_type] ?? 'X'}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">FACTURA {invoice.invoice_type}</p>
                  <p className="text-xs text-slate-500">N° {String(invoice.invoice_number ?? 1).padStart(8, '0')}</p>
                </div>
              </div>
            </div>

            {/* ── DATOS DEL COMPROBANTE ── */}
            <div className="px-8 py-5 grid grid-cols-2 gap-6 border-b border-slate-200">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Fecha de emisión</p>
                <p className="text-sm font-medium text-slate-800">{formatDate(invoice.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Concepto</p>
                <p className="text-sm font-medium text-slate-800">{invoice.concept ?? 'Servicios simulados'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Receptor</p>
                <p className="text-sm font-medium text-slate-800">{invoice.receiver_name}</p>
                {invoice.receiver_cuit && <p className="text-xs text-slate-500">CUIT: {invoice.receiver_cuit}</p>}
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Condición</p>
                <p className="text-sm font-medium text-slate-800">{invoice.receiver_condition ?? 'Consumidor Final'}</p>
              </div>
            </div>

            {/* ── ÍTEMS ── */}
            <div className="px-8 py-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left text-xs text-slate-500 uppercase tracking-wide pb-2 font-semibold w-1/2">Descripción</th>
                    <th className="text-right text-xs text-slate-500 uppercase tracking-wide pb-2 font-semibold">Cant.</th>
                    <th className="text-right text-xs text-slate-500 uppercase tracking-wide pb-2 font-semibold">P. Unitario</th>
                    <th className="text-right text-xs text-slate-500 uppercase tracking-wide pb-2 font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, i) => (
                    <tr key={item.id ?? i}>
                      <td className="py-2.5 text-slate-800">{item.description}</td>
                      <td className="py-2.5 text-right text-slate-600">{item.quantity}</td>
                      <td className="py-2.5 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2.5 text-right text-slate-800 font-medium">{formatCurrency(item.quantity * item.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── TOTALES ── */}
            <div className="px-8 pb-8">
              <div className="ml-auto w-64 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-200">
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-sm text-slate-600">Subtotal</span>
                    <span className="text-sm font-medium text-slate-800">{formatCurrency(subtotal)}</span>
                  </div>
                  {invoice.invoice_type === 'A' && (
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-slate-600">IVA 21%</span>
                      <span className="text-sm font-medium text-slate-800">{formatCurrency(iva)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-3 bg-primary-700">
                    <span className="text-sm font-bold text-white">TOTAL</span>
                    <span className="text-sm font-bold text-white">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PIE DE PÁGINA ── */}
            <div className="border-t-2 border-amber-400 bg-amber-50 px-8 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                    ⚠️ DOCUMENTO SIN VALIDEZ FISCAL NI LEGAL
                  </p>
                  <p className="text-[10px] text-amber-700 mt-0.5">
                    Generado por TRIBUT.AR — Simulador Didáctico. No reemplaza comprobantes emitidos ante AFIP.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-amber-700">© 2026 Juan Manuel Gómez</p>
                  <p className="text-[10px] text-amber-600">Prof. Cs. Económicas — FHyCS UNaM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS de impresión */}
      <style>{`
        @media print {
          body { margin: 0; background: white; }
          @page { size: A4; margin: 0; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}
