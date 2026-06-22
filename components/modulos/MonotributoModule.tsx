'use client'

/**
 * MonotributoModule — componente embebible del módulo de Monotributo.
 * Usado tanto por /monotributo (standalone) como por /administrador-relaciones (inline).
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
  suggestMonotributoCategory,
  calculateMonotributoQuota,
  checkRecategorizacion,
  calculateMora,
  isPeriodOverdue,
  daysToNextDue,
  nextRecategorizationDate,
} from '@/lib/fiscal-engine/monotributo'
import { formatPeriod, currentPeriod, generateVepNumber, generateComprobanteNumber } from '@/lib/fiscal-engine'
import type { MonotributoDemoCategory, MonotributoProfile, MonotributoPayment } from '@/types/fiscal'
import {
  AlertTriangle, CheckCircle, CreditCard, Clock, ChevronRight,
  ArrowUpRight, ArrowDownRight, BarChart3, Calculator, FileText,
  BookOpen, AlertCircle, Download, Award, ExternalLink,
} from 'lucide-react'

type Tab = 'situacion' | 'cuotas' | 'tabla' | 'simulador'
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export function MonotributoModule() {
  const { user } = useUser()
  const supabase = createClient()
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)
  const [tab, setTab]           = useState<Tab>('situacion')

  const [categories, setCategories] = useState<MonotributoDemoCategory[]>([])
  const [profile, setProfile]       = useState<MonotributoProfile | null>(null)
  const [payments, setPayments]     = useState<MonotributoPayment[]>([])
  const [annualIncome, setAnnualIncome] = useState(0)

  // Wizard
  const [formActivityType, setFormActivityType] = useState<'servicios' | 'bienes'>('servicios')
  const [formAnnualRevenue, setFormAnnualRevenue] = useState('')
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0])

  // Cuotas
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod())
  const [paymentMethod, setPaymentMethod]   = useState('transferencia')

  // Simulador
  const [simRevenue, setSimRevenue] = useState('')
  const [simActivity, setSimActivity] = useState<'servicios' | 'bienes'>('servicios')

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const db = supabase as any
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const [catRes, profRes, payRes, invRes] = await Promise.all([
      db.from('monotributo_demo_categories').select('*').eq('is_active', true).order('max_annual_income'),
      db.from('monotributo_profiles').select('*').eq('user_id', user!.id).maybeSingle(),
      db.from('monotributo_payments').select('*').eq('user_id', user!.id).order('period', { ascending: false }).limit(12),
      db.from('invoices').select('total').eq('user_id', user!.id).neq('status', 'cancelled')
        .gte('issue_date', oneYearAgo.toISOString().split('T')[0]),
    ])
    setCategories(catRes.data || [])
    setProfile(profRes.data || null)
    setPayments(payRes.data || [])
    const income = (invRes.data || []).reduce((s: number, r: any) => s + parseFloat(r.total || 0), 0)
    setAnnualIncome(income)
    setLoading(false)
  }

  const currentCat = profile ? categories.find(c => c.category_code === profile.category_code) : null
  const quota       = currentCat ? calculateMonotributoQuota(currentCat, profile?.activity_type ?? 'servicios') : null
  const recatResult = (profile && categories.length > 0)
    ? checkRecategorizacion(profile.category_code, annualIncome, categories, profile.activity_type)
    : null

  const suggestedCat = suggestMonotributoCategory(parseFloat(formAnnualRevenue) || 0, categories, formActivityType)
  const simCat       = simRevenue ? suggestMonotributoCategory(parseFloat(simRevenue) || 0, categories, simActivity) : null
  const simQuota     = simCat ? calculateMonotributoQuota(simCat, simActivity) : null

  const now        = currentPeriod()
  const daysLeft   = daysToNextDue(now)
  const nowOverdue = isPeriodOverdue(now)
  const nowPayment = payments.find(p => p.period === now)

  const selPayment = payments.find(p => p.period === selectedPeriod)
  const moraInfo   = quota ? calculateMora(quota.total, selectedPeriod) : null

  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label:  `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    }
  })

  const maxCatLimit = categories.length > 0 ? Math.max(...categories.map(c => c.max_annual_income)) : 0

  async function handleSetupProfile() {
    if (!user || !suggestedCat) { setError('Completá los datos para continuar.'); return }
    setSaving(true); setError(null)
    try {
      const db = supabase as any
      const payload = {
        user_id: user.id, category_code: suggestedCat.category_code,
        activity_type: formActivityType, estimated_annual_revenue: parseFloat(formAnnualRevenue) || 0,
        start_date: formStartDate, current_since: formStartDate, status: 'active',
      }
      if (profile) await db.from('monotributo_profiles').update(payload).eq('id', profile.id)
      else         await db.from('monotributo_profiles').insert(payload)
      setSuccess('Perfil monotributista configurado.')
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  async function handleRecategorize(newCode: string) {
    if (!user || !profile) return
    setSaving(true); setError(null)
    try {
      await (supabase as any).from('monotributo_profiles')
        .update({ category_code: newCode, current_since: new Date().toISOString().split('T')[0] })
        .eq('id', profile.id)
      setSuccess(`Recategorizado a Categoría ${newCode}.`)
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  async function handlePayQuota() {
    if (!user || !quota || !currentCat) return
    if (selPayment?.status === 'paid') { setError('Este período ya está pagado.'); return }
    setSaving(true); setError(null); setSuccess(null)
    try {
      const db   = supabase as any
      const mora = calculateMora(quota.total, selectedPeriod)
      const due  = `${selectedPeriod}-20`
      const existing = await db.from('monotributo_payments')
        .select('id').eq('user_id', user.id).eq('period', selectedPeriod).maybeSingle()

      const payPayload = {
        user_id: user.id, period: selectedPeriod, period_label: formatPeriod(selectedPeriod),
        due_date: due, category_code: currentCat.category_code,
        tax_component: quota.taxComponent, sipa_component: quota.sipaComponent,
        obra_social_component: quota.obraSocialComponent, total_amount: quota.total,
        surcharge: mora.surcharge, status: 'paid', paid_at: new Date().toISOString(),
      }
      if (existing.data) await db.from('monotributo_payments').update(payPayload).eq('id', existing.data.id)
      else               await db.from('monotributo_payments').insert(payPayload)

      await db.from('simulated_veps').insert({
        user_id: user.id, vep_number: generateVepNumber(), obligation_type: 'monotributo',
        concept: `Monotributo Cat. ${currentCat.category_code} — ${formatPeriod(selectedPeriod)}${mora.surcharge > 0 ? ` (+mora)` : ''}`,
        period: selectedPeriod, amount: mora.totalWithMora, due_date: due,
        payment_method: paymentMethod, status: 'paid', paid_at: new Date().toISOString(),
        comprobante_number: generateComprobanteNumber(),
      })

      setSuccess(mora.surcharge > 0
        ? `Cuota ${formatPeriod(selectedPeriod)}: ${formatCurrency(mora.totalWithMora)} (${mora.daysLate} días mora)`
        : `Cuota ${formatPeriod(selectedPeriod)}: ${formatCurrency(quota.total)} ✓`)
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'situacion',  label: 'Mi Situación', icon: <BarChart3  className="w-3.5 h-3.5" /> },
    { id: 'cuotas',     label: 'Cuotas',        icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'tabla',      label: 'Tabla',          icon: <FileText   className="w-3.5 h-3.5" /> },
    { id: 'simulador',  label: 'Simulador',      icon: <Calculator className="w-3.5 h-3.5" /> },
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Disclaimer */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium">SIMULADOR DIDÁCTICO — SIN VALIDEZ FISCAL NI LEGAL</p>
        <Link href="/monotributo" className="ml-auto text-xs font-semibold text-amber-700 hover:underline flex items-center gap-1 whitespace-nowrap">
          Abrir en página completa <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {error   && <Alert variant="error"   className="mb-1">{error}</Alert>}
      {success && <Alert variant="success" className="mb-1">{success}</Alert>}

      {/* ── WIZARD (sin perfil) ── */}
      {!profile && (
        <Card padding="md">
          <h3 className="font-bold text-slate-800 mb-1">Configurar perfil Monotributista</h3>
          <p className="text-xs text-slate-500 mb-4">Ingresá tus datos para determinar la categoría según ingresos brutos anuales.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { icon: '💰', label: 'Ingresos anuales' },
              { icon: '📐', label: 'Superficie (m²)' },
              { icon: '⚡', label: 'Energía (kWh/año)' },
              { icon: '🏠', label: 'Alquileres anuales' },
            ].map(item => (
              <div key={item.label} className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
                <p className="text-base mb-0.5">{item.icon}</p>
                <p className="text-[10px] text-blue-700 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mb-4">El parámetro más elevado determina la categoría (art. 8 Ley 26565).</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de actividad</label>
              <select value={formActivityType} onChange={e => setFormActivityType(e.target.value as 'servicios' | 'bienes')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="servicios">Prestación de servicios</option>
                <option value="bienes">Venta de bienes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ingresos brutos anuales ($)</label>
              <input type="number" min="0" value={formAnnualRevenue} onChange={e => setFormAnnualRevenue(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Ej: 15.000.000" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Inicio de actividad</label>
              <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>

          {formAnnualRevenue && (
            <div className={cn('p-4 rounded-xl border-2 mb-4', suggestedCat ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300')}>
              {suggestedCat ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl font-black text-emerald-700">{suggestedCat.category_code}</span>
                    <div>
                      <p className="font-bold text-emerald-800">Categoría sugerida</p>
                      <p className="text-xs text-emerald-600">Límite: {formatCurrency(suggestedCat.max_annual_income)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Impuesto integrado', val: formActivityType === 'servicios' ? suggestedCat.monthly_tax_services : suggestedCat.monthly_tax_goods },
                      { label: 'SIPA', val: suggestedCat.monthly_sipa },
                      { label: 'Obra social', val: suggestedCat.monthly_obra_social },
                    ].map(item => (
                      <div key={item.label} className="bg-white rounded-lg p-2 text-center border border-emerald-200">
                        <p className="text-[10px] text-slate-500">{item.label}</p>
                        <p className="text-sm font-bold">{formatCurrency(item.val)}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-bold text-emerald-700 mt-2 text-center">
                    Cuota total: {formatCurrency(formActivityType === 'servicios' ? suggestedCat.monthly_total_services : suggestedCat.monthly_total_goods)}/mes
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-red-800 mb-1">⚠ Supera el límite del Monotributo</p>
                  <p className="text-xs text-red-700">Ingresos superiores al tope Cat. K ({formatCurrency(maxCatLimit)}). Inscribite como Responsable Inscripto.</p>
                </>
              )}
            </div>
          )}

          <Button size="sm" onClick={handleSetupProfile} loading={saving} disabled={!suggestedCat || !formAnnualRevenue}>
            Confirmar categoría y guardar perfil
          </Button>
        </Card>
      )}

      {/* ── DASHBOARD ── */}
      {profile && currentCat && quota && (<>

        {/* Alerta vencimiento */}
        {nowPayment?.status !== 'paid' && (
          <div className={cn('px-4 py-3 rounded-xl border-2 flex items-center gap-3',
            nowOverdue ? 'bg-red-50 border-red-300' : daysLeft <= 3 ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-200')}>
            <Clock className={cn('w-4 h-4 flex-shrink-0', nowOverdue ? 'text-red-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-blue-500')} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-bold', nowOverdue ? 'text-red-800' : daysLeft <= 3 ? 'text-amber-800' : 'text-blue-800')}>
                {nowOverdue
                  ? `Cuota ${formatPeriod(now)} VENCIDA — ${Math.abs(daysLeft)} días de mora`
                  : `Cuota ${formatPeriod(now)} vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''} (día 20)`}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {nowOverdue
                  ? `Recargo estimado: ${formatCurrency(calculateMora(quota.total, now).surcharge)} — art. 37 Ley 11683`
                  : 'Transferencia, débito automático o pago electrónico'
                }
              </p>
            </div>
            <button onClick={() => { setTab('cuotas'); setSelectedPeriod(now) }}
              className={cn('text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap text-white', nowOverdue ? 'bg-red-600' : 'bg-blue-600')}>
              Pagar →
            </button>
          </div>
        )}
        {nowPayment?.status === 'paid' && (
          <div className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <p className="text-sm text-emerald-700 font-medium">Cuota {formatPeriod(now)} pagada ✓</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all',
                tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              {t.icon}<span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ══ TAB: MI SITUACIÓN ══ */}
        {tab === 'situacion' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card padding="md" className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
                <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-2">CATEGORÍA ACTUAL</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-5xl font-black text-primary-700">{currentCat.category_code}</span>
                  <span className="text-xs text-primary-500">Monotributo</span>
                </div>
                <p className="text-xs text-slate-600 mb-1">{profile.activity_type === 'servicios' ? 'Prestación de servicios' : 'Venta de bienes'}</p>
                <p className="text-[10px] text-slate-400">Desde {formatDate(profile.current_since)}</p>
                <p className="text-[10px] text-slate-400">Próx. recategorización: {nextRecategorizationDate()}</p>
                <div className="mt-3 flex gap-2">
                  <Link href="/monotributo/constancia"
                    className="flex items-center gap-1 text-[10px] font-bold text-primary-700 hover:text-primary-900 bg-white border border-primary-200 px-2 py-1 rounded-lg">
                    <Award className="w-3 h-3" /> Constancia
                  </Link>
                </div>
              </Card>

              <Card padding="md" className="sm:col-span-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  CUOTA MENSUAL — {formatCurrency(quota.total)}
                </p>
                <div className="space-y-2.5">
                  {[
                    { label: 'Impuesto integrado', sub: 'Reemplaza IVA + Ganancias', amount: quota.taxComponent, pct: quota.taxPct, color: 'bg-primary-500' },
                    { label: 'SIPA', sub: 'Jubilación y retiro', amount: quota.sipaComponent, pct: quota.sipaPct, color: 'bg-blue-500' },
                    { label: 'Obra social', sub: 'Cobertura de salud', amount: quota.obraSocialComponent, pct: quota.osPct, color: 'bg-emerald-500' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between items-baseline mb-0.5">
                        <div>
                          <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">{item.sub}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-800">{formatCurrency(item.amount)}</span>
                          <span className="text-[10px] text-slate-400 ml-1">{item.pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', item.color)} style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-3 text-center">Vencimiento: día 20 de cada mes</p>
              </Card>
            </div>

            {/* Barra de facturación */}
            <Card padding="md">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">FACTURACIÓN ANUAL — últimos 12 meses</p>
                  <p className="text-xs text-slate-400 mt-0.5">Base para recategorización</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-slate-800">{formatCurrency(annualIncome)}</p>
                  <p className="text-[10px] text-slate-400">de {formatCurrency(currentCat.max_annual_income)}</p>
                </div>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden mb-1">
                <div
                  className={cn('h-full rounded-full transition-all',
                    (recatResult?.percentUsed ?? 0) >= 100 ? 'bg-red-500' :
                    (recatResult?.percentUsed ?? 0) >= 80  ? 'bg-amber-500' : 'bg-emerald-500')}
                  style={{ width: `${Math.min(recatResult?.percentUsed ?? 0, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {recatResult?.percentUsed ?? 0}% del límite · Margen: {formatCurrency(Math.max(0, currentCat.max_annual_income - annualIncome))}
              </p>
            </Card>

            {/* Alerta recategorización */}
            {recatResult?.shouldRecategorize && (
              <div className={cn('p-4 rounded-xl border-2',
                recatResult.direction === 'exclude' || recatResult.percentUsed >= 100
                  ? 'bg-red-50 border-red-400' : 'bg-amber-50 border-amber-300')}>
                <div className="flex items-start gap-3">
                  {recatResult.direction === 'exclude'
                    ? <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    : recatResult.direction === 'up'
                    ? <ArrowUpRight className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    : <ArrowDownRight className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className={cn('text-sm font-bold mb-1',
                      recatResult.direction === 'exclude' || recatResult.percentUsed >= 100 ? 'text-red-800' : 'text-amber-800')}>
                      {recatResult.direction === 'exclude' ? '🚨 EXCLUSIÓN DEL MONOTRIBUTO' :
                       recatResult.direction === 'up'      ? '⬆ Recategorización recomendada' :
                                                             '⬇ Podés bajar de categoría'}
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{recatResult.reason}</p>
                    {recatResult.suggestedCategory && recatResult.suggestedCategory !== profile.category_code && (
                      <Button size="sm" className="mt-3" onClick={() => handleRecategorize(recatResult.suggestedCategory!)} loading={saving}>
                        Recategorizar a {recatResult.suggestedCategory}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Card padding="md" className="bg-slate-50 border-slate-200">
              <div className="flex gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-slate-700">Recategorización semestral</p>
              </div>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside leading-relaxed">
                <li>Se realiza en <strong>enero y julio</strong> de cada año</li>
                <li>Se evalúan los ingresos de los últimos <strong>12 meses corridos</strong></li>
                <li>Superar la Categoría K implica <strong>exclusión automática</strong> del régimen</li>
                <li>Bajo Monotributo <strong>no presentás DDJJ de IVA ni Ganancias</strong></li>
              </ul>
            </Card>
          </div>
        )}

        {/* ══ TAB: CUOTAS ══ */}
        {tab === 'cuotas' && (
          <div className="space-y-4">
            <Card padding="md">
              <p className="text-sm font-bold text-slate-700 mb-4">Pago de cuota mensual</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Período</label>
                  <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                    {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Medio de pago</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    disabled={selPayment?.status === 'paid'}>
                    <option value="transferencia">Transferencia bancaria</option>
                    <option value="debito_automatico">Débito automático</option>
                    <option value="pago_electronico">Pago electrónico</option>
                  </select>
                </div>
              </div>

              {selPayment?.status !== 'paid' && moraInfo && (
                <div className={cn('p-4 rounded-xl mb-4 border', moraInfo.daysLate > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200')}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">DETALLE DEL PAGO</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Cuota Cat. {currentCat.category_code} — {formatPeriod(selectedPeriod)}</span>
                      <span className="font-semibold">{formatCurrency(quota.total)}</span>
                    </div>
                    {moraInfo.daysLate > 0 && (
                      <div className="flex justify-between text-red-700">
                        <span>Mora {moraInfo.daysLate} días × 3%/mes (art. 37 L.11683)</span>
                        <span className="font-semibold">+ {formatCurrency(moraInfo.surcharge)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t border-slate-200 pt-1.5">
                      <span>TOTAL</span>
                      <span className="text-base">{formatCurrency(moraInfo.totalWithMora)}</span>
                    </div>
                  </div>
                </div>
              )}

              {selPayment?.status === 'paid' ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm text-emerald-700 font-semibold">
                      Pagado el {formatDate(selPayment.paid_at!)}
                      {selPayment.surcharge > 0 && ` · Mora: ${formatCurrency(selPayment.surcharge)}`}
                    </p>
                  </div>
                  {/* Botón PDF comprobante */}
                  <Link href={`/monotributo/comprobante/${selectedPeriod}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg">
                    <Download className="w-3.5 h-3.5" /> Comprobante PDF
                  </Link>
                </div>
              ) : (
                <Button onClick={handlePayQuota} loading={saving}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pagar {moraInfo ? formatCurrency(moraInfo.totalWithMora) : '...'}
                  {moraInfo && moraInfo.daysLate > 0 && ' (con mora)'}
                </Button>
              )}
            </Card>

            {/* Historial */}
            <Card padding="md">
              <p className="text-sm font-bold text-slate-700 mb-3">Historial de cuotas</p>
              {payments.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No hay cuotas registradas aún.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 font-semibold text-slate-500">Período</th>
                        <th className="text-center py-2 font-semibold text-slate-500">Cat.</th>
                        <th className="text-right py-2 font-semibold text-slate-500">Cuota</th>
                        <th className="text-right py-2 font-semibold text-slate-500">Mora</th>
                        <th className="text-right py-2 font-semibold text-slate-500">Total</th>
                        <th className="text-center py-2 font-semibold text-slate-500">Estado</th>
                        <th className="text-center py-2 font-semibold text-slate-500">PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 font-medium text-slate-700">{p.period_label}</td>
                          <td className="py-2 text-center text-slate-500">{p.category_code}</td>
                          <td className="py-2 text-right text-slate-700">{formatCurrency(p.total_amount)}</td>
                          <td className="py-2 text-right text-red-600">{p.surcharge > 0 ? formatCurrency(p.surcharge) : '—'}</td>
                          <td className="py-2 text-right font-semibold">{formatCurrency(p.total_amount + p.surcharge)}</td>
                          <td className="py-2 text-center">
                            <span className={cn('px-2 py-0.5 rounded-full font-bold text-[10px]',
                              p.status === 'paid'    ? 'bg-emerald-100 text-emerald-700' :
                              p.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                              {p.status === 'paid' ? 'Pagado' : p.status === 'overdue' ? 'Vencido' : 'Pendiente'}
                            </span>
                          </td>
                          <td className="py-2 text-center">
                            {p.status === 'paid' && (
                              <Link href={`/monotributo/comprobante/${p.period}`}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary-700 hover:text-primary-900 bg-primary-50 border border-primary-200 px-2 py-1 rounded">
                                <Download className="w-3 h-3" /> PDF
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ══ TAB: TABLA ══ */}
        {tab === 'tabla' && (
          <div className="space-y-4">
            <Card padding="md">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-slate-700">Escala de categorías — Régimen ARCA 2026</p>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Valores orientativos</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Actualizadas trimestralmente según RIPTE. El parámetro más elevado determina la categoría.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-2 px-2 font-bold text-slate-600">Cat.</th>
                      <th className="text-right py-2 px-2 font-bold text-slate-600">Ingresos anuales</th>
                      <th className="text-right py-2 px-2 font-bold text-slate-600">Sup. (m²)</th>
                      <th className="text-right py-2 px-2 font-bold text-slate-600">Energía (kWh)</th>
                      <th className="text-right py-2 px-2 font-bold text-slate-600">Cuota servicios</th>
                      <th className="text-right py-2 px-2 font-bold text-slate-600">Cuota bienes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => {
                      const isCurrent = cat.category_code === profile.category_code
                      return (
                        <tr key={cat.id} className={cn('border-b border-slate-100', isCurrent ? 'bg-primary-50' : 'hover:bg-slate-50')}>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1.5">
                              <span className={cn('font-black text-sm', isCurrent ? 'text-primary-700' : 'text-slate-700')}>{cat.category_code}</span>
                              {isCurrent && <span className="text-[9px] font-bold bg-primary-600 text-white px-1.5 py-0.5 rounded">ACTUAL</span>}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right text-slate-700">{formatCurrency(cat.max_annual_income)}</td>
                          <td className="py-2 px-2 text-right text-slate-500">{cat.max_surface ?? '—'}</td>
                          <td className="py-2 px-2 text-right text-slate-500">{cat.max_energy ? cat.max_energy.toLocaleString('es-AR') : '—'}</td>
                          <td className="py-2 px-2 text-right font-medium text-slate-800">{formatCurrency(cat.monthly_total_services)}</td>
                          <td className="py-2 px-2 text-right font-medium text-slate-800">{formatCurrency(cat.monthly_total_goods)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card padding="md" className="bg-red-50 border-red-200">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-red-800 mb-1">Exclusión del Monotributo (art. 21 Ley 26565)</p>
                  <p className="text-xs text-red-700">
                    Superar {formatCurrency(maxCatLimit)} (Cat. K) implica exclusión automática. Debés darte de baja, inscribirte en IVA y Ganancias, y emitir Facturas A/B.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ══ TAB: SIMULADOR ══ */}
        {tab === 'simulador' && (
          <div className="space-y-4">
            <Card padding="md">
              <p className="text-sm font-bold text-slate-700 mb-1">Simulador de categoría</p>
              <p className="text-xs text-slate-500 mb-4">Calculá qué categoría y cuota correspondería a cualquier nivel de ingresos.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ingresos brutos anuales ($)</label>
                  <input type="number" min="0" value={simRevenue} onChange={e => setSimRevenue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Ej: 25.000.000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de actividad</label>
                  <select value={simActivity} onChange={e => setSimActivity(e.target.value as 'servicios' | 'bienes')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                    <option value="servicios">Prestación de servicios</option>
                    <option value="bienes">Venta de bienes</option>
                  </select>
                </div>
              </div>

              {simRevenue && (simCat && simQuota ? (
                <div className="space-y-3">
                  <div className={cn('p-4 rounded-xl border-2', simCat.category_code === profile.category_code ? 'bg-primary-50 border-primary-300' : 'bg-slate-50 border-slate-300')}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-4xl font-black text-slate-700">{simCat.category_code}</span>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{simCat.label}</p>
                        <p className="text-xs text-slate-500">Límite: {formatCurrency(simCat.max_annual_income)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: 'Impuesto', val: simQuota.taxComponent },
                        { label: 'SIPA', val: simQuota.sipaComponent },
                        { label: 'Obra social', val: simQuota.obraSocialComponent },
                        { label: 'TOTAL/MES', val: simQuota.total, highlight: true },
                      ].map(item => (
                        <div key={item.label} className={cn('rounded-lg p-2 border', item.highlight ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-200')}>
                          <p className={cn('text-[10px]', item.highlight ? 'text-primary-600 font-bold' : 'text-slate-500')}>{item.label}</p>
                          <p className={cn('text-sm font-bold', item.highlight ? 'text-primary-800' : 'text-slate-800')}>{formatCurrency(item.val)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {simCat.category_code !== profile.category_code && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs">
                      <span className="text-slate-600">Cuota actual ({currentCat.category_code}): {formatCurrency(quota.total)}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span className="font-bold text-blue-800">Simulada ({simCat.category_code}): {formatCurrency(simQuota.total)}</span>
                      <span className={cn('font-bold ml-auto', simQuota.total > quota.total ? 'text-red-600' : 'text-emerald-600')}>
                        {simQuota.total > quota.total ? '+' : ''}{formatCurrency(simQuota.total - quota.total)}/mes
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl">
                  <p className="font-bold text-red-800 mb-1">🚨 Excede el límite del Monotributo</p>
                  <p className="text-xs text-red-700">
                    Con {formatCurrency(parseFloat(simRevenue))} superás el tope Cat. K. Debés inscribirte como Responsable Inscripto.
                  </p>
                </div>
              ))}

              {!simRevenue && (
                <div className="text-center py-6">
                  <Calculator className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Ingresá un monto anual para ver la categoría sugerida</p>
                </div>
              )}
            </Card>
          </div>
        )}
      </>)}
    </div>
  )
}
