'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatDate } from '@/lib/utils'
import { exportElementToPDF } from '@/lib/pdf-export'
import { ArrowLeft, Download, Printer, CheckCircle2 } from 'lucide-react'
import type { TaxpayerProfile } from '@/types'
import type { AutonomosProfile } from '@/types/fiscal'
import { getCategoryByCode } from '@/lib/fiscal-engine/autonomos'

export default function ConstanciaAutonomosPage() {
  const { user } = useUser()
  const supabase   = createClient()

  const [taxpayer,  setTaxpayer]  = useState<TaxpayerProfile | null>(null)
  const [autProfile, setAutProfile] = useState<AutonomosProfile | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const db = supabase as any
    const [tpRes, autRes] = await Promise.all([
      db.from('taxpayer_profiles').select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle(),
      db.from('autonomos_profiles').select('*').eq('user_id', user!.id).maybeSingle(),
    ])
    setTaxpayer(tpRes.data)
    setAutProfile(autRes.data)
    setLoading(false)
  }

  function handlePDF() {
    const name = (taxpayer?.entity_name ?? 'contribuyente').replace(/\s+/g, '_')
    exportElementToPDF(
      'doc-constancia-autonomos',
      `TRIBUTAR_Constancia_Autonomo_${name}`,
      () => setExporting(true),
      () => setExporting(false),
    )
  }

  const nowStr   = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  const cuit     = taxpayer?.cuit ?? '20-00000000-0'
  const cat      = autProfile ? getCategoryByCode(autProfile.category) : null
  const catLabel = cat?.label ?? 'Categoría I'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Generando constancia…</p>
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
          <button onClick={handlePDF} disabled={exporting}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
            <Download className="w-4 h-4" />
            {exporting ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {/* Hoja A4 */}
      <div className="p-6 print:p-0">
        <div
          id="doc-constancia-autonomos"
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
                <p className="text-xs text-slate-500 mb-4">ARCA — Ex AFIP</p>
                <p className="text-xl font-black text-slate-800 uppercase tracking-wide">Constancia de Inscripción</p>
                <p className="text-sm font-bold text-blue-700">TRABAJADOR AUTÓNOMO — RÉGIMEN AUTÓNOMOS</p>
                <p className="text-xs text-slate-500">Ley 11683, Ley 24241 (SIPA), Ley 20628 (Ganancias), Ley 23660 (Obras Sociales)</p>
              </div>
              <div className="w-40 flex-shrink-0 flex flex-col items-center justify-center border-l border-slate-200 py-6 px-4">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-sm font-black text-blue-700">ACTIVO</p>
                <p className="text-[10px] text-blue-600 text-center">Autónomo</p>
                <p className="text-[9px] text-slate-400 text-center mt-1">{nowStr}</p>
              </div>
            </div>

            {/* DATOS DEL CONTRIBUYENTE */}
            <div className="px-8 py-6 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">IDENTIFICACIÓN DEL CONTRIBUYENTE</p>
              <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Apellido y nombre</p>
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
                <div className="bg-blue-700 rounded-2xl w-36 h-36 flex-shrink-0 flex flex-col items-center justify-center shadow-lg">
                  <p className="text-[9px] text-blue-200 uppercase font-bold tracking-widest mb-1">AUTÓNOMO</p>
                  <p className="text-2xl font-black text-white">{autProfile?.category ?? 'I'}</p>
                  <p className="text-[9px] text-blue-200 uppercase mt-1">SIPA / IVA / GCIAS</p>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Categoría autónomos</p>
                    <p className="text-sm font-semibold text-slate-800">{catLabel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Tipo de actividad</p>
                    <p className="text-sm font-semibold text-slate-800 capitalize">{autProfile?.activity_type ?? 'Profesional'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Condición frente al IVA</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {autProfile?.is_iva_inscripto ? 'Responsable Inscripto' : 'Exento'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Fecha de inicio</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {autProfile?.start_date ? formatDate(autProfile.start_date) : nowStr}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Aportes SIPA</p>
                    <p className="text-sm font-semibold text-slate-800">Vencimiento: día 15 del mes siguiente</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Estado</p>
                    <p className="text-sm font-bold text-blue-700">ACTIVO ✓</p>
                  </div>
                </div>
              </div>
            </div>

            {/* OBLIGACIONES */}
            <div className="px-8 py-6 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">OBLIGACIONES DEL TRABAJADOR AUTÓNOMO</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Concepto</th>
                      <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Periodicidad</th>
                      <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Vencimiento</th>
                      <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Referencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-5 py-3 font-semibold text-slate-800">Aportes SIPA (jubilación + PAMI)</td>
                      <td className="px-5 py-3 text-slate-600">Mensual</td>
                      <td className="px-5 py-3 text-slate-600">Día 15 del mes siguiente</td>
                      <td className="px-5 py-3 text-slate-600">Ley 24241</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-semibold text-slate-800">Obra social autónomos</td>
                      <td className="px-5 py-3 text-slate-600">Mensual</td>
                      <td className="px-5 py-3 text-slate-600">Día 15 del mes siguiente</td>
                      <td className="px-5 py-3 text-slate-600">Ley 23660</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-semibold text-slate-800">IVA (si Resp. Inscripto)</td>
                      <td className="px-5 py-3 text-slate-600">Mensual (DDJJ)</td>
                      <td className="px-5 py-3 text-slate-600">Día 12-20 según dígito CUIT</td>
                      <td className="px-5 py-3 text-slate-600">Ley 20631</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-semibold text-slate-800">Impuesto a las Ganancias PH</td>
                      <td className="px-5 py-3 text-slate-600">Anual + anticipos</td>
                      <td className="px-5 py-3 text-slate-600">Día 15 de cada mes (anticipos)</td>
                      <td className="px-5 py-3 text-slate-600">Ley 20628</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-semibold text-slate-800">Ingresos Brutos (IIBB)</td>
                      <td className="px-5 py-3 text-slate-600">Mensual</td>
                      <td className="px-5 py-3 text-slate-600">Día 25 de cada mes</td>
                      <td className="px-5 py-3 text-slate-600">Código Fiscal provincial</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* OBLIGACIONES Y DERECHOS */}
            <div className="px-8 py-6 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">OBLIGACIONES Y DERECHOS DEL AUTÓNOMO</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">Obligaciones principales</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {[
                      'Ingresar aportes SIPA mensualmente',
                      'Presentar DDJJ de IVA (si RI)',
                      'Presentar DDJJ de Ganancias anualmente',
                      'Emitir Facturas A (a RI) y B (a CF)',
                      'Discriminar IVA en Factura A',
                      'Conservar documentación 10 años',
                      'Informar variaciones de ingresos a ANSES',
                      'Presentar anticipos de Ganancias',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="text-blue-600 font-bold mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">Derechos del autónomo</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {[
                      'Deducir aportes pagados en Ganancias',
                      'Computar crédito fiscal IVA en compras',
                      'Deducir gastos reales vinculados a la actividad',
                      'Acceder a jubilación SIPA al cumplir requisitos',
                      'Cobertura médica a través de obra social',
                      'Solicitar devolución de saldo a favor de IVA',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="text-blue-600 font-bold mt-0.5">✓</span>
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
                  Ley 11683 (Procedimiento Fiscal) · Ley 24241 (SIJP — Régimen previsional autónomos, arts. 2° inc. b y 8°) ·
                  Ley 20628 (Impuesto a las Ganancias) · Ley 20631 (IVA) · Ley 23660 (Obras Sociales) ·
                  RG ARCA 5616/2025 (vencimientos) · Art. 37 Ley 11683 (mora: interés mensual).
                </p>
              </div>
            </div>

            {/* PIE */}
            <div className="border-t-4 border-amber-400 bg-amber-50 px-8 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold text-amber-700 uppercase">DOCUMENTO EDUCATIVO — SIN VALIDEZ FISCAL NI LEGAL</p>
                  <p className="text-[9px] text-amber-600">Generado por TRIBUT.AR · Simulador didáctico de impuestos argentinos · {nowStr}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-amber-600">Mod. ANSES F.546 (simulado)</p>
                  <p className="text-[9px] text-amber-500">Folio N° {Math.floor(Math.random() * 90000 + 10000)}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
