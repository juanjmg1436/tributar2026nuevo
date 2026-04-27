'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { useRegime } from '@/hooks/useRegime'
import { RegimeGate } from '@/components/ui/RegimeGate'
import { formatCurrency, formatDate } from '@/lib/utils'
import { suggestMonotributoCategory, calculateMonotributoQuota, checkRecategorizacion } from '@/lib/fiscal-engine/monotributo'
import { formatPeriod, currentPeriod, generateVepNumber, generateComprobanteNumber } from '@/lib/fiscal-engine'
import type { MonotributoDemoCategory, MonotributoProfile, MonotributoPayment } from '@/types/fiscal'
import { AlertTriangle, Info, CheckCircle, CreditCard, TrendingUp, RefreshCw, Zap } from 'lucide-react'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function MonotributoPage() {
  const { user, loading: userLoading } = useUser()
  const regime = useRegime()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [step, setStep] = useState<'check' | 'setup' | 'dashboard'>('check')

  const [categories, setCategories] = useState<MonotributoDemoCategory[]>([])
  const [profile, setProfile] = useState<MonotributoProfile | null>(null)
  const [payments, setPayments] = useState<MonotributoPayment[]>([])

  // Formulario de alta
  const [formActivityType, setFormActivityType] = useState<'servicios' | 'bienes'>('servicios')
  const [formAnnualRevenue, setFormAnnualRevenue] = useState('')
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0])

  // Pago mensual
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod())
  const [paymentMethod, setPaymentMethod] = useState('transferencia')

  useEffect(() => { if (!user) return; loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const db = supabase as any
    const [catRes, profRes, payRes] = await Promise.all([
      db.from('monotributo_demo_categories').select('*').eq('is_active', true).order('max_annual_income'),
      db.from('monotributo_profiles').select('*').eq('user_id', user!.id).maybeSingle(),
      db.from('monotributo_payments').select('*').eq('user_id', user!.id).order('period', { ascending: false }).limit(12),
    ])
    setCategories(catRes.data || [])
    setProfile(profRes.data || null)
    setPayments(payRes.data || [])
    setStep(profRes.data ? 'dashboard' : 'check')
    setLoading(false)
  }

  const suggestedCat = suggestMonotributoCategory(parseFloat(formAnnualRevenue) || 0, categories, formActivityType)
  const currentCat = profile ? categories.find(c => c.category_code === profile.category_code) : null
  const quota = currentCat ? calculateMonotributoQuota(currentCat, profile?.activity_type || 'servicios') : null

  // Acumulado últimos 12 meses (sum de payments pagados)
  const accumulated = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.total_amount, 0)
  const recatResult = profile && categories.length > 0 ? checkRecategorizacion(
    profile.category_code,
    accumulated,
    categories,
    profile.activity_type
  ) : null

  async function handleSetupProfile() {
    if (!user || !suggestedCat) { setError('Completá los datos para continuar.'); return }
    setSaving(true); setError(null)
    try {
      const db = supabase as any
      const payload = {
        user_id: user.id,
        category_code: suggestedCat.category_code,
        activity_type: formActivityType,
        estimated_annual_revenue: parseFloat(formAnnualRevenue) || 0,
        start_date: formStartDate,
        current_since: formStartDate,
        status: 'active',
      }
      if (profile) {
        await db.from('monotributo_profiles').update(payload).eq('id', profile.id)
      } else {
        await db.from('monotributo_profiles').insert(payload)
      }
      setSuccess('Perfil monotributista configurado.')
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  async function handleRecategorize(newCode: string) {
    if (!user || !profile) return
    setSaving(true); setError(null)
    try {
      await (supabase as any).from('monotributo_profiles').update({
        category_code: newCode,
        current_since: new Date().toISOString().split('T')[0],
      }).eq('id', profile.id)
      setSuccess(`Recategorizado a Categoría ${newCode}.`)
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  async function handlePayQuota() {
    if (!user || !quota || !currentCat) return
    setSaving(true); setError(null); setSuccess(null)
    try {
      const db = supabase as any
      const existing = await db.from('monotributo_payments').select('*').eq('user_id', user.id).eq('period', selectedPeriod).maybeSingle()
      const dueDate = `${selectedPeriod.split('-')[0]}-${selectedPeriod.split('-')[1]}-20`

      if (existing.data && existing.data.status === 'paid') {
        setError('Este período ya está pagado.')
        setSaving(false)
        return
      }

      const payPayload = {
        user_id: user.id,
        period: selectedPeriod,
        period_label: formatPeriod(selectedPeriod),
        due_date: dueDate,
        category_code: currentCat.category_code,
        tax_component: quota.taxComponent,
        sipa_component: quota.sipaComponent,
        obra_social_component: quota.obraSocialComponent,
        total_amount: quota.total,
        surcharge: 0,
        status: 'paid',
        paid_at: new Date().toISOString(),
      }

      const vepPayload = {
        user_id: user.id,
        vep_number: generateVepNumber(),
        obligation_type: 'monotributo',
        concept: `Monotributo Categoría ${currentCat.category_code} — ${formatPeriod(selectedPeriod)}`,
        period: selectedPeriod,
        amount: quota.total,
        due_date: dueDate,
        payment_method: paymentMethod,
        status: 'paid',
        paid_at: new Date().toISOString(),
        comprobante_number: generateComprobanteNumber(),
      }

      if (existing.data) {
        await db.from('monotributo_payments').update(payPayload).eq('id', existing.data.id)
      } else {
        await db.from('monotributo_payments').insert(payPayload)
      }
      await db.from('simulated_veps').insert(vepPayload)

      setSuccess(`Cuota de ${formatPeriod(selectedPeriod)} pagada: ${formatCurrency(quota.total)}`)
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { value: val, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` }
  })

  const periodPayment = payments.find(p => p.period === selectedPeriod)

  if (userLoading || loading || regime.loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer title="Monotributo" subtitle="Categorías, cuotas mensuales y recategorización (simulación didáctica)">
      {!regime.canUseMonotributo && (
        <RegimeGate
          moduleName="Monotributo"
          reason={regime.monotributoBlockReason!}
          currentRegime={regime.label}
          alternativeHref="/iva"
          alternativeLabel="Ir a DDJJ IVA →"
        />
      )}
      {regime.canUseMonotributo && (<>
      {/* Disclaimer */}
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {/* Info pedagógica */}
      <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>¿Qué es el Monotributo?</strong> Régimen simplificado que unifica en una cuota mensual el impuesto a las ganancias, el IVA y las cargas previsionales.
          La categoría se determina por la facturación anual acumulada. Cada semestre (enero y julio) se debe <em>recategorizar</em> si los ingresos cambiaron significativamente.
          Las 11 categorías (A a K) tienen montos actualizados por ARCA periódicamente.
        </p>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      {/* Sin perfil: wizard */}
      {!profile && (
        <Card padding="md" className="mb-5 border-primary-200 bg-primary-50/20">
          <h3 className="font-semibold text-slate-700 mb-1">Configurar perfil Monotributista</h3>
          <p className="text-xs text-slate-500 mb-4">Ingresá tus datos para determinar tu categoría según facturación anual estimada.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de actividad</label>
              <select value={formActivityType} onChange={e => setFormActivityType(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="servicios">Servicios</option>
                <option value="bienes">Venta de bienes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Facturación anual estimada ($)</label>
              <input type="number" min="0" value={formAnnualRevenue} onChange={e => setFormAnnualRevenue(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Ej: 3500000" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de inicio</label>
              <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
          {suggestedCat && formAnnualRevenue && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-sm font-bold text-emerald-700">
                Categoría sugerida: <span className="text-lg">{suggestedCat.category_code}</span> — {suggestedCat.label}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Límite anual: {formatCurrency(suggestedCat.max_annual_income)} · Cuota mensual: {formatCurrency(formActivityType === 'servicios' ? suggestedCat.monthly_total_services : suggestedCat.monthly_total_goods)}
              </p>
            </div>
          )}
          {!suggestedCat && formAnnualRevenue && parseFloat(formAnnualRevenue) > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm font-semibold text-red-700">Tu facturación supera el límite del Monotributo. Debés inscribirte como Responsable Inscripto.</p>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={handleSetupProfile} loading={saving} disabled={!suggestedCat}>
              Confirmar categoría
            </Button>
          </div>
        </Card>
      )}

      {/* Con perfil: dashboard */}
      {profile && currentCat && quota && (
        <>
          {/* Categoría actual */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
            <Card padding="md" className="sm:col-span-2 bg-primary-50 border-primary-200">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Categoría actual</p>
              <p className="text-3xl font-black text-primary-700">{currentCat.category_code}</p>
              <p className="text-sm text-slate-600">{currentCat.label}</p>
              <p className="text-xs text-slate-400 mt-1">Vigente desde: {formatDate(profile.current_since)}</p>
              <p className="text-xs text-slate-400">Actividad: {profile.activity_type}</p>
            </Card>
            <Card padding="md" className="text-center">
              <p className="text-xs font-semibold text-slate-500 mb-1">Cuota mensual</p>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(quota.total)}</p>
              <p className="text-xs text-slate-400 mt-1">Impuesto: {formatCurrency(quota.taxComponent)}</p>
              <p className="text-xs text-slate-400">SIPA: {formatCurrency(quota.sipaComponent)}</p>
              <p className="text-xs text-slate-400">Obra social: {formatCurrency(quota.obraSocialComponent)}</p>
            </Card>
            <Card padding="md" className="text-center">
              <p className="text-xs font-semibold text-slate-500 mb-1">Límite anual</p>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(currentCat.max_annual_income)}</p>
              <p className="text-xs text-slate-400 mt-1">Facturado (aprox):</p>
              <p className="text-sm font-semibold text-slate-700">{formatCurrency(accumulated)}</p>
            </Card>
          </div>

          {/* Alerta recategorización */}
          {recatResult && recatResult.shouldRecategorize && (
            <div className={`mb-5 p-4 rounded-xl border-2 ${recatResult.percentUsed >= 100 ? 'bg-red-50 border-red-400' : 'bg-amber-50 border-amber-400'}`}>
              <div className="flex items-start gap-3">
                <Zap className={`w-5 h-5 mt-0.5 ${recatResult.percentUsed >= 100 ? 'text-red-500' : 'text-amber-500'}`} />
                <div className="flex-1">
                  <p className={`text-sm font-bold ${recatResult.percentUsed >= 100 ? 'text-red-700' : 'text-amber-700'}`}>
                    {recatResult.percentUsed >= 100 ? '⚠ RECATEGORIZACIÓN OBLIGATORIA' : '📋 Revisión de categoría sugerida'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">{recatResult.reason}</p>
                  <div className="mt-2 bg-white bg-opacity-60 rounded-lg h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-lg ${recatResult.percentUsed >= 100 ? 'bg-red-500' : recatResult.percentUsed >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(recatResult.percentUsed, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{recatResult.percentUsed}% del límite utilizado</p>
                  {recatResult.suggestedCategory && recatResult.suggestedCategory !== profile.category_code && (
                    <Button size="sm" className="mt-3" onClick={() => handleRecategorize(recatResult.suggestedCategory!)} loading={saving}>
                      Recategorizar a {recatResult.suggestedCategory}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pago mensual */}
          <Card padding="md" className="mb-5">
            <p className="text-sm font-semibold text-slate-700 mb-4">Pago de cuota mensual</p>
            <div className="flex flex-wrap gap-3 items-end mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Período</label>
                <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                  {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Medio de pago</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm" disabled={periodPayment?.status === 'paid'}>
                  <option value="transferencia">Transferencia</option>
                  <option value="debito_automatico">Débito automático</option>
                  <option value="pago_electronico">Pago electrónico</option>
                </select>
              </div>
              <Button
                size="sm"
                onClick={handlePayQuota}
                loading={saving}
                disabled={periodPayment?.status === 'paid'}
              >
                <CreditCard className="w-3.5 h-3.5 mr-1" />
                {periodPayment?.status === 'paid' ? `Pagado ✓` : `Pagar ${formatCurrency(quota.total)}`}
              </Button>
            </div>
            {periodPayment?.status === 'paid' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <p className="text-sm text-emerald-700 font-semibold">Cuota de {formatPeriod(selectedPeriod)} pagada el {formatDate(periodPayment.paid_at!)}</p>
              </div>
            )}
          </Card>

          {/* Historial de pagos */}
          {payments.length > 0 && (
            <Card padding="md" className="mb-5">
              <p className="text-sm font-semibold text-slate-700 mb-3">Historial de cuotas</p>
              <div className="space-y-1">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">{p.period_label}</span>
                    <span className="text-slate-400">Cat. {p.category_code}</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(p.total_amount)}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold ${
                      p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      p.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {p.status === 'paid' ? 'Pagado' : p.status === 'overdue' ? 'Vencido' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tabla de categorías */}
          <Card padding="md" className="mb-5">
            <p className="text-sm font-semibold text-slate-700 mb-3">Tabla de categorías 2026 (demo)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-2 font-semibold text-slate-600">Cat.</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600">Límite anual</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600">Cuota servicios</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600">Cuota bienes</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id} className={`border-b border-slate-100 ${cat.category_code === profile.category_code ? 'bg-primary-50 font-semibold' : ''}`}>
                      <td className="py-1.5 px-2 font-bold text-slate-800">{cat.category_code}</td>
                      <td className="py-1.5 px-2 text-right text-slate-700">{formatCurrency(cat.max_annual_income)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-700">{formatCurrency(cat.monthly_total_services)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-700">{formatCurrency(cat.monthly_total_goods)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Cambiar perfil */}
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => { setProfile(null); setStep('check') }}>
              Cambiar configuración
            </Button>
            <a href="/estado-fiscal"><Button variant="outline" size="sm">Estado fiscal integral →</Button></a>
          </div>
        </>
      )}
      </>)}
    </PageContainer>
  )
}
