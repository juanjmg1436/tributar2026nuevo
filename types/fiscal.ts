// ─────────────────────────────────────────────────────────────────────────────
// Tipos — Motor Fiscal Integral — Tribut.AR
// ─────────────────────────────────────────────────────────────────────────────

// ── Parámetros fiscales ───────────────────────────────────────────────────────
export interface FiscalParameter {
  id: string
  param_key: string
  param_name: string
  param_type: 'rate' | 'amount' | 'integer' | 'text' | 'boolean'
  value_decimal: number | null
  value_text: string | null
  category: 'iva' | 'ganancias' | 'monotributo' | 'cargas_sociales' | 'mora' | 'general'
  description: string | null
  editable_by_teacher: boolean
  is_active: boolean
}

export interface FiscalParamsMap {
  iva_general: number
  iva_diferencial: number
  iva_vencimiento_dia: number
  ganancias_alicuota_juridica: number
  ganancias_mni_mensual: number
  ganancias_anticipo_pct: number
  mora_tasa_mensual: number
  multa_omision_pct: number
  jubilacion_trabajador: number
  obra_social_trabajador: number
  pami_trabajador: number
  jubilacion_empleador: number
  obra_social_empleador: number
  asig_familiares_empleador: number
  fondo_empleo_empleador: number
  art_empleador: number
  seguro_vida_empleador: number
}

// ── Categorías Monotributo ────────────────────────────────────────────────────
export interface MonotributoDemoCategory {
  id: string
  category_code: string
  label: string
  max_annual_income: number
  max_surface: number | null
  max_energy: number | null
  monthly_tax_services: number
  monthly_tax_goods: number
  monthly_sipa: number
  monthly_obra_social: number
  monthly_total_services: number
  monthly_total_goods: number
  is_active: boolean
}

// ── Perfil Monotributo ────────────────────────────────────────────────────────
export interface MonotributoProfile {
  id: string
  user_id: string
  category_code: string
  activity_type: 'servicios' | 'bienes'
  estimated_annual_revenue: number
  start_date: string | null
  current_since: string
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

// ── Pago Monotributo ─────────────────────────────────────────────────────────
export interface MonotributoPayment {
  id: string
  user_id: string
  period: string
  period_label: string
  due_date: string
  category_code: string
  tax_component: number
  sipa_component: number
  obra_social_component: number
  total_amount: number
  surcharge: number
  status: 'pending' | 'paid' | 'overdue'
  paid_at: string | null
  created_at: string
}

// ── Compras ───────────────────────────────────────────────────────────────────
export interface Purchase {
  id: string
  user_id: string
  period: string
  purchase_date: string
  supplier_name: string
  supplier_cuit: string | null
  invoice_type: 'A' | 'B' | 'C' | 'X' | 'ticket'
  invoice_number: string | null
  concept: string
  subtotal: number
  iva_rate: number
  iva_amount: number
  total: number
  is_iva_computable: boolean
  status: 'active' | 'cancelled'
  notes: string | null
  created_at: string
}

// ── DDJJ IVA ─────────────────────────────────────────────────────────────────
export interface VatReturn {
  id: string
  user_id: string
  period: string
  period_label: string
  due_date: string
  sales_taxable: number
  sales_iva_debit: number
  purchases_iva_credit: number
  withholdings: number
  perceptions: number
  previous_credit: number
  iva_determined: number
  net_payable: number
  credit_balance: number
  status: 'draft' | 'submitted' | 'paid' | 'overdue' | 'credit'
  submitted_at: string | null
  notes: string | null
  created_at: string
}

// ── Ganancias DDJJ ────────────────────────────────────────────────────────────
export interface IncomeTaxReturn {
  id: string
  user_id: string
  fiscal_year: number
  period: string
  period_label: string
  period_type: 'mensual' | 'anual'
  due_date: string
  total_income: number
  total_purchases: number
  salary_expense: number
  social_security_expense: number
  other_expenses: number
  gross_result: number
  net_income: number
  tax_rate: number
  tax_determined: number
  advance_payments: number
  withholdings: number
  previous_credit: number
  net_payable: number
  status: 'draft' | 'submitted' | 'paid' | 'overdue'
  submitted_at: string | null
  created_at: string
}

// ── Empleadores ───────────────────────────────────────────────────────────────
export interface Employer {
  id: string
  user_id: string
  cuit: string
  entity_name: string
  activity: string
  address: string
  locality: string
  art_insurer: string
  obra_social: string
  convention_type: string
  status: 'active' | 'incomplete' | 'suspended'
  registered_at: string
  created_at: string
}

// ── Trabajadores ──────────────────────────────────────────────────────────────
export interface Employee {
  id: string
  employer_id: string
  user_id: string
  cuil: string
  full_name: string
  hire_date: string
  position: string
  schedule_type: 'completa' | 'parcial'
  basic_salary: number
  contract_type: string
  obra_social: string
  art: string
  workplace: string
  status: 'active' | 'baja' | 'licencia'
  termination_date: string | null
  created_at: string
  updated_at: string
}

// ── Liquidación de sueldos ────────────────────────────────────────────────────
export interface PayrollRun {
  id: string
  user_id: string
  employer_id: string
  period: string
  period_label: string
  employee_count: number
  total_gross: number
  total_worker_deductions: number
  total_net: number
  total_employer_contributions: number
  total_labor_cost: number
  status: 'draft' | 'confirmed' | 'paid'
  created_at: string
}

export interface PayrollItem {
  id: string
  payroll_run_id: string
  employee_id: string
  user_id: string
  // Haberes
  basic_salary: number
  overtime: number
  presentismo: number
  bonuses: number
  other_remunerative: number
  non_remunerative: number
  total_gross: number
  // Descuentos trabajador
  jubilacion_worker: number
  obra_social_worker: number
  pami_worker: number
  other_deductions: number
  total_worker_deductions: number
  net_salary: number
  // Cargas patronales
  jubilacion_employer: number
  obra_social_employer: number
  art_employer: number
  family_allowances: number
  employment_fund: number
  life_insurance: number
  total_employer_contributions: number
  total_labor_cost: number
  created_at: string
}

// ── Cargas sociales DDJJ ──────────────────────────────────────────────────────
export interface SocialSecurityReturn {
  id: string
  user_id: string
  employer_id: string
  payroll_run_id: string | null
  period: string
  period_label: string
  due_date: string
  total_worker_contributions: number
  total_employer_contributions: number
  total_payable: number
  surcharge: number
  status: 'pending' | 'submitted' | 'paid' | 'overdue'
  paid_at: string | null
  created_at: string
}

// ── VEP Simulado ──────────────────────────────────────────────────────────────
export interface SimulatedVep {
  id: string
  user_id: string
  vep_number: string
  obligation_type: string
  concept: string
  period: string | null
  amount: number
  due_date: string
  payment_method: string
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  reference_id: string | null
  paid_at: string | null
  comprobante_number: string | null
  created_at: string
}

// ── Evaluación estudiante ─────────────────────────────────────────────────────
export interface StudentAssessment {
  id: string
  user_id: string
  assessed_by: string | null
  period: string
  total_score: number
  criteria_scores: Record<string, number>
  feedback: string | null
  level: 'excelente' | 'muy_bueno' | 'bueno' | 'regular' | 'insuficiente' | null
  created_at: string
}

// ── Cálculos del motor fiscal ─────────────────────────────────────────────────
export interface VatCalculation {
  period: string
  salesTaxable: number
  salesIvaDebit: number
  purchasesIvaCredit: number
  withholdings: number
  perceptions: number
  previousCredit: number
  ivaDetermined: number
  netPayable: number
  creditBalance: number
  hasCredit: boolean
}

export interface PayrollCalculation {
  employee: Employee
  totalGross: number
  jubilacionWorker: number
  obraSocialWorker: number
  pamiWorker: number
  totalWorkerDeductions: number
  netSalary: number
  jubilacionEmployer: number
  obraSocialEmployer: number
  artEmployer: number
  familyAllowances: number
  employmentFund: number
  lifeInsurance: number
  totalEmployerContributions: number
  totalLaborCost: number
}

export interface TramoPHResult {
  desde: number
  hasta: number
  tasa: number
  base: number
  impuesto: number
}

export interface IncomeTaxCalculation {
  period: string
  totalIncome: number
  totalPurchases: number
  salaryExpense: number
  socialSecurityExpense: number
  otherExpenses: number
  grossResult: number
  netIncome: number
  taxRate: number
  taxDetermined: number
  advancePayments: number
  withholdings: number
  previousCredit: number
  netPayable: number
  // Deducciones PH (art. 23 Ley 20628)
  mniDeduccion?: number
  deduccionEspecial?: number
  deduccionConyuge?: number
  deduccionHijos?: number
  deduccionGastosMedicos?: number
  totalDeducciones?: number
  // Escala progresiva PH
  tramosPH?: TramoPHResult[]
  // Quebrantos
  hasQuebranto?: boolean
  quebranto?: number
}

// ── Estado fiscal integral ─────────────────────────────────────────────────────
export interface FiscalStatus {
  userId: string
  period: string
  // IVA
  vatStatus: 'ok' | 'pending' | 'overdue' | 'not_applicable' | 'credit'
  vatAmount: number
  // Monotributo
  monotributoStatus: 'ok' | 'pending' | 'overdue' | 'not_applicable'
  monotributoAmount: number
  // Ganancias
  incomeTaxStatus: 'ok' | 'pending' | 'overdue' | 'not_applicable'
  incomeTaxAmount: number
  // Cargas sociales
  socialSecurityStatus: 'ok' | 'pending' | 'overdue' | 'not_applicable'
  socialSecurityAmount: number
  // IIBB Provincial
  iibbStatus: 'ok' | 'pending' | 'overdue' | 'not_applicable'
  iibbAmount: number
  // Totals
  totalPending: number
  totalOverdue: number
  complianceScore: number
  fiscalState: 'al_dia' | 'con_deuda' | 'incompleto' | 'suspendido_demo'
}
