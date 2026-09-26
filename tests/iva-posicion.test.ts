/**
 * Posición mensual de IVA — Responsable Inscripto.
 *
 * La regla que nunca se puede violar: en un mismo período o se paga o se tiene
 * saldo a favor, jamás las dos cosas. El módulo mostraba un saldo a favor
 * inventado cada vez que el crédito fiscal superaba la mitad del débito, y
 * ocultaba el importe a ingresar. Con débito 15.000 y crédito 10.000 anunciaba
 * "saldo a favor $5.000" cuando correspondía pagar $5.000.
 */
import { describe, it, expect } from 'vitest'
import { calculateVat } from '@/lib/fiscal-engine/vat'

function posicion(debito: number, credito: number, extra: { withholdings?: number; perceptions?: number; previousCredit?: number } = {}) {
  return calculateVat({
    period: '2026-09',
    invoices:  [{ subtotal: debito / 0.21, iva_amount: debito, invoice_type: 'A', status: 'issued' }],
    purchases: [{ iva_amount: credito, is_iva_computable: true, status: 'received' }],
    ...extra,
  })
}

describe('posición mensual de IVA', () => {
  it('con débito mayor al crédito, la diferencia se paga', () => {
    const r = posicion(15000, 10000)
    expect(r.netPayable).toBe(5000)
    expect(r.creditBalance).toBe(0)
    expect(r.hasCredit).toBe(false)
  })

  it('con crédito mayor al débito, queda a favor sólo el excedente', () => {
    const r = posicion(10000, 15000)
    expect(r.creditBalance).toBe(5000)   // no 15.000: el débito ya consumió parte
    expect(r.netPayable).toBe(0)
    expect(r.hasCredit).toBe(true)
  })

  it('con débito igual al crédito la posición queda en cero', () => {
    const r = posicion(12000, 12000)
    expect(r.netPayable).toBe(0)
    expect(r.creditBalance).toBe(0)
  })

  it('las retenciones y percepciones se descuentan de lo que hay que pagar', () => {
    const r = posicion(15000, 5000, { withholdings: 3000, perceptions: 1000 })
    expect(r.netPayable).toBe(6000)      // 15000 - 5000 - 3000 - 1000
    expect(r.creditBalance).toBe(0)
  })

  it('si las retenciones superan al impuesto, el exceso queda a favor', () => {
    const r = posicion(10000, 2000, { withholdings: 9000 })
    expect(r.netPayable).toBe(0)
    expect(r.creditBalance).toBe(1000)   // 9000 - (10000 - 2000)
  })

  it('el saldo a favor del mes anterior se computa', () => {
    const r = posicion(10000, 0, { previousCredit: 4000 })
    expect(r.netPayable).toBe(6000)
  })

  it('nunca hay saldo a pagar y a favor al mismo tiempo', () => {
    for (const [d, c] of [[15000, 10000], [10000, 15000], [12000, 12000], [1, 999], [999, 1], [0, 0]]) {
      const r = posicion(d, c)
      expect(Math.min(r.netPayable, r.creditBalance)).toBe(0)
    }
  })
})
