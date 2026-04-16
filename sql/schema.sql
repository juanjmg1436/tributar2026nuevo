-- ============================================================
-- TRIBUT.AR - Simulador Didáctico Fiscal Argentino
-- Script de Creación de Base de Datos
-- SIMULADOR EDUCATIVO - NO OFICIAL - SIN VALIDEZ LEGAL/FISCAL
-- ============================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: profiles
-- Extiende auth.users de Supabase con datos del estudiante
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  institution TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role = 'student'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Perfil del estudiante. SIMULADOR EDUCATIVO.';

-- ============================================================
-- TABLA: taxpayer_profiles
-- Contribuyente simulado creado por el estudiante
-- ============================================================
CREATE TABLE IF NOT EXISTS public.taxpayer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('persona_humana', 'persona_juridica')),
  entity_name TEXT NOT NULL,
  trade_name TEXT,
  cuit TEXT NOT NULL,
  main_activity_code TEXT,
  main_activity_name TEXT,
  secondary_activity_code TEXT,
  secondary_activity_name TEXT,
  fiscal_address TEXT,
  street TEXT,
  street_number TEXT,
  floor_apt TEXT,
  province TEXT,
  municipality TEXT,
  postal_code TEXT,
  activity_start_date DATE,
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'active', 'suspended', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

COMMENT ON TABLE public.taxpayer_profiles IS 'Contribuyente simulado del estudiante. SIMULADOR EDUCATIVO.';

-- ============================================================
-- TABLA: registration_steps
-- Pasos del proceso de alta inicial (RUT / formulario equivalente)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.registration_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_key TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'locked')),
  step_data JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, step_key)
);

COMMENT ON TABLE public.registration_steps IS 'Pasos del alta registral simulada. SIMULADOR EDUCATIVO.';

-- ============================================================
-- TABLA: tax_regimes
-- Regímenes tributarios disponibles en el simulador
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tax_regimes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT,
  full_description TEXT,
  applies_to TEXT NOT NULL DEFAULT 'both' CHECK (applies_to IN ('persona_humana', 'persona_juridica', 'both')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tax_regimes IS 'Regímenes tributarios del simulador. SIMULADOR EDUCATIVO.';

-- ============================================================
-- TABLA: taxpayer_regime_status
-- Estado del contribuyente en cada régimen
-- ============================================================
CREATE TABLE IF NOT EXISTS public.taxpayer_regime_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  regime_id UUID NOT NULL REFERENCES public.tax_regimes(id),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_activation')),
  start_date DATE,
  end_date DATE,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, regime_id)
);

COMMENT ON TABLE public.taxpayer_regime_status IS 'Régimen activo del contribuyente. SIMULADOR EDUCATIVO.';

-- ============================================================
-- TABLA: obligations
-- Obligaciones fiscales simuladas generadas automáticamente
-- ============================================================
CREATE TABLE IF NOT EXISTS public.obligations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  regime_id UUID REFERENCES public.tax_regimes(id),
  concept TEXT NOT NULL,
  period TEXT NOT NULL,
  due_date DATE NOT NULL,
  amount_demo DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'paid', 'overdue')),
  description TEXT,
  origin TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.obligations IS 'Obligaciones fiscales simuladas. SIMULADOR EDUCATIVO.';

-- ============================================================
-- TABLA: e_fiscal_address
-- Domicilio Fiscal Electrónico simulado
-- ============================================================
CREATE TABLE IF NOT EXISTS public.e_fiscal_address (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'constituted', 'suspended')),
  notification_email TEXT,
  phone TEXT,
  constitution_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

COMMENT ON TABLE public.e_fiscal_address IS 'Domicilio Fiscal Electrónico simulado. SIMULADOR EDUCATIVO.';

-- ============================================================
-- TABLA: notifications
-- Notificaciones del sistema y pedagógicas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'info' CHECK (notification_type IN ('info', 'warning', 'reminder', 'success', 'error')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  link_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'Notificaciones del simulador. SIMULADOR EDUCATIVO.';

-- ============================================================
-- TABLA: points_of_sale
-- Puntos de venta habilitados (simulados)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.points_of_sale (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pos_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  modality TEXT NOT NULL DEFAULT 'electronica' CHECK (modality IN ('electronica', 'manual', 'pos_fiscal', 'otro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  activation_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, pos_number)
);

COMMENT ON TABLE public.points_of_sale IS 'Puntos de venta simulados. SIMULADOR EDUCATIVO.';

-- ============================================================
-- TABLA: invoices
-- Comprobantes simulados emitidos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  point_of_sale_id UUID REFERENCES public.points_of_sale(id),
  pos_number INTEGER NOT NULL DEFAULT 1,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('A', 'B', 'C', 'X', 'DEMO')),
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receiver_name TEXT NOT NULL,
  receiver_cuit TEXT,
  receiver_condition TEXT,
  concept TEXT DEFAULT 'Servicios',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  iva_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'cancelled', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.invoices IS 'Comprobantes simulados emitidos. SIMULADOR EDUCATIVO.';

-- ============================================================
-- TABLA: invoice_items
-- Ítems de cada comprobante
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.invoice_items IS 'Ítems de comprobantes. SIMULADOR EDUCATIVO.';

-- ============================================================
-- TABLA: activity_log
-- Historial de acciones del estudiante
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  module TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.activity_log IS 'Historial de acciones del simulador. SIMULADOR EDUCATIVO.';

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_taxpayer_profiles_user_id ON public.taxpayer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_registration_steps_user_id ON public.registration_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_taxpayer_regime_status_user_id ON public.taxpayer_regime_status(user_id);
CREATE INDEX IF NOT EXISTS idx_obligations_user_id ON public.obligations(user_id);
CREATE INDEX IF NOT EXISTS idx_obligations_status ON public.obligations(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_points_of_sale_user_id ON public.points_of_sale(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_module ON public.activity_log(module);

-- ============================================================
-- FUNCIÓN: update_updated_at_column
-- Actualiza automáticamente updated_at en cada UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_taxpayer_profiles_updated_at
  BEFORE UPDATE ON public.taxpayer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_registration_steps_updated_at
  BEFORE UPDATE ON public.registration_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_taxpayer_regime_status_updated_at
  BEFORE UPDATE ON public.taxpayer_regime_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_obligations_updated_at
  BEFORE UPDATE ON public.obligations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_e_fiscal_address_updated_at
  BEFORE UPDATE ON public.e_fiscal_address
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_points_of_sale_updated_at
  BEFORE UPDATE ON public.points_of_sale
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- FUNCIÓN: handle_new_user
-- Crea automáticamente el perfil cuando se registra un usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
