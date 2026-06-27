'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { useProvincialTaxpayer } from '@/hooks/useProvincialTaxpayer'
import { useRegime } from '@/hooks/useRegime'
import { IIBB_ACTIVITIES, calcIIBBDueDate, formatPeriodLabel, RS_IIBB_PROYECTO } from '@/lib/constants/misiones'
import { formatCurrency } from '@/lib/utils'
import {
  Plus, Trash2, Calculator, CheckCircle2, AlertTriangle,
  RefreshCw, Link2, Info, Building2,
} from 'lucide-react'

interface ActivityLine {
  activity_code: string
  activity_name: string
  rate: number
  revenue: string
  exempt_revenue: string
}

interface PymezData {
  company_name:      string
  company_cuit:      string
  total_bruto:       number
  iva_debito_fiscal: number
  total_sales_net:   number
  invoice_count:     number
}

export default function NuevaDDJJPage() {
  const { user } = useUser()
  const { taxpayer, loading } = useProvincialTaxpayer(user?.id)
  const regime = useRegime()
  const router = useRouter()
  const supabase = createClient()

  const now = new Date()
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0')}`

  const [period, setPeriod]           = useState(defaultPeriod)
  const [withholdings, setWithholdings] = useState('0')
  const [notes, setNotes]             = useState('')
  const [lines, setLines]             = useState<ActivityLine[]>([
    { activity_code: '', activity_name: '', rate: 0, revenue: '', exempt_revenue: '0' },
  ])
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [origin, setOrigin]           = useState<'manual' | 'pymez360'>('manual')

  // ── Pre-cargar actividad principal del contribuyente ────────────────────────
  useEffect(() => {
    if (!taxpayer?.primary_activity_code) return
    setLines(prev => {
      if (prev[0].activity_code !== '') return prev
      const actCode  = taxpayer.primary_activity_code
      const actEntry = IIBB_ACTIVITIES.find(a => a.code === actCode)
      return [{
        ...prev[0],
        activity_code: actCode,
        activity_name: actEntry?.name ?? taxpayer.primary_activity_name ?? '',
        rate:          actEntry?.rate ?? 0,
      }]
    })
  }, [taxpayer?.primary_activity_code])

  // ── PyMEZ 360 import ────────────────────────────────────────────────────────
  const [pymezToken, setPymezToken]       = useState('')
  const [pymezSyncing, setPymezSyncing]   = useState(false)
  const [pymezData, setPymezData]         = useState<PymezData | null>(null)
  const [pymezError, setPymezError]       = useState<string | null>(null)
  const [cuitMismatch, setCuitMismatch]   = useState(false)

  async function handlePymezImport() {
    if (!pymezToken.trim() || !period) return
    setPymezSyncing(true)
    setPymezError(null)
    setPymezData(null)
    setCuitMismatch(false)

    try {
      const res  = await fetch(
        `/api/pymez-sync?action=iibb-summary&token=${encodeURIComponent(pymezToken.trim())}&period=${period}`,
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al importar')

      // Validar compatibilidad de CUIT
      const normCuitPymez    = (json.company_cuit ?? '').replace(/-/g, '').trim()
      const normCuitTributar = (taxpayer?.cuit ?? '').replace(/-/g, '').trim()
      if (normCuitPymez && normCuitTributar && normCuitPymez !== normCuitTributar) {
        setCuitMismatch(true)
      }

      setPymezData(json)

      // Pre-rellenar primera línea con la actividad principal del contribuyente
      const actCode  = taxpayer?.primary_activity_code ?? ''
      const actEntry = IIBB_ACTIVITIES.find(a => a.code === actCode)

      setLines([{
        activity_code:  actCode,
        activity_name:  actEntry?.name ?? taxpayer?.primary_activity_name ?? '',
        rate:           actEntry?.rate ?? 0,
        revenue:        String(json.total_sales_net),
        exempt_revenue: '0',
      }])
      setOrigin('pymez360')
    } catch (e) {
      setPymezError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setPymezSyncing(false)
    }
  }

  // ── Actividades ─────────────────────────────────────────────────────────────
  function addLine() {
    setLines(prev => [...prev, { activity_code: '', activity_name: '', rate: 0, revenue: '', exempt_revenue: '0' }])
  }

  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx))
  }

  function updateActivity(idx: number, code: string) {
    const act = IIBB_ACTIVITIES.find(a => a.code === code)
    setLines(prev => prev.map((l, i) => i === idx ? {
      ...l,
      activity_code: code,
      activity_name: act?.name || '',
      rate:          act?.rate || 0,
    } : l))
  }

  function updateLine(idx: number, field: keyof ActivityLine, value: string) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  // ── Cálculos ────────────────────────────────────────────────────────────────
  const calcLines = lines.map(l => {
    const revenue = parseFloat(l.revenue) || 0
    const exempt  = parseFloat(l.exempt_revenue) || 0
    const taxable = Math.max(0, revenue - exempt)
    return { revenue, exempt, taxable, tax: taxable * l.rate, rate: l.rate }
  })

  const totalRevenue     = calcLines.reduce((s, l) => s + l.revenue, 0)
  const totalExempt      = calcLines.reduce((s, l) => s + l.exempt, 0)
  const totalTaxable     = calcLines.reduce((s, l) => s + l.taxable, 0)
  const totalTax         = calcLines.reduce((s, l) => s + l.tax, 0)
  const totalWithholdings = parseFloat(withholdings) || 0
  const netTax           = Math.max(0, totalTax - totalWithholdings)

  // ── Guardar ─────────────────────────────────────────────────────────────────
  async function handleSubmit(submitStatus: 'draft' | 'submitted') {
    if (!user || !taxpayer) return
    const hasValidLine = lines.some(l => l.activity_code && parseFloat(l.revenue) > 0)
    if (!hasValidLine) {
      setError('Ingresá al menos una actividad con ingresos.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const db          = supabase as any
      const dueDate     = calcIIBBDueDate(period)
      const periodLabel = formatPeriodLabel(period)

      const { data: ddjj, error: ddjjErr } = await db.from('prov_iibb_ddjj').insert({
        user_id:               user.id,
        taxpayer_id:           taxpayer.id,
        period,
        period_label:          periodLabel,
        due_date:              dueDate,
        total_revenue:         totalRevenue,
        total_exempt_revenue:  totalExempt,
        total_taxable_revenue: totalTaxable,
        total_tax:             totalTax,
        total_withholdings:    totalWithholdings,
        net_tax:               netTax,
        status:                submitStatus,
        submitted_at:          submitStatus === 'submitted' ? new Date().toISOString() : null,
        notes:                 notes || null,
        origin,
        pymez_token:           origin === 'pymez360' ? pymezToken.trim().toUpperCase() : null,
        pymez_company_name:    origin === 'pymez360' ? (pymezData?.company_name ?? null) : null,
      }).select().single()

      if (ddjjErr) throw new Error(ddjjErr.message)

      const items = lines
        .filter(l => l.activity_code && parseFloat(l.revenue) > 0)
        .map(l => {
          const rev = parseFloat(l.revenue) || 0
          const ex  = parseFloat(l.exempt_revenue) || 0
          return {
            ddjj_id:          ddjj.id,
            activity_code:    l.activity_code,
            activity_name:    l.activity_name,
            revenue:          rev,
            exempt_revenue:   ex,
            taxable_revenue:  Math.max(0, rev - ex),
            rate:             l.rate,
            tax_amount:       Math.max(0, rev - ex) * l.rate,
          }
        })

      if (items.length > 0) await db.from('prov_iibb_items').insert(items)

      if (submitStatus === 'submitted' && netTax > 0) {
        await db.from('prov_payments').insert({
          user_id:       user.id,
          taxpayer_id:   taxpayer.id,
          tax_type:      'iibb',
          concept:       `IIBB — ${periodLabel}`,
          period,
          due_date:      dueDate,
          amount:        netTax,
          surcharge:     0,
          total_amount:  netTax,
          status:        'pending',
          reference_id:  ddjj.id,
        })
      }

      router.push(`/misiones/iibb/${ddjj.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <PageContainer title="Nueva DDJJ — IIBB" subtitle="Declaración jurada mensual de Ingresos Brutos">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <a href="/misiones" className="hover:text-primary-600">ATM Misiones</a>
        <span>›</span>
        <a href="/misiones/iibb" className="hover:text-primary-600 font-semibold text-slate-700">Historial DDJJ IIBB</a>
        <span>›</span>
        <span className="text-primary-600 font-semibold">Nueva DDJJ</span>
      </div>

      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-xs text-red-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {/* ── Gate Monotributista ────────────────────────────────────────────── */}
      {regime.regime === 'monotributista' && (
        <div className="mb-4 space-y-3">
          {/* Aviso principal: Misiones NO adhirió al Monotributo Unificado */}
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 mb-1">
                  Misiones NO adhirió al Monotributo Unificado — debés pagar IIBB por separado
                </p>
                <p className="text-xs text-amber-700 leading-relaxed mb-2">
                  A diferencia de otras 14 provincias (Buenos Aires, Córdoba, Mendoza, etc.), Misiones
                  <strong> no integró el Monotributo Unificado</strong>. Tu cuota nacional no incluye el
                  componente de IIBB provincial. Debés inscribirte en ATM Misiones como contribuyente de
                  Ingresos Brutos y presentar DDJJ mensual como cualquier otro régimen.
                </p>
                <div className="bg-amber-100 rounded-lg p-2 text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">Para monotributistas en Misiones (régimen vigente):</p>
                  <p>· <strong>Base imponible:</strong> total de Factura C (precio único, sin IVA separado).</p>
                  <p>· <strong>Alícuota:</strong> igual que el Régimen General para tu actividad.</p>
                  <p>· <strong>DDJJ:</strong> presentación mensual ante ATM (vence día 15).</p>
                  <p>· <strong>Convenio Multilateral:</strong> si operás en otras provincias, declarás en COMARB.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Nota sobre RS-IIBB propuesto (no vigente) */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-semibold mb-1">
                Proyecto RS-IIBB — Cuota fija para Monotributistas (en análisis legislativo, NO vigente)
              </p>
              <p className="mb-1.5">
                En abril de 2026, la Cámara de Representantes de Misiones recibió un proyecto que
                reemplazaría la DDJJ mensual por una <strong>cuota fija alineada a cada categoría del Monotributo</strong>,
                sin obligación de presentar declaración jurada y con exención de retenciones bancarias.
                Solo aplica a actividad exclusiva en Misiones (excluye Convenio Multilateral).
              </p>
              <p className="font-semibold mb-1">Cuotas propuestas de referencia (sujetas a modificación):</p>
              <div className="grid grid-cols-4 gap-1 text-[10px] bg-white rounded border border-blue-100 p-2">
                {RS_IIBB_PROYECTO.cuotasPorCategoria.map(c => (
                  <div key={c.categoria} className="text-center">
                    <div className="font-bold text-blue-800">Cat. {c.categoria}</div>
                    <div className="text-blue-600">${c.cuotaMensual.toLocaleString('es-AR')}</div>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-blue-500 italic">
                Este proyecto NO está aprobado. El formulario abajo refleja el régimen vigente.
              </p>
            </div>
          </div>
        </div>
      )}

      {!taxpayer ? (
        <Alert variant="warning">
          Primero completá el <a href="/misiones/alta" className="underline font-semibold">alta provincial →</a>
        </Alert>
      ) : (
        <>
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}

          {/* ── Gate Convenio Multilateral ──────────────────────────────────── */}
          {taxpayer.iibb_regime === 'convenio_multilateral' && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-300 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-800 mb-1">Convenio Multilateral — presentación en COMARB</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Estás inscripto en Convenio Multilateral. Las declaraciones juradas no se presentan
                  en ATM Misiones sino en el sistema <strong>SIFERE / COMARB</strong> (Comisión Arbitral).
                  El formulario que completás aquí es didáctico para entender la mecánica del cálculo,
                  pero en la realidad la distribución de la base imponible entre provincias se hace
                  conforme a los coeficientes del CM.
                </p>
              </div>
            </div>
          )}

          {/* Período */}
          <Card padding="md" className="mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Período declarado</label>
                <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className={inputCls} />
                <p className="text-xs text-slate-400 mt-1">Vencimiento: {calcIIBBDueDate(period)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Total retenciones sufridas ($)</label>
                <input type="number" value={withholdings} onChange={e => setWithholdings(e.target.value)}
                  className={inputCls} placeholder="0.00" min="0" />
              </div>
            </div>
          </Card>

          {/* ── Importar desde PyMEZ 360 ─────────────────────────────────────── */}
          <Card padding="md" className="mb-4 border-violet-200 bg-violet-50/40">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-4 h-4 text-violet-600" />
              <h3 className="text-sm font-bold text-violet-800">Importar ingresos desde PyMEZ 360</h3>
              <span className="text-[10px] bg-violet-100 text-violet-600 font-bold px-2 py-0.5 rounded-full">Recomendado</span>
            </div>
            <div className="flex gap-2 items-start text-xs text-violet-700 bg-violet-100 border border-violet-200 rounded-lg p-3 mb-3">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>IIBB grava los ingresos de <strong>cualquier régimen fiscal</strong>. La base imponible varía:</p>
                <ul className="space-y-0.5 pl-1">
                  <li>· <strong>Responsable Inscripto:</strong> precio neto sin IVA (el IVA no es ingreso propio, se recauda para ARCA).</li>
                  <li>· <strong>Monotributista / Autónomo:</strong> precio total facturado (no separás IVA; lo cobrado es el ingreso bruto).</li>
                </ul>
                <p className="text-violet-600">
                  PyMEZ 360 registra el precio base correctamente en ambos casos.
                  Usá el mismo código de sincronización que en <strong>Régimen General</strong> o <strong>IVA</strong>.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={pymezToken}
                onChange={e => setPymezToken(e.target.value.toUpperCase())}
                placeholder="Código PyMEZ 360 (ej: ABC123)"
                className="flex-1 px-3 py-2 border border-violet-300 bg-white rounded-lg text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-violet-500"
                maxLength={8}
              />
              <Button
                onClick={handlePymezImport}
                loading={pymezSyncing}
                disabled={!pymezToken.trim() || pymezSyncing}
                className="bg-violet-700 hover:bg-violet-800 text-white flex-shrink-0"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" /> Importar
              </Button>
            </div>

            {pymezError && (
              <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                ✗ {pymezError}
              </p>
            )}

            {cuitMismatch && pymezData && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-0.5">Incompatibilidad de CUIT — verificá los datos</p>
                  <p>
                    El CUIT de la empresa en <strong>PyMEZ 360</strong> es <strong>{pymezData.company_cuit}</strong>,
                    pero tu alta en <strong>ATM / TRIBUT.AR</strong> registra el CUIT <strong>{taxpayer?.cuit}</strong>.
                    Verificá que estás usando el código de la empresa correcta.
                  </p>
                </div>
              </div>
            )}

            {pymezData && (
              <div className={`mt-3 bg-white border rounded-xl p-3 flex items-start gap-3 ${cuitMismatch ? 'border-amber-200' : 'border-emerald-200'}`}>
                <Building2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cuitMismatch ? 'text-amber-500' : 'text-emerald-600'}`} />
                <div className="flex-1">
                  <p className={`text-sm font-bold ${cuitMismatch ? 'text-amber-800' : 'text-emerald-800'}`}>{pymezData.company_name}</p>
                  <p className="text-xs text-slate-500 mb-2">CUIT {pymezData.company_cuit} · {pymezData.invoice_count} comprobantes · Código: {pymezToken.toUpperCase()}</p>
                  {regime.regime === 'monotributista' ? (
                    <div className="bg-slate-50 rounded-lg p-2 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Total facturado (Factura C)</span>
                        <span className="font-semibold">{formatCurrency(pymezData.total_sales_net)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-emerald-700">
                        <span>= Base imponible IIBB</span>
                        <span>{formatCurrency(pymezData.total_sales_net)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">Factura C no desglosa IVA — el total facturado es la base imponible directa.</p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-2 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Ventas brutas (con IVA)</span>
                        <span className="font-semibold">{formatCurrency(pymezData.total_bruto)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>− IVA Débito Fiscal</span>
                        <span className="font-semibold text-red-500">− {formatCurrency(pymezData.iva_debito_fiscal)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-emerald-700">
                        <span>= Base imponible IIBB</span>
                        <span>{formatCurrency(pymezData.total_sales_net)}</span>
                      </div>
                    </div>
                  )}
                  <p className="mt-1.5 text-[10px] text-emerald-600 font-semibold">
                    ✓ Pre-cargada en actividad principal ({taxpayer?.primary_activity_code}) · Sincronización se guardará con la DDJJ
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Actividades */}
          <Card padding="none" className="mb-4">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-700 text-sm">Actividades e ingresos <span className="text-red-500 text-xs">(requerido para guardar)</span></h3>
                {origin === 'pymez360' && (
                  <p className="text-[10px] text-violet-600 font-semibold mt-0.5">Datos importados desde PyMEZ 360</p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Agregar actividad
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {lines.map((line, idx) => {
                const calc = calcLines[idx]
                return (
                  <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Actividad</label>
                        <select value={line.activity_code} onChange={e => updateActivity(idx, e.target.value)} className={inputCls}>
                          <option value="">Seleccioná actividad...</option>
                          {['comercio', 'servicios', 'industria', 'primario', 'construccion'].map(cat => (
                            <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                              {IIBB_ACTIVITIES.filter(a => a.category === cat).map(a => (
                                <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Ingresos brutos ($) <span className="text-red-500">*</span>
                            {origin === 'pymez360' && idx === 0 && (
                              <span className="ml-1 text-violet-500 font-bold">← PyMEZ</span>
                            )}
                          </label>
                          <input type="number" value={line.revenue} onChange={e => updateLine(idx, 'revenue', e.target.value)}
                            className={`${inputCls} ${!line.revenue && line.activity_code ? 'border-amber-300 ring-1 ring-amber-200' : ''}`}
                            placeholder="Ingresá el monto" min="0" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Exentos ($)</label>
                          <input type="number" value={line.exempt_revenue} onChange={e => updateLine(idx, 'exempt_revenue', e.target.value)}
                            className={inputCls} placeholder="0.00" min="0" />
                        </div>
                      </div>
                    </div>
                    {line.activity_code && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex gap-4 text-slate-500">
                          <span>Alíc.: <strong>{(line.rate * 100).toFixed(1)}%</strong></span>
                          <span>Base gravada: <strong>{formatCurrency(calc.taxable)}</strong></span>
                          <span>Impuesto: <strong className="text-primary-700">{formatCurrency(calc.tax)}</strong></span>
                        </div>
                        {lines.length > 1 && (
                          <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* ── Resumen liquidación — 3 pasos ──────────────────────────────── */}
          <Card padding="md" className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-slate-400" />
              <h3 className="font-semibold text-slate-700 text-sm">Liquidación del impuesto</h3>
            </div>

            {/* PASO 1 — Base Imponible */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold bg-slate-700 text-white rounded-full px-2 py-0.5">PASO 1</span>
                <span className="text-xs font-bold text-slate-600">Determinación de la Base Imponible</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>
                    {regime.regime === 'monotributista'
                      ? 'Total facturado (Factura C — precio único sin IVA separado)'
                      : 'Total ingresos netos facturados (sin IVA)'}
                  </span>
                  <span className="font-semibold">{formatCurrency(totalRevenue)}</span>
                </div>
                {totalExempt > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>− Rentas exentas</span>
                    <span className="font-semibold text-red-500">− {formatCurrency(totalExempt)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-800">
                  <span>= Base imponible</span>
                  <span>{formatCurrency(totalTaxable)}</span>
                </div>
              </div>
            </div>

            {/* PASO 2 — Impuesto Bruto */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold bg-slate-700 text-white rounded-full px-2 py-0.5">PASO 2</span>
                <span className="text-xs font-bold text-slate-600">Aplicación de Alícuota → Impuesto Bruto</span>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 space-y-1.5 text-xs">
                {calcLines.map((cl, idx) => {
                  const act = lines[idx]
                  if (!act.activity_code || cl.taxable === 0) return null
                  return (
                    <div key={idx} className="flex justify-between text-slate-600">
                      <span>
                        {act.activity_name || act.activity_code}
                        <span className="ml-1 text-orange-600 font-semibold">× {(cl.rate * 100).toFixed(1)}%</span>
                      </span>
                      <span className="font-semibold">{formatCurrency(cl.tax)}</span>
                    </div>
                  )
                })}
                <div className="flex justify-between border-t border-orange-200 pt-1.5 font-bold text-orange-700">
                  <span>= Impuesto Bruto (determinado)</span>
                  <span>{formatCurrency(totalTax)}</span>
                </div>
              </div>
            </div>

            {/* PASO 3 — Impuesto a Pagar */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold bg-primary-700 text-white rounded-full px-2 py-0.5">PASO 3</span>
                <span className="text-xs font-bold text-slate-600">Descuento de Retenciones / Percepciones</span>
              </div>
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Impuesto Bruto</span>
                  <span className="font-semibold">{formatCurrency(totalTax)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>− Retenciones / percepciones sufridas</span>
                  <span className="font-semibold text-red-500">− {formatCurrency(totalWithholdings)}</span>
                </div>
                <div className="flex justify-between border-t border-primary-200 pt-1.5">
                  <span className="text-sm font-extrabold text-primary-800">= IMPUESTO A PAGAR</span>
                  <span className="text-lg font-extrabold text-primary-700">{formatCurrency(netTax)}</span>
                </div>
              </div>
              {totalWithholdings > totalTax && (
                <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  ✓ Las retenciones superan el impuesto determinado — tenés un <strong>saldo a favor de {formatCurrency(totalWithholdings - totalTax)}</strong> que podés imputar al próximo período.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Observaciones (opcional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 h-16 resize-none"
                placeholder="Notas adicionales..." />
            </div>
          </Card>

          {/* Acciones */}
          {error && (
            <div className="flex items-start gap-2 p-3 mb-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-3 justify-end">
            <a href="/misiones/iibb"><Button variant="outline">← Historial DDJJ</Button></a>
            <Button variant="outline" onClick={() => handleSubmit('draft')} loading={saving}>
              Guardar borrador
            </Button>
            <Button onClick={() => handleSubmit('submitted')} loading={saving}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Presentar DDJJ
            </Button>
          </div>
        </>
      )}
    </PageContainer>
  )
}
