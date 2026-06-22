'use client'

/**
 * AutonomosModule — componente embebible para el régimen de trabajadores autónomos.
 * Tabs: Situación | Aportes | IVA & Ganancias | Comparativo
 * Reutiliza RegimenGeneralModule para la lógica de IVA/Ganancias + integración PyMEZ 360.
 */

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useUser } from '@/hooks/useUser'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import {
  AUTONOMOS_CATEGORIES,
  getCategoryByCode,
  getAportesDueDate,
  suggestAutonomosCategory,
  compareRegimes,
  type AutonomosCategory,
} from '@/lib/fiscal-engine/autonomos'
import { suggestMonotributoCategory } from '@/lib/fiscal-engine/monotributo'
import { formatPeriod, currentPeriod, generateVepNumber, generateComprobanteNumber, calcSurcharge } from '@/lib/fiscal-engine'
import type { AutonomosProfile, AutonomosPayment } from '@/types/fiscal'
import type { MonotributoDemoCategory } from '@/types/fiscal'
import { RegimenGeneralModule } from './RegimenGeneralModule'
import {
  AlertTriangle, CheckCircle, CreditCard, Clock, BookOpen, ExternalLink,
  Briefcase, TrendingUp, TrendingDown, Minus, FileText, Download,
  Users, Calculator, Info, ChevronDown, ChevronUp, BarChart3,
} from 'lucide-react'

type Tab = 'situacion' | 'aportes' | 'iva-ganancias' | 'comparativo'
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function StepHeader({ n, done, label }: { n: number; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black',
        done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600')}>
        {done ? '✓' : n}
      </div>
      <p className="text-xs font-bold text-slate-700">{label}</p>
    </div>
  )
}

function CatBadge({ code }: { code: string }) {
  return (
    <div className="bg-blue-700 rounded-xl w-14 h-14 flex flex-col items-center justify-center flex-shrink-0 shadow">
      <p className="text-[8px] text-blue-200 font-bold uppercase">Cat.</p>
      <p className="text-xl font-black text-white leading-none">{code}</p>
    </div>
  )
}

export function AutonomosModule() {
  const { user } = useUser()
  const supabase  = createClient()
  const [tab, setTab]           = useState<Tab>('situacion')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  // Perfil
  const [profile, setProfile]   = useState<AutonomosProfile | null>(null)
  const [payments, setPayments] = useState<AutonomosPayment[]>([])

  // Wizard alta
  const [wCategory,     setWCategory]     = useState<'I'|'II'|'III'|'IV'|'V'>('I')
  const [wActivityType, setWActivityType] = useState<'servicios'|'bienes'|'profesional'>('profesional')
  const [wActivityDesc, setWActivityDesc] = useState('')
  const [wIvaInscripto, setWIvaInscripto] = useState(true)
  const [wAnnualIncome, setWAnnualIncome] = useState('')

  // Aportes
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod())
  const [payMethod, setPayMethod]           = useState('transferencia')

  // Comparativo
  const [simMonthlySales, setSimMonthlySales] = useState('')
  const [dbMonoCategories, setDbMonoCategories] = useState<MonotributoDemoCategory[]>([])

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const db = supabase as any
    const [profRes, payRes, monoCatRes] = await Promise.all([
      db.from('autonomos_profiles').select('*').eq('user_id', user!.id).maybeSingle(),
      db.from('autonomos_payments').select('*').eq('user_id', user!.id).order('period', { ascending: false }).limit(12),
      db.from('monotributo_demo_categories').select('*').eq('is_active', true).order('max_annual_income'),
    ])
    setProfile(profRes.data)
    setPayments(payRes.data || [])
    setDbMonoCategories(monoCatRes.data || [])
    setLoading(false)
  }

  // ── Alta perfil ────────────────────────────────────────────────────────────
  async function handleSetupProfile() {
    if (!user) return
    setSaving(true); setError(null)
    try {
      const db = supabase as any
      await db.from('autonomos_profiles').upsert({
        user_id:        user.id,
        category:       wCategory,
        activity_type:  wActivityType,
        activity_desc:  wActivityDesc,
        is_iva_inscripto: wIvaInscripto,
        start_date:     new Date().toISOString().split('T')[0],
        status:         'active',
        updated_at:     new Date().toISOString(),
      }, { onConflict: 'user_id' })
      setSuccess('Perfil de autónomo configurado correctamente.')
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  // ── Generar cuota mes ──────────────────────────────────────────────────────
  async function handleGeneratePayment() {
    if (!user || !profile) return
    const cat = getCategoryByCode(profile.category)
    if (!cat) return
    setSaving(true); setError(null)
    try {
      const db    = supabase as any
      const dueDate = getAportesDueDate(selectedPeriod)
      const today = new Date().toISOString().split('T')[0]
      const mora  = today > dueDate ? calcSurcharge(cat.totalMensual, dueDate, today, 0.03) : 0
      const total = cat.totalMensual + mora
      const label = formatPeriod(selectedPeriod)
      await db.from('autonomos_payments').upsert({
        user_id:           user.id,
        period:            selectedPeriod,
        period_label:      label,
        due_date:          dueDate,
        category:          profile.category,
        base_imponible:    cat.baseImponible,
        aporte_jubilacion: cat.aporteJubilacion,
        aporte_pami:       cat.aportePami,
        aporte_obra_social: cat.aporteObraSocial,
        surcharge:         mora,
        total_amount:      total,
        status:            today > dueDate ? 'overdue' : 'pending',
      }, { onConflict: 'user_id,period' })
      setSuccess(`Cuota ${label} generada.`)
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  // ── Pagar cuota ────────────────────────────────────────────────────────────
  async function handlePay() {
    if (!user) return
    const payment = payments.find(p => p.period === selectedPeriod)
    if (!payment) return
    setSaving(true); setError(null)
    try {
      const db   = supabase as any
      const comp = generateComprobanteNumber()
      const vep  = generateVepNumber()
      await db.from('autonomos_payments').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        comprobante_number: comp,
        vep_number: vep,
      }).eq('id', payment.id)
      setSuccess(`Pago registrado. Comp: ${comp}`)
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const cat         = profile ? getCategoryByCode(profile.category) : null
  const selectedPay = payments.find(p => p.period === selectedPeriod)
  const isPaid      = selectedPay?.status === 'paid'
  const isGenerated = !!selectedPay

  const periodOptions = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    }
  })

  // Comparativo
  const salesNum  = parseFloat(simMonthlySales) || 0
  const annualSim = salesNum * 12
  const suggestedAutCat = salesNum > 0 ? suggestAutonomosCategory(annualSim) : null
  const suggestedMonoCat = salesNum > 0 && dbMonoCategories.length > 0
    ? suggestMonotributoCategory(annualSim, dbMonoCategories, 'servicios')
    : null
  const monoQuota = suggestedMonoCat
    ? suggestedMonoCat.monthly_total_services
    : 0
  const comparison = (suggestedAutCat && monoQuota > 0 && salesNum > 0)
    ? compareRegimes(salesNum, monoQuota, suggestedMonoCat?.category_code ?? '?', suggestedAutCat)
    : null

  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'situacion',    label: 'Mi situación', icon: <Briefcase   className="w-3.5 h-3.5" /> },
    { id: 'aportes',      label: 'Aportes ANSES', icon: <CreditCard  className="w-3.5 h-3.5" /> },
    { id: 'iva-ganancias',label: 'IVA & Ganancias', icon: <Calculator className="w-3.5 h-3.5" /> },
    { id: 'comparativo',  label: 'Comparativo',  icon: <BarChart3   className="w-3.5 h-3.5" /> },
  ]

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">

      {/* Disclaimer */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium">SIMULADOR DIDÁCTICO — SIN VALIDEZ FISCAL NI LEGAL</p>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/autonomos/constancia"
            className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1 whitespace-nowrap">
            <FileText className="w-3 h-3" /> Constancia
          </Link>
          <Link href="/autonomos"
            className="text-xs font-semibold text-amber-700 hover:underline flex items-center gap-1 whitespace-nowrap">
            Pantalla completa <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
              tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t.icon}<span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {error   && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* ══════════ TAB: MI SITUACIÓN ══════════ */}
      {tab === 'situacion' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>Trabajador Autónomo:</strong> Régimen para independientes que no están en Monotributo.
              Pagan <strong>aportes jubilatorios a ANSES</strong> (5 categorías según actividad) más{' '}
              <strong>IVA mensual</strong> y <strong>Ganancias anual</strong> como Responsable Inscripto.
              Pueden deducir gastos reales, lo que puede ser más conveniente con ingresos altos.
            </p>
          </div>

          {!profile ? (
            // ── Wizard de alta ──
            <Card padding="md">
              <p className="text-sm font-bold text-slate-700 mb-4">Configurar perfil de Autónomo</p>

              {/* Sugerencia por ingresos */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ingresos anuales estimados (para sugerir categoría)</label>
                <input type="number" value={wAnnualIncome} onChange={e => {
                  setWAnnualIncome(e.target.value)
                  const s = suggestAutonomosCategory(parseFloat(e.target.value) || 0)
                  setWCategory(s.code)
                }}
                  placeholder="Ej: 12000000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {wAnnualIncome && (
                  <p className="text-[10px] text-blue-600 mt-1">
                    Sugerencia: Categoría {suggestAutonomosCategory(parseFloat(wAnnualIncome)).code} — {suggestAutonomosCategory(parseFloat(wAnnualIncome)).description}
                  </p>
                )}
              </div>

              {/* Selector de categoría */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-600 mb-2">Categoría de autónomo</label>
                <div className="space-y-2">
                  {AUTONOMOS_CATEGORIES.map(c => (
                    <button key={c.code} type="button" onClick={() => setWCategory(c.code)}
                      className={cn('w-full flex items-center gap-4 p-3 rounded-xl border-2 text-left transition-all',
                        wCategory === c.code ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300')}>
                      <CatBadge code={c.code} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">{c.label}</p>
                        <p className="text-xs text-slate-500">{c.description}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{c.activities}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-black text-blue-700">{formatCurrency(c.totalMensual)}</p>
                        <p className="text-[9px] text-slate-400">por mes</p>
                      </div>
                      {wCategory === c.code && <div className="text-blue-600 font-black">✓</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de actividad */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de actividad</label>
                <div className="flex gap-2">
                  {(['profesional','servicios','bienes'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setWActivityType(t)}
                      className={cn('flex-1 py-2 px-3 rounded-lg border text-xs font-semibold capitalize transition-colors',
                        wActivityType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                      {t === 'profesional' ? 'Profesional liberal' : t === 'servicios' ? 'Prestación de servicios' : 'Venta de bienes'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción actividad */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción de la actividad (opcional)</label>
                <input type="text" value={wActivityDesc} onChange={e => setWActivityDesc(e.target.value)}
                  placeholder="Ej: Contador público — asesoría impositiva"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* IVA */}
              <div className="mb-5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="iva-inscripto" checked={wIvaInscripto} onChange={e => setWIvaInscripto(e.target.checked)} className="w-4 h-4" />
                  <label htmlFor="iva-inscripto" className="text-sm text-slate-700">
                    <span className="font-semibold">Inscripto en IVA (Responsable Inscripto)</span>
                    <span className="text-xs text-slate-400 block">La mayoría de autónomos son RI. Solo algunos profesionales están exentos.</span>
                  </label>
                </div>
              </div>

              <Button onClick={handleSetupProfile} loading={saving} className="w-full bg-blue-700 hover:bg-blue-800 text-white">
                <Briefcase className="w-4 h-4 mr-2" /> Configurar perfil de Autónomo
              </Button>
            </Card>
          ) : (
            // ── Perfil activo ──
            <div className="space-y-4">
              <Card padding="md">
                <div className="flex items-center gap-4">
                  <CatBadge code={profile.category} />
                  <div className="flex-1">
                    <p className="text-base font-bold text-slate-800">{cat?.label ?? `Categoría ${profile.category}`}</p>
                    <p className="text-sm text-slate-500">{cat?.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{profile.activity_desc || cat?.activities}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-blue-700">{formatCurrency(cat?.totalMensual ?? 0)}</p>
                    <p className="text-xs text-slate-400">aporte mensual</p>
                    <p className="text-[10px] text-slate-400">vence día 15</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="p-2.5 bg-slate-50 rounded-lg text-center">
                    <p className="text-[10px] text-slate-400 mb-0.5">Jubilación (27%)</p>
                    <p className="text-sm font-bold text-slate-700">{formatCurrency(cat?.aporteJubilacion ?? 0)}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg text-center">
                    <p className="text-[10px] text-slate-400 mb-0.5">PAMI (5%)</p>
                    <p className="text-sm font-bold text-slate-700">{formatCurrency(cat?.aportePami ?? 0)}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg text-center">
                    <p className="text-[10px] text-slate-400 mb-0.5">Obra social (6.5%)</p>
                    <p className="text-sm font-bold text-slate-700">{formatCurrency(cat?.aporteObraSocial ?? 0)}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold',
                    profile.is_iva_inscripto ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                    {profile.is_iva_inscripto ? '✓ Responsable Inscripto IVA' : 'Exento IVA'}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-100 text-blue-700 capitalize">
                    {profile.activity_type === 'profesional' ? 'Profesional liberal' : profile.activity_type}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-600">
                    Activo desde {formatDate(profile.start_date)}
                  </span>
                </div>
              </Card>

              {/* Resumen anual */}
              <Card padding="md">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Carga anual estimada</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <p className="text-xs text-blue-600 mb-1">Aportes ANSES anuales</p>
                    <p className="text-lg font-black text-blue-800">{formatCurrency((cat?.totalMensual ?? 0) * 12)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Base imponible mensual</p>
                    <p className="text-lg font-black text-slate-700">{formatCurrency(cat?.baseImponible ?? 0)}</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-3">
                  + IVA mensual y Ganancias anuales (ver tab "IVA & Ganancias") ·
                  Vencimiento aportes: día 15 del mes siguiente
                </p>
              </Card>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setProfile(null) }} className="text-xs">
                  Cambiar categoría
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ TAB: APORTES ══════════ */}
      {tab === 'aportes' && (
        <div className="space-y-4">
          {!profile ? (
            <Alert variant="warning">Primero configurá tu perfil de autónomo en la tab "Mi situación".</Alert>
          ) : (
            <>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  <strong>Aportes jubilatorios:</strong> Se pagan mensualmente hasta el <strong>día 15</strong> del mes siguiente.
                  El incumplimiento genera mora (art. 37 Ley 11683). Son deducibles en Ganancias.
                </p>
              </div>

              {/* Selector período */}
              <Card padding="md">
                <div className="flex gap-3 items-end mb-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Período</label>
                    <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {periodOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Medio de pago</label>
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="transferencia">Transferencia bancaria</option>
                      <option value="debito">Débito automático</option>
                      <option value="efectivo">Pago electrónico (ANSES)</option>
                    </select>
                  </div>
                </div>

                {/* Detalle */}
                {cat && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Concepto</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase">%</th>
                          <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Importe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-4 py-2.5 font-medium text-slate-700">Base imponible</td>
                          <td className="px-4 py-2.5 text-slate-400">—</td>
                          <td className="px-4 py-2.5 text-right text-slate-700">{formatCurrency(cat.baseImponible)}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-medium text-slate-700">Jubilación SIPA</td>
                          <td className="px-4 py-2.5 text-slate-400">27%</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{formatCurrency(cat.aporteJubilacion)}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-medium text-slate-700">PAMI (INSSJP)</td>
                          <td className="px-4 py-2.5 text-slate-400">5%</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{formatCurrency(cat.aportePami)}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-medium text-slate-700">Obra social</td>
                          <td className="px-4 py-2.5 text-slate-400">6.5%</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{formatCurrency(cat.aporteObraSocial)}</td>
                        </tr>
                        {selectedPay?.surcharge ? (
                          <tr className="bg-red-50">
                            <td className="px-4 py-2.5 font-medium text-red-700">Interés por mora (art. 37 L.11683)</td>
                            <td className="px-4 py-2.5 text-red-400">3%/mes</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-red-700">{formatCurrency(selectedPay.surcharge)}</td>
                          </tr>
                        ) : null}
                      </tbody>
                      <tfoot>
                        <tr className="bg-blue-700">
                          <td colSpan={2} className="px-4 py-3 font-black text-white text-xs uppercase">Total aportes</td>
                          <td className="px-4 py-3 text-right font-black text-white text-sm">
                            {formatCurrency(selectedPay?.total_amount ?? cat.totalMensual)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Pasos */}
                <div className="flex flex-wrap gap-3">
                  {/* Paso 1: Generar cuota */}
                  <div className={cn('flex-1 min-w-[140px] p-3 rounded-xl border-2',
                    isGenerated ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200')}>
                    <StepHeader n={1} done={isGenerated} label="Generar" />
                    <p className="text-[10px] text-slate-500 mb-2">Calcula el importe del período.</p>
                    <Button size="sm" onClick={handleGeneratePayment} loading={saving}
                      disabled={isGenerated} className="w-full">
                      {isGenerated ? 'Generado ✓' : 'Calcular cuota'}
                    </Button>
                  </div>

                  {/* Paso 2: Pagar */}
                  <div className={cn('flex-1 min-w-[140px] p-3 rounded-xl border-2',
                    isPaid ? 'border-emerald-400 bg-emerald-50' : isGenerated ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-50')}>
                    <StepHeader n={2} done={isPaid} label="Pagar" />
                    <p className="text-[10px] text-slate-500 mb-2">Simula el pago de los aportes.</p>
                    <Button size="sm" onClick={handlePay} loading={saving}
                      disabled={!isGenerated || isPaid} className="w-full">
                      <CreditCard className="w-3 h-3 mr-1" />
                      {isPaid ? 'Pagado ✓' : 'Pagar ahora'}
                    </Button>
                    {selectedPay?.comprobante_number && (
                      <p className="text-[9px] text-slate-400 mt-1 truncate">Comp: {selectedPay.comprobante_number}</p>
                    )}
                    {isPaid && selectedPay && (
                      <Link href={`/autonomos/vep/${selectedPeriod}`}
                        className="mt-1 flex items-center gap-1 text-[10px] text-blue-700 hover:underline">
                        <Download className="w-3 h-3" /> Descargar comprobante
                      </Link>
                    )}
                  </div>
                </div>
              </Card>

              {/* Historial */}
              {payments.length > 0 && (
                <Card padding="sm">
                  <p className="text-xs font-semibold text-slate-700 mb-3">Historial de aportes</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {payments.map(p => (
                      <div key={p.id} className={cn('flex items-center justify-between p-2.5 rounded-lg text-xs',
                        p.status === 'paid' ? 'bg-emerald-50 border border-emerald-100' :
                        p.status === 'overdue' ? 'bg-red-50 border border-red-100' :
                        'bg-slate-50 border border-slate-100')}>
                        <div>
                          <span className="font-semibold text-slate-700">{p.period_label}</span>
                          <span className="text-slate-400 ml-2">Cat. {p.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-700">{formatCurrency(p.total_amount)}</span>
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold',
                            p.status === 'paid' ? 'bg-emerald-200 text-emerald-800' :
                            p.status === 'overdue' ? 'bg-red-200 text-red-800' :
                            'bg-amber-100 text-amber-700')}>
                            {p.status === 'paid' ? 'Pagado' : p.status === 'overdue' ? 'Vencido' : 'Pendiente'}
                          </span>
                          {p.status === 'paid' && (
                            <Link href={`/autonomos/vep/${p.period}`} className="text-blue-500 hover:text-blue-700">
                              <Download className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════ TAB: IVA & GANANCIAS ══════════ */}
      {tab === 'iva-ganancias' && (
        <div className="space-y-3">
          {!profile?.is_iva_inscripto ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-semibold text-amber-800 mb-1">Exento de IVA</p>
              <p className="text-xs text-amber-700">
                Tu perfil indica que estás exento de IVA. Si tu situación cambia o si tenés actividad gravada,
                actualizá tu perfil en la tab "Mi situación".
              </p>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs text-blue-700">
                <strong>Como Responsable Inscripto</strong>, las obligaciones de IVA y Ganancias son idénticas a las del Régimen General.
                El módulo a continuación es el mismo — los datos de PyMEZ 360 también están disponibles.
              </p>
            </div>
          )}
          <RegimenGeneralModule />
        </div>
      )}

      {/* ══════════ TAB: COMPARATIVO ══════════ */}
      {tab === 'comparativo' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
            <BarChart3 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>¿Monotributo o Autónomo?</strong> Ingresá tu facturación mensual neta y el comparativo te mostrará
              la carga tributaria estimada en cada régimen. Recordá: en Autónomo podés deducir gastos reales en Ganancias.
            </p>
          </div>

          <Card padding="md">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Facturación mensual neta (sin IVA)</label>
            <input type="number" value={simMonthlySales} onChange={e => setSimMonthlySales(e.target.value)}
              placeholder="Ej: 2500000"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
            <p className="text-[10px] text-slate-400">El comparativo asume ~60% de gastos deducibles (promedio orientativo)</p>
          </Card>

          {comparison && (
            <div className="space-y-3">
              {/* Resultado */}
              <div className={cn('p-4 rounded-xl border-2 text-center',
                comparison.recomendacion === 'monotributo' ? 'border-yellow-400 bg-yellow-50' :
                comparison.recomendacion === 'autonomos'   ? 'border-blue-400 bg-blue-50' :
                'border-slate-300 bg-slate-50')}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Conclusión</p>
                <p className={cn('text-lg font-black mb-1',
                  comparison.recomendacion === 'monotributo' ? 'text-yellow-800' :
                  comparison.recomendacion === 'autonomos'   ? 'text-blue-800' :
                  'text-slate-700')}>
                  {comparison.recomendacion === 'monotributo' ? '🟡 Monotributo más conveniente'
                   : comparison.recomendacion === 'autonomos' ? '🔵 Autónomo más conveniente'
                   : '⚪ Carga similar — elegir por criterios no económicos'}
                </p>
                <p className="text-xs text-slate-600 max-w-md mx-auto">{comparison.razon}</p>
              </div>

              {/* Grid comparativo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Monotributo */}
                <Card padding="md" className="border-yellow-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-700 font-black text-sm">
                      {comparison.monotributoCode}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Monotributo</p>
                      <p className="text-[10px] text-slate-400">Categoría {comparison.monotributoCode} sugerida</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Cuota mensual total</span>
                      <span className="font-black text-yellow-800 text-base">{formatCurrency(comparison.monotributoCuota)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">IVA</span>
                      <span className="text-slate-600">No presenta DDJJ</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Ganancias</span>
                      <span className="text-slate-600">Incluido en cuota</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Comprobante</span>
                      <span className="text-slate-600">Factura C</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Deducción gastos</span>
                      <span className="text-red-600 font-semibold">No</span>
                    </div>
                    <hr className="border-slate-100" />
                    <div className="flex justify-between text-xs font-black">
                      <span className="text-slate-600">Carga mensual estimada</span>
                      <span className="text-yellow-800">{formatCurrency(comparison.monotributoCuota)}</span>
                    </div>
                  </div>
                </Card>

                {/* Autónomo */}
                <Card padding="md" className="border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <CatBadge code={comparison.autonomosCategory.code} />
                    <div>
                      <p className="text-sm font-bold text-slate-700">Autónomo</p>
                      <p className="text-[10px] text-slate-400">Categoría {comparison.autonomosCategory.code} sugerida</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Aportes ANSES</span>
                      <span className="font-semibold text-blue-700">{formatCurrency(comparison.aportesMensual)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">IVA (débito bruto)</span>
                      <span className="text-slate-500 text-[10px]">se traslada al cliente</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Ganancias estimada</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(comparison.gananciasEstimadaMensual)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Comprobante</span>
                      <span className="text-slate-600">Factura A/B</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Deducción gastos</span>
                      <span className="text-emerald-600 font-semibold">Sí (gastos reales)</span>
                    </div>
                    <hr className="border-slate-100" />
                    <div className="flex justify-between text-xs font-black">
                      <span className="text-slate-600">Carga mensual estimada</span>
                      <span className="text-blue-800">{formatCurrency(comparison.totalAutonomo)}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Aclaraciones */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
                <strong>Notas:</strong> (1) El IVA no es costo en Autónomo si se puede computar crédito fiscal.
                (2) La estimación de Ganancias supone 60% de gastos deducibles; el valor real varía según el contribuyente.
                (3) Esta comparativa es orientativa — consultá un contador para tu caso específico.
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
