// ── Motor Impuesto a las Ganancias (didáctico) ───────────────────────────────
import type { IncomeTaxCalculation, FiscalParamsMap } from '@/types/fiscal'
import { DEFAULT_PARAMS } from './defaults'

// Escala progresiva PH — Ley 20628 art. 90, valores aprox. 2025/2026 (actualizados por RIPTE)
// Estructura: { desde, hasta, tasa, acumulado } donde acumulado = impuesto hasta el tramo anterior
export const TRAMOS_PH_2026 = [
  { desde: 0,            hasta: 1_100_000,  tasa: 0.05, acumulado: 0 },
  { desde: 1_100_000,    hasta: 2_200_000,  tasa: 0.09, acumulado: 55_000 },
  { desde: 2_200_000,    hasta: 3_300_000,  tasa: 0.12, acumulado: 154_000 },
  { desde: 3_300_000,    hasta: 4_400_000,  tasa: 0.15, acumulado: 286_000 },
  { desde: 4_400_000,    hasta: 6_600_000,  tasa: 0.19, acumulado: 451_000 },
  { desde: 6_600_000,    hasta: 8_800_000,  tasa: 0.23, acumulado: 869_000 },
  { desde: 8_800_000,    hasta: 13_200_000, tasa: 0.27, acumulado: 1_375_000 },
  { desde: 13_200_000,   hasta: 17_600_000, tasa: 0.31, acumulado: 2_563_000 },
  { desde: 17_600_000,   hasta: Infinity,   tasa: 0.35, acumulado: 3_927_000 },
] as const

export interface TramoPHResult {
  desde: number
  hasta: number
  tasa: number
  base: number   // imponible que cae en este tramo
  impuesto: number
}

interface DeduccionesPH {
  conyugeACargo?: boolean
  hijosMenores18?: number        // cantidad
  hijosIncapacitados?: number    // cantidad
  gastosMedicos?: number         // total facturado (se aplica 40%, tope 5% renta neta)
  interesesHipotecarios?: number // tope $200.000 aprox.
}

interface IncomeTaxInput {
  period: string
  fiscalYear: number
  totalIncome: number
  totalPurchases: number
  salaryExpense: number
  socialSecurityExpense: number
  otherExpenses: number
  advancePayments: number
  withholdings: number
  previousCredit: number
  subjectType: 'persona_humana' | 'persona_juridica'
  deduccionesPH?: DeduccionesPH
  params?: Partial<FiscalParamsMap>
}

function calcProgressiveTax(netIncome: number): { tax: number; rate: number; tramos: TramoPHResult[] } {
  if (netIncome <= 0) return { tax: 0, rate: 0, tramos: [] }

  const tramos: TramoPHResult[] = []
  for (const t of TRAMOS_PH_2026) {
    if (netIncome <= t.desde) break
    const base = Math.min(netIncome, t.hasta === Infinity ? netIncome : t.hasta) - t.desde
    const impuesto = base * t.tasa
    tramos.push({ desde: t.desde, hasta: t.hasta, tasa: t.tasa, base, impuesto })
  }

  // Uso acumulado del último tramo aplicable para consistencia
  const lastApplicable = [...TRAMOS_PH_2026].reverse().find(t => netIncome > t.desde)
  let tax = 0
  if (lastApplicable) {
    tax = lastApplicable.acumulado + (netIncome - lastApplicable.desde) * lastApplicable.tasa
  }

  return { tax: Math.round(tax * 100) / 100, rate: Math.round((tax / netIncome) * 10000) / 10000, tramos }
}

export function calculateIncomeTax(input: IncomeTaxInput): IncomeTaxCalculation {
  const p = { ...DEFAULT_PARAMS, ...input.params }

  // ── Resultado bruto ──────────────────────────────────────────────────────────
  const grossResult = input.totalIncome - input.totalPurchases
  const totalExpenses = input.salaryExpense + input.socialSecurityExpense + input.otherExpenses
  let netBeforeDed = grossResult - totalExpenses

  // Quebrantos: si el resultado es negativo se preserva para informar
  const hasQuebranto = netBeforeDed < 0
  const quebranto = hasQuebranto ? Math.abs(netBeforeDed) : 0

  // ── Deducciones personales (PH — art. 23 Ley 20628) ──────────────────────────
  const mniAnual = p.ganancias_mni_mensual * 12
  let mniDeduccion = 0
  let deduccionEspecial = 0
  let deduccionConyuge = 0
  let deduccionHijos = 0
  let deduccionGastosMedicos = 0

  if (input.subjectType === 'persona_humana') {
    // MNI anual completo (bug fix: antes se dividía por 12 incorrectamente)
    mniDeduccion = mniAnual

    // Deducción especial actividad independiente (art. 23 inc. c): 1,5 × MNI
    deduccionEspecial = mniAnual * 1.5

    if (input.deduccionesPH) {
      const d = input.deduccionesPH
      // Cónyuge a cargo: ~90% del MNI (art. 23 inc. b)
      if (d.conyugeACargo) deduccionConyuge = Math.round(mniAnual * 0.90)
      // Hijos menores de 18 o incapacitados (art. 23 inc. b)
      const hijosMen = (d.hijosMenores18 || 0) * Math.round(mniAnual * 0.45)
      const hijosInc = (d.hijosIncapacitados || 0) * Math.round(mniAnual * 0.90)
      deduccionHijos = hijosMen + hijosInc
    }
  }

  const totalDeducciones = mniDeduccion + deduccionEspecial + deduccionConyuge + deduccionHijos

  // Ganancia neta imponible = resultado neto − deducciones
  let netIncome = Math.max(0, netBeforeDed - totalDeducciones)

  // Gastos médicos: 40% de lo pagado, tope 5% de la ganancia neta imponible
  if (input.subjectType === 'persona_humana' && input.deduccionesPH?.gastosMedicos) {
    const topeMedicos = netIncome * 0.05
    deduccionGastosMedicos = Math.min(input.deduccionesPH.gastosMedicos * 0.40, topeMedicos)
    netIncome = Math.max(0, netIncome - deduccionGastosMedicos)
  }

  // ── Impuesto determinado ────────────────────────────────────────────────────
  let taxDetermined = 0
  let taxRate = 0
  let tramosPH: TramoPHResult[] = []

  if (input.subjectType === 'persona_juridica') {
    taxRate = p.ganancias_alicuota_juridica
    taxDetermined = netIncome * taxRate
  } else {
    const phResult = calcProgressiveTax(netIncome)
    taxDetermined = phResult.tax
    taxRate = phResult.rate
    tramosPH = phResult.tramos
  }

  const netPayable = Math.max(
    0,
    taxDetermined - input.advancePayments - input.withholdings - input.previousCredit,
  )

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
    // Campos extendidos
    mniDeduccion: Math.round(mniDeduccion * 100) / 100,
    deduccionEspecial: Math.round(deduccionEspecial * 100) / 100,
    deduccionConyuge: Math.round(deduccionConyuge * 100) / 100,
    deduccionHijos: Math.round(deduccionHijos * 100) / 100,
    deduccionGastosMedicos: Math.round(deduccionGastosMedicos * 100) / 100,
    totalDeducciones: Math.round(totalDeducciones * 100) / 100,
    tramosPH,
    hasQuebranto,
    quebranto: Math.round(quebranto * 100) / 100,
  }
}
