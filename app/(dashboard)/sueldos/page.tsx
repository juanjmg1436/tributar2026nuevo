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
import { calculatePayroll, calculatePayrollSummary } from '@/lib/fiscal-engine/payroll'
import { formatPeriod, currentPeriod } from '@/lib/fiscal-engine'
import type { Employee, PayrollCalculation } from '@/types/fiscal'
import { AlertTriangle, Info, RefreshCw, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function SueldosPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()
  const { params } = useFiscalParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filterPeriod, setFilterPeriod] = useState(currentPeriod())

  const [employees, setEmployees] = useState<Employee[]>([])
  const [employer, setEmployer] = useState<any>(null)
  const [existingRun, setExistingRun] = useState<any>(null)
  const [existingItems, setExistingItems] = useState<any[]>([])

  // Haberes adicionales por trabajador
  const [extras, setExtras] = useState<Record<string, { overtime: string; presentismo: string; bonuses: string; non_remunerative: string; other_deductions: string }>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { if (!user) return; loadData() }, [user, filterPeriod])

  async function loadData() {
    setLoading(true)
    const db = supabase as any
    const [empRes, workRes, runRes] = await Promise.all([
      db.from('employers').select('*').eq('user_id', user!.id).maybeSingle(),
      db.from('employees').select('*').eq('user_id', user!.id).eq('status', 'active').order('full_name'),
      db.from('payroll_runs').select('*').eq('user_id', user!.id).eq('period', filterPeriod).maybeSingle(),
    ])
    setEmployer(empRes.data)
    setEmployees(workRes.data || [])
    setExistingRun(runRes.data)

    if (runRes.data) {
      const itemsRes = await db.from('payroll_items').select('*').eq('payroll_run_id', runRes.data.id)
      setExistingItems(itemsRes.data || [])
    } else {
      setExistingItems([])
    }

    // Init extras
    const init: typeof extras = {}
    for (const w of workRes.data || []) {
      init[w.id] = { overtime: '', presentismo: '', bonuses: '', non_remunerative: '', other_deductions: '' }
    }
    setExtras(init)
    setLoading(false)
  }

  // Calcular liquidación
  const calculations: PayrollCalculation[] = employees.map(emp => {
    const ex = extras[emp.id] || {}
    return calculatePayroll(emp, {
      basic_salary: emp.basic_salary,
      overtime: parseFloat(ex.overtime) || 0,
      presentismo: parseFloat(ex.presentismo) || 0,
      bonuses: parseFloat(ex.bonuses) || 0,
      non_remunerative: parseFloat(ex.non_remunerative) || 0,
      other_deductions: parseFloat(ex.other_deductions) || 0,
    }, params)
  })

  const summary = calculatePayrollSummary(calculations)

  async function handleConfirm() {
    if (!user || !employer) return
    if (employees.length === 0) { setError('No hay empleados activos para liquidar.'); return }
    setSaving(true); setError(null)
    try {
      const db = supabase as any
      let runId: string

      const runPayload = {
        user_id: user.id,
        employer_id: employer.id,
        period: filterPeriod,
        period_label: formatPeriod(filterPeriod),
        employee_count: summary.employeeCount,
        total_gross: summary.totalGross,
        total_worker_deductions: summary.totalWorkerDeductions,
        total_net: summary.totalNet,
        total_employer_contributions: summary.totalEmployerContributions,
        total_labor_cost: summary.totalLaborCost,
        status: 'confirmed',
      }

      if (existingRun) {
        await db.from('payroll_runs').update(runPayload).eq('id', existingRun.id)
        await db.from('payroll_items').delete().eq('payroll_run_id', existingRun.id)
        runId = existingRun.id
      } else {
        const { data, error: err } = await db.from('payroll_runs').insert(runPayload).select('id').single()
        if (err) throw new Error(err.message)
        runId = data.id
      }

      // Insert items
      const items = calculations.map(c => ({
        payroll_run_id: runId,
        employee_id: c.employee.id,
        user_id: user.id,
        basic_salary: c.employee.basic_salary,
        overtime: parseFloat(extras[c.employee.id]?.overtime) || 0,
        presentismo: parseFloat(extras[c.employee.id]?.presentismo) || 0,
        bonuses: parseFloat(extras[c.employee.id]?.bonuses) || 0,
        other_remunerative: 0,
        non_remunerative: parseFloat(extras[c.employee.id]?.non_remunerative) || 0,
        total_gross: c.totalGross,
        jubilacion_worker: c.jubilacionWorker,
        obra_social_worker: c.obraSocialWorker,
        pami_worker: c.pamiWorker,
        other_deductions: parseFloat(extras[c.employee.id]?.other_deductions) || 0,
        total_worker_deductions: c.totalWorkerDeductions,
        net_salary: c.netSalary,
        jubilacion_employer: c.jubilacionEmployer,
        obra_social_employer: c.obraSocialEmployer,
        art_employer: c.artEmployer,
        family_allowances: c.familyAllowances,
        employment_fund: c.employmentFund,
        life_insurance: c.lifeInsurance,
        total_employer_contributions: c.totalEmployerContributions,
        total_labor_cost: c.totalLaborCost,
      }))
      await db.from('payroll_items').insert(items)

      setSuccess(`Liquidación de ${formatPeriod(filterPeriod)} confirmada. ${employees.length} trabajadores.`)
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al confirmar') }
    finally { setSaving(false) }
  }

  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { value: val, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` }
  })

  const inputSm = 'w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-400'

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer title="Liquidación de sueldos" subtitle="Recibos de sueldo y cargas patronales (simulación didáctica)">
      {/* Disclaimer */}
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {/* Info pedagógica */}
      <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Liquidación de sueldos:</strong> El salario bruto del trabajador tiene dos cargas:
          (1) <em>Aportes del trabajador</em>: 11% jubilación + 3% obra social + 3% PAMI = 17% sobre el salario bruto remunerativo.
          (2) <em>Contribuciones patronales</em>: ~30% a cargo de la empresa (jubilación 16%, OS 6%, PAMI 3%, asig. familiares 7.5%, fondo de empleo 0.89%, ART 1.5%, seguro de vida).
          El <em>costo laboral total</em> = sueldo bruto + contribuciones patronales.
        </p>
      </div>

      {!employer && (
        <Alert variant="warning" className="mb-4">
          Primero registrá la empresa empleadora en <a href="/empleados" className="underline font-semibold">Empleados</a>.
        </Alert>
      )}
      {employer && employees.length === 0 && (
        <Alert variant="warning" className="mb-4">
          No hay empleados activos. Dá de alta trabajadores en <a href="/empleados" className="underline font-semibold">Empleados</a>.
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
        {existingRun && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${existingRun.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {existingRun.status === 'confirmed' ? '✓ Confirmada' : 'Borrador'}
          </span>
        )}
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      {/* Resumen total */}
      {employees.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-slate-800">{formatCurrency(summary.totalGross)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Bruto total</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-red-600">{formatCurrency(summary.totalWorkerDeductions)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Aportes trabajadores</p>
          </Card>
          <Card padding="sm" className="text-center bg-emerald-50 border-emerald-200">
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(summary.totalNet)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Neto a pagar</p>
          </Card>
          <Card padding="sm" className="text-center bg-orange-50 border-orange-200">
            <p className="text-lg font-bold text-orange-600">{formatCurrency(summary.totalLaborCost)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Costo laboral total</p>
          </Card>
        </div>
      )}

      {/* Lista de liquidaciones por trabajador */}
      {calculations.length > 0 && (
        <div className="space-y-3 mb-5">
          {calculations.map((calc, i) => {
            const emp = calc.employee
            const ex = extras[emp.id] || {}
            const isExpanded = expandedId === emp.id
            return (
              <Card key={emp.id} padding="none">
                <div className="p-3">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{emp.full_name}</p>
                      <p className="text-xs text-slate-500">{emp.position} · Básico: {formatCurrency(emp.basic_salary)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-700">{formatCurrency(calc.netSalary)}</p>
                      <p className="text-xs text-slate-400">Neto de bolsillo</p>
                    </div>
                    <button onClick={() => setExpandedId(isExpanded ? null : emp.id)} className="ml-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Resumen rápido */}
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>Bruto: <strong className="text-slate-700">{formatCurrency(calc.totalGross)}</strong></span>
                    <span>Aportes: <strong className="text-red-600">{formatCurrency(calc.totalWorkerDeductions)}</strong></span>
                    <span>Contrib.: <strong className="text-orange-600">{formatCurrency(calc.totalEmployerContributions)}</strong></span>
                    <span>Costo: <strong className="text-slate-800">{formatCurrency(calc.totalLaborCost)}</strong></span>
                  </div>

                  {/* Detalle expandido */}
                  {isExpanded && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      {/* Haberes adicionales */}
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Haberes adicionales</p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                        {[
                          { key: 'overtime', label: 'Horas extras' },
                          { key: 'presentismo', label: 'Presentismo' },
                          { key: 'bonuses', label: 'Bonificaciones' },
                          { key: 'non_remunerative', label: 'No remunerativo' },
                          { key: 'other_deductions', label: 'Otras deducc.' },
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">{label}</label>
                            <input
                              type="number" min="0"
                              value={(ex as any)[key]}
                              onChange={e => setExtras(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], [key]: e.target.value } }))}
                              className={inputSm}
                              placeholder="0"
                              disabled={existingRun?.status === 'confirmed'}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Recibo detallado */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="font-bold text-slate-600 mb-1">HABERES</p>
                          <div className="space-y-0.5">
                            <div className="flex justify-between"><span>Salario básico</span><span>{formatCurrency(emp.basic_salary)}</span></div>
                            {parseFloat(ex.overtime) > 0 && <div className="flex justify-between"><span>Horas extras</span><span>{formatCurrency(parseFloat(ex.overtime))}</span></div>}
                            {parseFloat(ex.presentismo) > 0 && <div className="flex justify-between"><span>Presentismo</span><span>{formatCurrency(parseFloat(ex.presentismo))}</span></div>}
                            {parseFloat(ex.bonuses) > 0 && <div className="flex justify-between"><span>Bonificaciones</span><span>{formatCurrency(parseFloat(ex.bonuses))}</span></div>}
                            {parseFloat(ex.non_remunerative) > 0 && <div className="flex justify-between text-slate-400"><span>No remunerativo</span><span>{formatCurrency(parseFloat(ex.non_remunerative))}</span></div>}
                            <div className="flex justify-between font-bold border-t border-slate-200 pt-0.5"><span>TOTAL BRUTO</span><span>{formatCurrency(calc.totalGross)}</span></div>
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-slate-600 mb-1">DESCUENTOS</p>
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-red-600"><span>Jubilación (11%)</span><span>− {formatCurrency(calc.jubilacionWorker)}</span></div>
                            <div className="flex justify-between text-red-600"><span>Obra Social (3%)</span><span>− {formatCurrency(calc.obraSocialWorker)}</span></div>
                            <div className="flex justify-between text-red-600"><span>PAMI (3%)</span><span>− {formatCurrency(calc.pamiWorker)}</span></div>
                            {parseFloat(ex.other_deductions) > 0 && <div className="flex justify-between text-red-600"><span>Otras deducc.</span><span>− {formatCurrency(parseFloat(ex.other_deductions))}</span></div>}
                            <div className="flex justify-between font-bold border-t border-slate-200 pt-0.5"><span>Total descuentos</span><span className="text-red-600">− {formatCurrency(calc.totalWorkerDeductions)}</span></div>
                            <div className="flex justify-between font-black text-emerald-700 text-sm border-t-2 border-emerald-300 pt-1"><span>NETO</span><span>{formatCurrency(calc.netSalary)}</span></div>
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="font-bold text-slate-600 mb-1">CONTRIBUCIONES PATRONALES (costo empresa)</p>
                          <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-slate-500">
                            <div className="flex justify-between"><span>Jubilación (16%)</span><span>{formatCurrency(calc.jubilacionEmployer)}</span></div>
                            <div className="flex justify-between"><span>Obra Social (6%)</span><span>{formatCurrency(calc.obraSocialEmployer)}</span></div>
                            <div className="flex justify-between"><span>ART (1.5%)</span><span>{formatCurrency(calc.artEmployer)}</span></div>
                            <div className="flex justify-between"><span>Asig. Fam. (7.5%)</span><span>{formatCurrency(calc.familyAllowances)}</span></div>
                            <div className="flex justify-between"><span>Fondo Empl. (0.89%)</span><span>{formatCurrency(calc.employmentFund)}</span></div>
                            <div className="flex justify-between"><span>Seg. Vida</span><span>{formatCurrency(calc.lifeInsurance)}</span></div>
                          </div>
                          <div className="flex justify-between font-bold text-orange-700 border-t border-slate-200 pt-1 mt-1">
                            <span>Total contrib. patronales</span>
                            <span>{formatCurrency(calc.totalEmployerContributions)}</span>
                          </div>
                          <div className="flex justify-between font-black text-slate-800 border-t-2 border-slate-300 pt-1">
                            <span>COSTO LABORAL TOTAL</span>
                            <span>{formatCurrency(calc.totalLaborCost)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Contribuciones patronales totales */}
      {calculations.length > 0 && (
        <Card padding="md" className="mb-5 bg-orange-50 border-orange-200">
          <p className="text-sm font-semibold text-orange-800 mb-2">Resumen cargas patronales (base DDJJ F.931)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div><p className="text-slate-500">Bruto total</p><p className="font-bold text-slate-800">{formatCurrency(summary.totalGross)}</p></div>
            <div><p className="text-slate-500">Aportes trabajadores</p><p className="font-bold text-red-700">{formatCurrency(summary.totalWorkerContributions)}</p></div>
            <div><p className="text-slate-500">Contrib. patronales</p><p className="font-bold text-orange-700">{formatCurrency(summary.totalEmployerContributions)}</p></div>
            <div><p className="text-slate-500">Costo laboral total</p><p className="font-bold text-slate-800">{formatCurrency(summary.totalLaborCost)}</p></div>
          </div>
        </Card>
      )}

      {/* Confirmar */}
      {employer && employees.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleConfirm} loading={saving} disabled={existingRun?.status === 'confirmed'}>
            <CheckCircle className="w-4 h-4 mr-1" />
            {existingRun?.status === 'confirmed' ? 'Liquidación confirmada ✓' : 'Confirmar liquidación'}
          </Button>
          {existingRun?.status === 'confirmed' && (
            <a href="/cargas-sociales"><Button variant="outline" size="sm">Generar DDJJ F.931 →</Button></a>
          )}
        </div>
      )}
    </PageContainer>
  )
}
