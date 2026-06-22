// ── Motor Monotributo — Régimen ARCA 2026 ─────────────────────────────────────
import type { MonotributoDemoCategory } from '@/types/fiscal'

// ─────────────────────────────────────────────────────────────────────────────
// Constantes del régimen
// ─────────────────────────────────────────────────────────────────────────────

// Vencimiento: día 20 de cada mes (art. 26 Ley 26565 y RG AFIP/ARCA)
export const DUE_DAY = 20

// Tasa de interés resarcitorio por mora (art. 37 Ley 11683) — ~3% mensual
export const MORA_RATE_MONTHLY = 0.03

// ─────────────────────────────────────────────────────────────────────────────
// Vencimientos y mora
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna el vencimiento de la cuota para un período YYYY-MM.
 * El vencimiento es el día 20 del mismo mes del período.
 */
export function getDueDate(period: string): Date {
  const [year, month] = period.split('-').map(Number)
  return new Date(year, month - 1, DUE_DAY)
}

/**
 * Indica si el período está vencido (pasó el día 20 y no fue pagado).
 */
export function isPeriodOverdue(period: string): boolean {
  return new Date() > getDueDate(period)
}

/**
 * Calcula el recargo por mora sobre el importe de una cuota.
 * Fórmula: mora = importe × (MORA_RATE_MONTHLY / 30) × días_de_mora
 *
 * @param amount   Importe de la cuota sin recargo
 * @param period   Período YYYY-MM
 * @param paidAt   Fecha de pago efectivo (null = hoy)
 */
export function calculateMora(
  amount: number,
  period: string,
  paidAt: Date | null = null
): { daysLate: number; surcharge: number; totalWithMora: number } {
  const dueDate = getDueDate(period)
  const refDate = paidAt ?? new Date()

  if (refDate <= dueDate) {
    return { daysLate: 0, surcharge: 0, totalWithMora: amount }
  }

  const msLate = refDate.getTime() - dueDate.getTime()
  const daysLate = Math.ceil(msLate / (1000 * 60 * 60 * 24))
  const dailyRate = MORA_RATE_MONTHLY / 30
  const surcharge = Math.round(amount * dailyRate * daysLate)

  return { daysLate, surcharge, totalWithMora: amount + surcharge }
}

/** Días que faltan para el próximo vencimiento (o días de mora si ya venció). */
export function daysToNextDue(period: string): number {
  const due = getDueDate(period)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// ─────────────────────────────────────────────────────────────────────────────
// Categorías y cuotas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sugiere la categoría adecuada para un ingreso anual estimado.
 * Devuelve null si supera el tope de la Cat. K (exclusión).
 */
export function suggestMonotributoCategory(
  annualRevenue: number,
  categories: MonotributoDemoCategory[],
  activityType: 'servicios' | 'bienes' = 'servicios'
): MonotributoDemoCategory | null {
  const sorted = [...categories]
    .filter(c => c.is_active)
    .sort((a, b) => a.max_annual_income - b.max_annual_income)
  return sorted.find(c => annualRevenue <= c.max_annual_income) ?? null
}

/**
 * Calcula los tres componentes de la cuota mensual:
 * - Impuesto integrado (reemplaza IVA + Ganancias)
 * - Aporte al SIPA (jubilación, importe fijo por categoría)
 * - Obra social (importe fijo, igual para servicios y bienes)
 */
export function calculateMonotributoQuota(
  category: MonotributoDemoCategory,
  activityType: 'servicios' | 'bienes' = 'servicios'
) {
  const taxComponent =
    activityType === 'servicios'
      ? category.monthly_tax_services
      : category.monthly_tax_goods
  const total =
    activityType === 'servicios'
      ? category.monthly_total_services
      : category.monthly_total_goods

  return {
    taxComponent,
    sipaComponent: category.monthly_sipa,
    obraSocialComponent: category.monthly_obra_social,
    total,
    taxPct: total > 0 ? Math.round((taxComponent / total) * 100) : 0,
    sipaPct: total > 0 ? Math.round((category.monthly_sipa / total) * 100) : 0,
    osPct: total > 0 ? Math.round((category.monthly_obra_social / total) * 100) : 0,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Recategorización
// ─────────────────────────────────────────────────────────────────────────────

export interface RecategorizacionResult {
  shouldRecategorize: boolean
  currentCategory: string
  suggestedCategory: string | null
  direction: 'up' | 'down' | 'same' | 'exclude'
  reason: string
  accumulated: number     // Ingresos reales de facturas (últimos 12 meses)
  limit: number           // Tope de la categoría actual
  percentUsed: number     // % del tope consumido
  nextRecatDate: string   // Próxima recategorización (enero o julio)
}

/**
 * Evalúa si corresponde recategorizar.
 *
 * CORRECCIÓN CRÍTICA: accumulated debe ser la SUMA de facturas emitidas
 * (invoices.total) en los últimos 12 meses — NO el importe de las cuotas pagadas.
 */
export function checkRecategorizacion(
  currentCategoryCode: string,
  accumulatedRevenueLast12Months: number,   // ← ingresos reales de facturas
  categories: MonotributoDemoCategory[],
  activityType: 'servicios' | 'bienes' = 'servicios'
): RecategorizacionResult {
  const currentCat = categories.find(c => c.category_code === currentCategoryCode)
  if (!currentCat) {
    return {
      shouldRecategorize: false,
      currentCategory: currentCategoryCode,
      suggestedCategory: null,
      direction: 'same',
      reason: 'Categoría actual no encontrada en la tabla',
      accumulated: accumulatedRevenueLast12Months,
      limit: 0,
      percentUsed: 0,
      nextRecatDate: nextRecategorizationDate(),
    }
  }

  const percentUsed =
    currentCat.max_annual_income > 0
      ? Math.round((accumulatedRevenueLast12Months / currentCat.max_annual_income) * 100)
      : 0

  const maxCat = [...categories].sort((a, b) => b.max_annual_income - a.max_annual_income)[0]
  const isExcluded = accumulatedRevenueLast12Months > maxCat.max_annual_income

  const suggested = isExcluded
    ? null
    : suggestMonotributoCategory(accumulatedRevenueLast12Months, categories, activityType)

  const shouldRecategorize = isExcluded || suggested?.category_code !== currentCategoryCode

  let direction: RecategorizacionResult['direction'] = 'same'
  if (isExcluded) {
    direction = 'exclude'
  } else if (suggested) {
    const sortedCodes = [...categories]
      .sort((a, b) => a.max_annual_income - b.max_annual_income)
      .map(c => c.category_code)
    const currentIdx = sortedCodes.indexOf(currentCategoryCode)
    const suggestedIdx = sortedCodes.indexOf(suggested.category_code)
    direction = suggestedIdx > currentIdx ? 'up' : suggestedIdx < currentIdx ? 'down' : 'same'
  }

  let reason = ''
  if (isExcluded) {
    reason = `Tus ingresos anuales (${fmtCur(accumulatedRevenueLast12Months)}) superan el tope máximo del Monotributo (${fmtCur(maxCat.max_annual_income)}).
Deberás inscribirte como Responsable Inscripto y presentar DDJJ de IVA y Ganancias.`
  } else if (percentUsed >= 100) {
    reason = `Superaste el límite de la Categoría ${currentCategoryCode} (${percentUsed}% consumido). Recategorización OBLIGATORIA antes del ${nextRecategorizationDate()}.`
  } else if (percentUsed >= 85 && direction === 'up') {
    reason = `Alcanzaste el ${percentUsed}% del límite de tu categoría. En la próxima recategorización (${nextRecategorizationDate()}) deberás subir a Categoría ${suggested?.category_code}.`
  } else if (direction === 'down') {
    reason = `Tus ingresos reales son menores al tope de la Categoría ${suggested?.category_code}. En enero o julio podés bajar de categoría y pagar menos.`
  } else {
    reason = `Tu facturación (${percentUsed}% del límite) es consistente con la Categoría ${currentCategoryCode}. No hay cambios obligatorios.`
  }

  return {
    shouldRecategorize,
    currentCategory: currentCategoryCode,
    suggestedCategory: suggested?.category_code ?? null,
    direction,
    reason,
    accumulated: accumulatedRevenueLast12Months,
    limit: currentCat.max_annual_income,
    percentUsed,
    nextRecatDate: nextRecategorizationDate(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Retorna la próxima fecha de recategorización (enero o julio). */
export function nextRecategorizationDate(): string {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const year = now.getFullYear()
  if (month < 7) return `julio ${year}`
  return `enero ${year + 1}`
}

/** Formatea moneda sin decimales para mensajes internos. */
function fmtCur(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

/** Genera etiquetas de los últimos N meses en formato 'Mes YY'. */
export function lastNMonthLabels(n: number): { period: string; label: string }[] {
  const result: { period: string; label: string }[] = []
  const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
    })
  }
  return result
}
