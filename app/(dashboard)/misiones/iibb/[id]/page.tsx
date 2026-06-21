'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import { useUser } from '@/hooks/useUser'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, CheckCircle2, AlertTriangle, Printer } from 'lucide-react'
import type { ProvIIBBDDJJ, ProvIIBBItem, ProvTaxpayer } from '@/types/provincial'

export default function DDJJDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useUser()
  const supabase = createClient()
  const [ddjj, setDDJJ] = useState<ProvIIBBDDJJ | null>(null)
  const [items, setItems] = useState<ProvIIBBItem[]>([])
  const [taxpayer, setTaxpayer] = useState<ProvTaxpayer | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!user || !id) return
    load()
  }, [user, id])

  async function load() {
    setLoading(true)
    const db = supabase as any
    const [ddjjRes, itemsRes, tpRes] = await Promise.all([
      db.from('prov_iibb_ddjj').select('*').eq('id', id).eq('user_id', user!.id).single(),
      db.from('prov_iibb_items').select('*').eq('ddjj_id', id).order('created_at'),
      db.from('prov_taxpayers').select('*').eq('user_id', user!.id).limit(1).maybeSingle(),
    ])
    setDDJJ(ddjjRes.data)
    setItems(itemsRes.data || [])
    setTaxpayer(tpRes.data)
    setLoading(false)
  }

  async function markPaid() {
    setUpdating(true)
    await (supabase as any).from('prov_iibb_ddjj').update({ status: 'paid' }).eq('id', id)
    // Also mark related payment as paid
    await (supabase as any).from('prov_payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('reference_id', id)
    await load()
    setUpdating(false)
  }

  async function markSubmitted() {
    setUpdating(true)
    await (supabase as any).from('prov_iibb_ddjj').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', id)
    await load()
    setUpdating(false)
  }

  if (loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>
  if (!ddjj) return <PageContainer><Alert variant="error">Declaración no encontrada.</Alert></PageContainer>

  const statusColors: Record<string, string> = {
    draft: 'bg-orange-100 text-orange-700',
    submitted: 'bg-blue-100 text-blue-700',
    paid: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700',
  }
  const statusLabels: Record<string, string> = {
    draft: 'Borrador', submitted: 'Presentada', paid: 'Pagada', overdue: 'Vencida',
  }

  return (
    <PageContainer title={`DDJJ IIBB — ${ddjj.period_label}`} subtitle="Detalle de declaración jurada de Ingresos Brutos">
      {/* Banner */}
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-xs text-red-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {/* Header actions */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <a href="/misiones/iibb" className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary-700">
          <ArrowLeft className="w-4 h-4" /> Volver a IIBB
        </a>
        <div className="flex gap-2">
          {(ddjj.status === 'draft' || ddjj.status === 'overdue') && (
            <Button size="sm" variant="outline" onClick={markSubmitted} loading={updating}>
              Presentar DDJJ
            </Button>
          )}
          {(ddjj.status !== 'paid') && (
            <Button size="sm" onClick={markPaid} loading={updating}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Simular pago
            </Button>
          )}
          <button onClick={() => window.print()} className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      {/* Main card */}
      <Card padding="none" className="mb-4 overflow-hidden">
        {/* Encabezado */}
        <div className="bg-primary-700 px-6 py-4 flex items-start justify-between text-white">
          <div>
            <p className="text-xs opacity-70 uppercase tracking-wide mb-1">ATM Misiones — IIBB (SIMULACIÓN)</p>
            <h2 className="text-lg font-bold">{ddjj.period_label}</h2>
            <p className="text-sm opacity-80">Período: {ddjj.period}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[ddjj.status] || ''}`}>
            {statusLabels[ddjj.status] || ddjj.status}
          </span>
        </div>

        {/* Datos contribuyente */}
        <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400">Contribuyente</p>
            <p className="font-medium text-slate-800">{taxpayer?.entity_name ?? '—'}</p>
            <p className="text-xs text-slate-500">CUIT: {taxpayer?.cuit ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">N° IIBB</p>
            <p className="font-medium text-slate-800">{taxpayer?.iibb_number ?? 'Pendiente'}</p>
            <p className="text-xs text-slate-500">Vencimiento: {formatDate(ddjj.due_date)}</p>
          </div>
        </div>

        {/* Ítems */}
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">Detalle por actividad</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs text-slate-400 pb-2 font-semibold">Actividad</th>
                <th className="text-right text-xs text-slate-400 pb-2 font-semibold">Ingresos</th>
                <th className="text-right text-xs text-slate-400 pb-2 font-semibold">Base</th>
                <th className="text-right text-xs text-slate-400 pb-2 font-semibold">Alíc.</th>
                <th className="text-right text-xs text-slate-400 pb-2 font-semibold">Impuesto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.length === 0 ? (
                <tr><td colSpan={5} className="py-4 text-center text-slate-400 text-xs">Sin actividades cargadas</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td className="py-2 text-slate-700">
                    <p className="font-medium text-xs">{item.activity_name}</p>
                    <p className="text-slate-400 text-[11px]">{item.activity_code}</p>
                  </td>
                  <td className="py-2 text-right text-xs text-slate-600">{formatCurrency(item.revenue)}</td>
                  <td className="py-2 text-right text-xs text-slate-600">{formatCurrency(item.taxable_revenue)}</td>
                  <td className="py-2 text-right text-xs text-slate-600">{(item.rate * 100).toFixed(2)}%</td>
                  <td className="py-2 text-right text-xs font-semibold text-slate-800">{formatCurrency(item.tax_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="px-6 py-4">
          <div className="ml-auto w-full max-w-xs">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total ingresos</span>
                <span className="font-medium">{formatCurrency(ddjj.total_revenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Base imponible</span>
                <span className="font-medium">{formatCurrency(ddjj.total_taxable_revenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Impuesto determinado</span>
                <span className="font-medium">{formatCurrency(ddjj.total_tax)}</span>
              </div>
              {ddjj.total_withholdings > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Retenciones sufridas</span>
                  <span className="font-medium text-emerald-600">- {formatCurrency(ddjj.total_withholdings)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between">
                <span className="font-bold text-slate-800">Impuesto neto a pagar</span>
                <span className="font-bold text-lg text-primary-700">{formatCurrency(ddjj.net_tax)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer educativo */}
        <div className="border-t-2 border-amber-400 bg-amber-50 px-6 py-3">
          <p className="text-xs font-bold text-amber-800 uppercase">⚠️ DOCUMENTO SIN VALIDEZ FISCAL NI LEGAL</p>
          <p className="text-[10px] text-amber-700 mt-0.5">
            Generado por TRIBUT.AR — Simulador Didáctico. No reemplaza ningún trámite real ante la ATM Misiones.
          </p>
        </div>
      </Card>

      {ddjj.notes && (
        <Card padding="md">
          <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Observaciones</p>
          <p className="text-sm text-slate-600">{ddjj.notes}</p>
        </Card>
      )}
    </PageContainer>
  )
}
