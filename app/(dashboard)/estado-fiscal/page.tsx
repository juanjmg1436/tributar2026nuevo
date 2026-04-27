'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { formatCurrency, formatDate } from '@/lib/utils'
import { currentPeriod, formatPeriod, calcComplianceScore } from '@/lib/fiscal-engine'
import { AlertTriangle, CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, RefreshCw, CreditCard } from 'lucide-react'

type ObligationStatus = 'ok' | 'pending' | 'overdue' | 'not_applicable'

interface ObligationCard {
  label: string
  status: ObligationStatus
  amount: number
  dueDate?: string
  detail?: string
  href: string
}

function StatusIcon({ status }: { status: ObligationStatus | string }) {
  if (status === 'ok' || status === 'paid' || status === 'credit') return <CheckCircle className="w-5 h-5 text-emerald-500" />
  if (status === 'overdue') return <XCircle className="w-5 h-5 text-red-500" />
  if (status === 'pending' || status === 'submitted') return <Clock className="w-5 h-5 text-amber-500" />
  return <AlertCircle className="w-5 h-5 text-slate-400" />
}

function StatusBadge({ status }: { status: ObligationStatus | string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ok: { label: 'Al día', cls: 'bg-emerald-100 text-emerald-700' },
    paid: { label: 'Pagado', cls: 'bg-emerald-100 text-emerald-700' },
    credit: { label: 'Saldo a favor', cls: 'bg-blue-100 text-blue-700' },
    submitted: { label: 'Presentado', cls: 'bg-blue-100 text-blue-700' },
    pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
    overdue: { label: 'Vencido', cls: 'bg-red-100 text-red-700' },
    not_applicable: { label: 'No aplica', cls: 'bg-slate-100 text-slate-500' },
    confirmed: { label: 'Confirmado', cls: 'bg-blue-100 text-blue-700' },
    draft: { label: 'Borrador', cls: 'bg-slate-100 text-slate-500' },
  }
  const { label, cls } = map[status] || { label: status, cls: 'bg-slate-100 text-slate-500' }
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

export default function EstadoFiscalPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [period] = useState(currentPeriod())
  const [data, setData] = useState<any>({})
  const [veps, setVeps] = useState<any[]>([])

  useEffect(() => { if (!user) return; loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const db = supabase as any
    const year = new Date().getFullYear()

    const [
      vatRes, monoProfileRes, monoPayRes, payrollRes,
      ssRes, incomeTaxRes, vepRes, iibbRes,
    ] = await Promise.all([
      db.from('vat_returns').select('*').eq('user_id', user!.id).eq('period', period).maybeSingle(),
      db.from('monotributo_profiles').select('*').eq('user_id', user!.id).maybeSingle(),
      db.from('monotributo_payments').select('*').eq('user_id', user!.id).eq('period', period).maybeSingle(),
      db.from('payroll_runs').select('*').eq('user_id', user!.id).eq('period', period).maybeSingle(),
      db.from('social_security_returns').select('*').eq('user_id', user!.id).eq('period', period).maybeSingle(),
      db.from('income_tax_returns').select('*').eq('user_id', user!.id).eq('fiscal_year', year).maybeSingle(),
      db.from('simulated_veps').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10),
      db.from('prov_iibb_ddjj').select('*').eq('user_id', user!.id).eq('period', period).maybeSingle(),
    ])

    setData({ vatRes: vatRes.data, monoProfile: monoProfileRes.data, monoPayment: monoPayRes.data, payrollRun: payrollRes.data, ssReturn: ssRes.data, incomeTax: incomeTaxRes.data, iibb: iibbRes.data })
    setVeps(vepRes.data || [])
    setLoading(false)
  }

  const { vatRes, monoProfile, monoPayment, payrollRun, ssReturn, incomeTax, iibb } = data

  // Compute compliance score
  const obligations: { status: string }[] = []
  if (vatRes) obligations.push({ status: vatRes.status })
  if (monoPayment) obligations.push({ status: monoPayment.status })
  if (ssReturn) obligations.push({ status: ssReturn.status })
  if (incomeTax) obligations.push({ status: incomeTax.status })
  if (iibb) obligations.push({ status: iibb.status })
  const score = calcComplianceScore(obligations)

  const overdue = obligations.filter(o => o.status === 'overdue').length
  const pending = obligations.filter(o => o.status === 'pending' || o.status === 'submitted').length
  const ok = obligations.filter(o => o.status === 'paid' || o.status === 'credit' || o.status === 'ok').length

  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'
  const scoreBarColor = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'

  // Determinar régimen
  const isMonotributista = !!monoProfile
  const hasEmployees = !!payrollRun

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer title="Estado fiscal integral" subtitle={`Resumen de obligaciones tributarias — ${formatPeriod(period)}`}>
      {/* Disclaimer */}
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {/* Score general */}
      <Card padding="md" className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5">Puntaje de cumplimiento fiscal</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-5xl font-black ${scoreColor}`}>{score}</p>
              <p className="text-xl text-slate-400">/100</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-sm font-bold ${scoreColor}`}>
              {score >= 90 ? '🌟 Excelente' : score >= 70 ? '✅ Bueno' : score >= 50 ? '⚠ Regular' : '❌ Atención'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{ok} al día · {pending} pendiente · {overdue} vencido</p>
          </div>
          <button onClick={loadData} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${scoreBarColor}`} style={{ width: `${score}%` }} />
        </div>
        <div className="mt-3 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-600">
            {score >= 90
              ? '¡Cumplimiento excelente! Todas las obligaciones están presentadas y pagadas. Seguí así.'
              : score >= 70
              ? 'Cumplimiento bueno. Revisá las obligaciones pendientes para evitar intereses por mora.'
              : score >= 50
              ? 'Cumplimiento regular. Tenés obligaciones sin presentar o pagar. Regularizá antes del vencimiento.'
              : 'Atención: cumplimiento bajo. Las obligaciones vencidas generan intereses del ' + (3) + '% mensual y multas por omisión. Regularizá urgente.'}
          </p>
        </div>
      </Card>

      {/* Obligaciones por módulo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {/* IVA */}
        <Card padding="md" className={`border-l-4 ${vatRes ? (vatRes.status === 'paid' ? 'border-l-emerald-400' : vatRes.status === 'credit' ? 'border-l-blue-400' : 'border-l-amber-400') : isMonotributista ? 'border-l-slate-200' : 'border-l-slate-300'}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <StatusIcon status={vatRes?.status || (isMonotributista ? 'not_applicable' : 'pending')} />
              <p className="text-sm font-semibold text-slate-700">IVA</p>
            </div>
            <StatusBadge status={vatRes?.status || (isMonotributista ? 'not_applicable' : 'pending')} />
          </div>
          {isMonotributista && !vatRes && (
            <p className="text-xs text-slate-500">No aplica (Monotributo incluye IVA en la cuota).</p>
          )}
          {!isMonotributista && !vatRes && (
            <p className="text-xs text-amber-600">DDJJ de {formatPeriod(period)} sin presentar.</p>
          )}
          {vatRes && (
            <>
              <p className="text-xs text-slate-600">{vatRes.net_payable > 0 ? `A pagar: ${formatCurrency(vatRes.net_payable)}` : `Saldo a favor: ${formatCurrency(vatRes.credit_balance)}`}</p>
              {vatRes.due_date && <p className="text-xs text-slate-400">Vence: {formatDate(vatRes.due_date)}</p>}
            </>
          )}
          <a href="/iva" className="text-xs text-primary-600 hover:underline mt-2 block">→ Ir a IVA</a>
        </Card>

        {/* Monotributo */}
        <Card padding="md" className={`border-l-4 ${monoPayment?.status === 'paid' ? 'border-l-emerald-400' : monoProfile ? 'border-l-amber-400' : 'border-l-slate-200'}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <StatusIcon status={monoPayment?.status || (monoProfile ? 'pending' : 'not_applicable')} />
              <p className="text-sm font-semibold text-slate-700">Monotributo</p>
            </div>
            <StatusBadge status={monoPayment?.status || (monoProfile ? 'pending' : 'not_applicable')} />
          </div>
          {monoProfile ? (
            <>
              <p className="text-xs text-slate-600">Categoría {monoProfile.category_code} · {monoProfile.activity_type}</p>
              {monoPayment ? (
                <p className="text-xs text-slate-600">Cuota {formatPeriod(period)}: {formatCurrency(monoPayment.total_amount)}</p>
              ) : (
                <p className="text-xs text-amber-600">Cuota de {formatPeriod(period)} sin pagar.</p>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500">No hay perfil monotributista configurado.</p>
          )}
          <a href="/monotributo" className="text-xs text-primary-600 hover:underline mt-2 block">→ Ir a Monotributo</a>
        </Card>

        {/* Ganancias */}
        <Card padding="md" className={`border-l-4 ${incomeTax?.status === 'paid' ? 'border-l-emerald-400' : incomeTax ? 'border-l-amber-400' : 'border-l-slate-200'}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <StatusIcon status={incomeTax?.status || 'not_applicable'} />
              <p className="text-sm font-semibold text-slate-700">Ganancias</p>
            </div>
            <StatusBadge status={incomeTax?.status || 'not_applicable'} />
          </div>
          {incomeTax ? (
            <>
              <p className="text-xs text-slate-600">Ejercicio {incomeTax.fiscal_year} · {formatCurrency(incomeTax.net_payable)} a ingresar</p>
              <p className="text-xs text-slate-400">Vence: {formatDate(incomeTax.due_date)}</p>
            </>
          ) : (
            <p className="text-xs text-slate-500">No hay DDJJ de Ganancias para el ejercicio actual.</p>
          )}
          <a href="/ganancias" className="text-xs text-primary-600 hover:underline mt-2 block">→ Ir a Ganancias</a>
        </Card>

        {/* Cargas sociales */}
        <Card padding="md" className={`border-l-4 ${ssReturn?.status === 'paid' ? 'border-l-emerald-400' : ssReturn ? 'border-l-amber-400' : hasEmployees ? 'border-l-orange-300' : 'border-l-slate-200'}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <StatusIcon status={ssReturn?.status || (hasEmployees ? 'pending' : 'not_applicable')} />
              <p className="text-sm font-semibold text-slate-700">Cargas Sociales (F.931)</p>
            </div>
            <StatusBadge status={ssReturn?.status || (hasEmployees ? 'pending' : 'not_applicable')} />
          </div>
          {hasEmployees && !ssReturn && (
            <p className="text-xs text-amber-600">Liquidación confirmada sin F.931 presentado.</p>
          )}
          {!hasEmployees && !ssReturn && (
            <p className="text-xs text-slate-500">Sin empleados — no aplica este período.</p>
          )}
          {ssReturn && (
            <>
              <p className="text-xs text-slate-600">{payrollRun?.employee_count} empleados · {formatCurrency(ssReturn.total_payable)}</p>
              <p className="text-xs text-slate-400">Vence: {formatDate(ssReturn.due_date)}</p>
            </>
          )}
          <a href="/cargas-sociales" className="text-xs text-primary-600 hover:underline mt-2 block">→ Ir a Cargas Sociales</a>
        </Card>

        {/* IIBB Provincial */}
        <Card padding="md" className={`border-l-4 ${iibb?.status === 'paid' ? 'border-l-emerald-400' : iibb ? 'border-l-amber-400' : 'border-l-slate-200'} sm:col-span-2`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <StatusIcon status={iibb?.status || 'not_applicable'} />
              <p className="text-sm font-semibold text-slate-700">IIBB Provincial (ATM Misiones)</p>
            </div>
            <StatusBadge status={iibb?.status || 'not_applicable'} />
          </div>
          {iibb ? (
            <>
              <p className="text-xs text-slate-600">DDJJ {formatPeriod(period)} · {formatCurrency(iibb.net_payable || 0)}</p>
              {iibb.due_date && <p className="text-xs text-slate-400">Vence: {formatDate(iibb.due_date)}</p>}
            </>
          ) : (
            <p className="text-xs text-slate-500">No hay DDJJ de IIBB presentada para {formatPeriod(period)}.</p>
          )}
          <a href="/misiones/iibb" className="text-xs text-primary-600 hover:underline mt-2 block">→ Ir a IIBB Misiones</a>
        </Card>
      </div>

      {/* Últimos VEPs */}
      {veps.length > 0 && (
        <Card padding="md" className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-700">Últimos VEPs</p>
          </div>
          <div className="space-y-1.5">
            {veps.map(v => (
              <div key={v.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                <div className="flex-1">
                  <p className="font-semibold text-slate-700">{v.concept}</p>
                  <p className="text-slate-400">{v.vep_number} · Vence: {formatDate(v.due_date)}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-bold text-slate-800">{formatCurrency(v.amount)}</p>
                  <StatusBadge status={v.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Alertas pedagógicas */}
      {overdue > 0 && (
        <Card padding="md" className="mb-5 bg-red-50 border-red-200">
          <p className="text-sm font-bold text-red-700 mb-1">⚠ Obligaciones vencidas detectadas</p>
          <p className="text-xs text-red-600">
            Tenés {overdue} obligación(es) vencida(s). En la realidad, esto genera:
            <br />• <strong>Intereses resarcitorios</strong>: 3% mensual sobre el saldo impago.
            <br />• <strong>Multas por omisión</strong>: 50% del impuesto omitido (artículo 45, Ley 11683).
            <br />• Posibilidad de exclusión de beneficios (exenciones, planes de pago).
            <br />→ Regularizá cuanto antes para minimizar el costo fiscal.
          </p>
        </Card>
      )}

      {obligations.length === 0 && (
        <Card padding="lg" className="text-center">
          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No hay obligaciones registradas para {formatPeriod(period)}.</p>
          <p className="text-xs text-slate-400 mt-1">Comenzá cargando compras/ventas y presentando las DDJJ desde cada módulo.</p>
        </Card>
      )}

      {/* Accesos directos */}
      <div className="flex flex-wrap gap-2 mt-2">
        {[
          { href: '/compras', label: 'Compras' },
          { href: '/iva', label: 'IVA' },
          { href: '/monotributo', label: 'Monotributo' },
          { href: '/ganancias', label: 'Ganancias' },
          { href: '/empleados', label: 'Empleados' },
          { href: '/sueldos', label: 'Sueldos' },
          { href: '/cargas-sociales', label: 'Cargas Sociales' },
          { href: '/misiones', label: 'ATM Misiones' },
        ].map(l => (
          <a key={l.href} href={l.href}>
            <button className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              {l.label}
            </button>
          </a>
        ))}
      </div>
    </PageContainer>
  )
}
