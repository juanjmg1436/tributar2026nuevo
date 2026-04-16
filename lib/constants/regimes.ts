export const REGIME_CODES = {
  MONOTRIBUTO: 'MONOTRIBUTO',
  REGIMEN_GENERAL: 'REGIMEN_GENERAL',
  AUTONOMOS: 'AUTONOMOS',
  RELACIONES_LABORALES: 'RELACIONES_LABORALES',
  CASAS_PARTICULARES: 'CASAS_PARTICULARES',
} as const

export const MONOTRIBUTO_CATEGORIES = [
  { code: 'A', label: 'Categoría A', maxIncome: 2109223.31, description: 'Hasta $2.109.223,31 anuales (DEMO)' },
  { code: 'B', label: 'Categoría B', maxIncome: 3133200.45, description: 'Hasta $3.133.200,45 anuales (DEMO)' },
  { code: 'C', label: 'Categoría C', maxIncome: 4362667.89, description: 'Hasta $4.362.667,89 anuales (DEMO)' },
  { code: 'D', label: 'Categoría D', maxIncome: 5400000.00, description: 'Hasta $5.400.000,00 anuales (DEMO)' },
  { code: 'E', label: 'Categoría E', maxIncome: 6500000.00, description: 'Hasta $6.500.000,00 anuales (DEMO)' },
  { code: 'F', label: 'Categoría F', maxIncome: 8000000.00, description: 'Hasta $8.000.000,00 anuales (DEMO)' },
  { code: 'G', label: 'Categoría G', maxIncome: 10000000.00, description: 'Hasta $10.000.000,00 anuales (DEMO)' },
  { code: 'H', label: 'Categoría H', maxIncome: 13000000.00, description: 'Hasta $13.000.000,00 anuales (DEMO)' },
  { code: 'I', label: 'Categoría I', maxIncome: 16500000.00, description: 'Hasta $16.500.000,00 anuales (DEMO)' },
  { code: 'J', label: 'Categoría J', maxIncome: 20000000.00, description: 'Hasta $20.000.000,00 anuales (DEMO)' },
  { code: 'K', label: 'Categoría K', maxIncome: 25000000.00, description: 'Hasta $25.000.000,00 anuales (DEMO)' },
]

export const INVOICE_TYPES = {
  A: { label: 'Factura A', description: 'Para responsables inscriptos ante consumidores finales responsables inscriptos', color: 'blue' },
  B: { label: 'Factura B', description: 'Para responsables inscriptos ante consumidores finales', color: 'green' },
  C: { label: 'Factura C', description: 'Para monotributistas', color: 'yellow' },
  X: { label: 'Comprobante X', description: 'Comprobante genérico de simulador', color: 'gray' },
  DEMO: { label: 'Comprobante DEMO', description: 'Comprobante educativo de práctica', color: 'purple' },
} as const

export const POS_MODALITIES = [
  { value: 'electronica', label: 'Factura Electrónica' },
  { value: 'manual', label: 'Manual (talonario)' },
  { value: 'pos_fiscal', label: 'Controlador Fiscal' },
  { value: 'otro', label: 'Otro' },
]

export const REGISTRATION_STEPS_CONFIG = [
  { step_number: 1, step_key: 'datos_identificatorios', step_name: 'Datos identificatorios' },
  { step_number: 2, step_key: 'domicilio_fiscal', step_name: 'Domicilio fiscal' },
  { step_number: 3, step_key: 'actividad_economica', step_name: 'Actividad económica' },
  { step_number: 4, step_key: 'condicion_inicial', step_name: 'Condición inicial' },
  { step_number: 5, step_key: 'datos_contacto', step_name: 'Datos de contacto' },
  { step_number: 6, step_key: 'confirmacion', step_name: 'Confirmación final' },
]
