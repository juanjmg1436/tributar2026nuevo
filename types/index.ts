import type { Database } from './database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type TaxpayerProfile = Database['public']['Tables']['taxpayer_profiles']['Row']
export type RegistrationStep = Database['public']['Tables']['registration_steps']['Row']
export type TaxRegime = Database['public']['Tables']['tax_regimes']['Row']
export type TaxpayerRegimeStatus = Database['public']['Tables']['taxpayer_regime_status']['Row']
export type Obligation = Database['public']['Tables']['obligations']['Row']
export type EFiscalAddress = Database['public']['Tables']['e_fiscal_address']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type PointOfSale = Database['public']['Tables']['points_of_sale']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
export type ActivityLog = Database['public']['Tables']['activity_log']['Row']

// Insert types
export type InsertTaxpayerProfile = Database['public']['Tables']['taxpayer_profiles']['Insert']
export type InsertRegistrationStep = Database['public']['Tables']['registration_steps']['Insert']
export type InsertObligation = Database['public']['Tables']['obligations']['Insert']
export type InsertNotification = Database['public']['Tables']['notifications']['Insert']
export type InsertPointOfSale = Database['public']['Tables']['points_of_sale']['Insert']
export type InsertInvoice = Database['public']['Tables']['invoices']['Insert']
export type InsertInvoiceItem = Database['public']['Tables']['invoice_items']['Insert']
export type InsertActivityLog = Database['public']['Tables']['activity_log']['Insert']

// App-specific types
export type SubjectType = 'persona_humana' | 'persona_juridica'
export type RegistrationStatus = 'pending' | 'in_progress' | 'completed' | 'locked'
export type ObligationStatus = 'pending' | 'submitted' | 'paid' | 'overdue'
export type InvoiceType = 'A' | 'B' | 'C' | 'X' | 'DEMO'

export interface UserProgress {
  hasProfile: boolean
  hasTaxpayerProfile: boolean
  registrationComplete: boolean
  hasActiveRegime: boolean
  hasEFiscalAddress: boolean
  hasPOS: boolean
  completionPercentage: number
  currentStage: number
}

export interface StageInfo {
  number: number
  title: string
  description: string
  status: 'completed' | 'current' | 'locked'
  route?: string
}

export interface NavItem {
  label: string
  href: string
  icon: string
  locked?: boolean
  badge?: number
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[]
}
