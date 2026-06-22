'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatDate } from '@/lib/utils'
import { exportElementToPDF } from '@/lib/pdf-export'
import { ArrowLeft, Download, Printer, CheckCircle2 } from 'lucide-react'
import type { TaxpayerProfile } from '@/types'

const IVA_VTO: Record<string, number> = {
  '0': 12, '1': 12, '2': 14, '3': 14, '4': 16,
  '5': 16, '6': 18, '7': 18, '8': 20, '9': 20,
}

function ivaVencimiento(cuit: string): string {
  const digits = cuit.replace(/\D/g, '')
  const penultimate = digits[digits.length - 2] ?? '0'
  return `día ${IVA_VTO[penultimate] ?? 20} del mes siguiente`
}

export default function ConstanciaRIPage() {
  const { user } = useUser()
  const supabase  = createClient()

  const [taxpayer,  setTaxpayer]  = useState<TaxpayerProfile | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('taxpayer_profiles')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .maybeSingle()
    setTaxpayer(data)
    setLoading(false)
  }

  function handlePDF() {
    const name = (taxpayer?.entity_name ?? 'contribuyente').replace(/\s+/g, '_')
    exportElementToPDF(
      'doc-constancia-ri',
      `TRIBUTAR_Constancia_ResponsableInscripto_${name}`,
      () => setExporting(true),
      () => setExporting(false),
    )
  }

  const nowStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  const cuit   = taxpayer?.cuit ?? '20-00000000-0'
  const vto    = ivaVencimiento(cuit)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Generando constancia…</p>
      </div>
    </div>
  )

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
          id="doc-constancia-ri"
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
            <div className="flex items-stretch border-b-4 border-emerald-700">
              <div className="bg-emerald-700 w-28 flex-shrink-0 flex flex-col items-center justify-center py-8 px-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                  <span className="text-white font-black text-xl">A</span>
                </div>
                <p className="text-white text-[9px] font-bold text-center leading-tight">ARCA<br />(simulado)</p>
              </div>
              <div className="flex-1 px-6 py-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">República Argentina</p>
                <h1 className="text-lg font-black text-emerald-900 leading-tight">ADMINISTRACIÓN FEDERAL DE INGRESOS PÚBLICOS</h1>
                <p className="text-xs text-slate-500 mb-4">ARCA — Ex AFIP</p>
                <p className="text-xl font-black text-slate-800 uppercase tracking-wide">Constancia de Inscripción</p>
                <p className="text-sm font-bold text-emerald-700">RESPONSABLE INSCRIPTO — RÉGIMEN GENERAL</p>
                <p className="text-xs text-slate-500">Ley 11683, Ley 20631 (IVA), Ley 20628 (Ganancias)</p>
              </div>
              <div className="w-40 flex-shrink-0 flex flex-col items-center justify-center border-l border-slate-200 py-6 px-4">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-sm font-black text-emerald-700">ACTIVO</p>
                <p className="text-[10px] text-emerald-600 text-center">Resp. Inscripto</p>
                <p className="text-[9px] text-slate-400 text-center mt-1">{nowStr}</p>
              </div>
            </div>

            {/* DATOS DEL CONTRIBUYENTE */}
            <div className="px-8 py-6 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">IDENTIFICACIÓN DEL CONTRIBUYENTE</p>
              <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Apellido y nombre / Razón social</p>
                  <p className="text-base font-bold text-slate-800">{taxpayer?.entity_name ?? 'Contribuyente Simulado'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">CUIT</p>
                  <p className="text-base font-bold text-slate-800 font-mono">{cuit}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-400 uppercase">Domicilio fiscal</p>
                  <p className="text-sm font-semibold text-slate-800">{taxpayer?.fiscal_address ?? 'Domicilio fiscal simulado'}</p>
                </div>
              </div>
            </div>

            {/* SITUACIÓN TRIBUTARIA */}
            <div className="px-8 py-6 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">SITUACIÓN TRIBUTARIA</p>
              <div className="flex gap-6 items-start">
                {/* Badge régimen */}
                <div className="bg-emerald-700 rounded-2xl w-36 h-36 flex-shrink-0 flex flex-col items-center justify-center shadow-lg">
                  <p className="text-[9px] text-emerald-200 uppercase font-bold tracking-widest mb-1">RÉGIMEN</p>
                  <p className="text-lg font-black text-white text-center leading-tight px-2">RESP.<br />INSCRIPTO</p>
                  <p className="text-[9px] text-emerald-200 uppercase mt-1">IVA / GANANCIAS</p>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Condición frente al IVA</p>
                    <p className="text-sm font-semibold text-slate-800">Responsable Inscripto</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Condición frente a Ganancias</p>
                    <p className="text-sm font-semibold text-slate-800">Persona Humana / Jurídica</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Fecha de inscripción IVA</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {taxpayer?.created_at ? formatDate(taxpayer.created_at) : nowStr}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Estado</p>
                    <p className="text-sm font-bold text-emerald-700">ACTIVO ✓</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Vencimiento IVA</p>
                    <p className="text-sm font-semibold text-slate-800">{vto}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Ejercicio fiscal Ganancias</p>
                    <p className="text-sm font-semibold text-slate-800">1 enero – 31 diciembre</p>
                  </div>
                </div>
              </div>
            </div>

            {/* OBLIGACIONES TRIBUTARIAS */}
            <div className="px-8 py-6 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">OBLIGACIONES TRIBUTARIAS</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Impuesto</th>
                      <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Periodicidad</th>
                      <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Vencimiento</th>
                      <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Alícuota general</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-5 py-3 font-semibold text-slate-800">IVA</td>
                      <td className="px-5 py-3 text-slate-600">Mensual (DDJJ)</td>
                      <td className="px-5 py-3 text-slate-600">{vto}</td>
                      <td className="px-5 py-3 text-slate-600">21% (general) · 10,5% (diferencial) · 27% (servicios públicos)</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-semibold text-slate-800">Ganancias</td>
                      <td className="px-5 py-3 text-slate-600">Anual + anticipos mensuales</td>
                      <td className="px-5 py-3 text-slate-600">Día 15 de cada mes (anticipos)</td>
                      <td className="px-5 py-3 text-slate-600">35% PJ · Escala progresiva PH (5% – 35%)</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-semibold text-slate-800">Ing. Brutos (IIBB)</td>
                      <td className="px-5 py-3 text-slate-600">Mensual</td>
                      <td className="px-5 py-3 text-slate-600">Día 25 de cada mes</td>
                      <td className="px-5 py-3 text-slate-600">3% (Misiones) · varía por provincia</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Los vencimientos varían según el penúltimo dígito del CUIT para IVA. Consultar tabla completa en ARCA.</p>
            </div>

            {/* OBLIGACIONES Y DERECHOS */}
            <div className="px-8 py-6 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">OBLIGACIONES Y DERECHOS DEL RESPONSABLE INSCRIPTO</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">Obligaciones principales</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {[
                      'Presentar DDJJ de IVA mensualmente',
                      'Presentar DDJJ de Ganancias anualmente',
                      'Ingresar anticipos de Ganancias (10 cuotas)',
                      'Emitir Facturas A (a otros RI) y B (a consumidores)',
                      'Discriminar IVA en las facturas tipo A',
                      'Conservar comprobantes 10 años',
                      'Informar cambios de domicilio o actividad',
                      'Llevar registros contables actualizados',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">Derechos del contribuyente</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {[
                      'Computar crédito fiscal IVA en compras (Factura A)',
                      'Deducir gastos vinculados a la actividad en Ganancias',
                      'Solicitar devolución de saldo a favor de IVA',
                      'Trasladar quebrantos hasta 5 ejercicios',
                      'Aplicar deducciones personales (PH): MNI, cargas de familia',
                      'Fraccionar el pago en 10 anticipos de Ganancias',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="text-primary-600 font-bold mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* NOTA NORMATIVA */}
            <div className="px-8 py-5">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Base normativa</p>
                <p className="text-[10px] text-blue-600 leading-relaxed">
                  Ley 11683 (Procedimiento Fiscal) · Ley 20631 (IVA) y modificatorias ·
                  Ley 20628 (Impuesto a las Ganancias) y modificatorias ·
                  RG ARCA 5616/2025 (vencimientos IVA) · RG AFIP 5496/2023 (actualización de multas) ·
                  Art. 37 Ley 11683 (mora: interés mensual).
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
                    Constancia generada por TRIBUT.AR — Simulador Didáctico. No reemplaza la constancia oficial emitida por ARCA/AFIP.
                    Para obtener la constancia oficial, ingresá con clave fiscal a arca.gob.ar
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
