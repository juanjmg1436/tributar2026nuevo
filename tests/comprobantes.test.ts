/**
 * Importes de un comprobante y recorte del período.
 *
 * Dos errores reales que esto fija:
 *  1. La Factura B se guardaba con IVA en cero. El responsable inscripto debe
 *     el débito igual aunque no lo discrimine, así que esas ventas entraban a
 *     la DDJJ sin generar impuesto.
 *  2. La DDJJ filtraba las ventas por una columna `period` que la tabla
 *     `invoices` no tiene — guarda `issue_date`. La consulta fallaba entera y
 *     el módulo mostraba cero ventas en todos los períodos.
 */
import { describe, it, expect } from 'vitest'
import { calcularImportes, rangoDelPeriodo } from '@/lib/fiscal-engine/comprobante'

describe('importes del comprobante', () => {
  it('en Factura A el IVA se suma por afuera del precio cargado', () => {
    expect(calcularImportes('A', 1000)).toEqual({ subtotal: 1000, ivaAmount: 210, total: 1210 })
  })

  it('en Factura B el IVA se extrae de adentro y el total no cambia', () => {
    const r = calcularImportes('B', 30000)
    expect(r.total).toBe(30000)              // lo que paga el consumidor final
    expect(r.ivaAmount).toBe(5206.61)        // 30000 x 0,21 / 1,21
    expect(r.subtotal).toBe(24793.39)
    expect(r.subtotal + r.ivaAmount).toBe(r.total)
  })

  it('la Factura B genera débito fiscal, no cero', () => {
    expect(calcularImportes('B', 30000).ivaAmount).toBeGreaterThan(0)
  })

  it('la Factura C del monotributista no genera IVA', () => {
    expect(calcularImportes('C', 1000)).toEqual({ subtotal: 1000, ivaAmount: 0, total: 1000 })
  })

  it('los comprobantes no fiscales tampoco generan IVA', () => {
    for (const t of ['X', 'DEMO']) expect(calcularImportes(t, 5000).ivaAmount).toBe(0)
  })

  it('el neto más el IVA siempre da el total', () => {
    for (const tipo of ['A', 'B', 'C']) {
      for (const importe of [1, 999.99, 30000, 1234567.89]) {
        const r = calcularImportes(tipo, importe)
        expect(Math.abs(r.subtotal + r.ivaAmount - r.total)).toBeLessThan(0.02)
      }
    }
  })
})

describe('recorte del período para buscar ventas por fecha', () => {
  it('toma el mes completo', () => {
    expect(rangoDelPeriodo('2026-09')).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' })
    expect(rangoDelPeriodo('2026-01')).toEqual({ desde: '2026-01-01', hasta: '2026-01-31' })
  })

  it('resuelve bien febrero, incluido el bisiesto', () => {
    expect(rangoDelPeriodo('2026-02').hasta).toBe('2026-02-28')
    expect(rangoDelPeriodo('2028-02').hasta).toBe('2028-02-29')
  })

  it('una factura del último día del mes entra en el período', () => {
    const { desde, hasta } = rangoDelPeriodo('2026-09')
    const emision = '2026-09-30'
    expect(emision >= desde && emision <= hasta).toBe(true)
  })

  it('una factura del mes siguiente queda afuera', () => {
    const { hasta } = rangoDelPeriodo('2026-09')
    expect('2026-10-01' <= hasta).toBe(false)
  })
})
