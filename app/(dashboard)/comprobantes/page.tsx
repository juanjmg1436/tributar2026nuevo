'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Receipt, Plus, FileText, ChevronDown, ChevronUp, Info, Eye, Printer } from 'lucide-react'
import type { Invoice, InvoiceItem } from '@/types'

export default function ComprobantesPage() {
  const { user, loading: userLoading } = useUser()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [hasPOS, setHasPOS] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [items, setItems] = useState<Record<string, InvoiceItem[]>>({})
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    setLoading(true)
    const [posRes, invoicesRes] = await Promise.all([
      supabase.from('points_of_sale').select('id').eq('user_id', user!.id).eq('status', 'active'),
      supabase.from('invoices').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    ])
    setHasPOS((posRes.data || []).length > 0)
    setInvoices(invoicesRes.data || [])
    setLoading(false)
  }

  async function loadItems(invoiceId: string) {
    if (items[invoiceId]) return
    const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId).order('created_at')
    setItems(prev => ({ ...prev, [invoiceId]: data || [] }))
  }

  async function toggleExpand(invoiceId: string) {
    if (expanded === invoiceId) {
      setExpanded(null)
    } else {
      setExpanded(invoiceId)
      await loadItems(invoiceId)
    }
  }

  const typeColors: Record<string, string> = {
    A: 'bg-blue-100 text-blue-700',
    B: 'bg-emerald-100 text-emerald-700',
    C: 'bg-yellow-100 text-yellow-700',
    X: 'bg-slate-100 text-slate-700',
    DEMO: 'bg-purple-100 text-purple-700',
  }

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  if (!hasPOS) {
    return (
      <PageContainer title="Comprobantes" subtitle="Comprobantes simulados emitidos">
        <Alert variant="warning">
          <strong>Módulo bloqueado.</strong> Debés tener al menos un punto de venta activo para emitir comprobantes.{' '}
          <a href="/puntos-venta" className="underline font-semibold">Ir a Puntos de venta →</a>
        </Alert>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Comprobantes"
      subtitle="Comprobantes simulados emitidos en el simulador."
      actions={
        <Link href="/comprobantes/nuevo">
          <Button><Plus className="w-4 h-4 mr-1" /> Emitir comprobante</Button>
        </Link>
      }
    >
      <Alert variant="info" className="mb-6">
        <strong>¿Qué son los comprobantes?</strong> Son documentos comerciales que acreditan una operación económica entre un vendedor y un comprador. En Argentina, el tipo de comprobante (A, B, C) depende de la condición tributaria de quien emite y de quien recibe. Todos los comprobantes emitidos aquí son ficticios y educativos.
      </Alert>

      {invoices.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Sin comprobantes emitidos</p>
          <p className="text-sm text-slate-400 mt-1">Emití tu primer comprobante simulado.</p>
          <Link href="/comprobantes/nuevo">
            <Button className="mt-4"><Plus className="w-4 h-4 mr-1" /> Emitir comprobante</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => (
            <Card key={inv.id} padding="none" className="overflow-hidden">
              <div className="p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleExpand(inv.id)}>
                <div className="flex items-start gap-3 justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2.5 py-1.5 rounded-lg ${typeColors[inv.invoice_type] || typeColors.DEMO}`}>
                      FACT. {inv.invoice_type}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">N° {inv.invoice_number}</p>
                      <p className="text-xs text-slate-500">Para: {inv.receiver_name} — {formatDate(inv.issue_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(inv.total)}</p>
                    {expanded === inv.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
              </div>
              {expanded === inv.id && (
                <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                  {/* Invoice detail */}
                  <div className="border border-slate-200 rounded-xl bg-white overflow-hidden mb-4">
                    <div className="bg-primary-800 text-white p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-primary-200 uppercase tracking-wider">SIMULADOR DIDÁCTICO — NO OFICIAL</p>
                          <p className="text-lg font-bold mt-1">FACTURA {inv.invoice_type}</p>
                          <p className="text-sm text-primary-200">N° {String(inv.pos_number).padStart(4, '0')}-{inv.invoice_number}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-primary-200">Fecha: {formatDate(inv.issue_date)}</p>
                          <p className="text-white font-semibold mt-1">DATOS DEMO</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-400 uppercase font-semibold">Receptor</p>
                          <p className="font-medium text-slate-800">{inv.receiver_name}</p>
                          {inv.receiver_cuit && <p className="text-slate-500">CUIT: {inv.receiver_cuit}</p>}
                          {inv.receiver_condition && <p className="text-slate-500">{inv.receiver_condition}</p>}
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 uppercase font-semibold">Concepto</p>
                          <p className="font-medium text-slate-800">{inv.concept || 'Servicios'}</p>
                        </div>
                      </div>
                      {/* Items */}
                      {items[inv.id] && items[inv.id].length > 0 && (
                        <table className="w-full text-sm mb-4">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left p-2 text-slate-500 font-medium text-xs">Descripción</th>
                              <th className="text-right p-2 text-slate-500 font-medium text-xs">Cant.</th>
                              <th className="text-right p-2 text-slate-500 font-medium text-xs">Precio unit.</th>
                              <th className="text-right p-2 text-slate-500 font-medium text-xs">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items[inv.id].map(item => (
                              <tr key={item.id} className="border-t border-slate-100">
                                <td className="p-2 text-slate-700">{item.description}</td>
                                <td className="p-2 text-right text-slate-600">{item.quantity}</td>
                                <td className="p-2 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                                <td className="p-2 text-right font-medium text-slate-800">{formatCurrency(item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <div className="border-t border-slate-200 pt-3 space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(inv.subtotal)}</span></div>
                        {inv.iva_amount != null && inv.iva_amount > 0 && (
                          <div className="flex justify-between"><span className="text-slate-500">IVA (21%)</span><span>{formatCurrency(inv.iva_amount)}</span></div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2 mt-1">
                          <span>TOTAL</span><span>{formatCurrency(inv.total)}</span>
                        </div>
                      </div>
                      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-amber-700 font-semibold">SIMULADOR DIDÁCTICO — SIN VALIDEZ FISCAL/LEGAL — DATOS DEMO</p>
                      </div>
                    </div>
                  </div>
                  {/* Botón exportar PDF */}
                  <div className="flex justify-end">
                    <a
                      href={`/comprobantes/${inv.id}/imprimir`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      Exportar / Imprimir PDF
                    </a>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
