export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          institution: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          institution?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          institution?: string | null
          role?: string
          updated_at?: string
        }
      }
      taxpayer_profiles: {
        Row: {
          id: string
          user_id: string
          subject_type: 'persona_humana' | 'persona_juridica'
          entity_name: string
          trade_name: string | null
          cuit: string
          main_activity_code: string | null
          main_activity_name: string | null
          secondary_activity_code: string | null
          secondary_activity_name: string | null
          fiscal_address: string | null
          street: string | null
          street_number: string | null
          floor_apt: string | null
          province: string | null
          municipality: string | null
          postal_code: string | null
          activity_start_date: string | null
          status: 'incomplete' | 'active' | 'suspended' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_type: 'persona_humana' | 'persona_juridica'
          entity_name: string
          trade_name?: string | null
          cuit: string
          main_activity_code?: string | null
          main_activity_name?: string | null
          secondary_activity_code?: string | null
          secondary_activity_name?: string | null
          fiscal_address?: string | null
          street?: string | null
          street_number?: string | null
          floor_apt?: string | null
          province?: string | null
          municipality?: string | null
          postal_code?: string | null
          activity_start_date?: string | null
          status?: 'incomplete' | 'active' | 'suspended' | 'cancelled'
        }
        Update: {
          subject_type?: 'persona_humana' | 'persona_juridica'
          entity_name?: string
          trade_name?: string | null
          cuit?: string
          main_activity_code?: string | null
          main_activity_name?: string | null
          secondary_activity_code?: string | null
          secondary_activity_name?: string | null
          fiscal_address?: string | null
          street?: string | null
          street_number?: string | null
          floor_apt?: string | null
          province?: string | null
          municipality?: string | null
          postal_code?: string | null
          activity_start_date?: string | null
          status?: 'incomplete' | 'active' | 'suspended' | 'cancelled'
          updated_at?: string
        }
      }
      registration_steps: {
        Row: {
          id: string
          user_id: string
          step_number: number
          step_key: string
          step_name: string
          status: 'pending' | 'in_progress' | 'completed' | 'locked'
          step_data: Json
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          step_number: number
          step_key: string
          step_name: string
          status?: 'pending' | 'in_progress' | 'completed' | 'locked'
          step_data?: Json
          completed_at?: string | null
        }
        Update: {
          status?: 'pending' | 'in_progress' | 'completed' | 'locked'
          step_data?: Json
          completed_at?: string | null
          updated_at?: string
        }
      }
      tax_regimes: {
        Row: {
          id: string
          code: string
          name: string
          short_description: string | null
          full_description: string | null
          applies_to: 'persona_humana' | 'persona_juridica' | 'both'
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          short_description?: string | null
          full_description?: string | null
          applies_to?: 'persona_humana' | 'persona_juridica' | 'both'
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          name?: string
          short_description?: string | null
          full_description?: string | null
          applies_to?: 'persona_humana' | 'persona_juridica' | 'both'
          is_active?: boolean
          sort_order?: number
        }
      }
      taxpayer_regime_status: {
        Row: {
          id: string
          user_id: string
          regime_id: string
          status: 'active' | 'inactive' | 'suspended' | 'pending_activation'
          start_date: string | null
          end_date: string | null
          category: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          regime_id: string
          status?: 'active' | 'inactive' | 'suspended' | 'pending_activation'
          start_date?: string | null
          end_date?: string | null
          category?: string | null
          notes?: string | null
        }
        Update: {
          status?: 'active' | 'inactive' | 'suspended' | 'pending_activation'
          start_date?: string | null
          end_date?: string | null
          category?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      obligations: {
        Row: {
          id: string
          user_id: string
          regime_id: string | null
          concept: string
          period: string
          due_date: string
          amount_demo: number
          status: 'pending' | 'submitted' | 'paid' | 'overdue'
          description: string | null
          origin: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          regime_id?: string | null
          concept: string
          period: string
          due_date: string
          amount_demo?: number
          status?: 'pending' | 'submitted' | 'paid' | 'overdue'
          description?: string | null
          origin?: string | null
        }
        Update: {
          concept?: string
          period?: string
          due_date?: string
          amount_demo?: number
          status?: 'pending' | 'submitted' | 'paid' | 'overdue'
          description?: string | null
          updated_at?: string
        }
      }
      e_fiscal_address: {
        Row: {
          id: string
          user_id: string
          status: 'pending' | 'constituted' | 'suspended'
          notification_email: string | null
          phone: string | null
          constitution_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status?: 'pending' | 'constituted' | 'suspended'
          notification_email?: string | null
          phone?: string | null
          constitution_date?: string | null
        }
        Update: {
          status?: 'pending' | 'constituted' | 'suspended'
          notification_email?: string | null
          phone?: string | null
          constitution_date?: string | null
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          notification_type: 'info' | 'warning' | 'reminder' | 'success' | 'error'
          is_read: boolean
          link_to: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          notification_type?: 'info' | 'warning' | 'reminder' | 'success' | 'error'
          is_read?: boolean
          link_to?: string | null
        }
        Update: {
          title?: string
          message?: string
          notification_type?: 'info' | 'warning' | 'reminder' | 'success' | 'error'
          is_read?: boolean
        }
      }
      points_of_sale: {
        Row: {
          id: string
          user_id: string
          pos_number: number
          name: string
          modality: 'electronica' | 'manual' | 'pos_fiscal' | 'otro'
          status: 'active' | 'inactive' | 'pending'
          activation_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pos_number: number
          name: string
          modality?: 'electronica' | 'manual' | 'pos_fiscal' | 'otro'
          status?: 'active' | 'inactive' | 'pending'
          activation_date?: string | null
          notes?: string | null
        }
        Update: {
          name?: string
          modality?: 'electronica' | 'manual' | 'pos_fiscal' | 'otro'
          status?: 'active' | 'inactive' | 'pending'
          activation_date?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          point_of_sale_id: string | null
          pos_number: number
          invoice_type: 'A' | 'B' | 'C' | 'X' | 'DEMO'
          invoice_number: string
          issue_date: string
          receiver_name: string
          receiver_cuit: string | null
          receiver_condition: string | null
          concept: string | null
          subtotal: number
          iva_amount: number | null
          total: number
          notes: string | null
          status: 'issued' | 'cancelled' | 'draft'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          point_of_sale_id?: string | null
          pos_number?: number
          invoice_type: 'A' | 'B' | 'C' | 'X' | 'DEMO'
          invoice_number: string
          issue_date?: string
          receiver_name: string
          receiver_cuit?: string | null
          receiver_condition?: string | null
          concept?: string | null
          subtotal?: number
          iva_amount?: number | null
          total?: number
          notes?: string | null
          status?: 'issued' | 'cancelled' | 'draft'
        }
        Update: {
          invoice_type?: 'A' | 'B' | 'C' | 'X' | 'DEMO'
          receiver_name?: string
          receiver_cuit?: string | null
          receiver_condition?: string | null
          concept?: string | null
          subtotal?: number
          iva_amount?: number | null
          total?: number
          notes?: string | null
          status?: 'issued' | 'cancelled' | 'draft'
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          total: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          unit_price?: number
          total?: number
        }
        Update: {
          description?: string
          quantity?: number
          unit_price?: number
          total?: number
        }
      }
      activity_log: {
        Row: {
          id: string
          user_id: string
          action_type: string
          description: string
          module: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action_type: string
          description: string
          module: string
          metadata?: Json
        }
        Update: never
      }
    }
  }
}
