'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportElementToPDF } from '@/lib/pdf-export'
import { ArrowLeft, Download, Printer, CheckCircle2, Clock } from 'lucide-react'
import type { TaxpayerProfile } from '@/types'
import type { AutonomosPayment } from '@/types/fiscal'
import { formatPeriod } from '@/lib/fiscal-engine'

export default function VepAutonomosPage() {
  const { user }   = useUser()
  const params     = useParams<{ period: string }>()
  const period     = params.period
  const supabase   = createClient()

  const [taxpayer,  setTaxpayer]  = useState<TaxpayerProfile | null>(null)
  const [payment,   setPayment]   = useState<AutonomosPayment | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { if (user && period) load() }, [user, period])

  async function load() {
    setLoading(true)
    const db = supabase as any
    const [tpRes, payRes] = await Promise.all([
      db.from('taxpayer_profiles').select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle(),
      db.from('autonomos_payments').select('*').eq('user_id', user!.id).eq('period', period).maybeSingle(),
    ])
    setTaxpayer(tpRes.data)
    setPayment(payRes.data)
    setLoading(false)
  }

  function handlePDF() {
    const name = (taxpayer?.entity_name ?? 'contribuyente').replace(/\s+/g, '_')
    exportElementToPDF(
      'doc-vep-autonomos',
      `TRIBUTAR_VEP_Autonomos_${period}_${name}`,
      () => setExporting(true),
      () => setExporting(false),
    )
  }

  const nowStr    = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  const isPaid    = payment?.status === 'paid'
  const cuit      = taxpayer?.cuit ?? '20-00000000-0'
  const periodLabel = payment?.period_label ?? formatPeriod(period)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Cargando comprobante…</p>
      </div>
    </div>
  )

  if (!payment) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center max-w-sm">
        <p className="text-slate-500 mb-4">No se encontró un pago para el período {periodLabel}.</p>
        <a href="/administrador-relaciones" className="text-blue-700 hover:underline text-sm">
          ← Volver a Administrador de Relaciones
        </a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-3">
        <a href="/administrador-relaciones" className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a Administrador
        </a>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          {isPaid && (
            <button onClick={handlePDF} disabled={exporting}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
              <Download className="w-4 h-4" />
              {exporting ? 'Generando…' : 'Descargar PDF'}
            </button>
          )}
        </div>
      </div>

      <div className="p-6 print:p-0">
        <div
          id="doc-vep-autonomos"
          className="max-w-[794px] mx-auto bg-white shadow-xl print:shadow-none relative overflow-hidden"
          style={{ minHeight: '1000px' }}
        >
          {/* Sello de agua */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ zIndex: 0 }}>
            <div style={{ transform: 'rotate(-35deg)', opacity: 0.05, fontSize: '62px', fontWeight: 900, color: '#1e3a5f', lineHeight: 1.25, textAlign: 'center', whiteSpace: 'nowrap' }}>
              TRIBUT.AR<br />SIMULADOR<br />EDUCATIVO<br />SIN VALIDEZ FISCAL
            </div>
          </div>

          <div className="relative" style={{ zIndex: 1 }}>

            {/* ENCABEZADO */}
            <div className="flex items-stretch border-b-4 border-blue-700">
              <div className="bg-blue-700 w-28 flex-shrink-0 flex flex-col items-center justify-center py-8 px-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                  <span className="text-white font-black text-xl">A</span>
                </div>
                <p className="text-white text-[9px] font-bold text-center leading-tight">ARCA<br />(simulado)</p>
              </div>
              <div className="flex-1 px-6 py-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">República Argentina</p>
                <h1 className="text-lg font-black text-blue-900 leading-tight">ADMINISTRACIÓN FEDERAL DE INGRESOS PÚBLICOS</h1>
                <p className="text-xs text-slate-500 mb-4">ARCA — Ex AFIP · ANSES</p>
                <p className="text-xl font-black text-slate-800 uppercase tracking-wide">Comprobante de Pago</p>
                <p className="text-sm font-bold text-blue-700">VEP — APORTES AUTÓNOMOS</p>
                <p className="text-xs text-slate-500">Período: {periodLabel} · Ley 24241 (SIPA) · Ley 23660 (Obras Sociales)</p>
              </div>
              <div className="w-40 flex-shrink-0 flex flex-col items-center justify-center border-l border-slate-200 py-6 px-4">
                {isPaid ? (
                  <>
                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <p className="text-sm font-black text-emerald-700">PAGADO</p>
                    <p className="text-[9px] text-emerald-600 text-center mt-1">
                      {payment.paid_at ? formatDate(payment.paid_at) : nowStr}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                      <Clock className="w-8 h-8 text-amber-500" />
                    </div>
                    <p className="text-sm font-black text-amber-700">PENDIENTE</p>
                    <p className="text-[9px] text-amber-600 text-center mt-1">Vence {formatDate(payment.due_date)}</p>
                  </>
                )}
              </div>
            </div>

            {/* IDENTIFICACIÓN */}
            <div className="px-8 py-5 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">DATOS DEL CONTRIBUYENTE</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Apellido y nombre</p>
                  <p className="text-sm font-bold text-slate-800">{taxpayer?.entity_name ?? 'Contribuyente Simulado'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">CUIT</p>
                  <p className="text-sm font-bold text-slate-800 font-mono">{cuit}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Categoría autónomo</p>
                  <p className="text-sm font-bold text-slate-800">Categoría {payment.category}</p>
                </div>
              </div>
            </div>

            {/* PERÍODO Y VENCIMIENTO */}
            <div className="mx-8 my-5 bg-blue-700 text-white rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-200 uppercase font-semibold mb-0.5">Período devengado</p>
                <p className="text-2xl font-black">{periodLabel}</p>
              </div>
              <div className="text-center px-6 border-x border-blue-500">
                <p className="text-xs text-blue-200 uppercase font-semibold mb-0.5">Vencimiento</p>
                <p className="text-lg font-black">{formatDate(payment.due_date)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-200 uppercase font-semibold mb-0.5">Estado</p>
                <p className={`text-lg font-black ${isPaid ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {isPaid ? 'PAGADO' : 'PENDIENTE'}
                </p>
              </div>
            </div>

            {/* DETALLE */}
            <div className="px-8 pb-6 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">DETALLE DE APORTES</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Concepto</th>
                      <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Alícuota</th>
                      <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-5 py-3 text-slate-500 text-xs">Base imponible (Categoría {payment.category})</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">Referencia</td>
                      <td className="px-5 py-3 text-right text-slate-500">{formatCurrency(payment.base_imponible)}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-semibold text-slate-800">Jubilación SIPA (Ley 24241)</td>
                      <td className="px-5 py-3 text-slate-600">27%</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatCurrency(payment.aporte_jubilacion)}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-semibold text-slate-800">PAMI / INSSJP</td>
                      <td className="px-5 py-3 text-slate-600">5%</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatCurrency(payment.aporte_pami)}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-semibold text-slate-800">Obra social (Ley 23660)</td>
                      <td className="px-5 py-3 text-slate-600">6.5%</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatCurrency(payment.aporte_obra_social)}</td>
                    </tr>
                    {payment.surcharge > 0 && (
                      <tr className="bg-red-50">
                        <td className="px-5 py-3 font-semibold text-red-700">Interés por mora (art. 37 Ley 11683)</td>
                        <td className="px-5 py-3 text-red-500">3%/mes</td>
                        <td className="px-5 py-3 text-right font-semibold text-red-700">{formatCurrency(payment.surcharge)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-700">
                      <td colSpan={2} className="px-5 py-4 font-black text-white text-xs uppercase">TOTAL APORTES</td>
                      <td className="px-5 py-4 text-right font-black text-white text-xl">{formatCurrency(payment.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Datos de pago */}
            {isPaid && (
              <div className="px-8 py-5 border-b border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">DATOS DEL PAGO</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Número de comprobante</p>
                    <p className="text-sm font-bold text-slate-800 font-mono">{payment.comprobante_number ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Número VEP</p>
                    <p className="text-sm font-bold text-slate-800 font-mono">{payment.vep_number ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Fecha de acreditación</p>
                    <p className="text-sm font-bold text-slate-800">{payment.paid_at ? formatDate(payment.paid_at) : '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {!isPaid && (
              <div className="px-8 py-5 border-b border-slate-200">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-bold text-amber-700 mb-1">Pago pendiente</p>
                  <p className="text-xs text-amber-600">
                    Realizá el pago desde <strong>Administrador de Relaciones → Autónomos → Aportes</strong>.
                    Vencimiento: {formatDate(payment.due_date)}.
                    Los aportes impagos generan intereses según el art. 37 Ley 11683.
                  </p>
                </div>
              </div>
            )}

            {/* PIE */}
            <div className="border-t-4 border-amber-400 bg-amber-50 px-8 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold text-amber-700 uppercase">DOCUMENTO EDUCATIVO — SIN VALIDEZ FISCAL NI LEGAL</p>
                  <p className="text-[9px] text-amber-600">Generado por TRIBUT.AR · Simulador didáctico de impuestos argentinos · {nowStr}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-amber-600">VEP Autónomos (simulado)</p>
                  <p className="text-[9px] text-amber-500">Período {period}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
