// ─────────────────────────────────────────────────────────────────────────────
// Tipos TypeScript — Módulo ATM Misiones Simulado
// Tribut.AR — Simulador Didáctico Fiscal
// ─────────────────────────────────────────────────────────────────────────────

export type ProvRegistrationStatus = 'incomplete' | 'active' | 'suspended' | 'cancelled'
export type ProvDDJJStatus = 'draft' | 'submitted' | 'paid' | 'overdue'
export type ProvPaymentStatus = 'pending' | 'paid' | 'overdue'
export type ProvSubjectType = 'persona_humana' | 'persona_juridica'
export type ProvTaxType = 'iibb' | 'inmobiliario' | 'automotor' | 'sellos' | 'sr341'

// ── Contribuyente provincial ─────────────────────────────────────────────────
export interface ProvTaxpayer {
  id: string
  user_id: string
  cuit: string
  entity_name: string
  subject_type: ProvSubjectType
  // Datos de actividad
  primary_activity_code: string
  primary_activity_name: string
  start_date: string
  // Domicilio en Misiones
  locality: string
  department: string
  street: string
  street_number: string
  postal_code: string
  // Contacto
  email: string
  phone?: string | null
  // Condición IIBB
  iibb_number?: string | null
  iibb_regime: 'local' | 'convenio_multilateral' | 'exento'
  // Estado
  status: ProvRegistrationStatus
  created_at: string
  updated_at: string
}

// ── DDJJ Ingresos Brutos ─────────────────────────────────────────────────────
export interface ProvIIBBDDJJ {
  id: string
  user_id: string
  taxpayer_id: string
  period: string                // 'YYYY-MM'
  period_label: string          // 'Enero 2026'
  due_date: string
  total_revenue: number
  total_exempt_revenue: number
  total_taxable_revenue: number
  total_tax: number
  total_withholdings: number
  net_tax: number
  status: ProvDDJJStatus
  submitted_at?: string | null
  notes?: string | null
  origin: 'manual' | 'system'
  created_at: string
}

// ── Ítems de DDJJ (actividades) ──────────────────────────────────────────────
export interface ProvIIBBItem {
  id: string
  ddjj_id: string
  activity_code: string
  activity_name: string
  revenue: number
  exempt_revenue: number
  taxable_revenue: number
  rate: number                  // Alícuota en decimales (ej: 0.03 = 3%)
  tax_amount: number
  created_at: string
}

// ── Boletas / Pagos ──────────────────────────────────────────────────────────
export interface ProvPayment {
  id: string
  user_id: string
  taxpayer_id: string
  tax_type: ProvTaxType
  concept: string
  period?: string | null
  due_date: string
  amount: number
  surcharge: number             // Recargo por mora
  total_amount: number
  status: ProvPaymentStatus
  reference_id?: string | null  // DDJJ, inmueble, vehículo vinculado
  paid_at?: string | null
  created_at: string
}

// ── Inmobiliario ─────────────────────────────────────────────────────────────
export interface ProvRealEstate {
  id: string
  user_id: string
  taxpayer_id: string
  cadastral_number: string
  description: string           // 'Lote 12, Manzana 3 — Posadas'
  locality: string
  department: string
  land_area: number             // m²
  built_area: number            // m²
  fiscal_value: number
  rate: number                  // Alícuota
  annual_tax: number
  category: 'urbano' | 'rural' | 'periurbano'
  created_at: string
}

// ── Automotor ────────────────────────────────────────────────────────────────
export interface ProvVehicle {
  id: string
  user_id: string
  taxpayer_id: string
  plate: string
  make: string
  model: string
  year: number
  engine_cc: number
  fiscal_value: number
  rate: number
  annual_tax: number
  category: 'automovil' | 'camioneta' | 'camion' | 'moto' | 'otro'
  created_at: string
}

// ── Sellos ───────────────────────────────────────────────────────────────────
export interface ProvStamp {
  id: string
  user_id: string
  taxpayer_id: string
  contract_type: string         // 'Locación inmueble', 'Compraventa', etc.
  description: string
  contract_date: string
  contract_amount: number
  rate: number                  // 0.01 = 1%
  tax_amount: number
  status: 'pending' | 'paid'
  created_at: string
}

// ── SR-341 (Agente de retención) ─────────────────────────────────────────────
export interface ProvSR341 {
  id: string
  user_id: string
  taxpayer_id: string
  period: string                // 'YYYY-MM'
  retention_month: string
  // Datos del retenido
  retained_cuit: string
  retained_name: string
  activity_code: string
  // Valores
  gross_amount: number
  rate: number
  retained_amount: number
  payment_date: string
  notes?: string | null
  status: 'draft' | 'submitted'
  created_at: string
}

// ── Domicilio Fiscal Electrónico Provincial ──────────────────────────────────
export interface ProvFiscalAddress {
  id: string
  user_id: string
  taxpayer_id: string
  email: string
  alternate_email?: string | null
  sms_phone?: string | null
  notifications_iibb: boolean
  notifications_payments: boolean
  notifications_general: boolean
  confirmed: boolean
  confirmed_at?: string | null
  created_at: string
}

// ── Cumplimiento ─────────────────────────────────────────────────────────────
export interface ProvCompliance {
  id: string
  user_id: string
  taxpayer_id: string
  obligation_type: ProvTaxType
  concept: string
  period: string
  due_date: string
  status: 'ok' | 'pending' | 'overdue' | 'exempt'
  days_overdue: number
  related_id?: string | null
  created_at: string
}

// ── Casos prácticos ──────────────────────────────────────────────────────────
export interface ProvCaseProgress {
  id: string
  user_id: string
  case_id: string               // 'caso_1' | 'caso_2' | 'caso_3'
  step: number
  completed: boolean
  score: number                 // 0-100
  feedback?: string | null
  completed_at?: string | null
  created_at: string
}

// ── Resumen provincial (calculado en frontend) ───────────────────────────────
export interface ProvSummary {
  hasTaxpayer: boolean
  iibbPending: number
  iibbOverdue: number
  paymentsPending: number
  paymentsOverdue: number
  complianceScore: number       // 0-100
  lastDDJJPeriod?: string
}
