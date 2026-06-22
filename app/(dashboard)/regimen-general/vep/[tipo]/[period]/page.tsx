'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatDate, formatCurrency } from '@/lib/utils'
import { exportElementToPDF } from '@/lib/pdf-export'
import { formatPeriod } from '@/lib/fiscal-engine'
import { ArrowLeft, Download, Printer, CheckCircle2, Clock } from 'lucide-react'
import type { TaxpayerProfile } from '@/types'

interface VepData {
  id: string
  obligation_type: string
  concept: string
  period: string | null
  amount: number
  due_date: string
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  paid_at: string | null
  comprobante_number: string | null
}

const TIPO_LABELS: Record<string, { label: string; color: string; bg: string; law: string }> = {
  iva: {
    label: 'IVA — Impuesto al Valor Agregado',
    color: 'emerald',
    bg: 'bg-emerald-700',
    law: 'Ley 20631 y modificatorias · RG ARCA 5616/2025',
  },
  ganancias: {
    label: 'Impuesto a las Ganancias',
    color: 'violet',
    bg: 'bg-violet-700',
    law: 'Ley 20628 y modificatorias · Art. 23 y 90 Ley 20628',
  },
}

export default function VepRIPage() {
  const { tipo, period } = useParams<{ tipo: string; period: string }>()
  const { user } = useUser()
  const supabase  = createClient()

  const [vep,       setVep]       = useState<VepData | null>(null)
  const [taxpayer,  setTaxpayer]  = useState<TaxpayerProfile | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { if (user && tipo && period) load() }, [user, tipo, period])

  async function load() {
    setLoading(true)
    const db = supabase as any
    const oblType = tipo === 'ganancias' ? 'ganancias' : 'iva'
    const [vepRes, tpRes] = await Promise.all([
      db.from('simulated_veps')
        .select('*')
        .eq('user_id', user!.id)
        .eq('obligation_type', oblType)
        .eq('period', period)
        .maybeSingle(),
      db.from('taxpayer_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle(),
    ])
    setVep(vepRes.data)
    setTaxpayer(tpRes.data)
    setLoading(false)
  }

  function handlePDF() {
    const tipoLabel = tipo === 'ganancias' ? 'Ganancias' : 'IVA'
    const name = (taxpayer?.entity_name ?? 'contribuyente').replace(/\s+/g, '_')
    exportElementToPDF(
      'doc-vep-ri',
      `TRIBUTAR_VEP_${tipoLabel}_${period}_${name}`,
      () => setExporting(true),
      () => setExporting(false),
    )
  }

  const meta    = TIPO_LABELS[tipo ?? 'iva'] ?? TIPO_LABELS.iva
  const isPaid  = vep?.status === 'paid'
  const nowStr  = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  const periodoLabel = period ? formatPeriod(period) : '—'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Preparando comprobante…</p>
      </div>
    </div>
  )

  if (!vep) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <p className="text-slate-500 mb-4">No se encontró el VEP para este período.</p>
        <a href="/regimen-general" className="text-primary-600 text-sm hover:underline">← Volver a Régimen General</a>
      </div>
    </div>
  )

  const bgClass  = meta.bg
  const isPending = vep.status === 'pending' || vep.status === 'expired'

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-3">
        <a href="/regimen-general" className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a Régimen General
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

      {/* Hoja A4 */}
      <div className="p-6 print:p-0">
        <div
          id="doc-vep-ri"
          className="max-w-[794px] mx-auto bg-white shadow-xl print:shadow-none relative overflow-hidden"
          style={{ minHeight: '1123px' }}
        >
          {/* Sello de agua */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ zIndex: 0 }}>
            <div style={{ transform: 'rotate(-35deg)', opacity: 0.05, fontSize: '62px', fontWeight: 900, color: '#1e3a5f', lineHeight: 1.25, textAlign: 'center', whiteSpace: 'nowrap' }}>
              TRIBUT.AR<br />SIMULADOR<br />EDUCATIVO<br />SIN VALIDEZ FISCAL
            </div>
          </div>

          <div className="relative" style={{ zIndex: 1 }}>

            {/* ENCABEZADO ARCA-STYLE */}
            <div className={`flex items-stretch border-b-4 ${tipo === 'ganancias' ? 'border-violet-700' : 'border-emerald-700'}`}>
              <div className={`${bgClass} w-28 flex-shrink-0 flex flex-col items-center justify-center py-8 px-3`}>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                  <span className="text-white font-black text-xl">A</span>
                </div>
                <p className="text-white text-[9px] font-bold text-center leading-tight">ARCA<br />(simulado)</p>
              </div>
              <div className="flex-1 px-6 py-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">República Argentina</p>
                <h1 className={`text-lg font-black leading-tight ${tipo === 'ganancias' ? 'text-violet-900' : 'text-emerald-900'}`}>
                  ADMINISTRACIÓN FEDERAL DE INGRESOS PÚBLICOS
                </h1>
                <p className="text-xs text-slate-500 mb-4">ARCA — Ex AFIP</p>
                <p className="text-xl font-black text-slate-800 uppercase tracking-wide">Volante de Pago Electrónico (VEP)</p>
                <p className={`text-sm font-bold ${tipo === 'ganancias' ? 'text-violet-700' : 'text-emerald-700'}`}>
                  {meta.label}
                </p>
                <p className="text-xs text-slate-500">{meta.law}</p>
              </div>
              <div className="w-40 flex-shrink-0 flex flex-col items-center justify-center border-l border-slate-200 py-6 px-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 ${isPaid ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  {isPaid
                    ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    : <Clock className="w-8 h-8 text-amber-600" />
                  }
                </div>
                <p className={`text-sm font-black ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isPaid ? 'PAGADO' : 'PENDIENTE'}
                </p>
                <p className="text-[10px] text-slate-500 text-center">{periodoLabel}</p>
                <p className="text-[9px] text-slate-400 text-center mt-1">VEP N° {vep.comprobante_number ?? vep.id.slice(-8).toUpperCase()}</p>
              </div>
            </div>

            {/* BANDA DE PERÍODO */}
            <div className={`${bgClass} px-8 py-3 flex items-center justify-between`}>
              <div>
                <span className="text-white text-xs font-bold uppercase tracking-widest">Período: </span>
                <span className="text-white text-sm font-black">{periodoLabel}</span>
              </div>
              <div className="text-right">
                <span className="text-white/80 text-xs">Vencimiento: </span>
                <span className="text-white text-sm font-bold">{vep.due_date ? formatDate(vep.due_date) : '—'}</span>
              </div>
            </div>

            {/* DATOS DEL CONTRIBUYENTE */}
            <div className="px-8 py-6 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">IDENTIFICACIÓN DEL CONTRIBUYENTE</p>
              <div className="grid grid-cols-2 gap-x-10 gap-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Apellido y nombre / Razón social</p>
                  <p className="text-sm font-bold text-slate-800">{taxpayer?.entity_name ?? 'Contribuyente Simulado'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">CUIT</p>
                  <p className="text-sm font-bold text-slate-800 font-mono">{taxpayer?.cuit ?? '20-00000000-0'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-400 uppercase">Domicilio fiscal</p>
                  <p className="text-sm font-semibold text-slate-800">{taxpayer?.fiscal_address ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Condición IVA</p>
                  <p className="text-sm font-semibold text-slate-800">Responsable Inscripto</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Tipo de obligación</p>
                  <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
                </div>
              </div>
            </div>

            {/* DETALLE DE LA OBLIGACIÓN */}
            <div className="px-8 py-6 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">DETALLE DE LA OBLIGACIÓN</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Concepto</th>
                      <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-5 py-3 text-slate-700">
                        {tipo === 'iva'
                          ? `DDJJ IVA — Período ${periodoLabel} (Débito - Crédito - Retenciones - Saldo anterior)`
                          : `DDJJ Ganancias — Ejercicio ${period?.slice(0, 4) ?? '—'} (Resultado neto × alícuota)`
                        }
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatCurrency(vep.amount)}</td>
                    </tr>
                    {vep.amount === 0 && (
                      <tr>
                        <td colSpan={2} className="px-5 py-3 text-xs text-slate-400 italic text-center">
                          Saldo a favor: no se genera pago. Se traslada al período siguiente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className={bgClass}>
                      <td className="px-5 py-3.5 font-black text-white text-xs uppercase tracking-wide">
                        {isPaid ? 'TOTAL PAGADO' : 'TOTAL A PAGAR'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-white text-base">{formatCurrency(vep.amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* DATOS DE PAGO (si pagado) */}
            {isPaid && (
              <div className="px-8 py-6 border-b border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">DATOS DEL PAGO</p>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Fecha de pago</p>
                    <p className="text-sm font-bold text-slate-800">{vep.paid_at ? formatDate(vep.paid_at.slice(0, 10)) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Medio de pago</p>
                    <p className="text-sm font-bold text-slate-800">Transferencia Bancaria</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">N° de comprobante</p>
                    <p className="text-sm font-bold text-slate-800 font-mono">{vep.comprobante_number ?? '—'}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <p className="text-xs text-emerald-800 font-semibold">
                    Pago acreditado correctamente. La DDJJ queda presentada y pagada en término.
                  </p>
                </div>
              </div>
            )}

            {/* Si pendiente */}
            {isPending && (
              <div className="px-8 py-6 border-b border-slate-200">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-bold text-amber-800 mb-1">Pago pendiente</p>
                  <p className="text-xs text-amber-700">
                    Para efectivizar el pago, volvé a <strong>Régimen General → {tipo === 'iva' ? 'Tab IVA' : 'Tab Ganancias'}</strong> y usá el botón "Pagar ahora" en el paso 3.
                    Una vez pagado, este comprobante se actualizará automáticamente.
                  </p>
                </div>
              </div>
            )}

            {/* NOTA NORMATIVA */}
            <div className="px-8 py-5">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Base normativa</p>
                <p className="text-[10px] text-blue-600 leading-relaxed">
                  {meta.law} · Ley 11683 (Procedimiento Fiscal) ·
                  Art. 37 Ley 11683 (mora: interés mensual) ·
                  RG AFIP 5496/2023 (actualización de multas y sanciones).
                </p>
              </div>
            </div>

            {/* PIE */}
            <div className="border-t-4 border-amber-400 bg-amber-50 px-8 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-wide">
                    ⚠ DOCUMENTO SIN VALIDEZ FISCAL NI LEGAL
                  </p>
                  <p className="text-[9px] text-amber-700 mt-0.5">
                    Comprobante generado por TRIBUT.AR — Simulador Didáctico. No reemplaza el VEP oficial emitido por ARCA/AFIP.
                    Para obtener el VEP oficial, ingresá con clave fiscal a arca.gob.ar
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-6">
                  <p className="text-[9px] text-amber-600">© 2026 Juan Manuel Gómez</p>
                  <p className="text-[9px] text-amber-600">Prof. Cs. Económicas — FHyCS UNaM</p>
                  <p className="text-[9px] text-amber-600 font-mono">Emitido: {nowStr}</p>
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
