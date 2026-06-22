// ── Motor IVA ────────────────────────────────────────────────────────────────
import type { VatCalculation, FiscalParamsMap } from '@/types/fiscal'
import { DEFAULT_PARAMS } from './defaults'

interface VatInput {
  period: string
  /** Facturas emitidas tipo A del período */
  invoices: { subtotal: number; iva_amount: number; invoice_type: string; status: string }[]
  /** Compras y gastos del período */
  purchases: { iva_amount: number; is_iva_computable: boolean; status: string }[]
  /** Retenciones IVA sufridas */
  withholdings?: number
  /** Percepciones IVA sufridas */
  perceptions?: number
  /** Saldo a favor mes anterior */
  previousCredit?: number
  params?: Partial<FiscalParamsMap>
}

export function calculateVat(input: VatInput): VatCalculation {
  const params = { ...DEFAULT_PARAMS, ...input.params }

  // Débito fiscal: IVA de todas las facturas emitidas (A y B), no anuladas
  // Factura B también genera débito para el vendedor RI, aunque el CF no pueda tomar crédito
  const salesIvaDebit = input.invoices
    .filter(i => i.status !== 'cancelled')
    .reduce((s, i) => s + (i.iva_amount || 0), 0)

  const salesTaxable = input.invoices
    .filter(i => i.status !== 'cancelled')
    .reduce((s, i) => s + (i.subtotal || 0), 0)

  // Crédito fiscal: IVA de compras computables activas
  const purchasesIvaCredit = input.purchases
    .filter(p => p.is_iva_computable && p.status !== 'cancelled')
    .reduce((s, p) => s + (p.iva_amount || 0), 0)

  const withholdings = input.withholdings || 0
  const perceptions = input.perceptions || 0
  const previousCredit = input.previousCredit || 0

  // IVA determinado = débito - crédito
  const ivaDetermined = Math.max(0, salesIvaDebit - purchasesIvaCredit)

  // Saldo neto = determinado - retenciones - percepciones - saldo a favor anterior
  const netPayable = Math.max(0, ivaDetermined - withholdings - perceptions - previousCredit)

  // Saldo a favor si crédito supera débito
  const creditBalance = Math.max(0, purchasesIvaCredit + withholdings + perceptions + previousCredit - ivaDetermined)

  return {
    period: input.period,
    salesTaxable: Math.round(salesTaxable * 100) / 100,
    salesIvaDebit: Math.round(salesIvaDebit * 100) / 100,
    purchasesIvaCredit: Math.round(purchasesIvaCredit * 100) / 100,
    withholdings: Math.round(withholdings * 100) / 100,
    perceptions: Math.round(perceptions * 100) / 100,
    previousCredit: Math.round(previousCredit * 100) / 100,
    ivaDetermined: Math.round(ivaDetermined * 100) / 100,
    netPayable: Math.round(netPayable * 100) / 100,
    creditBalance: Math.round(creditBalance * 100) / 100,
    hasCredit: creditBalance > 0,
  }
}
