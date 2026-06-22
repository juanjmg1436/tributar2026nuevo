'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatDate, formatCurrency } from '@/lib/utils'
import { exportElementToPDF } from '@/lib/pdf-export'
import { formatPeriod } from '@/lib/fiscal-engine'
import { getDueDate } from '@/lib/fiscal-engine/monotributo'
import { ArrowLeft, Download, Printer, CheckCircle2, Clock } from 'lucide-react'
import type { TaxpayerProfile } from '@/types'
import type { MonotributoPayment, MonotributoProfile, MonotributoDemoCategory, SimulatedVep } from '@/types/fiscal'

export default function ComprobantePagoMonotributoPage() {
  const { period } = useParams<{ period: string }>()
  const { user } = useUser()
  const supabase  = createClient()

  const [payment,    setPayment]    = useState<MonotributoPayment | null>(null)
  const [vep,        setVep]        = useState<SimulatedVep | null>(null)
  const [profile,    setProfile]    = useState<MonotributoProfile | null>(null)
  const [category,   setCategory]   = useState<MonotributoDemoCategory | null>(null)
  const [taxpayer,   setTaxpayer]   = useState<TaxpayerProfile | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [exporting,  setExporting]  = useState(false)

  useEffect(() => { if (user && period) load() }, [user, period])

  async function load() {
    setLoading(true)
    const db = supabase as any
    const [payRes, vepRes, profRes, tpRes] = await Promise.all([
      db.from('monotributo_payments').select('*').eq('user_id', user!.id).eq('period', period).maybeSingle(),
      db.from('simulated_veps').select('*').eq('user_id', user!.id).eq('obligation_type', 'monotributo').eq('period', period).maybeSingle(),
      db.from('monotributo_profiles').select('*').eq('user_id', user!.id).maybeSingle(),
      db.from('taxpayer_profiles').select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle(),
    ])
    const payData: MonotributoPayment | null = payRes.data
    setPayment(payData)
    setVep(vepRes.data)
    setProfile(profRes.data)
    setTaxpayer(tpRes.data)

    if (profRes.data?.category_code) {
      const catRes = await db.from('monotributo_demo_categories')
        .select('*').eq('category_code', profRes.data.category_code).maybeSingle()
      setCategory(catRes.data)
    }
    setLoading(false)
  }

  function handlePDF() {
    const filename = `TRIBUTAR_Monotributo_Cuota_${period}`
    exportElementToPDF('doc-a4', filename, () => setExporting(true), () => setExporting(false))
  }

  const dueDate  = period ? getDueDate(period) : null
  const isPaid   = payment?.status === 'paid'
  const nowDate  = new Date()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Preparando comprobante…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Toolbar ── */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-3">
        <a href="/monotributo" className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a Monotributo
        </a>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button onClick={handlePDF} disabled={exporting}
            className="flex items-center gap-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
            <Download className="w-4 h-4" />
            {exporting ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {/* ── Hoja A4 ── */}
      <div className="p-6 print:p-0">
        <div
          id="doc-a4"
          className="max-w-[794px] mx-auto bg-white shadow-xl print:shadow-none relative overflow-hidden"
          style={{ minHeight: '1123px' }}
        >
          {/* Sello de agua */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ zIndex: 0 }}>
            <div style={{ transform: 'rotate(-35deg)', opacity: 0.055, fontSize: '62px', fontWeight: 900, color: '#1e3a5f', lineHeight: 1.25, textAlign: 'center', whiteSpace: 'nowrap' }}>
              TRIBUT.AR<br />SIMULADOR<br />EDUCATIVO<br />SIN VALIDEZ FISCAL
            </div>
          </div>

          <div className="relative" style={{ zIndex: 1 }}>

            {/* ── ENCABEZADO ARCA-STYLE ── */}
            <div className="flex items-stretch border-b-4 border-primary-700">
              {/* Franja izquierda */}
              <div className="bg-primary-700 w-28 flex-shrink-0 flex flex-col items-center justify-center py-6 px-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                  <span className="text-white font-black text-xl">A</span>
                </div>
                <p className="text-white text-[9px] font-bold text-center leading-tight">ARCA<br />(simulado)</p>
              </div>

              {/* Bloque central */}
              <div className="flex-1 px-6 py-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">República Argentina</p>
                <h1 className="text-lg font-black text-primary-900 leading-tight">ADMINISTRACIÓN FEDERAL DE INGRESOS PÚBLICOS</h1>
                <p className="text-xs text-slate-500">ARCA — Ex AFIP</p>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-base font-black text-slate-800 uppercase tracking-wide">Comprobante de Pago de Monotributo</p>
                  <p className="text-xs text-slate-500">Cuota Integrada — Régimen Simplificado (Ley 26565)</p>
                </div>
              </div>

              {/* Bloque estado */}
              <div className="w-44 flex-shrink-0 flex flex-col items-center justify-center border-l border-slate-200 py-5 px-4">
                {isPaid ? (
                  <>
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    </div>
                    <p className="text-sm font-black text-emerald-700">PAGADO</p>
                    <p className="text-[10px] text-emerald-600 text-center">{payment?.paid_at ? formatDate(payment.paid_at) : '—'}</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                    <p className="text-sm font-black text-amber-700">PENDIENTE</p>
                    <p className="text-[10px] text-amber-600 text-center">Sin pago registrado</p>
                  </>
                )}
              </div>
            </div>

            {/* ── BANDA PERÍODO ── */}
            <div className="bg-slate-700 px-8 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Período</p>
                <p className="text-lg font-black text-white">{period ? formatPeriod(period) : '—'}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 uppercase">Vencimiento</p>
                <p className="text-base font-bold text-white">{dueDate ? formatDate(dueDate.toISOString()) : '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase">N° VEP</p>
                <p className="text-base font-bold text-white font-mono">{vep?.vep_number ?? '—'}</p>
              </div>
            </div>

            {/* ── DATOS DEL CONTRIBUYENTE ── */}
            <div className="px-8 py-5 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">DATOS DEL CONTRIBUYENTE</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Apellido y nombre / Razón social</p>
                  <p className="text-sm font-semibold text-slate-800">{taxpayer?.entity_name ?? 'Contribuyente Simulado'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">CUIT</p>
                  <p className="text-sm font-semibold text-slate-800 font-mono">{taxpayer?.cuit ?? '20-00000000-0'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Domicilio fiscal</p>
                  <p className="text-sm font-semibold text-slate-800">{taxpayer?.fiscal_address ?? 'Domicilio simulado'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Tipo de actividad</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {profile?.activity_type === 'servicios' ? 'Prestación de servicios' : profile?.activity_type === 'bienes' ? 'Venta de bienes' : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* ── CATEGORÍA ── */}
            <div className="px-8 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Categoría</p>
                  <p className="text-5xl font-black text-primary-700">{profile?.category_code ?? '—'}</p>
                  <p className="text-[10px] text-slate-500">Monotributo</p>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-400 uppercase mb-1">Límite de ingresos anuales</p>
                  <p className="text-base font-bold text-slate-800">{category ? formatCurrency(category.max_annual_income) : '—'}</p>
                  {category?.max_surface && (
                    <p className="text-[10px] text-slate-400 mt-0.5">Superficie máx.: {category.max_surface} m² · Energía: {category.max_energy?.toLocaleString('es-AR')} kWh/año</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase">Vigente desde</p>
                  <p className="text-sm font-semibold text-slate-700">{profile?.current_since ? formatDate(profile.current_since) : '—'}</p>
                </div>
              </div>
            </div>

            {/* ── DETALLE DE LA CUOTA ── */}
            <div className="px-8 py-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">DETALLE DE LA OBLIGACIÓN</p>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="text-left px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wide">Concepto</th>
                      <th className="text-left px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wide">Descripción</th>
                      <th className="text-right px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wide">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-5 py-3 font-semibold text-slate-800">Impuesto integrado</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">Reemplaza IVA + Impuesto a las Ganancias</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">{payment ? formatCurrency(payment.tax_component) : '—'}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-semibold text-slate-800">SIPA</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">Aporte jubilatorio — Sistema Integrado Previsional</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">{payment ? formatCurrency(payment.sipa_component) : '—'}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-semibold text-slate-800">Obra social</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">Cobertura médica — Sistema nacional de obras sociales</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">{payment ? formatCurrency(payment.obra_social_component) : '—'}</td>
                    </tr>
                    {payment && payment.surcharge > 0 && (
                      <tr className="bg-red-50">
                        <td className="px-5 py-3 font-semibold text-red-700">Interés por mora</td>
                        <td className="px-5 py-3 text-red-500 text-xs">Art. 37 Ley 11683 — Tasa resarcitoria 3%/mes</td>
                        <td className="px-5 py-3 text-right font-semibold text-red-700">+ {formatCurrency(payment.surcharge)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary-700">
                      <td colSpan={2} className="px-5 py-4 font-black text-white text-sm uppercase tracking-wide">TOTAL A PAGAR / PAGADO</td>
                      <td className="px-5 py-4 text-right font-black text-white text-lg">
                        {payment ? formatCurrency(payment.total_amount + payment.surcharge) : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Método de pago y fecha */}
              {isPaid && (
                <div className="mt-5 grid grid-cols-3 gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div>
                    <p className="text-[10px] text-emerald-600 uppercase font-bold">Medio de pago</p>
                    <p className="text-sm font-semibold text-emerald-800 capitalize">
                      {(vep?.payment_method ?? 'transferencia').replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-600 uppercase font-bold">Fecha de pago</p>
                    <p className="text-sm font-semibold text-emerald-800">{payment?.paid_at ? formatDate(payment.paid_at) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-600 uppercase font-bold">N° de comprobante</p>
                    <p className="text-sm font-semibold text-emerald-800 font-mono">{vep?.comprobante_number ?? '—'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── NOTA NORMATIVA ── */}
            <div className="px-8 pb-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Normativa aplicable</p>
                <p className="text-[10px] text-blue-600 leading-relaxed">
                  Ley 26565 (Monotributo) · RG ARCA 5601/2025 (actualización de categorías) · Ley 11683 art. 37 (mora) ·
                  Vencimiento de cuota: día 20 de cada mes · Recategorización: enero y julio de cada año.
                </p>
              </div>
            </div>

            {/* ── PIE ── */}
            <div className="border-t-4 border-amber-400 bg-amber-50 px-8 py-4 mt-auto">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-wide">
                    ⚠ DOCUMENTO SIN VALIDEZ FISCAL NI LEGAL
                  </p>
                  <p className="text-[9px] text-amber-700 mt-0.5">
                    Generado por TRIBUT.AR — Simulador Didáctico. No reemplaza documentación emitida ante ARCA/AFIP.
                    Este comprobante es solo a fines educativos.
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-6">
                  <p className="text-[9px] text-amber-600">© 2026 Juan Manuel Gómez</p>
                  <p className="text-[9px] text-amber-600">Prof. Cs. Económicas — FHyCS UNaM</p>
                  <p className="text-[9px] text-amber-600 font-mono">Emitido: {nowDate.toLocaleDateString('es-AR')}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; background: white; }
          @page { size: A4 portrait; margin: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  )
}
