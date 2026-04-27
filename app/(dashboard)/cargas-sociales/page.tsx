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
import { formatPeriod, currentPeriod, generateVepNumber, generateComprobanteNumber } from '@/lib/fiscal-engine'
import { AlertTriangle, Info, RefreshCw, CheckCircle, CreditCard, FileText } from 'lucide-react'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function CargasSocialesPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filterPeriod, setFilterPeriod] = useState(currentPeriod())

  const [employer, setEmployer] = useState<any>(null)
  const [payrollRun, setPayrollRun] = useState<any>(null)
  const [existingReturn, setExistingReturn] = useState<any>(null)
  const [existingVep, setExistingVep] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState('transferencia')

  useEffect(() => { if (!user) return; loadData() }, [user, filterPeriod])

  async function loadData() {
    setLoading(true)
    const db = supabase as any
    const [empRes, runRes, retRes] = await Promise.all([
      db.from('employers').select('*').eq('user_id', user!.id).maybeSingle(),
      db.from('payroll_runs').select('*').eq('user_id', user!.id).eq('period', filterPeriod).maybeSingle(),
      db.from('social_security_returns').select('*').eq('user_id', user!.id).eq('period', filterPeriod).maybeSingle(),
    ])
    setEmployer(empRes.data)
    setPayrollRun(runRes.data)
    setExistingReturn(retRes.data)

    if (retRes.data) {
      const vepRes = await db.from('simulated_veps')
        .select('*').eq('user_id', user!.id).eq('period', filterPeriod)
        .eq('obligation_type', 'cargas_sociales').maybeSingle()
      setExistingVep(vepRes.data)
    } else {
      setExistingVep(null)
    }
    setLoading(false)
  }

  // Datos del payroll run
  const totalWorkerContributions = payrollRun?.total_worker_deductions || 0
  const totalEmployerContributions = payrollRun?.total_employer_contributions || 0
  const totalPayable = totalWorkerContributions + totalEmployerContributions

  // Vencimiento: día 10 del mes siguiente (F.931)
  const [yr, mo] = filterPeriod.split('-').map(Number)
  const nextMo = mo === 12 ? 1 : mo + 1
  const nextYr = mo === 12 ? yr + 1 : yr
  const dueDate = `${nextYr}-${String(nextMo).padStart(2, '0')}-10`

  async function handleSubmit() {
    if (!user || !employer || !payrollRun) return
    setSaving(true); setError(null)
    try {
      const db = supabase as any
      const payload = {
        user_id: user.id,
        employer_id: employer.id,
        payroll_run_id: payrollRun.id,
        period: filterPeriod,
        period_label: formatPeriod(filterPeriod),
        due_date: dueDate,
        total_worker_contributions: totalWorkerContributions,
        total_employer_contributions: totalEmployerContributions,
        total_payable: totalPayable,
        surcharge: 0,
        status: 'submitted',
      }
      if (existingReturn) {
        await db.from('social_security_returns').update(payload).eq('id', existingReturn.id)
      } else {
        await db.from('social_security_returns').insert(payload)
      }
      setSuccess('DDJJ F.931 presentada (simulación).')
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
        obligation_type: 'cargas_sociales',
        concept: `Cargas Sociales F.931 — ${formatPeriod(filterPeriod)}`,
        period: filterPeriod,
        amount: totalPayable,
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
      await db.from('social_security_returns').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', existingReturn.id)
      setSuccess(`Pago registrado. Comprobante: ${comp}`)
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

  const isSubmitted = existingReturn?.status === 'submitted' || existingReturn?.status === 'paid'
  const isPaid = existingReturn?.status === 'paid'
  const vepPaid = existingVep?.status === 'paid'

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer title="Cargas Sociales (F.931)" subtitle="Declaración jurada de aportes y contribuciones (simulación didáctica)">
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>F.931 — Declaración Jurada de Cargas Sociales:</strong> Mensualmente, el empleador debe presentar el formulario F.931 informando
          los aportes retenidos a los trabajadores y las contribuciones patronales. El total se ingresa mediante VEP antes del día 10 del mes siguiente.
          Este formulario alimenta la historia laboral de cada trabajador en ANSES.
        </p>
      </div>

      {!employer && <Alert variant="warning" className="mb-4">Registrá la empresa en <a href="/empleados" className="underline font-semibold">Empleados</a> primero.</Alert>}
      {employer && !payrollRun && (
        <Alert variant="warning" className="mb-4">
          No hay liquidación de sueldos confirmada para {formatPeriod(filterPeriod)}. Generala en <a href="/sueldos" className="underline font-semibold">Liquidación de sueldos</a>.
        </Alert>
      )}

      {/* Período */}
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

      {/* Estado */}
      {existingReturn && (
        <div className={`mb-5 p-3 rounded-xl border flex items-center gap-3 ${isPaid ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
          <CheckCircle className={`w-5 h-5 ${isPaid ? 'text-emerald-600' : 'text-blue-600'}`} />
          <p className={`text-sm font-semibold ${isPaid ? 'text-emerald-700' : 'text-blue-700'}`}>
            {isPaid ? 'F.931 presentado y pagado' : 'F.931 presentado — pendiente de pago'}
          </p>
        </div>
      )}

      {/* Resumen */}
      {payrollRun && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <Card padding="md" className="text-center border-l-4 border-l-red-400">
              <p className="text-xs font-semibold text-slate-500 mb-1">Aportes trabajadores</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalWorkerContributions)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Retenidos del sueldo bruto (17%)</p>
            </Card>
            <Card padding="md" className="text-center border-l-4 border-l-orange-400">
              <p className="text-xs font-semibold text-slate-500 mb-1">Contribuciones patronales</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(totalEmployerContributions)}</p>
              <p className="text-xs text-slate-400 mt-0.5">A cargo de la empresa (≈30%)</p>
            </Card>
            <Card padding="md" className="text-center border-l-4 border-l-primary-400">
              <p className="text-xs font-semibold text-slate-500 mb-1">Total a ingresar</p>
              <p className="text-xl font-bold text-primary-700">{formatCurrency(totalPayable)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Vence: {formatDate(dueDate)}</p>
            </Card>
          </div>

          {/* Desglose de la DDJJ */}
          <Card padding="md" className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-700">F.931 — Desglose</p>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Empleados declarados</span>
                <span className="font-semibold">{payrollRun.employee_count}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Masa salarial bruta</span>
                <span className="font-semibold">{formatCurrency(payrollRun.total_gross)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-red-600">
                <span>Aportes trabajadores (jubilación 11% + OS 3% + PAMI 3%)</span>
                <span className="font-bold">{formatCurrency(totalWorkerContributions)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-orange-600">
                <span>Contribuciones patronales (jubil. 16% + OS 6% + ART + AF + FE + SV)</span>
                <span className="font-bold">{formatCurrency(totalEmployerContributions)}</span>
              </div>
              <div className="flex justify-between py-2 text-base font-bold bg-slate-50 px-3 rounded-lg">
                <span>TOTAL F.931</span>
                <span className="text-primary-700">{formatCurrency(totalPayable)}</span>
              </div>
            </div>
          </Card>

          {/* Flujo presentación + VEP + pago */}
          <Card padding="md" className="mb-5">
            <p className="text-sm font-semibold text-slate-700 mb-4">Flujo: F.931 → VEP → Pago</p>
            <div className="flex flex-wrap gap-3">
              <div className={`flex-1 min-w-[180px] p-3 rounded-xl border-2 ${isSubmitted ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isSubmitted ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>1</div>
                  <p className="text-sm font-semibold text-slate-700">Presentar F.931</p>
                </div>
                <p className="text-xs text-slate-500 mb-3">Declara aportes y contribuciones del período.</p>
                <Button size="sm" onClick={handleSubmit} loading={saving} disabled={isPaid} className="w-full">
                  {isSubmitted ? 'Actualizar F.931' : 'Presentar F.931'}
                </Button>
              </div>

              <div className={`flex-1 min-w-[180px] p-3 rounded-xl border-2 ${existingVep ? 'border-blue-400 bg-blue-50' : isSubmitted ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${existingVep ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>2</div>
                  <p className="text-sm font-semibold text-slate-700">Generar VEP</p>
                </div>
                <p className="text-xs text-slate-500 mb-2">VEP por {formatCurrency(totalPayable)}.</p>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded text-xs mb-2" disabled={!isSubmitted || vepPaid}>
                  <option value="transferencia">Transferencia</option>
                  <option value="debito_automatico">Débito automático</option>
                </select>
                <Button size="sm" variant="outline" onClick={handleGenerateVep} loading={saving} disabled={!isSubmitted || vepPaid} className="w-full">
                  {existingVep ? `VEP: ${existingVep.vep_number?.slice(-8)}` : 'Generar VEP'}
                </Button>
              </div>

              <div className={`flex-1 min-w-[180px] p-3 rounded-xl border-2 ${vepPaid ? 'border-emerald-400 bg-emerald-50' : existingVep ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-50'}`}>
                <div className="flex items-center gap-2 mb-2">
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
            </div>
          </Card>
        </>
      )}

      <div className="flex gap-3 flex-wrap">
        <a href="/sueldos"><Button variant="outline" size="sm">← Liquidación de sueldos</Button></a>
        <a href="/estado-fiscal"><Button variant="outline" size="sm">Estado fiscal integral →</Button></a>
      </div>
    </PageContainer>
  )
}
