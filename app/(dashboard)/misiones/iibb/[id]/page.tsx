'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import { BilleteraFiscal } from '@/components/BilleteraFiscal'
import { useUser } from '@/hooks/useUser'
import { useBilletera } from '@/hooks/useBilletera'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Printer, CreditCard,
  Clock, FileText, Save,
} from 'lucide-react'
import type { ProvIIBBDDJJ, ProvIIBBItem, ProvTaxpayer } from '@/types/provincial'

// ── Mora provincial: 3% mensual (Código Fiscal de Misiones) ─────────────────
function calcMoraProvincial(principal: number, dueDate: Date): {
  daysLate: number; moraAmount: number; total: number
} {
  const today = new Date()
  if (today <= dueDate) return { daysLate: 0, moraAmount: 0, total: principal }
  const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  const moraAmount = Math.round(principal * (0.03 / 30) * daysLate * 100) / 100
  return { daysLate, moraAmount, total: Math.round((principal + moraAmount) * 100) / 100 }
}

export default function DDJJDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useUser()
  const supabase = createClient()
  const { balance, debitarPago } = useBilletera()

  const [ddjj, setDDJJ]       = useState<ProvIIBBDDJJ | null>(null)
  const [items, setItems]     = useState<ProvIIBBItem[]>([])
  const [taxpayer, setTaxpayer] = useState<ProvTaxpayer | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [paying, setPaying]   = useState(false)
  const [saldoInsuficiente, setSaldoInsuficiente] = useState<number | null>(null)
  const [paySuccess, setPaySuccess] = useState(false)
  const [error, setError]     = useState<string | null>(null)

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

  async function markSubmitted() {
    setUpdating(true)
    await (supabase as any).from('prov_iibb_ddjj').update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }).eq('id', id)
    await load()
    setUpdating(false)
  }

  async function handlePagar() {
    if (!ddjj) return
    setSaldoInsuficiente(null)
    setError(null)
    setPaying(true)

    const dueDate = new Date(ddjj.due_date)
    const mora = calcMoraProvincial(ddjj.net_tax, dueDate)
    const montoPagar = mora.total

    const result = await debitarPago(
      montoPagar,
      `IIBB Misiones — ${ddjj.period_label}${mora.moraAmount > 0 ? ' (c/ mora)' : ''}`,
      ddjj.id,
      'iibb_misiones',
    )

    if (!result.success) {
      setSaldoInsuficiente(result.shortfall ?? montoPagar - balance)
      setPaying(false)
      return
    }

    const db = supabase as any
    await db.from('prov_iibb_ddjj').update({ status: 'paid' }).eq('id', id)
    await db.from('prov_payments').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      total_amount: montoPagar,
      surcharge: mora.moraAmount,
    }).eq('reference_id', id)

    setPaySuccess(true)
    await load()
    setPaying(false)
  }

  if (loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>
  if (!ddjj) return <PageContainer><Alert variant="error">Declaración no encontrada.</Alert></PageContainer>

  const dueDate  = new Date(ddjj.due_date)
  const isOverdue = ddjj.status !== 'paid' && new Date() > dueDate
  const mora     = isOverdue ? calcMoraProvincial(ddjj.net_tax, dueDate) : { daysLate: 0, moraAmount: 0, total: ddjj.net_tax }

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

      {/* Banner simulador — oculto al imprimir */}
      <div className="print:hidden mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-xs text-red-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {/* Éxito de pago */}
      {paySuccess && (
        <div className="print:hidden mb-4 p-4 bg-emerald-50 border-2 border-emerald-400 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Pago registrado en Billetera Fiscal</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Se debitó <strong>{formatCurrency(mora.total)}</strong> de tu Billetera Fiscal
              {mora.moraAmount > 0 && ` (incluye ${formatCurrency(mora.moraAmount)} de mora provincial)`}.
              La declaración quedó en estado <strong>Pagada</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Header acciones — oculto al imprimir */}
      <div className="print:hidden flex items-center justify-between gap-3 mb-5 flex-wrap">
        <a href="/misiones/iibb" className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary-700">
          <ArrowLeft className="w-4 h-4" /> Volver a IIBB
        </a>
        <div className="flex gap-2 flex-wrap">
          {(ddjj.status === 'draft' || ddjj.status === 'overdue') && (
            <Button size="sm" variant="outline" onClick={markSubmitted} loading={updating}>
              <FileText className="w-3.5 h-3.5 mr-1" /> Presentar DDJJ
            </Button>
          )}
          {ddjj.status !== 'paid' && ddjj.net_tax > 0 && (
            <Button size="sm" onClick={handlePagar} loading={paying}>
              <CreditCard className="w-3.5 h-3.5 mr-1" />
              {isOverdue ? `Pagar con mora (${formatCurrency(mora.total)})` : `Pagar (${formatCurrency(mora.total)})`}
            </Button>
          )}
          {ddjj.status === 'paid' && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Pagada
            </span>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" /> Imprimir / Exportar PDF
          </button>
        </div>
      </div>

      {/* Mora alert si vencida */}
      {isOverdue && ddjj.status !== 'paid' && (
        <div className="print:hidden mb-4 p-4 bg-red-50 border border-red-300 rounded-xl">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800 mb-1">
                DDJJ vencida — {mora.daysLate} días de mora
              </p>
              <div className="bg-white/60 rounded-lg p-2.5 text-xs space-y-1 text-red-700">
                <div className="flex justify-between">
                  <span>Impuesto original</span>
                  <span className="font-semibold">{formatCurrency(ddjj.net_tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Interés resarcitorio ({mora.daysLate}d × 0,1% diario)</span>
                  <span className="font-semibold text-red-600">+ {formatCurrency(mora.moraAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-red-200 pt-1 font-bold">
                  <span>Total a pagar hoy</span>
                  <span>{formatCurrency(mora.total)}</span>
                </div>
              </div>
              <p className="text-[10px] text-red-500 mt-2">
                Código Fiscal Misiones — interés por mora del 3% mensual (0,1% diario) sobre el impuesto no pagado en término.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Saldo insuficiente */}
      {saldoInsuficiente !== null && (
        <div className="print:hidden mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800 mb-1">
                Saldo insuficiente — faltan {formatCurrency(saldoInsuficiente)}
              </p>
              <p className="text-xs text-amber-700 mb-3">
                Tu Billetera Fiscal no tiene saldo suficiente para cubrir el pago.
                Cargá al menos <strong>{formatCurrency(saldoInsuficiente)}</strong> y volvé a pagar.
              </p>
              <BilleteraFiscal compact />
            </div>
          </div>
        </div>
      )}

      {error && <Alert variant="error" className="print:hidden mb-4">{error}</Alert>}

      {/* ── Documento imprimible ─────────────────────────────────────────────── */}

      {/* Encabezado solo visible al imprimir */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-800 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold uppercase tracking-wide">Administración Tributaria de Misiones</p>
            <p className="text-sm font-semibold text-slate-600 mt-0.5">Ingresos Brutos — Declaración Jurada Mensual</p>
            <p className="text-xs text-gray-400 mt-1 italic">SIMULACIÓN EDUCATIVA · SIN VALIDEZ FISCAL NI LEGAL · TRIBUT.AR</p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p><span className="font-semibold">Período:</span> {ddjj.period_label}</p>
            <p><span className="font-semibold">Estado:</span> {statusLabels[ddjj.status] ?? ddjj.status}</p>
            <p><span className="font-semibold">Vencimiento:</span> {formatDate(ddjj.due_date)}</p>
            {taxpayer && (
              <>
                <p className="mt-1"><span className="font-semibold">Contribuyente:</span> {taxpayer.entity_name}</p>
                <p><span className="font-semibold">CUIT:</span> {taxpayer.cuit}</p>
                {taxpayer.iibb_number && <p><span className="font-semibold">N° IIBB:</span> {taxpayer.iibb_number}</p>}
              </>
            )}
          </div>
        </div>
      </div>

      <Card padding="none" className="mb-4 overflow-hidden">
        {/* Encabezado del documento */}
        <div className="bg-primary-700 px-6 py-4 flex items-start justify-between text-white print:bg-slate-800">
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

        {/* Ítems por actividad */}
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

        {/* Liquidación — 3 pasos */}
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">Liquidación del impuesto</h3>
          <div className="ml-auto w-full max-w-sm space-y-3">

            {/* Paso 1 */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Paso 1 — Base imponible</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total ingresos</span>
                  <span className="font-medium">{formatCurrency(ddjj.total_revenue)}</span>
                </div>
                {ddjj.total_exempt_revenue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">− Rentas exentas</span>
                    <span className="font-medium text-emerald-600">− {formatCurrency(ddjj.total_exempt_revenue)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-dashed border-slate-200 pt-1">
                  <span className="text-slate-700">= Base imponible</span>
                  <span>{formatCurrency(ddjj.total_taxable_revenue)}</span>
                </div>
              </div>
            </div>

            {/* Paso 2 */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Paso 2 — Impuesto bruto</p>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-700">= Impuesto determinado</span>
                <span className="text-orange-600">{formatCurrency(ddjj.total_tax)}</span>
              </div>
            </div>

            {/* Paso 3 */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Paso 3 — Impuesto a pagar</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Impuesto determinado</span>
                  <span className="font-medium">{formatCurrency(ddjj.total_tax)}</span>
                </div>
                {ddjj.total_withholdings > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">− Retenciones sufridas</span>
                    <span className="font-medium text-emerald-600">− {formatCurrency(ddjj.total_withholdings)}</span>
                  </div>
                )}
                {isOverdue && mora.moraAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-500">+ Mora ({mora.daysLate} días)</span>
                    <span className="font-medium text-red-500">+ {formatCurrency(mora.moraAmount)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="font-extrabold text-slate-800">IMPUESTO A PAGAR</span>
                  <span className="font-extrabold text-lg text-primary-700">{formatCurrency(mora.total)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Datos del pago (si está pagada) */}
        {ddjj.status === 'paid' && (
          <div className="px-6 py-3 bg-emerald-50 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-xs font-semibold text-emerald-800">
              Pago registrado en Billetera Fiscal el {formatDate(new Date().toISOString())}
            </p>
          </div>
        )}

        {/* Footer educativo */}
        <div className="border-t-2 border-amber-400 bg-amber-50 px-6 py-3">
          <p className="text-xs font-bold text-amber-800 uppercase">DOCUMENTO SIN VALIDEZ FISCAL NI LEGAL</p>
          <p className="text-[10px] text-amber-700 mt-0.5">
            Generado por TRIBUT.AR — Simulador Didáctico. No reemplaza ningún trámite real ante la ATM Misiones.
          </p>
        </div>
      </Card>

      {/* Observaciones */}
      {ddjj.notes && (
        <Card padding="md" className="mb-4">
          <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Observaciones</p>
          <p className="text-sm text-slate-600">{ddjj.notes}</p>
        </Card>
      )}

      {/* Acciones secundarias al pie — ocultas al imprimir */}
      <div className="print:hidden flex gap-2 justify-end">
        <a href="/misiones/iibb">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Ver todas las DDJJ
          </Button>
        </a>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          title="Se abre el diálogo de impresión. Elegí 'Guardar como PDF' en destino."
        >
          <Printer className="w-4 h-4" /> Exportar PDF / Imprimir
        </button>
      </div>

    </PageContainer>
  )
}
