'use client'

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
import { calculateIncomeTax, TRAMOS_PH_2026 } from '@/lib/fiscal-engine/income-tax'
import {
  calcVatDueDate, formatPeriod, previousPeriod,
  generateVepNumber, generateComprobanteNumber, calcSurcharge,
} from '@/lib/fiscal-engine'
import {
  AlertTriangle, CheckCircle, CreditCard, RefreshCw, FileText,
  TrendingUp, TrendingDown, Minus, BookOpen, ExternalLink,
  Receipt, Calculator, Info, ChevronDown, ChevronUp,
  Clock, Users, Heart, Percent,
} from 'lucide-react'

type Tab = 'iva' | 'ganancias' | 'normativa'
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// Vencimientos IVA según penúltimo dígito CUIT (RG ARCA — aproximación didáctica)
const IVA_VTO_DIA: Record<string, number> = {
  '0': 12, '1': 12,
  '2': 14, '3': 14,
  '4': 16, '5': 16,
  '6': 18, '7': 18,
  '8': 20, '9': 20,
}

function currentPeriodStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

interface Props { defaultTab?: Tab }

export function RegimenGeneralModule({ defaultTab = 'iva' }: Props) {
  const { user } = useUser()
  const supabase = createClient()
  const { params } = useFiscalParams()
  const [tab, setTab] = useState<Tab>(defaultTab)

  // ── IVA state ──────────────────────────────────────────────────────────────
  const [ivaLoading, setIvaLoading]     = useState(true)
  const [ivaSaving, setIvaSaving]       = useState(false)
  const [ivaError, setIvaError]         = useState<string | null>(null)
  const [ivaSuccess, setIvaSuccess]     = useState<string | null>(null)
  const [showIvaDetail, setShowIvaDetail] = useState(true)

  const [ivaPeriod, setIvaPeriod]       = useState(currentPeriodStr())
  const [ivaCuitDig, setIvaCuitDig]     = useState('6')   // penúltimo dígito CUIT
  const [invoices, setInvoices]         = useState<any[]>([])
  const [purchases, setPurchases]       = useState<any[]>([])
  const [ivaReturn, setIvaReturn]       = useState<any>(null)
  const [ivaVep, setIvaVep]             = useState<any>(null)
  const [ivaWithholdings, setIvaWithholdings] = useState('')
  const [ivaPerceptions, setIvaPerceptions]   = useState('')
  const [ivaPrevCredit, setIvaPrevCredit]     = useState('')
  const [ivaPrevCreditAuto, setIvaPrevCreditAuto] = useState(false)
  const [ivaNotes, setIvaNotes]               = useState('')
  const [ivaPayMethod, setIvaPayMethod]       = useState('transferencia')

  // ── Ganancias state ────────────────────────────────────────────────────────
  const [ganLoading, setGanLoading]     = useState(true)
  const [ganSaving, setGanSaving]       = useState(false)
  const [ganError, setGanError]         = useState<string | null>(null)
  const [ganSuccess, setGanSuccess]     = useState<string | null>(null)
  const [showGanDetail, setShowGanDetail] = useState(true)
  const [showDeducciones, setShowDeducciones] = useState(false)
  const [showAnticipOS, setShowAnticipOS] = useState(false)
  const [showTramos, setShowTramos]     = useState(false)

  const currentYear = new Date().getFullYear()
  const [fiscalYear, setFiscalYear]   = useState(currentYear - 1)
  const [subjectType, setSubjectType] = useState<'persona_humana' | 'persona_juridica'>('persona_juridica')
  const [ganReturn, setGanReturn]     = useState<any>(null)
  const [ganVep, setGanVep]           = useState<any>(null)
  const [ganPayMethod, setGanPayMethod] = useState('transferencia')
  const [ganForm, setGanForm] = useState({
    totalIncome: '', totalPurchases: '', salaryExpense: '',
    socialSecurityExpense: '', otherExpenses: '',
    advancePayments: '', withholdings: '', previousCredit: '', notes: '',
  })
  const [ganDedPH, setGanDedPH] = useState({
    conyugeACargo: false,
    hijosMenores18: 0,
    hijosIncapacitados: 0,
    gastosMedicos: '',
    interesesHipotecarios: '',
  })
  // Último ejercicio presentado (para calcular anticipos)
  const [lastYearTax, setLastYearTax] = useState<number | null>(null)

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => { if (user) loadIva() }, [user, ivaPeriod])
  useEffect(() => { if (user) loadGanancias() }, [user, fiscalYear])

  async function loadIva() {
    setIvaLoading(true); setIvaError(null)
    const db = supabase as any
    const prevP = previousPeriod(ivaPeriod)

    const [invRes, purRes, retRes, vepRes, prevRetRes] = await Promise.all([
      db.from('invoices').select('*').eq('user_id', user!.id).eq('period', ivaPeriod).neq('status', 'cancelled'),
      db.from('purchases').select('*').eq('user_id', user!.id).eq('period', ivaPeriod).eq('status', 'active'),
      db.from('vat_returns').select('*').eq('user_id', user!.id).eq('period', ivaPeriod).maybeSingle(),
      db.from('simulated_veps').select('*').eq('user_id', user!.id).eq('period', ivaPeriod).eq('obligation_type', 'iva').maybeSingle(),
      db.from('vat_returns').select('credit_balance').eq('user_id', user!.id).eq('period', prevP).maybeSingle(),
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
      setIvaPrevCreditAuto(false)
      setIvaNotes(r.notes || '')
    } else {
      setIvaWithholdings(''); setIvaPerceptions(''); setIvaNotes('')
      // Auto-cargar saldo a favor del período anterior
      const prevCredit = prevRetRes.data?.credit_balance || 0
      if (prevCredit > 0) {
        setIvaPrevCredit(String(prevCredit))
        setIvaPrevCreditAuto(true)
      } else {
        setIvaPrevCredit('')
        setIvaPrevCreditAuto(false)
      }
    }
    setIvaLoading(false)
  }

  async function loadGanancias() {
    setGanLoading(true)
    const db = supabase as any
    const retRes = await db.from('income_tax_returns').select('*').eq('user_id', user!.id).eq('fiscal_year', fiscalYear).maybeSingle()
    const prevYearRes = await db.from('income_tax_returns').select('tax_determined').eq('user_id', user!.id).eq('fiscal_year', fiscalYear - 1).maybeSingle()
    setLastYearTax(prevYearRes.data?.tax_determined || null)

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
  const ivaDueDay  = IVA_VTO_DIA[ivaCuitDig] ?? 18
  const ivaDueDate = calcVatDueDate(ivaPeriod, ivaDueDay)
  const today      = todayStr()
  const ivaIsOverdue = ivaDueDate < today && !ivaReturn?.status?.match(/paid|submitted|credit/)
  const ivaMora    = ivaIsOverdue && ivaCalc.netPayable > 0
    ? calcSurcharge(ivaCalc.netPayable, ivaDueDate, today, params.mora_tasa_mensual)
    : 0
  const ivaTotalWithMora = ivaCalc.netPayable + ivaMora

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
  const ganPeriod = `${fiscalYear}-12`
  const ganCalc   = calculateIncomeTax({
    period: ganPeriod, fiscalYear, ...gf, subjectType, params,
    deduccionesPH: subjectType === 'persona_humana' ? {
      conyugeACargo: ganDedPH.conyugeACargo,
      hijosMenores18: ganDedPH.hijosMenores18,
      hijosIncapacitados: ganDedPH.hijosIncapacitados,
      gastosMedicos: parseFloat(ganDedPH.gastosMedicos) || 0,
    } : undefined,
  })

  const ganDueDate   = `${fiscalYear + 1}-05-31`
  const ganIsOverdue = ganDueDate < today && !ganReturn?.status?.match(/paid|submitted/)
  const ganMora      = ganIsOverdue && ganCalc.netPayable > 0
    ? calcSurcharge(ganCalc.netPayable, ganDueDate, today, params.mora_tasa_mensual)
    : 0

  const ganIsPaid    = ganReturn?.status === 'paid'
  const ganSubmitted = ganReturn?.status === 'submitted' || ganReturn?.status === 'paid'
  const ganVepPaid   = ganVep?.status === 'paid'

  // Anticipos
  const anticipoBase   = lastYearTax ?? ganCalc.taxDetermined
  const anticipoCuota  = Math.round((anticipoBase * (params.ganancias_anticipo_pct)) * 100) / 100
  const ANTICIPO_MESES = ['Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov']

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
      setIvaSuccess('DDJJ IVA presentada (simulación).')
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
        amount: ivaTotalWithMora, due_date: ivaDueDate, payment_method: ivaPayMethod,
        status: 'pending', reference_id: ivaReturn.id,
      }
      if (ivaVep) await db.from('simulated_veps').update(payload).eq('id', ivaVep.id)
      else        await db.from('simulated_veps').insert(payload)
      setIvaSuccess('VEP generado.')
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
      setIvaSuccess(`Pago IVA. Comprobante: ${comp}`)
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
      const totalGan = ganCalc.netPayable + ganMora
      const payload = {
        user_id: user.id, vep_number: generateVepNumber(), obligation_type: 'ganancias',
        concept: `Ganancias — Ejercicio ${fiscalYear}`, period: String(fiscalYear),
        amount: totalGan, due_date: ganDueDate, payment_method: ganPayMethod,
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
      setGanSuccess(`Pago Ganancias. Comprobante: ${comp}`)
      await loadGanancias()
    } catch (e) { setGanError(e instanceof Error ? e.message : 'Error') }
    finally { setGanSaving(false) }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const ivaPeriodOptions = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    }
  })

  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'iva',       label: 'IVA Mensual', icon: <Receipt    className="w-3.5 h-3.5" /> },
    { id: 'ganancias', label: 'Ganancias',   icon: <Calculator className="w-3.5 h-3.5" /> },
    { id: 'normativa', label: 'Normativa',   icon: <BookOpen   className="w-3.5 h-3.5" /> },
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
          Pantalla completa <ExternalLink className="w-3 h-3" />
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

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: IVA
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'iva' && (
        <div className="space-y-4">
          {ivaError   && <Alert variant="error">{ivaError}</Alert>}
          {ivaSuccess && <Alert variant="success">{ivaSuccess}</Alert>}

          {/* Info pedagógica */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>IVA (RI):</strong> DDJJ mensual. <strong>Débito fiscal</strong> (facturas A al 21% / 10,5%) −{' '}
              <strong>Crédito fiscal</strong> (compras computables) = <strong>IVA a ingresar</strong>.{' '}
              El vencimiento varía según el <strong>penúltimo dígito</strong> del CUIT (días 12-20 del mes siguiente).
            </p>
          </div>

          {/* Alerta de mora */}
          {ivaIsOverdue && ivaCalc.netPayable > 0 && (
            <div className="p-3 rounded-xl border-2 border-red-300 bg-red-50 flex gap-3 items-start">
              <Clock className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">DDJJ vencida — interés de mora</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Venció el {formatDate(ivaDueDate)}. Mora calculada (art. 37 Ley 11683):{' '}
                  <strong>{formatCurrency(ivaMora)}</strong> ({Math.round(params.mora_tasa_mensual * 100)}%/mes sobre {formatCurrency(ivaCalc.netPayable)}).
                </p>
              </div>
            </div>
          )}

          {/* Estado DDJJ existente */}
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

          {/* Selectores: período + penúltimo dígito CUIT */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mr-2">Período:</label>
              <select value={ivaPeriod} onChange={e => setIvaPeriod(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                {ivaPeriodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mr-2">Penúlt. dígito CUIT:</label>
              <select value={ivaCuitDig} onChange={e => setIvaCuitDig(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm w-16">
                {['0','1','2','3','4','5','6','7','8','9'].map(d =>
                  <option key={d} value={d}>{d}</option>
                )}
              </select>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              Vence: <strong className="text-slate-700">día {ivaDueDay}</strong> de {MONTHS[parseInt(ivaPeriod.split('-')[1]) % 12]}
            </div>
            <button onClick={loadIva} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg ml-auto">
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
                  <p className="text-[10px] text-slate-400">
                    Base: {formatCurrency(ivaCalc.salesTaxable)} ·{' '}
                    {invoices.filter(i => i.invoice_type === 'A' || i.invoice_type === 'M').length} comp. gravados
                  </p>
                </Card>
                <Card padding="sm" className="border-l-4 border-l-emerald-400">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                    <p className="text-xs font-semibold text-slate-600">Crédito fiscal</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(ivaCalc.purchasesIvaCredit)}</p>
                  <p className="text-[10px] text-slate-400">{purchases.filter(p => p.is_iva_computable).length} compras computables</p>
                </Card>
                <Card padding="sm" className={cn('border-l-4',
                  ivaCalc.hasCredit ? 'border-l-blue-400' : ivaMora > 0 ? 'border-l-red-500' : ivaCalc.netPayable > 0 ? 'border-l-orange-400' : 'border-l-slate-300')}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Minus className="w-3.5 h-3.5 text-slate-500" />
                    <p className="text-xs font-semibold text-slate-600">
                      {ivaCalc.hasCredit ? 'Saldo a favor' : ivaMora > 0 ? 'A pagar + mora' : 'IVA a pagar'}
                    </p>
                  </div>
                  <p className={cn('text-xl font-bold',
                    ivaCalc.hasCredit ? 'text-blue-600' : ivaMora > 0 ? 'text-red-600' : ivaCalc.netPayable > 0 ? 'text-orange-600' : 'text-slate-500')}>
                    {formatCurrency(ivaCalc.hasCredit ? ivaCalc.creditBalance : ivaTotalWithMora)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {ivaCalc.hasCredit ? 'Traslado al período siguiente' :
                     ivaMora > 0 ? `Incl. mora: ${formatCurrency(ivaMora)}` :
                     ivaCalc.netPayable > 0 ? `Vence: día ${ivaDueDay}/${parseInt(ivaPeriod.split('-')[1]) % 12 + 1}` : 'Equilibrado'}
                  </p>
                </Card>
              </div>

              {/* Desglose */}
              <Card padding="md">
                <button className="w-full flex items-center justify-between text-sm font-semibold text-slate-700"
                  onClick={() => setShowIvaDetail(!showIvaDetail)}>
                  <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Desglose DDJJ</span>
                  {showIvaDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showIvaDetail && (
                  <div className="mt-4 space-y-2">
                    {/* Desglose ventas por alícuota */}
                    {invoices.length > 0 && (
                      <div className="p-2 bg-red-50 rounded-lg border border-red-100 mb-2">
                        <p className="text-[10px] font-bold text-red-700 uppercase mb-1.5">Ventas gravadas por alícuota</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { aliq: '21%', tipo: ['A'], color: 'text-red-700' },
                            { aliq: '10,5%', tipo: ['B_DIFERENCIAL'], color: 'text-orange-600' },
                          ].map(a => {
                            const invFilt = a.tipo.includes('A')
                              ? invoices.filter(i => i.invoice_type === 'A' && (i.iva_rate === 0.21 || !i.iva_rate))
                              : invoices.filter(i => i.iva_rate === 0.105)
                            const total = invFilt.reduce((s: number, i: any) => s + (i.iva_amount || 0), 0)
                            return (
                              <div key={a.aliq} className="text-xs">
                                <span className="text-slate-500">IVA {a.aliq}: </span>
                                <span className={cn('font-bold', a.color)}>{formatCurrency(total)}</span>
                                <span className="text-slate-400 ml-1">({invFilt.length} comp.)</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {[
                      { label: 'Ventas gravadas (neto)', val: ivaCalc.salesTaxable },
                      { label: 'IVA Débito Fiscal', val: ivaCalc.salesIvaDebit, color: 'text-red-600', sign: '+' },
                      { label: 'IVA Crédito Fiscal', val: ivaCalc.purchasesIvaCredit, color: 'text-emerald-600', sign: '−' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className={cn('text-sm', row.color ? `${row.color} font-medium` : 'text-slate-600')}>{row.label}</span>
                        <span className={cn('text-sm font-semibold', row.color)}>{row.sign ? `${row.sign} ` : ''}{formatCurrency(row.val)}</span>
                      </div>
                    ))}

                    <div className="pt-2 pb-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Ajustes adicionales</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Retenciones IVA ($)', val: ivaWithholdings, set: setIvaWithholdings },
                          { label: 'Percepciones IVA ($)', val: ivaPerceptions, set: setIvaPerceptions },
                          { label: 'Saldo favor anterior ($)', val: ivaPrevCredit, set: (v: string) => { setIvaPrevCredit(v); setIvaPrevCreditAuto(false) } },
                        ].map(f => (
                          <div key={f.label}>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">{f.label}</label>
                            <input type="number" min="0" value={f.val}
                              onChange={e => f.set(e.target.value)}
                              disabled={ivaIsPaid} className={inputCls} placeholder="0.00" />
                          </div>
                        ))}
                      </div>
                      {ivaPrevCreditAuto && parseFloat(ivaPrevCredit) > 0 && (
                        <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Saldo cargado automáticamente del período anterior
                        </p>
                      )}
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
                    {ivaMora > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-red-100 bg-red-50 px-2 rounded">
                        <span className="text-sm text-red-700 font-medium">+ Interés de mora (art. 37)</span>
                        <span className="text-sm font-semibold text-red-700">+ {formatCurrency(ivaMora)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-3 bg-slate-50 rounded-lg px-3">
                      <span className={cn('text-sm font-bold',
                        ivaCalc.hasCredit ? 'text-blue-700' : ivaTotalWithMora > 0 ? 'text-orange-700' : 'text-slate-600')}>
                        {ivaCalc.hasCredit ? 'Saldo a favor (traslado)' : 'Total a ingresar'}
                      </span>
                      <span className={cn('text-xl font-bold',
                        ivaCalc.hasCredit ? 'text-blue-700' : ivaTotalWithMora > 0 ? 'text-orange-700' : 'text-slate-500')}>
                        {formatCurrency(ivaCalc.hasCredit ? ivaCalc.creditBalance : ivaTotalWithMora)}
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

              {/* Comprobantes del período */}
              {invoices.length > 0 && (
                <Card padding="sm">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Comprobantes del período ({invoices.length})</p>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {invoices.map(inv => (
                      <div key={inv.id} className="flex items-center gap-2 text-xs py-1 border-b border-slate-50">
                        <span className={cn('px-1.5 py-0.5 rounded font-bold flex-shrink-0 text-[10px]',
                          inv.invoice_type === 'A' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600')}>
                          {inv.invoice_type}
                        </span>
                        <span className="flex-1 text-slate-600 truncate">{inv.customer_name || 'Cliente'}</span>
                        {inv.iva_amount > 0 && (
                          <span className="text-[10px] text-slate-400">
                            {inv.iva_rate === 0.105 ? '10,5%' : '21%'}
                          </span>
                        )}
                        <span className={cn('font-medium', inv.invoice_type === 'A' ? 'text-red-600' : 'text-slate-400')}>
                          {inv.iva_amount > 0 ? `IVA: ${formatCurrency(inv.iva_amount)}` : 'Sin IVA'}
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
                  <div className={cn('flex-1 min-w-[150px] p-3 rounded-xl border-2',
                    ivaSubmitted || ivaIsPaid ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200')}>
                    <StepHeader n={1} done={ivaSubmitted || ivaIsPaid} label="Presentar DDJJ" />
                    <p className="text-[10px] text-slate-500 mb-2">Confirma los datos calculados.</p>
                    <Button size="sm" onClick={handleIvaSubmit} loading={ivaSaving} disabled={ivaIsPaid} className="w-full">
                      {ivaSubmitted ? 'Actualizar' : 'Presentar DDJJ'}
                    </Button>
                  </div>

                  {ivaCalc.netPayable > 0 && (
                    <div className={cn('flex-1 min-w-[150px] p-3 rounded-xl border-2',
                      ivaVep ? 'border-blue-400 bg-blue-50' : ivaSubmitted ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-50')}>
                      <StepHeader n={2} done={!!ivaVep} label="Generar VEP" />
                      <p className="text-[10px] text-slate-500 mb-2">
                        VEP por {formatCurrency(ivaTotalWithMora)}
                        {ivaMora > 0 && <span className="text-red-600"> (incl. mora)</span>}.
                      </p>
                      <select value={ivaPayMethod} onChange={e => setIvaPayMethod(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-[10px] mb-2" disabled={!ivaSubmitted || ivaVepPaid}>
                        <option value="transferencia">Transferencia</option>
                        <option value="debito_automatico">Débito automático</option>
                        <option value="pago_electronico">Home Banking</option>
                      </select>
                      <Button size="sm" variant="outline" onClick={handleIvaVep} loading={ivaSaving}
                        disabled={!ivaSubmitted || ivaVepPaid} className="w-full">
                        {ivaVep ? `VEP: …${ivaVep.vep_number?.slice(-6)}` : 'Generar VEP'}
                      </Button>
                    </div>
                  )}

                  {ivaCalc.netPayable > 0 && (
                    <div className={cn('flex-1 min-w-[150px] p-3 rounded-xl border-2',
                      ivaVepPaid ? 'border-emerald-400 bg-emerald-50' : ivaVep ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-50')}>
                      <StepHeader n={3} done={ivaVepPaid} label="Pagar" />
                      <p className="text-[10px] text-slate-500 mb-2">Simula el pago y emite comprobante.</p>
                      <Button size="sm" onClick={handleIvaPay} loading={ivaSaving} disabled={!ivaVep || ivaVepPaid} className="w-full">
                        <CreditCard className="w-3 h-3 mr-1" />
                        {ivaVepPaid ? 'Pagado ✓' : 'Pagar ahora'}
                      </Button>
                      {ivaVep?.comprobante_number && <p className="text-[9px] text-slate-400 mt-1 truncate">Comp: {ivaVep.comprobante_number}</p>}
                    </div>
                  )}

                  {ivaCalc.hasCredit && (
                    <div className="flex-1 min-w-[150px] p-3 rounded-xl border-2 border-blue-300 bg-blue-50">
                      <p className="text-xs font-bold text-blue-700 mb-1">Saldo a favor</p>
                      <p className="text-[10px] text-blue-600 mb-2">
                        <strong>{formatCurrency(ivaCalc.creditBalance)}</strong> se trasladará al próximo período automáticamente.
                      </p>
                      <Button size="sm" onClick={handleIvaSubmit} loading={ivaSaving} disabled={ivaIsPaid} className="w-full">
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

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: GANANCIAS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'ganancias' && (
        <div className="space-y-4">
          {ganError   && <Alert variant="error">{ganError}</Alert>}
          {ganSuccess && <Alert variant="success">{ganSuccess}</Alert>}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>Ganancias (RI):</strong> DDJJ <strong>anual</strong>, vence en mayo del año siguiente.{' '}
              PJ: alícuota única <strong>35%</strong> (Ley 27630). PH: <strong>escala progresiva</strong> 5%-35% (art. 90 Ley 20628) con MNI y deducciones personales.{' '}
              Anticipos mensuales: {Math.round(params.ganancias_anticipo_pct * 100)}% del impuesto del ejercicio anterior (10 cuotas).
            </p>
          </div>

          {/* Alerta mora */}
          {ganIsOverdue && ganCalc.netPayable > 0 && (
            <div className="p-3 rounded-xl border-2 border-red-300 bg-red-50 flex gap-3 items-start">
              <Clock className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">DDJJ vencida — interés de mora</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Venció el {formatDate(ganDueDate)}. Mora (art. 37 Ley 11683):{' '}
                  <strong>{formatCurrency(ganMora)}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Quebranto */}
          {ganCalc.hasQuebranto && (
            <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 flex gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-700">Quebranto fiscal: {formatCurrency(ganCalc.quebranto || 0)}</p>
                <p className="text-xs text-amber-600">
                  El resultado del ejercicio es negativo. En Ganancias, el quebranto puede trasladarse a los próximos 5 ejercicios (art. 25 Ley 20628).
                </p>
              </div>
            </div>
          )}

          {/* Estado DDJJ */}
          {ganReturn && (
            <div className={cn('p-3 rounded-xl border flex items-center gap-3',
              ganIsPaid ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200')}>
              <CheckCircle className={cn('w-4 h-4', ganIsPaid ? 'text-emerald-600' : 'text-blue-600')} />
              <div className="flex-1">
                <p className={cn('text-sm font-semibold', ganIsPaid ? 'text-emerald-700' : 'text-blue-700')}>
                  {ganIsPaid ? `DDJJ ${fiscalYear} pagada ✓` : `DDJJ ${fiscalYear} presentada — pendiente de pago`}
                </p>
                {ganReturn.submitted_at && <p className="text-xs text-slate-400">Presentada: {formatDate(ganReturn.submitted_at)}</p>}
              </div>
            </div>
          )}

          {/* Selectores */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mr-2">Ejercicio:</label>
              <select value={fiscalYear} onChange={e => setFiscalYear(Number(e.target.value))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                {[currentYear - 1, currentYear - 2, currentYear - 3].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mr-2">Tipo de sujeto:</label>
              <select value={subjectType} onChange={e => setSubjectType(e.target.value as any)}
                disabled={ganIsPaid} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50">
                <option value="persona_juridica">Persona jurídica — {Math.round(params.ganancias_alicuota_juridica * 100)}% fijo</option>
                <option value="persona_humana">Persona humana — escala progresiva</option>
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
              {/* Formulario datos */}
              <Card padding="md">
                <button className="w-full flex items-center justify-between text-sm font-semibold text-slate-700"
                  onClick={() => setShowGanDetail(!showGanDetail)}>
                  <span>Datos del ejercicio {fiscalYear}</span>
                  {showGanDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showGanDetail && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Ingresos brutos del ejercicio ($)', key: 'totalIncome', tip: 'Ventas, honorarios y demás ingresos gravados' },
                      { label: 'Costo de ventas / compras ($)', key: 'totalPurchases', tip: 'Costo directo de los bienes o servicios vendidos' },
                      { label: 'Sueldos pagados ($)', key: 'salaryExpense', tip: 'Remuneraciones brutas a empleados' },
                      { label: 'Cargas sociales patronales ($)', key: 'socialSecurityExpense', tip: 'Contribuciones patronales sobre sueldos' },
                      { label: 'Otros gastos deducibles ($)', key: 'otherExpenses', tip: 'Alquiler, servicios, insumos, etc.' },
                      { label: 'Anticipos pagados ($)', key: 'advancePayments', tip: 'Total de cuotas de anticipo abonadas en el año' },
                      { label: 'Retenciones sufridas ($)', key: 'withholdings', tip: 'Retenciones de Ganancias practicadas por clientes' },
                      { label: 'Saldo a favor ejercicio anterior ($)', key: 'previousCredit', tip: 'Impuesto a favor del ejercicio previo' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className={labelCls} title={f.tip}>{f.label}</label>
                        <input type="number" min="0" value={(ganForm as any)[f.key]}
                          onChange={e => setGanForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          disabled={ganIsPaid} className={inputCls} placeholder="0.00" />
                      </div>
                    ))}
                    <div>
                      <label className={labelCls}>Resultado bruto (calculado)</label>
                      <div className={cn('px-3 py-2 border rounded-lg text-sm font-bold',
                        ganCalc.grossResult < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-100 border-slate-200')}>
                        {formatCurrency(ganCalc.grossResult)}
                        {ganCalc.grossResult < 0 && ' (Quebranto)'}
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

              {/* Deducciones PH */}
              {subjectType === 'persona_humana' && (
                <Card padding="md">
                  <button className="w-full flex items-center justify-between text-sm font-semibold text-slate-700"
                    onClick={() => setShowDeducciones(!showDeducciones)}>
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-500" />
                      Deducciones personales (art. 23 Ley 20628)
                      {(ganDedPH.conyugeACargo || ganDedPH.hijosMenores18 > 0 || ganDedPH.hijosIncapacitados > 0) && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">aplicadas</span>
                      )}
                    </span>
                    {showDeducciones ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showDeducciones && (
                    <div className="mt-4 space-y-4">
                      <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-xs text-indigo-700">
                        <strong>MNI anual aplicado:</strong> {formatCurrency(ganCalc.mniDeduccion || 0)} |{' '}
                        <strong>Deducción especial (independiente):</strong> {formatCurrency(ganCalc.deduccionEspecial || 0)}
                        <p className="mt-1 text-indigo-500">Valores aprox. 2025/2026 actualizados por RIPTE (Ley 20628 art. 23).</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="conyuge" checked={ganDedPH.conyugeACargo}
                            onChange={e => setGanDedPH(p => ({...p, conyugeACargo: e.target.checked}))}
                            disabled={ganIsPaid} className="w-4 h-4 accent-indigo-600" />
                          <label htmlFor="conyuge" className="text-sm text-slate-700 cursor-pointer">
                            Cónyuge a cargo{' '}
                            <span className="text-xs text-slate-400">({formatCurrency(Math.round((params.ganancias_mni_mensual * 12) * 0.90))})</span>
                          </label>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">
                            Hijos menores de 18 <span className="text-slate-400">({formatCurrency(Math.round((params.ganancias_mni_mensual * 12) * 0.45))} c/u)</span>
                          </label>
                          <input type="number" min="0" max="20" value={ganDedPH.hijosMenores18}
                            onChange={e => setGanDedPH(p => ({...p, hijosMenores18: parseInt(e.target.value) || 0}))}
                            disabled={ganIsPaid} className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">
                            Hijos incapacitados <span className="text-slate-400">({formatCurrency(Math.round((params.ganancias_mni_mensual * 12) * 0.90))} c/u)</span>
                          </label>
                          <input type="number" min="0" max="20" value={ganDedPH.hijosIncapacitados}
                            onChange={e => setGanDedPH(p => ({...p, hijosIncapacitados: parseInt(e.target.value) || 0}))}
                            disabled={ganIsPaid} className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">
                            Gastos médicos y paramédicos ($) <span className="text-slate-400">(40%, tope 5% renta)</span>
                          </label>
                          <input type="number" min="0" value={ganDedPH.gastosMedicos}
                            onChange={e => setGanDedPH(p => ({...p, gastosMedicos: e.target.value}))}
                            disabled={ganIsPaid} className={inputCls} placeholder="0.00" />
                        </div>
                      </div>
                      {(ganCalc.deduccionConyuge || 0) + (ganCalc.deduccionHijos || 0) + (ganCalc.deduccionGastosMedicos || 0) > 0 && (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                          <p className="font-bold text-emerald-700 mb-1">Total deducciones personales:</p>
                          <div className="space-y-0.5 text-emerald-600">
                            {(ganCalc.mniDeduccion || 0) > 0 && <div className="flex justify-between"><span>MNI:</span><strong>{formatCurrency(ganCalc.mniDeduccion || 0)}</strong></div>}
                            {(ganCalc.deduccionEspecial || 0) > 0 && <div className="flex justify-between"><span>Ded. especial independiente:</span><strong>{formatCurrency(ganCalc.deduccionEspecial || 0)}</strong></div>}
                            {(ganCalc.deduccionConyuge || 0) > 0 && <div className="flex justify-between"><span>Cónyuge:</span><strong>{formatCurrency(ganCalc.deduccionConyuge || 0)}</strong></div>}
                            {(ganCalc.deduccionHijos || 0) > 0 && <div className="flex justify-between"><span>Hijos:</span><strong>{formatCurrency(ganCalc.deduccionHijos || 0)}</strong></div>}
                            {(ganCalc.deduccionGastosMedicos || 0) > 0 && <div className="flex justify-between"><span>Gastos médicos (40%):</span><strong>{formatCurrency(ganCalc.deduccionGastosMedicos || 0)}</strong></div>}
                            <div className="flex justify-between border-t border-emerald-200 pt-1 font-bold">
                              <span>Total:</span>
                              <span>{formatCurrency((ganCalc.totalDeducciones || 0) + (ganCalc.deduccionGastosMedicos || 0))}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )}

              {/* Resultado cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Resultado bruto', val: ganCalc.grossResult },
                  { label: 'Renta neta imponible', val: ganCalc.netIncome,
                    sub: subjectType === 'persona_humana' ? 'Tras deducciones' : `Alíc. ${Math.round(ganCalc.taxRate * 100)}%` },
                  { label: 'Impuesto determinado', val: ganCalc.taxDetermined, hl: 'orange',
                    sub: subjectType === 'persona_humana' ? `TEM ${(ganCalc.taxRate * 100).toFixed(1)}%` : '' },
                  {
                    label: ganCalc.netPayable > 0 ? (ganMora > 0 ? 'A ingresar + mora' : 'A ingresar') : 'Saldo a favor',
                    val: ganCalc.netPayable + ganMora,
                    hl: ganCalc.netPayable > 0 ? (ganMora > 0 ? 'red' : 'orange') : 'green',
                    sub: `Vence: ${formatDate(ganDueDate)}`,
                  },
                ].map(item => (
                  <Card key={item.label} padding="sm" className={cn('text-center',
                    item.hl === 'orange' ? 'bg-orange-50 border-orange-200' :
                    item.hl === 'red'    ? 'bg-red-50 border-red-200' :
                    item.hl === 'green'  ? 'bg-emerald-50 border-emerald-200' : '')}>
                    <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                    <p className={cn('text-lg font-bold',
                      item.hl === 'orange' ? 'text-orange-700' :
                      item.hl === 'red'    ? 'text-red-700' :
                      item.hl === 'green'  ? 'text-emerald-700' : 'text-slate-800')}>
                      {formatCurrency(item.val)}
                    </p>
                    {item.sub && <p className="text-[10px] text-slate-400">{item.sub}</p>}
                  </Card>
                ))}
              </div>

              {/* Escala progresiva PH */}
              {subjectType === 'persona_humana' && ganCalc.netIncome > 0 && (
                <Card padding="md">
                  <button className="w-full flex items-center justify-between text-sm font-semibold text-slate-700"
                    onClick={() => setShowTramos(!showTramos)}>
                    <span className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-purple-500" />
                      Escala progresiva aplicada (art. 90 Ley 20628)
                    </span>
                    {showTramos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showTramos && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-xs min-w-[400px]">
                        <thead>
                          <tr className="border-b-2 border-slate-200">
                            <th className="text-left py-1.5 px-2 text-slate-500">Tramo</th>
                            <th className="text-right py-1.5 px-2 text-slate-500">Base gravada</th>
                            <th className="text-right py-1.5 px-2 text-slate-500">Alícuota</th>
                            <th className="text-right py-1.5 px-2 text-slate-500 font-bold">Impuesto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(ganCalc.tramosPH || []).map((t, i) => (
                            <tr key={i} className={cn('border-b border-slate-100', t.base === ganCalc.netIncome ? 'bg-purple-50' : '')}>
                              <td className="py-1.5 px-2 text-slate-600">
                                {formatCurrency(t.desde)} – {t.hasta >= 99_999_999 ? '∞' : formatCurrency(t.hasta)}
                              </td>
                              <td className="py-1.5 px-2 text-right font-medium text-purple-700">{formatCurrency(t.base)}</td>
                              <td className="py-1.5 px-2 text-right">{Math.round(t.tasa * 100)}%</td>
                              <td className="py-1.5 px-2 text-right font-bold text-purple-800">{formatCurrency(t.impuesto)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-purple-200 bg-purple-50">
                            <td colSpan={3} className="py-2 px-2 font-bold text-purple-800">Total impuesto determinado</td>
                            <td className="py-2 px-2 text-right font-black text-purple-900">{formatCurrency(ganCalc.taxDetermined)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}

              {/* Anticipos */}
              <Card padding="md">
                <button className="w-full flex items-center justify-between text-sm font-semibold text-slate-700"
                  onClick={() => setShowAnticipOS(!showAnticipOS)}>
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-500" />
                    Anticipos Ganancias {fiscalYear + 1} (10 cuotas)
                  </span>
                  {showAnticipOS ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showAnticipOS && (
                  <div className="mt-3 space-y-2">
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-700">
                      <strong>Base de cálculo:</strong> {lastYearTax !== null
                        ? `Impuesto determinado ejercicio ${fiscalYear - 1}: ${formatCurrency(lastYearTax)}`
                        : `Estimado sobre ejercicio ${fiscalYear}: ${formatCurrency(ganCalc.taxDetermined)}`}.{' '}
                      Cada cuota: <strong>{Math.round(params.ganancias_anticipo_pct * 100)}%</strong> = <strong>{formatCurrency(anticipoCuota)}</strong>.
                      Vencimiento: día 15 de cada mes.
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {ANTICIPO_MESES.map((mes, i) => (
                        <div key={mes} className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-center">
                          <p className="text-[10px] text-slate-500">Cuota {i+1}</p>
                          <p className="text-[10px] font-bold text-slate-600">{mes} {fiscalYear + 1}</p>
                          <p className="text-xs font-black text-teal-700 mt-0.5">{formatCurrency(anticipoCuota)}</p>
                          <p className="text-[9px] text-slate-400">Vto: 15/{String(i+2).padStart(2,'0')}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      * Los anticipos se acreditan en la DDJJ anual siguiente. Si el impuesto real difiere en más de 20%, podés solicitar reducción (art. 180 DR Ley 20628).
                    </p>
                  </div>
                )}
              </Card>

              {/* Flujo */}
              <Card padding="md">
                <p className="text-sm font-semibold text-slate-700 mb-3">Flujo: DDJJ → VEP → Pago</p>
                <div className="flex flex-wrap gap-3">
                  <div className={cn('flex-1 min-w-[150px] p-3 rounded-xl border-2',
                    ganSubmitted ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200')}>
                    <StepHeader n={1} done={ganSubmitted} label="Presentar DDJJ" />
                    <p className="text-[10px] text-slate-500 mb-2">Declara el ejercicio {fiscalYear}.</p>
                    <Button size="sm" onClick={handleGanSubmit} loading={ganSaving} disabled={ganIsPaid} className="w-full">
                      {ganSubmitted ? 'Actualizar' : 'Presentar DDJJ'}
                    </Button>
                  </div>
                  {ganCalc.netPayable > 0 && (
                    <div className={cn('flex-1 min-w-[150px] p-3 rounded-xl border-2',
                      ganVep ? 'border-blue-400 bg-blue-50' : ganSubmitted ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-50')}>
                      <StepHeader n={2} done={!!ganVep} label="Generar VEP" />
                      <p className="text-[10px] text-slate-500 mb-2">
                        VEP por {formatCurrency(ganCalc.netPayable + ganMora)}
                        {ganMora > 0 && <span className="text-red-600"> (+ mora)</span>}.
                      </p>
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
                    <div className={cn('flex-1 min-w-[150px] p-3 rounded-xl border-2',
                      ganVepPaid ? 'border-emerald-400 bg-emerald-50' : ganVep ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-50')}>
                      <StepHeader n={3} done={ganVepPaid} label="Pagar" />
                      <p className="text-[10px] text-slate-500 mb-2">Simula pago y emite comprobante.</p>
                      <Button size="sm" onClick={handleGanPay} loading={ganSaving} disabled={!ganVep || ganVepPaid} className="w-full">
                        <CreditCard className="w-3 h-3 mr-1" />{ganVepPaid ? 'Pagado ✓' : 'Pagar ahora'}
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

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: NORMATIVA
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'normativa' && (
        <div className="space-y-4">

          {/* Obligaciones RI */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-slate-600" />
              <p className="text-sm font-bold text-slate-700">Responsable Inscripto — Obligaciones ARCA 2026</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    {['Obligación','Periodicidad','Vencimiento','Normativa'].map(h => (
                      <th key={h} className="text-left py-2 px-2 font-bold text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { ob: 'DDJJ IVA', per: 'Mensual', vto: 'Días 12-20 del mes siguiente (por penúlt. dígito CUIT)', norm: 'Ley 23349 · RG ARCA 715/99' },
                    { ob: 'Anticipo Ganancias', per: '10 cuotas (feb-nov)', vto: 'Día 15 de cada mes', norm: 'Art. 21 Ley 20628 · RG 5391/2023' },
                    { ob: 'DDJJ Ganancias anual', per: 'Anual', vto: '31 de mayo del año siguiente', norm: 'Ley 20628 · RG ARCA 5603/2025' },
                    { ob: 'Retenciones Ganancias (SICORE)', per: 'Quincenal', vto: 'Días 15 y último día del mes', norm: 'RG ARCA 4227/2018' },
                    { ob: 'Retenciones IVA (SIPER/RG 2854)', per: 'Mensual', vto: 'Mismo que DDJJ IVA', norm: 'RG ARCA 2854/2010' },
                    { ob: 'F.931 — Cargas sociales', per: 'Mensual', vto: 'Días 11-16 según CUIT', norm: 'Ley 24241 · RG ARCA 3834/2024' },
                    { ob: 'Bienes Personales (PH)', per: 'Anual', vto: 'Junio del año siguiente', norm: 'Ley 23966 tit. VI · RG ARCA 5577' },
                    { ob: 'IIBB (SIRCREB / Convenio Multilateral)', per: 'Mensual o bimestral', vto: 'Varía por jurisdicción', norm: 'Ley provincial · Convenio Multilateral' },
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

          {/* Vencimientos IVA por penúltimo dígito CUIT */}
          <Card padding="md">
            <p className="text-sm font-bold text-slate-700 mb-3">Vencimientos IVA por penúltimo dígito CUIT</p>
            <div className="grid grid-cols-5 gap-2">
              {[['0-1','12'],['2-3','14'],['4-5','16'],['6-7','18'],['8-9','20']].map(([dig, dia]) => (
                <div key={dig} className={cn('p-2 rounded-lg border text-center',
                  IVA_VTO_DIA[ivaCuitDig]?.toString() === dia ? 'bg-primary-50 border-primary-300' : 'bg-slate-50 border-slate-200')}>
                  <p className="text-lg font-black text-slate-800">{dia}</p>
                  <p className="text-[10px] text-slate-500">Dígito {dig}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Día del mes siguiente al período declarado. Fuente: RG ARCA (aproximación didáctica).</p>
          </Card>

          {/* Escala progresiva PH */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Percent className="w-4 h-4 text-purple-600" />
              <p className="text-sm font-bold text-slate-700">Escala progresiva PH — Art. 90 Ley 20628 (valores aprox. 2025/2026)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    {['Ganancia neta imponible desde','Hasta','Alíc. marg.','Impuesto fijo acumulado'].map(h => (
                      <th key={h} className="text-right py-1.5 px-2 font-bold text-slate-600 first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TRAMOS_PH_2026.map((t, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-purple-50">
                      <td className="py-1.5 px-2 text-left text-slate-700">{formatCurrency(t.desde)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-700">{t.hasta >= 99_999_999 ? '∞' : formatCurrency(t.hasta)}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-purple-700">{Math.round(t.tasa * 100)}%</td>
                      <td className="py-1.5 px-2 text-right text-slate-600">{formatCurrency(t.acumulado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Actualizados por índice RIPTE trimestralmente. Valores orientativos — verificar en ARCA para declaración real.
            </p>
          </Card>

          {/* Facturación RI */}
          <Card padding="md">
            <p className="text-sm font-bold text-slate-700 mb-3">Tipos de comprobantes — Responsable Inscripto</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { tipo: 'FACTURA A', color: 'bg-red-700', desc: 'Para ventas a Responsables Inscriptos y exentos',
                  items: ['IVA discriminado (21% general / 10,5% diferencial)', 'Genera crédito fiscal en el comprador RI', 'Requiere CUIT del receptor', 'Base imponible = precio neto (sin IVA)'] },
                { tipo: 'FACTURA B', color: 'bg-blue-700', desc: 'Para ventas a Consumidores Finales y Monotributistas',
                  items: ['IVA incluido en el precio (no discriminado)', 'Para CF, Monotributistas, no responsables', 'No genera crédito fiscal al receptor', 'No requiere CUIT si el total < umbral ARCA'] },
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

          {/* Alícuotas IVA */}
          <Card padding="md">
            <p className="text-sm font-bold text-slate-700 mb-3">Alícuotas IVA vigentes — ARCA 2026</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'General', val: '21%', sub: 'Bienes y servicios en general', color: 'bg-red-50 border-red-200 text-red-800' },
                { label: 'Diferencial', val: '10,5%', sub: 'Canasta básica, construcción, salud, transporte', color: 'bg-amber-50 border-amber-200 text-amber-800' },
                { label: 'Exento', val: '0%', sub: 'Medicamentos, libros, educación, exportaciones', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                { label: 'No gravado', val: '—', sub: 'Fuera del objeto del impuesto', color: 'bg-slate-50 border-slate-200 text-slate-700' },
              ].map(item => (
                <div key={item.label} className={cn('p-3 rounded-xl border text-center', item.color)}>
                  <p className="text-[10px] font-semibold mb-1">{item.label}</p>
                  <p className="text-2xl font-black mb-1">{item.val}</p>
                  <p className="text-[9px] leading-tight opacity-80">{item.sub}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Ganancias parámetros */}
          <Card padding="md">
            <p className="text-sm font-bold text-slate-700 mb-3">Ganancias — Parámetros clave 2026</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-600 mb-2">Personas Jurídicas (PJ)</p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>Alícuota única: <strong>35%</strong> sobre utilidad neta (art. 73 Ley 20628)</li>
                  <li>Sin MNI ni deducciones personales</li>
                  <li>Ajuste por inflación: obligatorio (Ley 27430 art. 106)</li>
                  <li>Anticipos: {Math.round(params.ganancias_anticipo_pct * 100)}% del impuesto anterior × 10 cuotas</li>
                  <li>Retenciones a cuenta (SICORE)</li>
                </ul>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-600 mb-2">Personas Humanas (PH) — 3ra categoría (RI)</p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>Escala progresiva 5% a 35% (art. 90)</li>
                  <li>MNI anual: ~{formatCurrency(params.ganancias_mni_mensual * 12)}</li>
                  <li>Deducción especial independiente: ~{formatCurrency(params.ganancias_mni_mensual * 12 * 1.5)}</li>
                  <li>Deducciones por cónyuge, hijos, gastos médicos</li>
                  <li>Bienes Personales también es obligación (Ley 23966)</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Sanciones — actualizadas */}
          <Card padding="md" className="bg-red-50 border-red-200">
            <p className="text-sm font-bold text-red-800 mb-2">Sanciones por incumplimiento — Ley 11683 (valores actualizados 2025/2026)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-red-700">
              <div>
                <p className="font-bold mb-1">Interés resarcitorio (art. 37)</p>
                <p><strong>{Math.round(params.mora_tasa_mensual * 100)}%/mes</strong> sobre deuda impaga</p>
                <p className="text-[10px] text-red-500 mt-0.5">Se aplica desde el día siguiente al vencimiento</p>
              </div>
              <div>
                <p className="font-bold mb-1">Multa por omisión (art. 45)</p>
                <p><strong>50% a 100%</strong> del impuesto no ingresado</p>
                <p className="text-[10px] text-red-500 mt-0.5">+200% si hay dolo (art. 46)</p>
              </div>
              <div>
                <p className="font-bold mb-1">No presentación (art. 38)</p>
                <p><strong>$600 a $60.000</strong> por DDJJ no presentada</p>
                <p className="text-[10px] text-red-500 mt-0.5">Actualizado por RG 5496/2023 (valores originales 2001 eran $200-$400)</p>
              </div>
            </div>
            <p className="text-[10px] text-red-600 mt-3 font-medium">
              Infracciones formales (art. 39): hasta $300.000. Los montos se actualizan periódicamente por resolución ARCA.
            </p>
          </Card>

        </div>
      )}
    </div>
  )
}

// ── Componente auxiliar ───────────────────────────────────────────────────────
function StepHeader({ n, done, label }: { n: number; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className={cn('w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0',
        done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600')}>
        {done ? '✓' : n}
      </div>
      <p className="text-xs font-bold text-slate-700">{label}</p>
    </div>
  )
}
