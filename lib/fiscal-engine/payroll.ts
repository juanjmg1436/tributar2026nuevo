// ── Motor de Liquidación de Sueldos ──────────────────────────────────────────
import type { Employee, PayrollCalculation, FiscalParamsMap } from '@/types/fiscal'
import { DEFAULT_PARAMS } from './defaults'

interface PayrollInput {
  basic_salary: number
  overtime?: number
  presentismo?: number
  bonuses?: number
  other_remunerative?: number
  non_remunerative?: number
  other_deductions?: number
}

export function calculatePayroll(
  employee: Employee,
  input: PayrollInput,
  params: Partial<FiscalParamsMap> = {}
): PayrollCalculation {
  const p = { ...DEFAULT_PARAMS, ...params }

  const basic = input.basic_salary || employee.basic_salary || 0
  const overtime = input.overtime || 0
  const presentismo = input.presentismo || 0
  const bonuses = input.bonuses || 0
  const otherRem = input.other_remunerative || 0
  const nonRem = input.non_remunerative || 0
  const otherDeductions = input.other_deductions || 0

  // Base remunerativa (base para cálculo de aportes)
  const totalGross = basic + overtime + presentismo + bonuses + otherRem + nonRem

  // Aportes del trabajador (sobre base remunerativa sin no remunerativo)
  const remBase = basic + overtime + presentismo + bonuses + otherRem
  const jubilacionWorker = Math.round(remBase * p.jubilacion_trabajador * 100) / 100
  const obraSocialWorker = Math.round(remBase * p.obra_social_trabajador * 100) / 100
  const pamiWorker = Math.round(remBase * p.pami_trabajador * 100) / 100
  const totalWorkerDeductions = jubilacionWorker + obraSocialWorker + pamiWorker + otherDeductions
  const netSalary = Math.round((totalGross - totalWorkerDeductions) * 100) / 100

  // Contribuciones patronales (sobre base remunerativa)
  const jubilacionEmployer = Math.round(remBase * p.jubilacion_empleador * 100) / 100
  const obraSocialEmployer = Math.round(remBase * p.obra_social_empleador * 100) / 100
  const artEmployer = Math.round(remBase * p.art_empleador * 100) / 100
  const familyAllowances = Math.round(remBase * p.asig_familiares_empleador * 100) / 100
  const employmentFund = Math.round(remBase * p.fondo_empleo_empleador * 100) / 100
  const lifeInsurance = p.seguro_vida_empleador
  const totalEmployerContributions = jubilacionEmployer + obraSocialEmployer + artEmployer + familyAllowances + employmentFund + lifeInsurance

  const totalLaborCost = Math.round((totalGross + totalEmployerContributions) * 100) / 100

  return {
    employee,
    totalGross: Math.round(totalGross * 100) / 100,
    jubilacionWorker,
    obraSocialWorker,
    pamiWorker,
    totalWorkerDeductions: Math.round(totalWorkerDeductions * 100) / 100,
    netSalary,
    jubilacionEmployer,
    obraSocialEmployer,
    artEmployer,
    familyAllowances,
    employmentFund,
    lifeInsurance,
    totalEmployerContributions: Math.round(totalEmployerContributions * 100) / 100,
    totalLaborCost,
  }
}

export function calculatePayrollSummary(items: PayrollCalculation[]) {
  return {
    employeeCount: items.length,
    totalGross: items.reduce((s, i) => s + i.totalGross, 0),
    totalWorkerDeductions: items.reduce((s, i) => s + i.totalWorkerDeductions, 0),
    totalNet: items.reduce((s, i) => s + i.netSalary, 0),
    totalEmployerContributions: items.reduce((s, i) => s + i.totalEmployerContributions, 0),
    totalLaborCost: items.reduce((s, i) => s + i.totalLaborCost, 0),
    totalWorkerContributions: items.reduce((s, i) => s + i.jubilacionWorker + i.obraSocialWorker + i.pamiWorker, 0),
  }
}
