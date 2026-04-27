// ── Motor Impuesto a las Ganancias (didáctico) ───────────────────────────────
import type { IncomeTaxCalculation, FiscalParamsMap } from '@/types/fiscal'
import { DEFAULT_PARAMS } from './defaults'

interface IncomeTaxInput {
  period: string
  fiscalYear: number
  totalIncome: number         // Ventas / ingresos del período
  totalPurchases: number      // Compras y costo de ventas
  salaryExpense: number       // Sueldos pagados
  socialSecurityExpense: number // Cargas sociales patronales
  otherExpenses: number       // Otros gastos deducibles
  advancePayments: number     // Anticipos ya pagados
  withholdings: number        // Retenciones sufridas
  previousCredit: number      // Saldo a favor ejercicio anterior
  subjectType: 'persona_humana' | 'persona_juridica'
  params?: Partial<FiscalParamsMap>
}

export function calculateIncomeTax(input: IncomeTaxInput): IncomeTaxCalculation {
  const p = { ...DEFAULT_PARAMS, ...input.params }

  const grossResult = input.totalIncome - input.totalPurchases
  const totalDeductions = input.salaryExpense + input.socialSecurityExpense + input.otherExpenses

  let netIncome = grossResult - totalDeductions

  // Para personas humanas: aplicar MNI anualizado si es cálculo mensual
  if (input.subjectType === 'persona_humana') {
    const mniAnnual = p.ganancias_mni_mensual * 12
    netIncome = Math.max(0, netIncome - mniAnnual / 12)
  }

  netIncome = Math.max(0, netIncome)

  const taxRate = input.subjectType === 'persona_juridica'
    ? p.ganancias_alicuota_juridica
    : 0.35 // simplificado para PH en demo

  const taxDetermined = netIncome * taxRate
  const netPayable = Math.max(0, taxDetermined - input.advancePayments - input.withholdings - input.previousCredit)

  return {
    period: input.period,
    totalIncome: Math.round(input.totalIncome * 100) / 100,
    totalPurchases: Math.round(input.totalPurchases * 100) / 100,
    salaryExpense: Math.round(input.salaryExpense * 100) / 100,
    socialSecurityExpense: Math.round(input.socialSecurityExpense * 100) / 100,
    otherExpenses: Math.round(input.otherExpenses * 100) / 100,
    grossResult: Math.round(grossResult * 100) / 100,
    netIncome: Math.round(netIncome * 100) / 100,
    taxRate,
    taxDetermined: Math.round(taxDetermined * 100) / 100,
    advancePayments: Math.round(input.advancePayments * 100) / 100,
    withholdings: Math.round(input.withholdings * 100) / 100,
    previousCredit: Math.round(input.previousCredit * 100) / 100,
    netPayable: Math.round(netPayable * 100) / 100,
  }
}
