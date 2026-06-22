'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { useProvincialTaxpayer } from '@/hooks/useProvincialTaxpayer'
import { IIBB_ACTIVITIES, calcIIBBDueDate, formatPeriodLabel } from '@/lib/constants/misiones'
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
  company_name: string
  company_cuit: string
  total_sales_net: number
  invoice_count: number
}

export default function NuevaDDJJPage() {
  const { user } = useUser()
  const { taxpayer, loading } = useProvincialTaxpayer(user?.id)
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

  // ── PyMEZ 360 import ────────────────────────────────────────────────────────
  const [pymezToken, setPymezToken]   = useState('')
  const [pymezSyncing, setPymezSyncing] = useState(false)
  const [pymezData, setPymezData]     = useState<PymezData | null>(null)
  const [pymezError, setPymezError]   = useState<string | null>(null)

  async function handlePymezImport() {
    if (!pymezToken.trim() || !period) return
    setPymezSyncing(true)
    setPymezError(null)
    setPymezData(null)

    try {
      const res  = await fetch(
        `/api/pymez-sync?action=iibb-summary&token=${encodeURIComponent(pymezToken.trim())}&period=${period}`,
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al importar')

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
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-xs text-red-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {!taxpayer ? (
        <Alert variant="warning">
          Primero completá el <a href="/misiones/alta" className="underline font-semibold">alta provincial →</a>
        </Alert>
      ) : (
        <>
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}

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
              <p>
                La <strong>base imponible de IIBB</strong> para un Responsable Inscripto es el precio neto (sin IVA)
                de las ventas del período — los mismos datos que usás para calcular el IVA en el módulo de Régimen General.
                Ingresá el mismo código que usás en <strong>IVA / Régimen General → PyMEZ 360</strong>.
              </p>
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

            {pymezData && (
              <div className="mt-3 bg-white border border-emerald-200 rounded-xl p-3 flex items-start gap-3">
                <Building2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-800">{pymezData.company_name}</p>
                  <p className="text-xs text-slate-500">CUIT {pymezData.company_cuit}</p>
                  <div className="mt-1.5 flex gap-4 text-xs">
                    <span className="text-slate-600">Comprobantes: <strong>{pymezData.invoice_count}</strong></span>
                    <span className="text-slate-600">Ingresos netos: <strong className="text-emerald-700">{formatCurrency(pymezData.total_sales_net)}</strong></span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-emerald-600 font-semibold">
                    ✓ Base imponible pre-cargada en la actividad principal ({taxpayer.primary_activity_code})
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Actividades */}
          <Card padding="none" className="mb-4">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-700 text-sm">Actividades e ingresos</h3>
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
                            Ingresos brutos ($)
                            {origin === 'pymez360' && idx === 0 && (
                              <span className="ml-1 text-violet-500 font-bold">← PyMEZ</span>
                            )}
                          </label>
                          <input type="number" value={line.revenue} onChange={e => updateLine(idx, 'revenue', e.target.value)}
                            className={inputCls} placeholder="0.00" min="0" />
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

          {/* Totales */}
          <Card padding="md" className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-slate-400" />
              <h3 className="font-semibold text-slate-700 text-sm">Resumen de la declaración</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Total ingresos</p>
                <p className="font-bold text-slate-800 text-sm">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Base imponible</p>
                <p className="font-bold text-slate-800 text-sm">{formatCurrency(totalTaxable)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Impuesto determinado</p>
                <p className="font-bold text-orange-600 text-sm">{formatCurrency(totalTax)}</p>
              </div>
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                <p className="text-xs text-primary-600 mb-1">Impuesto neto a pagar</p>
                <p className="font-bold text-primary-700 text-lg">{formatCurrency(netTax)}</p>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Observaciones (opcional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 h-16 resize-none"
                placeholder="Notas adicionales..." />
            </div>
          </Card>

          {/* Acciones */}
          <div className="flex flex-wrap gap-3 justify-end">
            <a href="/misiones/iibb"><Button variant="outline">Cancelar</Button></a>
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
