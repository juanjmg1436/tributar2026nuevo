'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useFiscalParams } from '@/hooks/useFiscalParams'
import { calculateIncomeTax } from '@/lib/fiscal-engine/income-tax'
import { formatPeriod, currentPeriod, generateVepNumber, generateComprobanteNumber } from '@/lib/fiscal-engine'
import { AlertTriangle, Info, RefreshCw, CreditCard, ChevronDown, ChevronUp } from 'lucide-react'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function GananciasPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()
  const { params } = useFiscalParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(true)

  const currentYear = new Date().getFullYear()
  const [fiscalYear, setFiscalYear] = useState(currentYear)
  const [subjectType, setSubjectType] = useState<'persona_humana' | 'persona_juridica'>('persona_juridica')

  // Inputs manuales (en una DDJJ real se obtienen de la contabilidad)
  const [form, setForm] = useState({
    totalIncome: '',
    totalPurchases: '',
    salaryExpense: '',
    socialSecurityExpense: '',
    otherExpenses: '',
    advancePayments: '',
    withholdings: '',
    previousCredit: '',
    notes: '',
  })
  const [paymentMethod, setPaymentMethod] = useState('transferencia')

  const [existingReturn, setExistingReturn] = useState<any>(null)
  const [existingVep, setExistingVep] = useState<any>(null)

  const period = `${fiscalYear}-12` // DDJJ anual representada como período diciembre

  useEffect(() => { if (!user) return; loadData() }, [user, fiscalYear])

  async function loadData() {
    setLoading(true)
    const db = supabase as any
    const [retRes] = await Promise.all([
      db.from('income_tax_returns').select('*').eq('user_id', user!.id).eq('fiscal_year', fiscalYear).maybeSingle(),
    ])
    if (retRes.data) {
      const r = retRes.data
      setForm({
        totalIncome: String(r.total_income || ''),
        totalPurchases: String(r.total_purchases || ''),
        salaryExpense: String(r.salary_expense || ''),
        socialSecurityExpense: String(r.social_security_expense || ''),
        otherExpenses: String(r.other_expenses || ''),
        advancePayments: String(r.advance_payments || ''),
        withholdings: String(r.withholdings || ''),
        previousCredit: String(r.previous_credit || ''),
        notes: r.notes || '',
      })
      setSubjectType(r.subject_type || 'persona_juridica')
      setExistingReturn(r)
      const vepRes = await db.from('simulated_veps').select('*').eq('user_id', user!.id)
        .eq('obligation_type', 'ganancias').eq('period', String(fiscalYear)).maybeSingle()
      setExistingVep(vepRes.data)
    } else {
      setExistingReturn(null)
      setExistingVep(null)
    }
    setLoading(false)
  }

  const f = {
    totalIncome: parseFloat(form.totalIncome) || 0,
    totalPurchases: parseFloat(form.totalPurchases) || 0,
    salaryExpense: parseFloat(form.salaryExpense) || 0,
    socialSecurityExpense: parseFloat(form.socialSecurityExpense) || 0,
    otherExpenses: parseFloat(form.otherExpenses) || 0,
    advancePayments: parseFloat(form.advancePayments) || 0,
    withholdings: parseFloat(form.withholdings) || 0,
    previousCredit: parseFloat(form.previousCredit) || 0,
  }

  const calc = calculateIncomeTax({
    period,
    fiscalYear,
    ...f,
    subjectType,
    params,
  })

  const dueDate = `${fiscalYear + 1}-05-31` // vencimiento típico mayo del año siguiente

  async function handleSubmit() {
    if (!user) return
    setSaving(true); setError(null)
    try {
      const db = supabase as any
      const payload = {
        user_id: user.id,
        fiscal_year: fiscalYear,
        period,
        period_label: `Ejercicio ${fiscalYear}`,
        period_type: 'anual',
        due_date: dueDate,
        subject_type: subjectType,
        total_income: calc.totalIncome,
        total_purchases: calc.totalPurchases,
        salary_expense: calc.salaryExpense,
        social_security_expense: calc.socialSecurityExpense,
        other_expenses: calc.otherExpenses,
        gross_result: calc.grossResult,
        net_income: calc.netIncome,
        tax_rate: calc.taxRate,
        tax_determined: calc.taxDetermined,
        advance_payments: calc.advancePayments,
        withholdings: calc.withholdings,
        previous_credit: calc.previousCredit,
        net_payable: calc.netPayable,
        status: calc.netPayable > 0 ? 'submitted' : 'submitted',
        submitted_at: new Date().toISOString(),
        notes: form.notes || null,
      }
      if (existingReturn) {
        await db.from('income_tax_returns').update(payload).eq('id', existingReturn.id)
      } else {
        await db.from('income_tax_returns').insert(payload)
      }
      setSuccess('DDJJ Ganancias presentada (simulación).')
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  async function handleGenerateVep() {
    if (!user || !existingReturn) return
    setSaving(true); setError(null)
    try {
      const db = supabase as any
      const vepPayload = {
        user_id: user.id,
        vep_number: generateVepNumber(),
        obligation_type: 'ganancias',
        concept: `Impuesto a las Ganancias — Ejercicio ${fiscalYear}`,
        period: String(fiscalYear),
        amount: calc.netPayable,
        due_date: dueDate,
        payment_method: paymentMethod,
        status: 'pending',
        reference_id: existingReturn.id,
      }
      if (existingVep) {
        await db.from('simulated_veps').update(vepPayload).eq('id', existingVep.id)
      } else {
        await db.from('simulated_veps').insert(vepPayload)
      }
      setSuccess('VEP generado.')
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  async function handlePay() {
    if (!user || !existingVep) return
    setSaving(true); setError(null)
    try {
      const db = supabase as any
      const comp = generateComprobanteNumber()
      await db.from('simulated_veps').update({ status: 'paid', paid_at: new Date().toISOString(), comprobante_number: comp }).eq('id', existingVep.id)
      await db.from('income_tax_returns').update({ status: 'paid' }).eq('id', existingReturn.id)
      setSuccess(`Pago registrado. Comprobante: ${comp}`)
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  const isSubmitted = existingReturn?.status === 'submitted' || existingReturn?.status === 'paid'
  const isPaid = existingReturn?.status === 'paid'
  const vepPaid = existingVep?.status === 'paid'

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50'
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer title="Impuesto a las Ganancias" subtitle="DDJJ anual simplificada (simulación didáctica)">
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Impuesto a las Ganancias:</strong> Grava la renta neta (ingresos menos gastos deducibles).
          Para <em>personas jurídicas</em>: alícuota del {Math.round(params.ganancias_alicuota_juridica * 100)}% sobre la utilidad neta.
          Para <em>personas humanas</em>: escala progresiva (simplificada aquí al 35%) con Mínimo No Imponible (MNI) de {formatCurrency(params.ganancias_mni_mensual)}/mes.
          La DDJJ es <strong>anual</strong> (vence en mayo del año siguiente); los anticipos se pagan mensualmente.
        </p>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      {/* Año fiscal y tipo de sujeto */}
      <div className="flex flex-wrap gap-4 mb-5">
        <div>
          <label className="text-xs font-semibold text-slate-500 mr-2">Ejercicio fiscal:</label>
          <select value={fiscalYear} onChange={e => setFiscalYear(Number(e.target.value))} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mr-2">Tipo de sujeto:</label>
          <select value={subjectType} onChange={e => setSubjectType(e.target.value as any)} disabled={isPaid} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50">
            <option value="persona_juridica">Persona jurídica ({Math.round(params.ganancias_alicuota_juridica * 100)}%)</option>
            <option value="persona_humana">Persona humana (escala)</option>
          </select>
        </div>
        <button onClick={loadData} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg self-end"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Formulario de datos */}
      <Card padding="md" className="mb-5">
        <button className="w-full flex items-center justify-between text-sm font-semibold text-slate-700 mb-0" onClick={() => setShowDetail(!showDetail)}>
          <span>Datos del ejercicio {fiscalYear}</span>
          {showDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showDetail && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Ingresos totales del ejercicio ($)</label>
              <input type="number" min="0" value={form.totalIncome} onChange={e => setForm(f => ({...f, totalIncome: e.target.value}))} className={inputCls} disabled={isPaid} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Compras / Costo de ventas ($)</label>
              <input type="number" min="0" value={form.totalPurchases} onChange={e => setForm(f => ({...f, totalPurchases: e.target.value}))} className={inputCls} disabled={isPaid} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Resultado bruto</label>
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold">{formatCurrency(calc.grossResult)}</div>
            </div>
            <div>
              <label className={labelCls}>Sueldos pagados ($)</label>
              <input type="number" min="0" value={form.salaryExpense} onChange={e => setForm(f => ({...f, salaryExpense: e.target.value}))} className={inputCls} disabled={isPaid} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Cargas sociales patronales ($)</label>
              <input type="number" min="0" value={form.socialSecurityExpense} onChange={e => setForm(f => ({...f, socialSecurityExpense: e.target.value}))} className={inputCls} disabled={isPaid} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Otros gastos deducibles ($)</label>
              <input type="number" min="0" value={form.otherExpenses} onChange={e => setForm(f => ({...f, otherExpenses: e.target.value}))} className={inputCls} disabled={isPaid} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Anticipos ya pagados ($)</label>
              <input type="number" min="0" value={form.advancePayments} onChange={e => setForm(f => ({...f, advancePayments: e.target.value}))} className={inputCls} disabled={isPaid} placeholder="0.00" />
              <p className="text-[10px] text-slate-400 mt-0.5">Pagos a cuenta del {Math.round(params.ganancias_anticipo_pct * 100)}% mensual</p>
            </div>
            <div>
              <label className={labelCls}>Retenciones sufridas ($)</label>
              <input type="number" min="0" value={form.withholdings} onChange={e => setForm(f => ({...f, withholdings: e.target.value}))} className={inputCls} disabled={isPaid} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Saldo a favor ejercicio anterior ($)</label>
              <input type="number" min="0" value={form.previousCredit} onChange={e => setForm(f => ({...f, previousCredit: e.target.value}))} className={inputCls} disabled={isPaid} placeholder="0.00" />
            </div>
            <div className="sm:col-span-3">
              <label className={labelCls}>Observaciones</label>
              <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className={inputCls} disabled={isPaid} placeholder="Notas o justificación..." />
            </div>
          </div>
        )}
      </Card>

      {/* Resultado calculado */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Card padding="sm" className="text-center">
          <p className="text-xs text-slate-500 mb-0.5">Resultado bruto</p>
          <p className="text-lg font-bold text-slate-800">{formatCurrency(calc.grossResult)}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-xs text-slate-500 mb-0.5">Renta neta imponible</p>
          <p className="text-lg font-bold text-slate-800">{formatCurrency(calc.netIncome)}</p>
          <p className="text-[10px] text-slate-400">Alíc. {Math.round(calc.taxRate * 100)}%</p>
        </Card>
        <Card padding="sm" className="text-center bg-orange-50 border-orange-200">
          <p className="text-xs text-slate-500 mb-0.5">Impuesto determinado</p>
          <p className="text-lg font-bold text-orange-700">{formatCurrency(calc.taxDetermined)}</p>
        </Card>
        <Card padding="sm" className={`text-center ${calc.netPayable > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className="text-xs text-slate-500 mb-0.5">{calc.netPayable > 0 ? 'A ingresar' : 'Saldo a favor'}</p>
          <p className={`text-lg font-bold ${calc.netPayable > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatCurrency(calc.netPayable)}</p>
          <p className="text-[10px] text-slate-400">Vence: {formatDate(dueDate)}</p>
        </Card>
      </div>

      {/* Flujo */}
      <Card padding="md" className="mb-5">
        <p className="text-sm font-semibold text-slate-700 mb-4">Flujo: DDJJ → VEP → Pago</p>
        <div className="flex flex-wrap gap-3">
          <div className={`flex-1 min-w-[180px] p-3 rounded-xl border-2 ${isSubmitted ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isSubmitted ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>1</div>
              <p className="text-sm font-semibold text-slate-700">Presentar DDJJ</p>
            </div>
            <p className="text-xs text-slate-500 mb-3">Declara el resultado del ejercicio {fiscalYear}.</p>
            <Button size="sm" onClick={handleSubmit} loading={saving} disabled={isPaid} className="w-full">
              {isSubmitted ? 'Actualizar DDJJ' : 'Presentar DDJJ'}
            </Button>
          </div>

          {calc.netPayable > 0 && (
            <div className={`flex-1 min-w-[180px] p-3 rounded-xl border-2 ${existingVep ? 'border-blue-400 bg-blue-50' : isSubmitted ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${existingVep ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>2</div>
                <p className="text-sm font-semibold text-slate-700">Generar VEP</p>
              </div>
              <p className="text-xs text-slate-500 mb-2">VEP por {formatCurrency(calc.netPayable)}.</p>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded text-xs mb-2" disabled={!isSubmitted || vepPaid}>
                <option value="transferencia">Transferencia</option>
                <option value="debito_automatico">Débito automático</option>
              </select>
              <Button size="sm" variant="outline" onClick={handleGenerateVep} loading={saving} disabled={!isSubmitted || vepPaid} className="w-full">
                {existingVep ? `VEP: ${existingVep.vep_number?.slice(-8)}` : 'Generar VEP'}
              </Button>
            </div>
          )}

          {calc.netPayable > 0 && (
            <div className={`flex-1 min-w-[180px] p-3 rounded-xl border-2 ${vepPaid ? 'border-emerald-400 bg-emerald-50' : existingVep ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${vepPaid ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>3</div>
                <p className="text-sm font-semibold text-slate-700">Registrar pago</p>
              </div>
              <p className="text-xs text-slate-500 mb-3">Simula el pago y emite comprobante.</p>
              <Button size="sm" onClick={handlePay} loading={saving} disabled={!existingVep || vepPaid} className="w-full">
                <CreditCard className="w-3.5 h-3.5 mr-1" />
                {vepPaid ? 'Pagado ✓' : 'Pagar ahora'}
              </Button>
              {existingVep?.comprobante_number && <p className="text-[10px] text-slate-400 mt-1 truncate">Comp: {existingVep.comprobante_number}</p>}
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-3">
        <a href="/estado-fiscal"><Button variant="outline" size="sm">Estado fiscal integral →</Button></a>
      </div>
    </PageContainer>
  )
}
