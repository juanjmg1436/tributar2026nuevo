// ─────────────────────────────────────────────────────────────────────────────
// Parámetros fiscales vigentes — Fuente: ARCA (ex AFIP)
// Actualización: 01/02/2026 (Semestre I 2026, ajuste IPC INDEC +14,29%)
// Próxima actualización: 01/08/2026 (Semestre II)
// Fuente oficial: https://www.afip.gob.ar/monotributo/categorias.asp
// ─────────────────────────────────────────────────────────────────────────────

export const REGIME_CODES = {
  MONOTRIBUTO: 'MONOTRIBUTO',
  REGIMEN_GENERAL: 'REGIMEN_GENERAL',
  AUTONOMOS: 'AUTONOMOS',
  RELACIONES_LABORALES: 'RELACIONES_LABORALES',
  CASAS_PARTICULARES: 'CASAS_PARTICULARES',
} as const

// ── MONOTRIBUTO — Tabla completa vigente desde 01/02/2026 ───────────────────
// Valores en pesos argentinos ($)
// Límite de precio unitario máximo (todas las categorías): $613.492,31
// Vencimiento cuota mensual: día 20 de cada mes

export interface MonotributoCategory {
  code: string
  label: string
  /** Ingresos brutos anuales máximos (igual para servicios y bienes) */
  maxIncome: number
  /** Superficie máxima del local (m²) */
  maxSurface: number
  /** Consumo eléctrico máximo anual (kWh) */
  maxEnergy: number
  /** Precio unitario máximo de venta */
  maxUnitPrice: number
  /** Impuesto integrado mensual — servicios */
  monthlyTaxServices: number
  /** Impuesto integrado mensual — bienes */
  monthlyTaxGoods: number
  /** Aporte SIPA/jubilación mensual */
  monthlySIPA: number
  /** Aporte obra social mensual */
  monthlyObraSocial: number
  /** Cuota total mensual — prestación de servicios */
  monthlyTotalServices: number
  /** Cuota total mensual — venta de bienes */
  monthlyTotalGoods: number
  description: string
}

export const MONOTRIBUTO_CATEGORIES: MonotributoCategory[] = [
  {
    code: 'A',
    label: 'Categoría A',
    maxIncome: 10277988.13,
    maxSurface: 30,
    maxEnergy: 3330,
    maxUnitPrice: 613492.31,
    monthlyTaxServices: 4780,
    monthlyTaxGoods: 4780,
    monthlySIPA: 15616,
    monthlyObraSocial: 21990,
    monthlyTotalServices: 42387,
    monthlyTotalGoods: 42387,
    description: 'Hasta $10.277.988 anuales · Cuota: $42.387/mes',
  },
  {
    code: 'B',
    label: 'Categoría B',
    maxIncome: 15058447.71,
    maxSurface: 45,
    maxEnergy: 5000,
    maxUnitPrice: 613492.31,
    monthlyTaxServices: 9083,
    monthlyTaxGoods: 9083,
    monthlySIPA: 17178,
    monthlyObraSocial: 21990,
    monthlyTotalServices: 48251,
    monthlyTotalGoods: 48251,
    description: 'Hasta $15.058.448 anuales · Cuota: $48.251/mes',
  },
  {
    code: 'C',
    label: 'Categoría C',
    maxIncome: 21113696.52,
    maxSurface: 60,
    maxEnergy: 6700,
    maxUnitPrice: 613492.31,
    monthlyTaxServices: 15616,
    monthlyTaxGoods: 14341,
    monthlySIPA: 18896,
    monthlyObraSocial: 21990,
    monthlyTotalServices: 56502,
    monthlyTotalGoods: 55227,
    description: 'Hasta $21.113.697 anuales · Cuota: $56.502/mes (servicios)',
  },
  {
    code: 'D',
    label: 'Categoría D',
    maxIncome: 26212853.42,
    maxSurface: 85,
    maxEnergy: 10000,
    maxUnitPrice: 613492.31,
    monthlyTaxServices: 25496,
    monthlyTaxGoods: 23743,
    monthlySIPA: 20785,
    monthlyObraSocial: 26133,
    monthlyTotalServices: 72414,
    monthlyTotalGoods: 70661,
    description: 'Hasta $26.212.853 anuales · Cuota: $72.414/mes (servicios)',
  },
  {
    code: 'E',
    label: 'Categoría E',
    maxIncome: 30833964.37,
    maxSurface: 110,
    maxEnergy: 13000,
    maxUnitPrice: 613492.31,
    monthlyTaxServices: 47805,
    monthlyTaxGoods: 37925,
    monthlySIPA: 22864,
    monthlyObraSocial: 31870,
    monthlyTotalServices: 102538,
    monthlyTotalGoods: 92658,
    description: 'Hasta $30.833.964 anuales · Cuota: $102.538/mes (servicios)',
  },
  {
    code: 'F',
    label: 'Categoría F',
    maxIncome: 38642048.36,
    maxSurface: 150,
    maxEnergy: 16500,
    maxUnitPrice: 613492.31,
    monthlyTaxServices: 67245,
    monthlyTaxGoods: 49398,
    monthlySIPA: 25150,
    monthlyObraSocial: 36650,
    monthlyTotalServices: 129045,
    monthlyTotalGoods: 111198,
    description: 'Hasta $38.642.048 anuales · Cuota: $129.045/mes (servicios)',
  },
  {
    code: 'G',
    label: 'Categoría G',
    maxIncome: 46211109.37,
    maxSurface: 200,
    maxEnergy: 20000,
    maxUnitPrice: 613492.31,
    monthlyTaxServices: 122380,
    monthlyTaxGoods: 61190,
    monthlySIPA: 35210,
    monthlyObraSocial: 39518,
    monthlyTotalServices: 197108,
    monthlyTotalGoods: 135918,
    description: 'Hasta $46.211.109 anuales · Cuota: $197.108/mes (servicios)',
  },
  {
    code: 'H',
    label: 'Categoría H',
    maxIncome: 70113407.33,
    maxSurface: 200,
    maxEnergy: 20000,
    maxUnitPrice: 613492.31,
    monthlyTaxServices: 350567,
    monthlyTaxGoods: 175283,
    monthlySIPA: 49294,
    monthlyObraSocial: 47486,
    monthlyTotalServices: 447347,
    monthlyTotalGoods: 272063,
    description: 'Hasta $70.113.407 anuales · Cuota: $447.347/mes (servicios)',
  },
  {
    code: 'I',
    label: 'Categoría I',
    maxIncome: 78479211.62,
    maxSurface: 200,
    maxEnergy: 20000,
    maxUnitPrice: 613492.31,
    monthlyTaxServices: 697150,
    monthlyTaxGoods: 278860,
    monthlySIPA: 69012,
    monthlyObraSocial: 58640,
    monthlyTotalServices: 824802,
    monthlyTotalGoods: 406512,
    description: 'Hasta $78.479.212 anuales · Cuota: $824.802/mes (servicios)',
  },
  {
    code: 'J',
    label: 'Categoría J',
    maxIncome: 89872640.30,
    maxSurface: 200,
    maxEnergy: 20000,
    maxUnitPrice: 613492.31,
    monthlyTaxServices: 836580,
    monthlyTaxGoods: 334632,
    monthlySIPA: 96616,
    monthlyObraSocial: 65811,
    monthlyTotalServices: 999007,
    monthlyTotalGoods: 497059,
    description: 'Hasta $89.872.640 anuales · Cuota: $999.007/mes (servicios)',
  },
  {
    code: 'K',
    label: 'Categoría K',
    maxIncome: 108357084.05,
    maxSurface: 200,
    maxEnergy: 20000,
    maxUnitPrice: 613492.31,
    monthlyTaxServices: 1171213,
    monthlyTaxGoods: 389656,
    monthlySIPA: 135263,
    monthlyObraSocial: 75213,
    monthlyTotalServices: 1381688,
    monthlyTotalGoods: 600880,
    description: 'Hasta $108.357.084 anuales · Cuota: $1.381.688/mes (servicios)',
  },
]

// ── IVA (Impuesto al Valor Agregado) — Alícuotas vigentes ──────────────────
export const IVA_RATES = {
  GENERAL: 0.21,          // 21% — Alícuota general
  DIFERENCIAL: 0.105,     // 10,5% — Bienes de capital, ganado bovino, frutas, etc.
  REDUCIDA: 0.025,        // 2,5% — Algunos servicios especiales
  ZERO: 0,                // Exento
} as const

export const IVA_LABELS: Record<keyof typeof IVA_RATES, string> = {
  GENERAL: '21% — Alícuota general',
  DIFERENCIAL: '10,5% — Diferencial (bienes de capital / agro)',
  REDUCIDA: '2,5% — Reducida',
  ZERO: 'Exento',
}

// ── RÉGIMEN GENERAL — Parámetros clave ──────────────────────────────────────
export const REGIMEN_GENERAL_PARAMS = {
  ivaGeneral: 0.21,
  ivaDiferencial: 0.105,
  /** Mínimo no imponible mensual Ganancias 4ta categoría 2026 (estimado) */
  mniGanancias4taCategoria: 1800000,
  /** Tasa Ganancias personas humanas — tramo básico */
  gananciasBasicRate: 0.05,
  /** Vencimiento IVA: entre el 18 y 22 de cada mes (según CUIT) */
  ivaVencimientoLabel: 'Entre el 18 y 22 de cada mes (según terminación CUIT)',
} as const

// ── TIPOS DE COMPROBANTE ────────────────────────────────────────────────────
export const INVOICE_TYPES = {
  A: { label: 'Factura A', description: 'Responsable Inscripto → Responsable Inscripto (con IVA discriminado 21%)', color: 'blue', ivaRate: 0.21 },
  B: { label: 'Factura B', description: 'Responsable Inscripto → Consumidor Final / Exento / No responsable', color: 'green', ivaRate: 0 },
  C: { label: 'Factura C', description: 'Monotributista o Exento → cualquier destinatario', color: 'yellow', ivaRate: 0 },
  X: { label: 'Comprobante X', description: 'Comprobante genérico del simulador (sin valor fiscal)', color: 'gray', ivaRate: 0 },
  DEMO: { label: 'Comprobante DEMO', description: 'Comprobante educativo de práctica — sin ningún valor fiscal', color: 'purple', ivaRate: 0 },
} as const

// ── PUNTOS DE VENTA — Modalidades ──────────────────────────────────────────
export const POS_MODALITIES = [
  { value: 'electronica', label: 'Factura Electrónica (RG 4291)' },
  { value: 'manual', label: 'Manual (talonario preimpreso)' },
  { value: 'pos_fiscal', label: 'Controlador Fiscal (RG 3561)' },
  { value: 'otro', label: 'Otro' },
]

// ── PASOS DE ALTA REGISTRAL ─────────────────────────────────────────────────
export const REGISTRATION_STEPS_CONFIG = [
  { step_number: 1, step_key: 'datos_identificatorios', step_name: 'Datos identificatorios' },
  { step_number: 2, step_key: 'domicilio_fiscal', step_name: 'Domicilio fiscal' },
  { step_number: 3, step_key: 'actividad_economica', step_name: 'Actividad económica' },
  { step_number: 4, step_key: 'condicion_inicial', step_name: 'Condición inicial' },
  { step_number: 5, step_key: 'datos_contacto', step_name: 'Datos de contacto' },
  { step_number: 6, step_key: 'confirmacion', step_name: 'Confirmación final' },
]
