// ── Motor Monotributo ─────────────────────────────────────────────────────────
import type { MonotributoDemoCategory } from '@/types/fiscal'

export function suggestMonotributoCategory(
  annualRevenue: number,
  categories: MonotributoDemoCategory[],
  activityType: 'servicios' | 'bienes' = 'servicios'
): MonotributoDemoCategory | null {
  const active = categories.filter(c => c.is_active)
  const sorted = [...active].sort((a, b) => a.max_annual_income - b.max_annual_income)
  return sorted.find(c => annualRevenue <= c.max_annual_income) || null
}

export function calculateMonotributoQuota(
  category: MonotributoDemoCategory,
  activityType: 'servicios' | 'bienes' = 'servicios'
) {
  const taxComponent = activityType === 'servicios' ? category.monthly_tax_services : category.monthly_tax_goods
  return {
    taxComponent,
    sipaComponent: category.monthly_sipa,
    obraSocialComponent: category.monthly_obra_social,
    total: activityType === 'servicios' ? category.monthly_total_services : category.monthly_total_goods,
  }
}

export interface RecategorizacionResult {
  shouldRecategorize: boolean
  currentCategory: string
  suggestedCategory: string | null
  reason: string
  accumulated: number
  limit: number
  percentUsed: number
}

export function checkRecategorizacion(
  currentCategoryCode: string,
  accumulatedRevenueLast12Months: number,
  categories: MonotributoDemoCategory[],
  activityType: 'servicios' | 'bienes' = 'servicios'
): RecategorizacionResult {
  const currentCat = categories.find(c => c.category_code === currentCategoryCode)
  if (!currentCat) {
    return {
      shouldRecategorize: false,
      currentCategory: currentCategoryCode,
      suggestedCategory: null,
      reason: 'Categoría actual no encontrada',
      accumulated: accumulatedRevenueLast12Months,
      limit: 0,
      percentUsed: 0,
    }
  }

  const percentUsed = currentCat.max_annual_income > 0
    ? Math.round((accumulatedRevenueLast12Months / currentCat.max_annual_income) * 100)
    : 0

  const suggested = suggestMonotributoCategory(accumulatedRevenueLast12Months, categories, activityType)

  const shouldRecategorize = suggested?.category_code !== currentCategoryCode

  let reason = ''
  if (percentUsed >= 100) {
    reason = `La facturación acumulada (${percentUsed}%) supera el límite de la categoría actual. Recategorización OBLIGATORIA.`
  } else if (percentUsed >= 80) {
    reason = `La facturación representa el ${percentUsed}% del límite. Se sugiere revisar la categoría próximamente.`
  } else if (suggested && suggested.max_annual_income < currentCat.max_annual_income) {
    reason = `Podrías estar en una categoría inferior. La recategorización puede reducir tu cuota mensual.`
  } else {
    reason = `La facturación acumulada (${percentUsed}%) es consistente con la categoría actual.`
  }

  return {
    shouldRecategorize,
    currentCategory: currentCategoryCode,
    suggestedCategory: suggested?.category_code || null,
    reason,
    accumulated: accumulatedRevenueLast12Months,
    limit: currentCat.max_annual_income,
    percentUsed,
  }
}
