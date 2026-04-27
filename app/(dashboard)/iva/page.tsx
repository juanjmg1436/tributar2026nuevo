'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { formatDate, formatCurrency } from '@/lib/utils'
import { calculateVat } from '@/lib/fiscal-engine/vat'
import { calcVatDueDate, formatPeriod, generateVepNumber, generateComprobanteNumber } from '@/lib/fiscal-engine'
import {
  FileText, AlertTriangle, Info, CheckCircle, CreditCard,
  TrendingDown, TrendingUp, Minus, RefreshCw, Download, ChevronDown, ChevronUp
} from 'lucide-react'

const currentPeriodStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function IvaPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()
  const [filterPeriod, setFilterPeriod] = useState(currentPeriodStr())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(true)

  const [invoices, setInvoices] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [existingReturn, setExistingReturn] = useState<any>(null)
  const [existingVep, setExistingVep] = useState<any>(null)

  // Ajustes manuales
  const [withholdings, setWithholdings] = useState('')
  const [perceptions, setPerceptions] = useState('')
  const [previousCredit, setPreviousCredit] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('transferencia')

  useEffect(() => { if (!user) return; loadData() }, [user, filterPeriod])

  async function loadData() {
    setLoading(true); setError(null)
    const db = supabase as any

    const [invRes, purRes, retRes, vepRes] = await Promise.all([
      db.from('invoices').select('*').eq('user_id', user!.id).eq('period', filterPeriod).neq('status', 'cancelled'),
      db.from('purchases').select('*').eq('user_id', user!.id).eq('period', filterPeriod).eq('status', 'active'),
      db.from('vat_returns').select('*').eq('user_id', user!.id).eq('period', filterPeriod).maybeSingle(),
      db.from('simulated_veps').select('*').eq('user_id', user!.id).eq('period', filterPeriod).eq('obligation_type', 'iva').maybeSingle(),
    ])

    setInvoices(invRes.data || [])
    setPurchases(purRes.data || [])
    setExistingReturn(retRes.data || null)
    setExistingVep(vepRes.data || null)

    if (retRes.data) {
      setWithholdings(String(retRes.data.withholdings || ''))
      setPerceptions(String(retRes.data.perceptions || ''))
      setPreviousCredit(String(retRes.data.previous_credit || ''))
      setNotes(retRes.data.notes || '')
    } else {
      setWithholdings(''); setPerceptions(''); setPreviousCredit(''); setNotes('')
    }
    setLoading(false)
  }

  const calc = calculateVat({
    period: filterPeriod,
    invoices,
    purchases,
    withholdings: parseFloat(withholdings) || 0,
    perceptions: parseFloat(perceptions) || 0,
    previousCredit: parseFloat(previousCredit) || 0,
  })

  const dueDate = calcVatDueDate(filterPeriod)

  async function handleSubmit() {
    if (!user) return
    setSaving(true); setError(null); setSuccess(null)
    try {
      const db = supabase as any
      const payload = {
        user_id: user.id,
        period: filterPeriod,
        period_label: formatPeriod(filterPeriod),
        due_date: dueDate,
        sales_taxable: calc.salesTaxable,
        sales_iva_debit: calc.salesIvaDebit,
        purchases_iva_credit: calc.purchasesIvaCredit,
        withholdings: calc.withholdings,
        perceptions: calc.perceptions,
        previous_credit: calc.previousCredit,
        iva_determined: calc.ivaDetermined,
        net_payable: calc.netPayable,
        credit_balance: calc.creditBalance,
        status: calc.netPayable > 0 ? 'submitted' : (calc.hasCredit ? 'credit' : 'submitted'),
        submitted_at: new Date().toISOString(),
        notes: notes || null,
      }
      if (existingReturn) {
        const { error: err } = await db.from('vat_returns').update(payload).eq('id', existingReturn.id)
        if (err) throw new Error(err.message)
      } else {
        const { error: err } = await db.from('vat_returns').insert(payload)
        if (err) throw new Error(err.message)
      }
      setSuccess('DDJJ IVA presentada correctamente (simulación).')
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al presentar') }
    finally { setSaving(false) }
  }

  async function handleGenerateVep() {
    if (!user || !existingReturn) return
    setSaving(true); setError(null); setSuccess(null)
    try {
      const db = supabase as any
      const vepPayload = {
        user_id: user.id,
        vep_number: generateVepNumber(),
        obligation_type: 'iva',
        concept: `IVA — ${formatPeriod(filterPeriod)}`,
        period: filterPeriod,
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
      setSuccess('VEP generado. Procedé al pago simulado.')
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al generar VEP') }
    finally { setSaving(false) }
  }

  async function handlePayVep() {
    if (!user || !existingVep) return
    setSaving(true); setError(null); setSuccess(null)
    try {
      const db = supabase as any
      const comp = generateComprobanteNumber()
      await db.from('simulated_veps').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        comprobante_number: comp,
      }).eq('id', existingVep.id)
      await db.from('vat_returns').update({ status: 'paid' }).eq('id', existingReturn.id)
      setSuccess(`Pago registrado. Comprobante: ${comp}`)
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al registrar pago') }
    finally { setSaving(false) }
  }

  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { value: val, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` }
  })

  const returnStatus = existingReturn?.status
  const isPaid = returnStatus === 'paid'
  const isSubmitted = returnStatus === 'submitted' || returnStatus === 'credit'
  const vepPaid = existingVep?.status === 'paid'

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer title="DDJJ IVA" subtitle="Declaración jurada mensual de IVA (simulación didáctica)">
      {/* Disclaimer */}
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {/* Info pedagógica */}
      <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>¿Cómo funciona el IVA?</strong> El Responsable Inscripto declara mensualmente:
          <strong> Débito fiscal</strong> (IVA de sus ventas A) <strong>−</strong> <strong>Crédito fiscal</strong> (IVA de sus compras computables) = <strong>IVA determinado</strong>.
          Si el resultado es positivo, debe ingresar ese saldo al fisco. Si es negativo, queda saldo a favor aplicable al próximo período.
          Vencimiento: día {new Date(dueDate).getDate()} de {MONTHS[new Date(dueDate).getMonth()]} {new Date(dueDate).getFullYear()}.
        </p>
      </div>

      {/* Estado de la DDJJ */}
      {existingReturn && (
        <div className={`mb-5 p-3 rounded-xl border flex items-center gap-3 ${
          isPaid ? 'bg-emerald-50 border-emerald-200' :
          isSubmitted ? 'bg-blue-50 border-blue-200' :
          'bg-orange-50 border-orange-200'
        }`}>
          <CheckCircle className={`w-5 h-5 ${isPaid ? 'text-emerald-600' : isSubmitted ? 'text-blue-600' : 'text-orange-500'}`} />
          <div>
            <p className={`text-sm font-semibold ${isPaid ? 'text-emerald-700' : isSubmitted ? 'text-blue-700' : 'text-orange-700'}`}>
              {isPaid ? 'DDJJ presentada y pagada' : isSubmitted ? 'DDJJ presentada — pendiente de pago' : `Estado: ${returnStatus}`}
            </p>
            {existingReturn.submitted_at && (
              <p className="text-xs text-slate-500">Presentada: {formatDate(existingReturn.submitted_at)}</p>
            )}
          </div>
        </div>
      )}

      {/* Selector de período */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div>
          <label className="text-xs font-semibold text-slate-500 mr-2">Período:</label>
          <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
            {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button onClick={loadData} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      {/* Resumen IVA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <Card padding="md" className="border-l-4 border-l-red-400">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <p className="text-xs font-semibold text-slate-600">Débito fiscal (ventas A)</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(calc.salesIvaDebit)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Base imponible: {formatCurrency(calc.salesTaxable)}</p>
          <p className="text-xs text-slate-400">{invoices.filter(i => i.invoice_type === 'A').length} facturas A</p>
        </Card>
        <Card padding="md" className="border-l-4 border-l-emerald-400">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-emerald-500" />
            <p className="text-xs font-semibold text-slate-600">Crédito fiscal (compras)</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(calc.purchasesIvaCredit)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{purchases.filter(p => p.is_iva_computable).length} compras computables</p>
          {(calc.withholdings > 0 || calc.perceptions > 0 || calc.previousCredit > 0) && (
            <p className="text-xs text-slate-400">+ {formatCurrency(calc.withholdings + calc.perceptions + calc.previousCredit)} otros créditos</p>
          )}
        </Card>
        <Card padding="md" className={`border-l-4 ${calc.hasCredit ? 'border-l-blue-400' : calc.netPayable > 0 ? 'border-l-orange-400' : 'border-l-slate-300'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Minus className="w-4 h-4 text-slate-500" />
            <p className="text-xs font-semibold text-slate-600">
              {calc.hasCredit ? 'Saldo a favor' : 'IVA a pagar'}
            </p>
          </div>
          <p className={`text-2xl font-bold ${calc.hasCredit ? 'text-blue-600' : calc.netPayable > 0 ? 'text-orange-600' : 'text-slate-500'}`}>
            {formatCurrency(calc.hasCredit ? calc.creditBalance : calc.netPayable)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {calc.hasCredit ? 'Aplicable al período siguiente' : calc.netPayable > 0 ? `Vence: ${formatDate(dueDate)}` : 'Sin saldo'}
          </p>
        </Card>
      </div>

      {/* Desglose detallado */}
      <Card padding="md" className="mb-5">
        <button
          className="w-full flex items-center justify-between text-sm font-semibold text-slate-700 mb-0"
          onClick={() => setShowBreakdown(!showBreakdown)}
        >
          <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Desglose de la DDJJ</span>
          {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showBreakdown && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Ventas gravadas (neto)</span>
              <span className="text-sm font-semibold">{formatCurrency(calc.salesTaxable)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-red-600 font-medium">IVA Débito Fiscal (ventas)</span>
              <span className="text-sm font-bold text-red-600">+ {formatCurrency(calc.salesIvaDebit)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-emerald-600 font-medium">IVA Crédito Fiscal (compras)</span>
              <span className="text-sm font-bold text-emerald-600">− {formatCurrency(calc.purchasesIvaCredit)}</span>
            </div>

            {/* Ajustes manuales */}
            <div className="pt-3 pb-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Ajustes y otros créditos</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Retenciones IVA sufridas ($)</label>
                  <input
                    type="number" min="0"
                    value={withholdings}
                    onChange={e => setWithholdings(e.target.value)}
                    disabled={isPaid}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Percepciones IVA sufridas ($)</label>
                  <input
                    type="number" min="0"
                    value={perceptions}
                    onChange={e => setPerceptions(e.target.value)}
                    disabled={isPaid}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Saldo a favor per. anterior ($)</label>
                  <input
                    type="number" min="0"
                    value={previousCredit}
                    onChange={e => setPreviousCredit(e.target.value)}
                    disabled={isPaid}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {(calc.withholdings > 0 || calc.perceptions > 0 || calc.previousCredit > 0) && (
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Retenciones + percepciones + saldo anterior</span>
                <span className="text-sm font-semibold text-slate-600">− {formatCurrency(calc.withholdings + calc.perceptions + calc.previousCredit)}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">IVA Determinado</span>
              <span className="text-sm font-bold text-slate-800">{formatCurrency(calc.ivaDetermined)}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-slate-50 rounded-lg px-3">
              <span className={`text-base font-bold ${calc.hasCredit ? 'text-blue-700' : calc.netPayable > 0 ? 'text-orange-700' : 'text-slate-600'}`}>
                {calc.hasCredit ? 'Saldo a favor (próximo período)' : 'IVA a ingresar'}
              </span>
              <span className={`text-xl font-bold ${calc.hasCredit ? 'text-blue-700' : calc.netPayable > 0 ? 'text-orange-700' : 'text-slate-500'}`}>
                {formatCurrency(calc.hasCredit ? calc.creditBalance : calc.netPayable)}
              </span>
            </div>

            {/* Notas */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Observaciones (opcional)</label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={isPaid}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50"
                placeholder="Comentarios o justificación de ajustes manuales..."
              />
            </div>
          </div>
        )}
      </Card>

      {/* Facturas del período */}
      {invoices.length > 0 && (
        <Card padding="md" className="mb-5">
          <p className="text-sm font-semibold text-slate-700 mb-3">Comprobantes del período ({invoices.length})</p>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                <span className={`px-1.5 py-0.5 rounded font-bold mr-2 ${inv.invoice_type === 'A' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                  {inv.invoice_type}
                </span>
                <span className="flex-1 text-slate-600 truncate">{inv.customer_name || 'Cliente'}</span>
                <span className="text-slate-400 ml-2">{formatDate(inv.invoice_date)}</span>
                <span className={`font-semibold ml-3 ${inv.invoice_type === 'A' ? 'text-red-600' : 'text-slate-500'}`}>
                  {inv.invoice_type === 'A' ? `IVA: ${formatCurrency(inv.iva_amount)}` : 'Sin IVA discriminado'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Flujo de presentación y pago */}
      <Card padding="md" className="mb-5">
        <p className="text-sm font-semibold text-slate-700 mb-4">Flujo: Presentación → VEP → Pago</p>
        <div className="flex flex-wrap gap-3">
          {/* Paso 1: Presentar */}
          <div className={`flex-1 min-w-[200px] p-3 rounded-xl border-2 ${isSubmitted || isPaid ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isSubmitted || isPaid ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>1</div>
              <p className="text-sm font-semibold text-slate-700">Presentar DDJJ</p>
            </div>
            <p className="text-xs text-slate-500 mb-3">Confirma los datos calculados y genera el acuse de recibo simulado.</p>
            <Button
              size="sm"
              onClick={handleSubmit}
              loading={saving}
              disabled={isPaid}
              className="w-full"
            >
              {isSubmitted ? 'Actualizar DDJJ' : 'Presentar DDJJ'}
            </Button>
          </div>

          {/* Paso 2: Generar VEP */}
          {calc.netPayable > 0 && (
            <div className={`flex-1 min-w-[200px] p-3 rounded-xl border-2 ${existingVep ? 'border-blue-400 bg-blue-50' : isSubmitted ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${existingVep ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>2</div>
                <p className="text-sm font-semibold text-slate-700">Generar VEP</p>
              </div>
              <p className="text-xs text-slate-500 mb-2">Genera el Volante Electrónico de Pago por {formatCurrency(calc.netPayable)}.</p>
              <div className="mb-2">
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded text-xs" disabled={!isSubmitted || vepPaid}>
                  <option value="transferencia">Transferencia bancaria</option>
                  <option value="debito_automatico">Débito automático</option>
                  <option value="pago_electronico">Pago electrónico</option>
                </select>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateVep}
                loading={saving}
                disabled={!isSubmitted || vepPaid}
                className="w-full"
              >
                {existingVep ? `VEP: ${existingVep.vep_number?.slice(-8)}` : 'Generar VEP'}
              </Button>
            </div>
          )}

          {/* Paso 3: Pagar */}
          {calc.netPayable > 0 && (
            <div className={`flex-1 min-w-[200px] p-3 rounded-xl border-2 ${vepPaid ? 'border-emerald-400 bg-emerald-50' : existingVep && !vepPaid ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${vepPaid ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>3</div>
                <p className="text-sm font-semibold text-slate-700">Registrar pago</p>
              </div>
              <p className="text-xs text-slate-500 mb-3">Simula el pago del VEP y genera el comprobante.</p>
              <Button
                size="sm"
                onClick={handlePayVep}
                loading={saving}
                disabled={!existingVep || vepPaid}
                className="w-full"
              >
                <CreditCard className="w-3.5 h-3.5 mr-1" />
                {vepPaid ? `Pagado ✓` : 'Pagar ahora'}
              </Button>
              {existingVep?.comprobante_number && (
                <p className="text-[10px] text-slate-400 mt-1 truncate">Comp: {existingVep.comprobante_number}</p>
              )}
            </div>
          )}

          {/* Si hay saldo a favor */}
          {calc.hasCredit && (
            <div className="flex-1 min-w-[200px] p-3 rounded-xl border-2 border-blue-300 bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-blue-500 text-white">✓</div>
                <p className="text-sm font-semibold text-blue-700">Saldo a favor</p>
              </div>
              <p className="text-xs text-blue-600">
                Tenés un saldo a favor de <strong>{formatCurrency(calc.creditBalance)}</strong> que se aplica automáticamente al próximo período como "Saldo a favor período anterior".
              </p>
              <Button size="sm" onClick={handleSubmit} loading={saving} disabled={isPaid} className="w-full mt-3">
                {isSubmitted ? 'DDJJ presentada ✓' : 'Presentar DDJJ'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Acuse de recibo simulado */}
      {existingReturn && (
        <Card padding="md" className="mb-5 bg-slate-50">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-700">Acuse de recibo simulado</p>
          </div>
          <div className="font-mono text-xs text-slate-600 space-y-1 bg-white border border-slate-200 rounded-lg p-4">
            <p className="font-bold text-center text-slate-800 mb-2">⚠ SIMULADOR DIDÁCTICO — SIN VALIDEZ FISCAL ⚠</p>
            <p>DDJJ IVA — Período: {formatPeriod(filterPeriod)}</p>
            <p>Vencimiento: {formatDate(dueDate)}</p>
            <p>Débito fiscal: {formatCurrency(calc.salesIvaDebit)}</p>
            <p>Crédito fiscal: {formatCurrency(calc.purchasesIvaCredit)}</p>
            <p>IVA determinado: {formatCurrency(calc.ivaDetermined)}</p>
            <p className="font-bold">{calc.hasCredit ? `Saldo a favor: ${formatCurrency(calc.creditBalance)}` : `A ingresar: ${formatCurrency(calc.netPayable)}`}</p>
            <p>Estado: {existingReturn.status?.toUpperCase()}</p>
            {existingReturn.submitted_at && <p>Presentada: {formatDate(existingReturn.submitted_at)}</p>}
            {existingVep?.comprobante_number && <p>Pago: {existingVep.comprobante_number}</p>}
          </div>
        </Card>
      )}

      <div className="flex gap-3 flex-wrap">
        <a href="/compras"><Button variant="outline" size="sm">← Ver compras</Button></a>
        <a href="/estado-fiscal"><Button variant="outline" size="sm">Estado fiscal integral →</Button></a>
      </div>
    </PageContainer>
  )
}
