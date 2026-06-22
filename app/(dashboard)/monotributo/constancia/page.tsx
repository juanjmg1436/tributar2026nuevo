'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatDate, formatCurrency } from '@/lib/utils'
import { exportElementToPDF } from '@/lib/pdf-export'
import { calculateMonotributoQuota, nextRecategorizationDate } from '@/lib/fiscal-engine/monotributo'
import { ArrowLeft, Download, Printer, CheckCircle2 } from 'lucide-react'
import type { TaxpayerProfile } from '@/types'
import type { MonotributoProfile, MonotributoDemoCategory } from '@/types/fiscal'

export default function ConstanciaMonotributoPage() {
  const { user } = useUser()
  const supabase  = createClient()

  const [profile,  setProfile]  = useState<MonotributoProfile | null>(null)
  const [category, setCategory] = useState<MonotributoDemoCategory | null>(null)
  const [taxpayer, setTaxpayer] = useState<TaxpayerProfile | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const db = supabase as any
    const [profRes, tpRes] = await Promise.all([
      db.from('monotributo_profiles').select('*').eq('user_id', user!.id).maybeSingle(),
      db.from('taxpayer_profiles').select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle(),
    ])
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
    const name = (taxpayer?.entity_name ?? 'contribuyente').replace(/\s+/g, '_')
    exportElementToPDF('doc-constancia', `TRIBUTAR_Constancia_Monotributo_${name}`, () => setExporting(true), () => setExporting(false))
  }

  const quota    = profile && category ? calculateMonotributoQuota(category, profile.activity_type) : null
  const nowDate  = new Date()
  const nowStr   = nowDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  const nextRecat = nextRecategorizationDate()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Generando constancia…</p>
      </div>
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <p className="text-slate-500 mb-4">No hay perfil de Monotributo configurado.</p>
        <a href="/monotributo" className="text-primary-600 text-sm hover:underline">← Ir a Monotributo</a>
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
          id="doc-constancia"
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

            {/* ── ENCABEZADO ARCA-STYLE ── */}
            <div className="flex items-stretch border-b-4 border-primary-700">
              <div className="bg-primary-700 w-28 flex-shrink-0 flex flex-col items-center justify-center py-8 px-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                  <span className="text-white font-black text-xl">A</span>
                </div>
                <p className="text-white text-[9px] font-bold text-center leading-tight">ARCA<br />(simulado)</p>
              </div>
              <div className="flex-1 px-6 py-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">República Argentina</p>
                <h1 className="text-lg font-black text-primary-900 leading-tight">ADMINISTRACIÓN FEDERAL DE INGRESOS PÚBLICOS</h1>
                <p className="text-xs text-slate-500 mb-4">ARCA — Ex AFIP</p>
                <p className="text-xl font-black text-slate-800 uppercase tracking-wide">Constancia de Inscripción</p>
                <p className="text-sm font-bold text-primary-700">RÉGIMEN SIMPLIFICADO PARA PEQUEÑOS CONTRIBUYENTES</p>
                <p className="text-xs text-slate-500">Ley 26565 y modificatorias</p>
              </div>
              <div className="w-40 flex-shrink-0 flex flex-col items-center justify-center border-l border-slate-200 py-6 px-4">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-sm font-black text-emerald-700">ACTIVO</p>
                <p className="text-[10px] text-emerald-600 text-center">Monotributo</p>
                <p className="text-[9px] text-slate-400 text-center mt-1">{nowStr}</p>
              </div>
            </div>

            {/* ── DATOS DEL CONTRIBUYENTE ── */}
            <div className="px-8 py-6 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">IDENTIFICACIÓN DEL CONTRIBUYENTE</p>
              <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Apellido y nombre / Razón social</p>
                  <p className="text-base font-bold text-slate-800">{taxpayer?.entity_name ?? 'Contribuyente Simulado'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">CUIT</p>
                  <p className="text-base font-bold text-slate-800 font-mono">{taxpayer?.cuit ?? '20-00000000-0'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-400 uppercase">Domicilio fiscal</p>
                  <p className="text-sm font-semibold text-slate-800">{taxpayer?.fiscal_address ?? 'Domicilio fiscal simulado'}</p>
                </div>
              </div>
            </div>

            {/* ── SITUACIÓN EN EL MONOTRIBUTO ── */}
            <div className="px-8 py-6 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">SITUACIÓN EN EL MONOTRIBUTO</p>

              <div className="flex gap-6 items-start">
                {/* Categoría grande */}
                <div className="bg-primary-700 rounded-2xl w-36 h-36 flex-shrink-0 flex flex-col items-center justify-center shadow-lg">
                  <p className="text-[9px] text-primary-200 uppercase font-bold tracking-widest">CATEGORÍA</p>
                  <p className="text-7xl font-black text-white leading-none">{profile.category_code}</p>
                  <p className="text-[9px] text-primary-200 uppercase">Monotributo</p>
                </div>

                {/* Grid de datos */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Tipo de actividad</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {profile.activity_type === 'servicios' ? 'Prestación de servicios' : 'Venta de bienes'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Fecha de adhesión</p>
                    <p className="text-sm font-semibold text-slate-800">{profile.start_date ? formatDate(profile.start_date) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Categoría vigente desde</p>
                    <p className="text-sm font-semibold text-slate-800">{formatDate(profile.current_since)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Próxima recategorización</p>
                    <p className="text-sm font-semibold text-slate-800 capitalize">{nextRecat}</p>
                  </div>
                  {category && (
                    <>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Límite de ingresos anuales</p>
                        <p className="text-sm font-semibold text-slate-800">{formatCurrency(category.max_annual_income)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Estado</p>
                        <p className="text-sm font-bold text-emerald-700">ACTIVO ✓</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── CUOTA MENSUAL ── */}
            {quota && (
              <div className="px-8 py-6 border-b border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">CUOTA MENSUAL</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Componente</th>
                        <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Descripción</th>
                        <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Importe mensual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-5 py-3 font-semibold text-slate-800">Impuesto integrado</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">Sustituye IVA e Impuesto a las Ganancias</td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatCurrency(quota.taxComponent)}</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3 font-semibold text-slate-800">SIPA</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">Aporte jubilatorio — Sistema Integrado Previsional Argentino</td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatCurrency(quota.sipaComponent)}</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3 font-semibold text-slate-800">Obra social</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">Cobertura médica — libre elección de obra social</td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatCurrency(quota.obraSocialComponent)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-primary-700">
                        <td colSpan={2} className="px-5 py-3.5 font-black text-white text-xs uppercase tracking-wide">CUOTA TOTAL MENSUAL</td>
                        <td className="px-5 py-3.5 text-right font-black text-white text-base">{formatCurrency(quota.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Vencimiento: día 20 de cada mes · Anual estimado: {formatCurrency(quota.total * 12)}</p>
              </div>
            )}

            {/* ── OBLIGACIONES Y DERECHOS ── */}
            <div className="px-8 py-6 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">OBLIGACIONES Y DERECHOS</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">Obligaciones del Monotributista</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {[
                      'Pagar la cuota mensual hasta el día 20',
                      'Emitir Facturas C (no discrimina IVA)',
                      'Exhibir constancia de inscripción en el local',
                      'Recategorizar en enero y julio',
                      'Conservar comprobantes de sus operaciones',
                      'Informar cambios en la actividad o domicilio',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="text-primary-600 font-bold mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">Beneficios del régimen simplificado</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {[
                      'No presenta DDJJ de IVA ni Ganancias',
                      'Cuota fija mensual (no proporcional)',
                      'Cobertura de obra social incluida',
                      'Aportes jubilatorios (SIPA) incluidos',
                      'Facturación simplificada (Factura C)',
                      'Reducción de carga administrativa',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* ── NOTA NORMATIVA ── */}
            <div className="px-8 py-5">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Base normativa</p>
                <p className="text-[10px] text-blue-600 leading-relaxed">
                  Ley 26565 y sus modificatorias · Decreto Reglamentario 1/2010 ·
                  RG ARCA 5601/2025 (actualización de categorías) ·
                  RG AFIP 2746/2010 (Obra social) ·
                  Categorías actualizadas trimestralmente según el RIPTE.
                </p>
              </div>
            </div>

            {/* ── PIE ── */}
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
