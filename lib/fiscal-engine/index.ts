// ─────────────────────────────────────────────────────────────────────────────
// Motor Fiscal — Tribut.AR
// Capa de cálculo pura (sin efectos secundarios, sin dependencias de React/Supabase)
// Recibe datos → devuelve resultados. Las páginas/hooks llaman a estas funciones.
// ─────────────────────────────────────────────────────────────────────────────

export { calculateVat } from './vat'
export { calculatePayroll, calculatePayrollSummary } from './payroll'
export { calculateIncomeTax } from './income-tax'
export { suggestMonotributoCategory, calculateMonotributoQuota, checkRecategorizacion } from './monotributo'
export { DEFAULT_PARAMS } from './defaults'

// Formatea período 'YYYY-MM' → 'Enero 2026'
export function formatPeriod(period: string): string {
  const MONTHS = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
  ]
  const [year, month] = period.split('-').map(Number)
  return `${MONTHS[month - 1]} ${year}`
}

// Genera período actual 'YYYY-MM'
export function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Período anterior
export function previousPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number)
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
  return `${prev.y}-${String(prev.m).padStart(2, '0')}`
}

// Genera número VEP demo
export function generateVepNumber(): string {
  const now = new Date()
  const base = now.getFullYear().toString().slice(2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 900000 + 100000)
  return `DEMO-${base}-${rand}`
}

// Genera número comprobante de pago demo
export function generateComprobanteNumber(): string {
  return `COMP-${Date.now()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`
}

// Calcula vencimiento IVA (día 18 del mes siguiente)
export function calcVatDueDate(period: string, dueDay = 18): string {
  const [year, month] = period.split('-').map(Number)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`
}

// Calcula recargo por mora (tasa mensual simple)
export function calcSurcharge(amount: number, dueDate: string, paymentDate: string, monthlyRate: number): number {
  const due = new Date(dueDate)
  const pay = new Date(paymentDate)
  if (pay <= due) return 0
  const diffMs = pay.getTime() - due.getTime()
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30)
  return Math.round(amount * monthlyRate * diffMonths * 100) / 100
}

// Evalúa estado fiscal de un contribuyente (complianceScore 0-100)
export function calcComplianceScore(obligations: { status: string }[]): number {
  if (obligations.length === 0) return 100
  const ok = obligations.filter(o =>
    o.status === 'paid' || o.status === 'submitted' || o.status === 'credit'
  ).length
  return Math.round((ok / obligations.length) * 100)
}
