'use client'

/**
 * RegimenGeneralModule — componente embebible del Régimen General (IVA + Ganancias).
 * Usado tanto por /iva y /ganancias (standalone) como por /administrador-relaciones (inline).
 */

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useUser } from '@/hooks/useUser'
import { useFiscalParams } from '@/hooks/useFiscalParams'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { calculateVat } from '@/lib/fiscal-engine/vat'
import { calculateIncomeTax } from '@/lib/fiscal-engine/income-tax'
import {
  calcVatDueDate, formatPeriod, currentPeriod,
  generateVepNumber, generateComprobanteNumber,
} from '@/lib/fiscal-engine'
import {
  AlertTriangle, CheckCircle, CreditCard, RefreshCw, FileText,
  TrendingUp, TrendingDown, Minus, BookOpen, ExternalLink,
  Receipt, Calculator, Info, ChevronDown, ChevronUp,
} from 'lucide-react'

type Tab = 'iva' | 'ganancias' | 'normativa'
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function currentPeriodStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface Props { defaultTab?: Tab }

export function RegimenGeneralModule({ defaultTab = 'iva' }: Props) {
  const { user } = useUser()
  const supabase  = createClient()
  const { params } = useFiscalParams()
  const [tab, setTab] = useState<Tab>(defaultTab)

  // ── IVA state ──────────────────────────────────────────────────────────────
  const [ivaLoading, setIvaLoading]   = useState(true)
  const [ivaSaving, setIvaSaving]     = useState(false)
  const [ivaError, setIvaError]       = useState<string | null>(null)
  const [ivaSuccess, setIvaSuccess]   = useState<string | null>(null)
  const [showIvaDetail, setShowIvaDetail] = useState(true)

  const [ivaPeriod, setIvaPeriod]     = useState(currentPeriodStr())
  const [invoices, setInvoices]       = useState<any[]>([])
  const [purchases, setPurchases]     = useState<any[]>([])
  const [ivaReturn, setIvaReturn]     = useState<any>(null)
  const [ivaVep, setIvaVep]           = useState<any>(null)
  const [ivaWithholdings, setIvaWithholdings] = useState('')
  const [ivaPerceptions, setIvaPerceptions]   = useState('')
  const [ivaPrevCredit, setIvaPrevCredit]     = useState('')
  const [ivaNotes, setIvaNotes]               = useState('')
  const [ivaPayMethod, setIvaPayMethod]       = useState('transferencia')

  // ── Ganancias state ────────────────────────────────────────────────────────
  const [ganLoading, setGanLoading]   = useState(true)
  const [ganSaving, setGanSaving]     = useState(false)
  const [ganError, setGanError]       = useState<string | null>(null)
  const [ganSuccess, setGanSuccess]   = useState<string | null>(null)
  const [showGanDetail, setShowGanDetail] = useState(true)

  const currentYear = new Date().getFullYear()
  const [fiscalYear, setFiscalYear]   = useState(currentYear)
  const [subjectType, setSubjectType] = useState<'persona_humana' | 'persona_juridica'>('persona_juridica')
  const [ganReturn, setGanReturn]     = useState<any>(null)
  const [ganVep, setGanVep]           = useState<any>(null)
  const [ganPayMethod, setGanPayMethod] = useState('transferencia')
  const [ganForm, setGanForm]         = useState({
    totalIncome: '', totalPurchases: '', salaryExpense: '',
    socialSecurityExpense: '', otherExpenses: '',
    advancePayments: '', withholdings: '', previousCredit: '', notes: '',
  })

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => { if (user) loadIva() }, [user, ivaPeriod])
  useEffect(() => { if (user) loadGanancias() }, [user, fiscalYear])

  async function loadIva() {
    setIvaLoading(true); setIvaError(null)
    const db = supabase as any
    const [invRes, purRes, retRes, vepRes] = await Promise.all([
      db.from('invoices').select('*').eq('user_id', user!.id).eq('period', ivaPeriod).neq('status', 'cancelled'),
      db.from('purchases').select('*').eq('user_id', user!.id).eq('period', ivaPeriod).eq('status', 'active'),
      db.from('vat_returns').select('*').eq('user_id', user!.id).eq('period', ivaPeriod).maybeSingle(),
      db.from('simulated_veps').select('*').eq('user_id', user!.id).eq('period', ivaPeriod).eq('obligation_type', 'iva').maybeSingle(),
    ])
    setInvoices(invRes.data || [])
    setPurchases(purRes.data || [])
    setIvaReturn(retRes.data || null)
    setIvaVep(vepRes.data || null)
    if (retRes.data) {
      const r = retRes.data
      setIvaWithholdings(String(r.withholdings || ''))
      setIvaPerceptions(String(r.perceptions || ''))
      setIvaPrevCredit(String(r.previous_credit || ''))
      setIvaNotes(r.notes || '')
    } else {
      setIvaWithholdings(''); setIvaPerceptions(''); setIvaPrevCredit(''); setIvaNotes('')
    }
    setIvaLoading(false)
  }

  async function loadGanancias() {
    setGanLoading(true)
    const db = supabase as any
    const retRes = await db.from('income_tax_returns').select('*').eq('user_id', user!.id).eq('fiscal_year', fiscalYear).maybeSingle()
    if (retRes.data) {
      const r = retRes.data
      setGanForm({
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
      setGanReturn(r)
      const vepRes = await db.from('simulated_veps').select('*').eq('user_id', user!.id)
        .eq('obligation_type', 'ganancias').eq('period', String(fiscalYear)).maybeSingle()
      setGanVep(vepRes.data)
    } else {
      setGanReturn(null); setGanVep(null)
    }
    setGanLoading(false)
  }

  // ── IVA calculations ───────────────────────────────────────────────────────
  const ivaCalc = calculateVat({
    period: ivaPeriod, invoices, purchases,
    withholdings: parseFloat(ivaWithholdings) || 0,
    perceptions: parseFloat(ivaPerceptions) || 0,
    previousCredit: parseFloat(ivaPrevCredit) || 0,
    params,
  })
  const ivaDueDate   = calcVatDueDate(ivaPeriod)
  const ivaIsPaid    = ivaReturn?.status === 'paid'
  const ivaSubmitted = ivaReturn?.status === 'submitted' || ivaReturn?.status === 'credit'
  const ivaVepPaid   = ivaVep?.status === 'paid'

  // ── Ganancias calculations ─────────────────────────────────────────────────
  const gf = {
    totalIncome: parseFloat(ganForm.totalIncome) || 0,
    totalPurchases: parseFloat(ganForm.totalPurchases) || 0,
    salaryExpense: parseFloat(ganForm.salaryExpense) || 0,
    socialSecurityExpense: parseFloat(ganForm.socialSecurityExpense) || 0,
    otherExpenses: parseFloat(ganForm.otherExpenses) || 0,
    advancePayments: parseFloat(ganForm.advancePayments) || 0,
    withholdings: parseFloat(ganForm.withholdings) || 0,
    previousCredit: parseFloat(ganForm.previousCredit) || 0,
  }
  const ganPeriod  = `${fiscalYear}-12`
  const ganCalc    = calculateIncomeTax({ period: ganPeriod, fiscalYear, ...gf, subjectType, params })
  const ganDueDate = `${fiscalYear + 1}-05-31`
  const ganIsPaid  = ganReturn?.status === 'paid'
  const ganSubmitted = ganReturn?.status === 'submitted' || ganReturn?.status === 'paid'
  const ganVepPaid = ganVep?.status === 'paid'

  // ── IVA actions ────────────────────────────────────────────────────────────
  async function handleIvaSubmit() {
    if (!user) return
    setIvaSaving(true); setIvaError(null); setIvaSuccess(null)
    try {
      const db = supabase as any
      const payload = {
        user_id: user.id, period: ivaPeriod, period_label: formatPeriod(ivaPeriod),
        due_date: ivaDueDate, sales_taxable: ivaCalc.salesTaxable,
        sales_iva_debit: ivaCalc.salesIvaDebit, purchases_iva_credit: ivaCalc.purchasesIvaCredit,
        withholdings: ivaCalc.withholdings, perceptions: ivaCalc.perceptions,
        previous_credit: ivaCalc.previousCredit, iva_determined: ivaCalc.ivaDetermined,
        net_payable: ivaCalc.netPayable, credit_balance: ivaCalc.creditBalance,
        status: ivaCalc.hasCredit ? 'credit' : 'submitted',
        submitted_at: new Date().toISOString(), notes: ivaNotes || null,
      }
      if (ivaReturn) await db.from('vat_returns').update(payload).eq('id', ivaReturn.id)
      else           await db.from('vat_returns').insert(payload)
      setIvaSuccess('DDJJ IVA presentada correctamente (simulación).')
      await loadIva()
    } catch (e) { setIvaError(e instanceof Error ? e.message : 'Error') }
    finally { setIvaSaving(false) }
  }

  async function handleIvaVep() {
    if (!user || !ivaReturn) return
    setIvaSaving(true); setIvaError(null)
    try {
      const db = supabase as any
      const payload = {
        user_id: user.id, vep_number: generateVepNumber(), obligation_type: 'iva',
        concept: `IVA — ${formatPeriod(ivaPeriod)}`, period: ivaPeriod,
        amount: ivaCalc.netPayable, due_date: ivaDueDate, payment_method: ivaPayMethod,
        status: 'pending', reference_id: ivaReturn.id,
      }
      if (ivaVep) await db.from('simulated_veps').update(payload).eq('id', ivaVep.id)
      else        await db.from('simulated_veps').insert(payload)
      setIvaSuccess('VEP generado. Procedé al pago.')
      await loadIva()
    } catch (e) { setIvaError(e instanceof Error ? e.message : 'Error') }
    finally { setIvaSaving(false) }
  }

  async function handleIvaPay() {
    if (!user || !ivaVep) return
    setIvaSaving(true); setIvaError(null)
    try {
      const db = supabase as any
      const comp = generateComprobanteNumber()
      await db.from('simulated_veps').update({ status: 'paid', paid_at: new Date().toISOString(), comprobante_number: comp }).eq('id', ivaVep.id)
      await db.from('vat_returns').update({ status: 'paid' }).eq('id', ivaReturn.id)
      setIvaSuccess(`Pago IVA registrado. Comprobante: ${comp}`)
      await loadIva()
    } catch (e) { setIvaError(e instanceof Error ? e.message : 'Error') }
    finally { setIvaSaving(false) }
  }

  // ── Ganancias actions ──────────────────────────────────────────────────────
  async function handleGanSubmit() {
    if (!user) return
    setGanSaving(true); setGanError(null); setGanSuccess(null)
    try {
      const db = supabase as any
      const payload = {
        user_id: user.id, fiscal_year: fiscalYear, period: ganPeriod,
        period_label: `Ejercicio ${fiscalYear}`, period_type: 'anual', due_date: ganDueDate,
        subject_type: subjectType, total_income: ganCalc.totalIncome,
        total_purchases: ganCalc.totalPurchases, salary_expense: ganCalc.salaryExpense,
        social_security_expense: ganCalc.socialSecurityExpense, other_expenses: ganCalc.otherExpenses,
        gross_result: ganCalc.grossResult, net_income: ganCalc.netIncome,
        tax_rate: ganCalc.taxRate, tax_determined: ganCalc.taxDetermined,
        advance_payments: ganCalc.advancePayments, withholdings: ganCalc.withholdings,
        previous_credit: ganCalc.previousCredit, net_payable: ganCalc.netPayable,
        status: 'submitted', submitted_at: new Date().toISOString(), notes: ganForm.notes || null,
      }
      if (ganReturn) await db.from('income_tax_returns').update(payload).eq('id', ganReturn.id)
      else           await db.from('income_tax_returns').insert(payload)
      setGanSuccess(`DDJJ Ganancias ${fiscalYear} presentada (simulación).`)
      await loadGanancias()
    } catch (e) { setGanError(e instanceof Error ? e.message : 'Error') }
    finally { setGanSaving(false) }
  }

  async function handleGanVep() {
    if (!user || !ganReturn) return
    setGanSaving(true); setGanError(null)
    try {
      const db = supabase as any
      const payload = {
        user_id: user.id, vep_number: generateVepNumber(), obligation_type: 'ganancias',
        concept: `Ganancias — Ejercicio ${fiscalYear}`, period: String(fiscalYear),
        amount: ganCalc.netPayable, due_date: ganDueDate, payment_method: ganPayMethod,
        status: 'pending', reference_id: ganReturn.id,
      }
      if (ganVep) await db.from('simulated_veps').update(payload).eq('id', ganVep.id)
      else        await db.from('simulated_veps').insert(payload)
      setGanSuccess('VEP Ganancias generado.')
      await loadGanancias()
    } catch (e) { setGanError(e instanceof Error ? e.message : 'Error') }
    finally { setGanSaving(false) }
  }

  async function handleGanPay() {
    if (!user || !ganVep) return
    setGanSaving(true); setGanError(null)
    try {
      const db = supabase as any
      const comp = generateComprobanteNumber()
      await db.from('simulated_veps').update({ status: 'paid', paid_at: new Date().toISOString(), comprobante_number: comp }).eq('id', ganVep.id)
      await db.from('income_tax_returns').update({ status: 'paid' }).eq('id', ganReturn.id)
      setGanSuccess(`Pago Ganancias registrado. Comprobante: ${comp}`)
      await loadGanancias()
    } catch (e) { setGanError(e instanceof Error ? e.message : 'Error') }
    finally { setGanSaving(false) }
  }

  // ── Period options ─────────────────────────────────────────────────────────
  const ivaPeriodOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    }
  })

  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'iva',       label: 'IVA Mensual',  icon: <Receipt    className="w-3.5 h-3.5" /> },
    { id: 'ganancias', label: 'Ganancias',    icon: <Calculator className="w-3.5 h-3.5" /> },
    { id: 'normativa', label: 'Normativa',    icon: <BookOpen   className="w-3.5 h-3.5" /> },
  ]

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50'
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

  return (
    <div className="space-y-4">

      {/* Disclaimer */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium">SIMULADOR DIDÁCTICO — SIN VALIDEZ FISCAL NI LEGAL</p>
        <Link href={tab === 'ganancias' ? '/ganancias' : '/iva'}
          className="ml-auto text-xs font-semibold text-amber-700 hover:underline flex items-center gap-1 whitespace-nowrap">
          Abrir en página completa <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

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

      {/* ══ TAB: IVA ══ */}
      {tab === 'iva' && (
        <div className="space-y-4">
          {ivaError   && <Alert variant="error">{ivaError}</Alert>}
          {ivaSuccess && <Alert variant="success">{ivaSuccess}</Alert>}

          {/* Info pedagógica */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>IVA (Régimen General — RI):</strong> Declaración mensual.{' '}
              <strong>Débito fiscal</strong> (IVA ventas A, 21%) −{' '}
              <strong>Crédito fiscal</strong> (IVA compras computables) = <strong>IVA determinado</strong>.{' '}
              Vencimiento: día 12 al 22 según terminación CUIT (simulador: día 18).{' '}
              Alícuota general: <strong>21%</strong> · Diferencial: <strong>10,5%</strong>.
            </p>
          </div>

          {/* Estado DDJJ */}
          {ivaReturn && (
            <div className={cn('p-3 rounded-xl border flex items-center gap-3',
              ivaIsPaid ? 'bg-emerald-50 border-emerald-200' : ivaSubmitted ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200')}>
              <CheckCircle className={cn('w-4 h-4', ivaIsPaid ? 'text-emerald-600' : 'text-blue-600')} />
              <div className="flex-1">
                <p className={cn('text-sm font-semibold', ivaIsPaid ? 'text-emerald-700' : 'text-blue-700')}>
                  {ivaIsPaid ? 'DDJJ presentada y pagada ✓' : 'DDJJ presentada — pendiente de pago'}
                </p>
                {ivaReturn.submitted_at && <p className="text-xs text-slate-400">Presentada: {formatDate(ivaReturn.submitted_at)}</p>}
              </div>
            </div>
          )}

          {/* Selector de período */}
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mr-2">Período:</label>
              <select value={ivaPeriod} onChange={e => setIvaPeriod(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                {ivaPeriodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <button onClick={loadIva} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg">
              <RefreshCw className={cn('w-4 h-4', ivaLoading && 'animate-spin')} />
            </button>
          </div>

          {ivaLoading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-slate-200 border-t-primary-600 rounded-full animate-spin" /></div>
          ) : (
            <>
              {/* Resumen cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card padding="sm" className="border-l-4 border-l-red-400">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                    <p className="text-xs font-semibold text-slate-600">Débito fiscal</p>
                  </div>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(ivaCalc.salesIvaDebit)}</p>
                  <p className="text-[10px] text-slate-400">Base: {formatCurrency(ivaCalc.salesTaxable)} · {invoices.filter(i => i.invoice_type === 'A').length} fact. A</p>
                </Card>
                <Card padding="sm" className="border-l-4 border-l-emerald-400">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                    <p className="text-xs font-semibold text-slate-600">Crédito fiscal</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(ivaCalc.purchasesIvaCredit)}</p>
                  <p className="text-[10px] text-slate-400">{purchases.filter(p => p.is_iva_computable).length} compras computables</p>
                </Card>
                <Card padding="sm" className={cn('border-l-4', ivaCalc.hasCredit ? 'border-l-blue-400' : ivaCalc.netPayable > 0 ? 'border-l-orange-400' : 'border-l-slate-300')}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Minus className="w-3.5 h-3.5 text-slate-500" />
                    <p className="text-xs font-semibold text-slate-600">{ivaCalc.hasCredit ? 'Saldo a favor' : 'IVA a pagar'}</p>
                  </div>
                  <p className={cn('text-xl font-bold', ivaCalc.hasCredit ? 'text-blue-600' : ivaCalc.netPayable > 0 ? 'text-orange-600' : 'text-slate-500')}>
                    {formatCurrency(ivaCalc.hasCredit ? ivaCalc.creditBalance : ivaCalc.netPayable)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {ivaCalc.hasCredit ? 'Aplicable al período siguiente' : ivaCalc.netPayable > 0 ? `Vence: ${formatDate(ivaDueDate)}` : 'Equilibrado'}
                  </p>
                </Card>
              </div>

              {/* Desglose expandible */}
              <Card padding="md">
                <button className="w-full flex items-center justify-between text-sm font-semibold text-slate-700"
                  onClick={() => setShowIvaDetail(!showIvaDetail)}>
                  <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Desglose DDJJ</span>
                  {showIvaDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showIvaDetail && (
                  <div className="mt-4 space-y-2">
                    {[
                      { label: 'Ventas gravadas (neto)', val: ivaCalc.salesTaxable },
                      { label: 'IVA Débito Fiscal', val: ivaCalc.salesIvaDebit, color: 'text-red-600', sign: '+' },
                      { label: 'IVA Crédito Fiscal', val: ivaCalc.purchasesIvaCredit, color: 'text-emerald-600', sign: '−' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className={cn('text-sm', row.color, row.color ? 'font-medium' : 'text-slate-600')}>{row.label}</span>
                        <span className={cn('text-sm font-semibold', row.color)}>{row.sign ? `${row.sign} ` : ''}{formatCurrency(row.val)}</span>
                      </div>
                    ))}

                    <div className="pt-2 pb-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Ajustes adicionales</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Retenciones IVA ($)', val: ivaWithholdings, set: setIvaWithholdings },
                          { label: 'Percepciones IVA ($)', val: ivaPerceptions, set: setIvaPerceptions },
                          { label: 'Saldo a favor anterior ($)', val: ivaPrevCredit, set: setIvaPrevCredit },
                        ].map(f => (
                          <div key={f.label}>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">{f.label}</label>
                            <input type="number" min="0" value={f.val} onChange={e => f.set(e.target.value)}
                              disabled={ivaIsPaid} className={inputCls} placeholder="0.00" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {(ivaCalc.withholdings > 0 || ivaCalc.perceptions > 0 || ivaCalc.previousCredit > 0) && (
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Retenciones + percepciones + saldo anterior</span>
                        <span className="text-sm font-semibold text-slate-600">− {formatCurrency(ivaCalc.withholdings + ivaCalc.perceptions + ivaCalc.previousCredit)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-sm font-semibold text-slate-700">IVA Determinado</span>
                      <span className="text-sm font-bold">{formatCurrency(ivaCalc.ivaDetermined)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-slate-50 rounded-lg px-3">
                      <span className={cn('text-sm font-bold', ivaCalc.hasCredit ? 'text-blue-700' : ivaCalc.netPayable > 0 ? 'text-orange-700' : 'text-slate-600')}>
                        {ivaCalc.hasCredit ? 'Saldo a favor (próximo período)' : 'IVA a ingresar'}
                      </span>
                      <span className={cn('text-xl font-bold', ivaCalc.hasCredit ? 'text-blue-700' : ivaCalc.netPayable > 0 ? 'text-orange-700' : 'text-slate-500')}>
                        {formatCurrency(ivaCalc.hasCredit ? ivaCalc.creditBalance : ivaCalc.netPayable)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Observaciones</label>
                      <input value={ivaNotes} onChange={e => setIvaNotes(e.target.value)} disabled={ivaIsPaid}
                        className={inputCls} placeholder="Notas o justificación..." />
                    </div>
                  </div>
                )}
              </Card>

              {/* Facturas del período */}
              {invoices.length > 0 && (
                <Card padding="sm">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Comprobantes del período ({invoices.length})</p>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {invoices.map(inv => (
                      <div key={inv.id} className="flex items-center gap-2 text-xs py-1 border-b border-slate-50">
                        <span className={cn('px-1.5 py-0.5 rounded font-bold flex-shrink-0',
                          inv.invoice_type === 'A' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600')}>
                          {inv.invoice_type}
                        </span>
                        <span className="flex-1 text-slate-600 truncate">{inv.customer_name || 'Cliente'}</span>
                        <span className={cn('font-medium', inv.invoice_type === 'A' ? 'text-red-600' : 'text-slate-400')}>
                          {inv.invoice_type === 'A' ? `IVA: ${formatCurrency(inv.iva_amount)}` : 'Sin IVA'}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Flujo */}
              <Card padding="md">
                <p className="text-sm font-semibold text-slate-700 mb-3">Flujo: Presentación → VEP → Pago</p>
                <div className="flex flex-wrap gap-3">
                  {/* Paso 1 */}
                  <div className={cn('flex-1 min-w-[160px] p-3 rounded-xl border-2',
                    ivaSubmitted || ivaIsPaid ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200')}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn('w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center',
                        ivaSubmitted || ivaIsPaid ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600')}>1</div>
                      <p className="text-xs font-bold text-slate-700">Presentar DDJJ</p>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2">Confirma los datos calculados.</p>
                    <Button size="sm" onClick={handleIvaSubmit} loading={ivaSaving} disabled={ivaIsPaid} className="w-full">
                      {ivaSubmitted ? 'Actualizar' : 'Presentar DDJJ'}
                    </Button>
                  </div>
                  {/* Paso 2 */}
                  {ivaCalc.netPayable > 0 && (
                    <div className={cn('flex-1 min-w-[160px] p-3 rounded-xl border-2',
                      ivaVep ? 'border-blue-400 bg-blue-50' : ivaSubmitted ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-50')}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn('w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center',
                          ivaVep ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600')}>2</div>
                        <p className="text-xs font-bold text-slate-700">Generar VEP</p>
                      </div>
                      <p className="text-[10px] text-slate-500 mb-2">VEP por {formatCurrency(ivaCalc.netPayable)}.</p>
                      <select value={ivaPayMethod} onChange={e => setIvaPayMethod(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-[10px] mb-2" disabled={!ivaSubmitted || ivaVepPaid}>
                        <option value="transferencia">Transferencia</option>
                        <option value="debito_automatico">Débito automático</option>
                        <option value="pago_electronico">Pago electrónico</option>
                      </select>
                      <Button size="sm" variant="outline" onClick={handleIvaVep} loading={ivaSaving}
                        disabled={!ivaSubmitted || ivaVepPaid} className="w-full">
                        {ivaVep ? `VEP: …${ivaVep.vep_number?.slice(-6)}` : 'Generar VEP'}
                      </Button>
                    </div>
                  )}
                  {/* Paso 3 */}
                  {ivaCalc.netPayable > 0 && (
                    <div className={cn('flex-1 min-w-[160px] p-3 rounded-xl border-2',
                      ivaVepPaid ? 'border-emerald-400 bg-emerald-50' : ivaVep ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-50')}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn('w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center',
                          ivaVepPaid ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600')}>3</div>
                        <p className="text-xs font-bold text-slate-700">Pagar</p>
                      </div>
                      <p className="text-[10px] text-slate-500 mb-2">Simula el pago y emite comprobante.</p>
                      <Button size="sm" onClick={handleIvaPay} loading={ivaSaving} disabled={!ivaVep || ivaVepPaid} className="w-full">
                        <CreditCard className="w-3 h-3 mr-1" />
                        {ivaVepPaid ? 'Pagado ✓' : 'Pagar ahora'}
                      </Button>
                      {ivaVep?.comprobante_number && <p className="text-[9px] text-slate-400 mt-1 truncate">Comp: {ivaVep.comprobante_number}</p>}
                    </div>
                  )}
                  {/* Saldo a favor */}
                  {ivaCalc.hasCredit && (
                    <div className="flex-1 min-w-[160px] p-3 rounded-xl border-2 border-blue-300 bg-blue-50">
                      <p className="text-xs font-bold text-blue-700 mb-1">Saldo a favor</p>
                      <p className="text-[10px] text-blue-600">
                        Saldo de <strong>{formatCurrency(ivaCalc.creditBalance)}</strong> — se aplica al próximo período.
                      </p>
                      <Button size="sm" onClick={handleIvaSubmit} loading={ivaSaving} disabled={ivaIsPaid} className="w-full mt-2">
                        {ivaSubmitted ? 'Presentada ✓' : 'Presentar DDJJ'}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ══ TAB: GANANCIAS ══ */}
      {tab === 'ganancias' && (
        <div className="space-y-4">
          {ganError   && <Alert variant="error">{ganError}</Alert>}
          {ganSuccess && <Alert variant="success">{ganSuccess}</Alert>}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>Impuesto a las Ganancias (Régimen General):</strong> DDJJ anual, vence en{' '}
              <strong>mayo del año siguiente</strong>. Personas jurídicas: <strong>35%</strong> sobre utilidad neta (Ley 27630).{' '}
              Personas humanas: escala progresiva hasta 35% con MNI anual{' '}
              de {formatCurrency(params.ganancias_mni_mensual * 12)}.{' '}
              Anticipos mensuales: {Math.round(params.ganancias_anticipo_pct * 100)}% del impuesto del año anterior.
            </p>
          </div>

          {/* Estado DDJJ */}
          {ganReturn && (
            <div className={cn('p-3 rounded-xl border flex items-center gap-3',
              ganIsPaid ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200')}>
              <CheckCircle className={cn('w-4 h-4', ganIsPaid ? 'text-emerald-600' : 'text-blue-600')} />
              <div className="flex-1">
                <p className={cn('text-sm font-semibold', ganIsPaid ? 'text-emerald-700' : 'text-blue-700')}>
                  {ganIsPaid ? `DDJJ ${fiscalYear} presentada y pagada ✓` : `DDJJ ${fiscalYear} presentada — pendiente de pago`}
                </p>
                {ganReturn.submitted_at && <p className="text-xs text-slate-400">Presentada: {formatDate(ganReturn.submitted_at)}</p>}
              </div>
            </div>
          )}

          {/* Selectores */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mr-2">Ejercicio fiscal:</label>
              <select value={fiscalYear} onChange={e => setFiscalYear(Number(e.target.value))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mr-2">Tipo de sujeto:</label>
              <select value={subjectType} onChange={e => setSubjectType(e.target.value as any)}
                disabled={ganIsPaid} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50">
                <option value="persona_juridica">Persona jurídica ({Math.round(params.ganancias_alicuota_juridica * 100)}%)</option>
                <option value="persona_humana">Persona humana (escala progresiva)</option>
              </select>
            </div>
            <button onClick={loadGanancias} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg">
              <RefreshCw className={cn('w-4 h-4', ganLoading && 'animate-spin')} />
            </button>
          </div>

          {ganLoading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-slate-200 border-t-primary-600 rounded-full animate-spin" /></div>
          ) : (
            <>
              {/* Formulario de datos */}
              <Card padding="md">
                <button className="w-full flex items-center justify-between text-sm font-semibold text-slate-700"
                  onClick={() => setShowGanDetail(!showGanDetail)}>
                  <span>Datos del ejercicio {fiscalYear}</span>
                  {showGanDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showGanDetail && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Ingresos del ejercicio ($)', key: 'totalIncome' },
                      { label: 'Costo de ventas / compras ($)', key: 'totalPurchases' },
                      { label: 'Sueldos pagados ($)', key: 'salaryExpense' },
                      { label: 'Cargas sociales patronales ($)', key: 'socialSecurityExpense' },
                      { label: 'Otros gastos deducibles ($)', key: 'otherExpenses' },
                      { label: 'Anticipos pagados ($)', key: 'advancePayments' },
                      { label: 'Retenciones sufridas ($)', key: 'withholdings' },
                      { label: 'Saldo a favor ejercicio anterior ($)', key: 'previousCredit' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className={labelCls}>{f.label}</label>
                        <input type="number" min="0" value={(ganForm as any)[f.key]}
                          onChange={e => setGanForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          disabled={ganIsPaid} className={inputCls} placeholder="0.00" />
                      </div>
                    ))}
                    <div>
                      <label className={labelCls}>Resultado bruto (calculado)</label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold">
                        {formatCurrency(ganCalc.grossResult)}
                      </div>
                    </div>
                    <div className="sm:col-span-3">
                      <label className={labelCls}>Observaciones</label>
                      <input value={ganForm.notes} onChange={e => setGanForm(p => ({...p, notes: e.target.value}))}
                        disabled={ganIsPaid} className={inputCls} placeholder="Notas..." />
                    </div>
                  </div>
                )}
              </Card>

              {/* Resultado */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Resultado bruto', val: ganCalc.grossResult },
                  { label: 'Renta neta imponible', val: ganCalc.netIncome, sub: `Alíc. ${Math.round(ganCalc.taxRate * 100)}%` },
                  { label: 'Impuesto determinado', val: ganCalc.taxDetermined, highlight: 'orange' },
                  { label: ganCalc.netPayable > 0 ? 'A ingresar' : 'Saldo a favor', val: ganCalc.netPayable, highlight: ganCalc.netPayable > 0 ? 'red' : 'green', sub: `Vence: ${formatDate(ganDueDate)}` },
                ].map(item => (
                  <Card key={item.label} padding="sm" className={cn('text-center',
                    item.highlight === 'orange' ? 'bg-orange-50 border-orange-200' :
                    item.highlight === 'red'    ? 'bg-red-50 border-red-200' :
                    item.highlight === 'green'  ? 'bg-emerald-50 border-emerald-200' : '')}>
                    <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                    <p className={cn('text-lg font-bold',
                      item.highlight === 'orange' ? 'text-orange-700' :
                      item.highlight === 'red'    ? 'text-red-700' :
                      item.highlight === 'green'  ? 'text-emerald-700' : 'text-slate-800')}>
                      {formatCurrency(item.val)}
                    </p>
                    {item.sub && <p className="text-[10px] text-slate-400">{item.sub}</p>}
                  </Card>
                ))}
              </div>

              {/* Flujo */}
              <Card padding="md">
                <p className="text-sm font-semibold text-slate-700 mb-3">Flujo: DDJJ → VEP → Pago</p>
                <div className="flex flex-wrap gap-3">
                  <div className={cn('flex-1 min-w-[160px] p-3 rounded-xl border-2',
                    ganSubmitted ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200')}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn('w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center',
                        ganSubmitted ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600')}>1</div>
                      <p className="text-xs font-bold text-slate-700">Presentar DDJJ</p>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2">Declara el ejercicio {fiscalYear}.</p>
                    <Button size="sm" onClick={handleGanSubmit} loading={ganSaving} disabled={ganIsPaid} className="w-full">
                      {ganSubmitted ? 'Actualizar DDJJ' : 'Presentar DDJJ'}
                    </Button>
                  </div>
                  {ganCalc.netPayable > 0 && (
                    <div className={cn('flex-1 min-w-[160px] p-3 rounded-xl border-2',
                      ganVep ? 'border-blue-400 bg-blue-50' : ganSubmitted ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-50')}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn('w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center',
                          ganVep ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600')}>2</div>
                        <p className="text-xs font-bold text-slate-700">Generar VEP</p>
                      </div>
                      <p className="text-[10px] text-slate-500 mb-2">VEP por {formatCurrency(ganCalc.netPayable)}.</p>
                      <select value={ganPayMethod} onChange={e => setGanPayMethod(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-[10px] mb-2" disabled={!ganSubmitted || ganVepPaid}>
                        <option value="transferencia">Transferencia</option>
                        <option value="debito_automatico">Débito automático</option>
                      </select>
                      <Button size="sm" variant="outline" onClick={handleGanVep} loading={ganSaving}
                        disabled={!ganSubmitted || ganVepPaid} className="w-full">
                        {ganVep ? `VEP: …${ganVep.vep_number?.slice(-6)}` : 'Generar VEP'}
                      </Button>
                    </div>
                  )}
                  {ganCalc.netPayable > 0 && (
                    <div className={cn('flex-1 min-w-[160px] p-3 rounded-xl border-2',
                      ganVepPaid ? 'border-emerald-400 bg-emerald-50' : ganVep ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-50')}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn('w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center',
                          ganVepPaid ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600')}>3</div>
                        <p className="text-xs font-bold text-slate-700">Pagar</p>
                      </div>
                      <p className="text-[10px] text-slate-500 mb-2">Simula el pago y emite comprobante.</p>
                      <Button size="sm" onClick={handleGanPay} loading={ganSaving} disabled={!ganVep || ganVepPaid} className="w-full">
                        <CreditCard className="w-3 h-3 mr-1" />
                        {ganVepPaid ? 'Pagado ✓' : 'Pagar ahora'}
                      </Button>
                      {ganVep?.comprobante_number && <p className="text-[9px] text-slate-400 mt-1 truncate">Comp: {ganVep.comprobante_number}</p>}
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ══ TAB: NORMATIVA ══ */}
      {tab === 'normativa' && (
        <div className="space-y-4">

          {/* Calendario de obligaciones RI */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-slate-600" />
              <p className="text-sm font-bold text-slate-700">Responsable Inscripto — Obligaciones ARCA 2026</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-2 px-2 font-bold text-slate-600">Obligación</th>
                    <th className="text-left py-2 px-2 font-bold text-slate-600">Periodicidad</th>
                    <th className="text-left py-2 px-2 font-bold text-slate-600">Vencimiento</th>
                    <th className="text-left py-2 px-2 font-bold text-slate-600">Normativa</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { ob: 'DDJJ IVA mensual', per: 'Mensual', vto: 'Días 12-22 del mes siguiente (según CUIT)', norm: 'Ley 23349 · RG ARCA 715' },
                    { ob: 'Anticipo Ganancias', per: 'Mensual (10 cuotas)', vto: 'Día 15 del mes corriente', norm: 'Ley 20628 art. 21 · RG 5391/2023' },
                    { ob: 'DDJJ Ganancias anual', per: 'Anual (ejercicio fiscal)', vto: 'Mayo del año siguiente (PH: mayo, PJ: mayo)', norm: 'Ley 20628 · RG ARCA 5603/2025' },
                    { ob: 'Retenciones IVA y Ganancias', per: 'Quincenal / mensual', vto: 'Día 15 y último día del mes', norm: 'RG ARCA 830 (IVA) · RG 830 (Gan.)' },
                    { ob: 'Percepciones IVA', per: 'Mensual', vto: 'Mismo que DDJJ IVA', norm: 'RG ARCA 2408' },
                    { ob: 'F.931 — Cargas sociales', per: 'Mensual', vto: 'Días 11-16 según CUIT', norm: 'Ley 24241 · RG ARCA 3834' },
                    { ob: 'Bienes Personales', per: 'Anual (PH)', vto: 'Junio del año siguiente', norm: 'Ley 23966 tit. VI · RG ARCA 5577' },
                  ].map(row => (
                    <tr key={row.ob} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-2 font-medium text-slate-800">{row.ob}</td>
                      <td className="py-2 px-2 text-slate-500">{row.per}</td>
                      <td className="py-2 px-2 text-slate-600">{row.vto}</td>
                      <td className="py-2 px-2 text-slate-400 text-[10px]">{row.norm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Facturación */}
          <Card padding="md">
            <p className="text-sm font-bold text-slate-700 mb-3">Facturación del Responsable Inscripto</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  tipo: 'FACTURA A', color: 'bg-red-700', desc: 'Para ventas a Responsables Inscriptos',
                  items: ['Discrimina IVA (21% / 10,5%)', 'Receptor debe ser RI o exento', 'Genera débito fiscal en el comprador', 'Requiere CUIT del receptor'],
                },
                {
                  tipo: 'FACTURA B', color: 'bg-blue-700', desc: 'Para ventas a Consumidores Finales o Monotributistas',
                  items: ['IVA incluido en el precio (no discriminado)', 'Para CF, Monotributistas, exentos', 'No genera crédito fiscal al receptor', 'No requiere CUIT si < umbral'],
                },
              ].map(f => (
                <div key={f.tipo} className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className={cn('px-4 py-2.5 text-white font-black text-sm', f.color)}>{f.tipo}</div>
                  <div className="p-3">
                    <p className="text-xs text-slate-600 font-semibold mb-2">{f.desc}</p>
                    <ul className="space-y-1">
                      {f.items.map(item => (
                        <li key={item} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="text-slate-400 mt-0.5 flex-shrink-0">·</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Alícuotas IVA vigentes */}
          <Card padding="md">
            <p className="text-sm font-bold text-slate-700 mb-3">Alícuotas IVA vigentes — ARCA 2026</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Alícuota general', val: '21%', sub: 'Bienes y servicios generales', color: 'bg-red-50 border-red-200 text-red-800' },
                { label: 'Alícuota diferencial', val: '10,5%', sub: 'Bienes de la canasta básica, construcción, servicios médicos', color: 'bg-amber-50 border-amber-200 text-amber-800' },
                { label: 'Exento', val: '0%', sub: 'Medicamentos, libros, servicios educativos, exportaciones', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                { label: 'No gravado', val: '—', sub: 'Operaciones fuera del objeto del impuesto', color: 'bg-slate-50 border-slate-200 text-slate-700' },
              ].map(item => (
                <div key={item.label} className={cn('p-3 rounded-xl border text-center', item.color)}>
                  <p className="text-[10px] font-semibold mb-1">{item.label}</p>
                  <p className="text-2xl font-black mb-1">{item.val}</p>
                  <p className="text-[9px] leading-tight opacity-80">{item.sub}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Ganancias */}
          <Card padding="md">
            <p className="text-sm font-bold text-slate-700 mb-3">Impuesto a las Ganancias — Parámetros 2026</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-600 mb-2">Personas Jurídicas (PJ)</p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>Alícuota única: <strong>35%</strong> sobre utilidad neta</li>
                  <li>Sin deducciones personales</li>
                  <li>DDJJ anual (vence mayo)</li>
                  <li>Anticipos: 10 cuotas del {Math.round(params.ganancias_anticipo_pct * 100)}% del impuesto anterior</li>
                  <li>Retenciones a cuenta</li>
                </ul>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-600 mb-2">Personas Humanas (PH) — 3ra categoría</p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>Escala progresiva hasta 35%</li>
                  <li>MNI anual: {formatCurrency(params.ganancias_mni_mensual * 12)}</li>
                  <li>Deducciones personales aplicables</li>
                  <li>DDJJ anual (vence mayo)</li>
                  <li>Actualizaciones RIPTE trimestrales</li>
                </ul>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-3">
              Nota: Ley Bases 2024 (Ley 27743) modificó 4ta categoría (relación de dependencia). Para RI en 3ra categoría, las alícuotas vigentes son las indicadas arriba.
            </p>
          </Card>

          {/* Mora */}
          <Card padding="md" className="bg-red-50 border-red-200">
            <p className="text-sm font-bold text-red-800 mb-2">Sanciones por incumplimiento</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-red-700">
              <div>
                <p className="font-bold mb-1">Interés resarcitorio</p>
                <p><strong>{Math.round(params.mora_tasa_mensual * 100)}%/mes</strong> sobre deuda impaga</p>
                <p className="text-[10px] text-red-500 mt-0.5">Art. 37 Ley 11683</p>
              </div>
              <div>
                <p className="font-bold mb-1">Multa por omisión</p>
                <p><strong>50% a 100%</strong> del impuesto omitido</p>
                <p className="text-[10px] text-red-500 mt-0.5">Art. 45 Ley 11683</p>
              </div>
              <div>
                <p className="font-bold mb-1">No presentación</p>
                <p><strong>$ 200 a $ 400</strong> por DDJJ no presentada</p>
                <p className="text-[10px] text-red-500 mt-0.5">Art. 38 Ley 11683</p>
              </div>
            </div>
          </Card>

        </div>
      )}
    </div>
  )
}
