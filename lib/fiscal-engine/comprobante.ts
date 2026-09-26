// ── Importes de un comprobante emitido ───────────────────────────────────────
// Extraído del formulario de emisión para poder probarlo. La regla que lo
// justifica: en Factura A el precio de lista es neto y el IVA se agrega por
// afuera; en Factura B el precio ya es final y el IVA viaja adentro, pero el
// responsable inscripto debe el débito fiscal igual, aunque el comprobante no
// lo discrimine. C, X y DEMO no generan IVA.

export const IVA_RATE = 0.21

const redondear = (n: number) => Math.round(n * 100) / 100

export interface ImportesComprobante {
  /** Neto gravado: lo que se acredita en Ventas */
  subtotal: number
  /** Débito fiscal que genera el comprobante */
  ivaAmount: number
  /** Lo que efectivamente paga el cliente */
  total: number
}

export function calcularImportes(tipo: string, importeCargado: number): ImportesComprobante {
  const ivaAmount =
    tipo === 'A' ? redondear(importeCargado * IVA_RATE)
    : tipo === 'B' ? redondear(importeCargado * IVA_RATE / (1 + IVA_RATE))
    : 0
  const subtotal = tipo === 'B' ? redondear(importeCargado - ivaAmount) : redondear(importeCargado)
  const total    = tipo === 'B' ? redondear(importeCargado) : redondear(importeCargado + ivaAmount)
  return { subtotal, ivaAmount, total }
}

/** Primer y último día de un período 'YYYY-MM', para filtrar por fecha de emisión. */
export function rangoDelPeriodo(periodo: string): { desde: string; hasta: string } {
  const [anio, mes] = periodo.split('-').map(Number)
  const ultimo = new Date(anio, mes, 0).getDate()
  return { desde: `${periodo}-01`, hasta: `${periodo}-${String(ultimo).padStart(2, '0')}` }
}
