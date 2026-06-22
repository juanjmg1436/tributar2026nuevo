// ── Motor Autónomos — Régimen SIPA + IVA + Ganancias ─────────────────────────
// Valores vigentes Semestre I 2026 (ANSES — actualización trimestral RIPTE)
// Aportes obligatorios: 27% jubilación + 5% PAMI = 32% sobre base imponible
// Obra social: 6.5% adicional (opcional, incluida en estas tablas)
// Vencimiento: día 15 del mes siguiente al devengado

export interface AutonomosCategory {
  code: 'I' | 'II' | 'III' | 'IV' | 'V'
  label: string
  description: string
  /** Actividades típicas */
  activities: string
  /** Base imponible mensual (en $) */
  baseImponible: number
  /** 27% jubilación SIPA */
  aporteJubilacion: number
  /** 5% PAMI/INSSJP */
  aportePami: number
  /** 6.5% Obra social (OSPAT u otra) */
  aporteObraSocial: number
  /** Total mensual obligatorio */
  totalMensual: number
}

// Tabla de categorías 2026 — Semestre I
// Base actualizada por RIPTE (Índice de remuneraciones promedio trabajadores estables)
export const AUTONOMOS_CATEGORIES: AutonomosCategory[] = [
  {
    code: 'I',
    label: 'Categoría I',
    description: 'Mínima — Inicio de actividad o ingresos reducidos',
    activities: 'Profesionales en inicio, oficios con bajos ingresos, rentistas pequeños',
    baseImponible: 287_000,
    aporteJubilacion: 77_490,  // 287k × 27%
    aportePami:       14_350,  // 287k × 5%
    aporteObraSocial: 18_655,  // 287k × 6.5%
    totalMensual:     110_495,
  },
  {
    code: 'II',
    label: 'Categoría II',
    description: 'Directores y socios de sociedades / Profesionales con ingresos medios',
    activities: 'Directores SA, gerentes SRL, profesionales liberales (abogados, contadores, médicos)',
    baseImponible: 430_500,
    aporteJubilacion: 116_235, // 430.5k × 27%
    aportePami:        21_525, // 430.5k × 5%
    aporteObraSocial:  27_983, // 430.5k × 6.5%
    totalMensual:      165_743,
  },
  {
    code: 'III',
    label: 'Categoría III',
    description: 'Comercio / Industria pequeña y mediana',
    activities: 'Comerciantes, industriales unipersonales, prestadores de servicios medianos',
    baseImponible: 574_000,
    aporteJubilacion: 154_980,
    aportePami:        28_700,
    aporteObraSocial:  37_310,
    totalMensual:      220_990,
  },
  {
    code: 'IV',
    label: 'Categoría IV',
    description: 'Actividad con ingresos elevados',
    activities: 'Empresas unipersonales medianas, prestadores con facturación significativa',
    baseImponible: 717_500,
    aporteJubilacion: 193_725,
    aportePami:        35_875,
    aporteObraSocial:  46_638,
    totalMensual:      276_238,
  },
  {
    code: 'V',
    label: 'Categoría V',
    description: 'Máxima — Ingresos muy elevados',
    activities: 'Grandes empresas unipersonales, profesionales de muy alto volumen de negocios',
    baseImponible: 861_000,
    aporteJubilacion: 232_470,
    aportePami:        43_050,
    aporteObraSocial:  55_965,
    totalMensual:      331_485,
  },
]

/** Vencimiento: día 15 del mes siguiente */
export function getAportesDueDate(period: string): string {
  const [year, month] = period.split('-').map(Number)
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
  return `${next}-15`
}

/** Categoría sugerida según ingresos anuales estimados */
export function suggestAutonomosCategory(annualIncome: number): AutonomosCategory {
  // Referencia orientativa (no regulatoria — la categoría la define la AFIP según actividad)
  if (annualIncome < 5_000_000)  return AUTONOMOS_CATEGORIES[0] // Cat I
  if (annualIncome < 12_000_000) return AUTONOMOS_CATEGORIES[1] // Cat II
  if (annualIncome < 25_000_000) return AUTONOMOS_CATEGORIES[2] // Cat III
  if (annualIncome < 50_000_000) return AUTONOMOS_CATEGORIES[3] // Cat IV
  return AUTONOMOS_CATEGORIES[4]                                  // Cat V
}

export function getCategoryByCode(code: string): AutonomosCategory | undefined {
  return AUTONOMOS_CATEGORIES.find(c => c.code === code)
}

export interface MonotributoCompare {
  monthlySales: number
  // Autónomo
  autonomosCategory: AutonomosCategory
  aportesMensual: number
  ivaDebitoEstimado: number // 21% sobre ventas (si RI)
  gananciasEstimadaMensual: number // estimación muy simplificada
  totalAutonomo: number
  // Monotributo
  monotributoCode: string
  monotributoCuota: number
  // Conclusión
  diferencia: number  // autónomo - monotributo (positivo = Mono más barato)
  recomendacion: 'monotributo' | 'autonomos' | 'similar'
  razon: string
}

/**
 * Comparativa mensual simplificada entre Monotributo y Autónomo.
 * IMPORTANTE: Solo es una aproximación educativa. El cálculo real
 * de Ganancias depende de los gastos deducibles del contribuyente.
 */
export function compareRegimes(
  monthlySalesNet: number,
  monotributoQuotaMonthly: number,
  monotributoCode: string,
  autonomosCategory: AutonomosCategory,
  expenseRatio = 0.6, // 60% de gastos deducibles sobre ingresos (supuesto)
): MonotributoCompare {
  // Autónomo — carga mensual estimada
  const aportesMensual = autonomosCategory.totalMensual
  const ivaDebitoEstimado = monthlySalesNet * 0.21  // débito IVA bruto (sin crédito)

  // Ganancias PH simplificado: resultado neto × ~15% promedio
  // Resultado neto = ventas - gastos (60%) - aportes
  const annualSales = monthlySalesNet * 12
  const annualExpenses = annualSales * expenseRatio
  const annualAportes = autonomosCategory.totalMensual * 12
  const mni = 21_600_000 // MNI anual 2026 estimado
  const netaGanancias = Math.max(0, annualSales - annualExpenses - annualAportes - mni)
  // Tasa promedio efectiva estimada ~12% (escala progresiva simplificada)
  const gananciasAnual = netaGanancias * 0.12
  const gananciasEstimadaMensual = gananciasAnual / 12

  const totalAutonomo = aportesMensual + gananciasEstimadaMensual
  // IVA no suma al costo real (se traslada al cliente o se compensa con crédito)

  const diferencia = totalAutonomo - monotributoQuotaMonthly

  let recomendacion: 'monotributo' | 'autonomos' | 'similar'
  let razon: string

  if (diferencia > 5_000) {
    recomendacion = 'monotributo'
    razon = `Monotributo es más económico (${new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Math.abs(diferencia))}/mes menos). Además tiene menor carga administrativa.`
  } else if (diferencia < -5_000) {
    recomendacion = 'autonomos'
    razon = `Autónomo puede ser más conveniente. Podés deducir gastos reales en Ganancias, lo que reduce la carga en ingresos altos. Requiere más gestión contable.`
  } else {
    recomendacion = 'similar'
    razon = `La carga es similar. Considerá factores no económicos: Monotributo tiene menor burocracia; Autónomo da más flexibilidad para deducir gastos.`
  }

  return {
    monthlySales: monthlySalesNet,
    autonomosCategory,
    aportesMensual,
    ivaDebitoEstimado,
    gananciasEstimadaMensual,
    totalAutonomo,
    monotributoCode,
    monotributoCuota: monotributoQuotaMonthly,
    diferencia,
    recomendacion,
    razon,
  }
}
