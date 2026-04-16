-- ============================================================
-- TRIBUT.AR - Row Level Security (RLS) Policies
-- Seguridad a nivel de fila para Supabase
-- SIMULADOR EDUCATIVO - NO OFICIAL
-- ============================================================

-- ============================================================
-- Habilitar RLS en todas las tablas
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxpayer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_regimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxpayer_regime_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_fiscal_address ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_of_sale ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS: profiles
-- ============================================================
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- POLÍTICAS: taxpayer_profiles
-- ============================================================
CREATE POLICY "Users can view own taxpayer profile"
  ON public.taxpayer_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own taxpayer profile"
  ON public.taxpayer_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own taxpayer profile"
  ON public.taxpayer_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own taxpayer profile"
  ON public.taxpayer_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- POLÍTICAS: registration_steps
-- ============================================================
CREATE POLICY "Users can view own registration steps"
  ON public.registration_steps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own registration steps"
  ON public.registration_steps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own registration steps"
  ON public.registration_steps FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- POLÍTICAS: tax_regimes (lectura pública - son datos de referencia)
-- ============================================================
CREATE POLICY "Anyone can view tax regimes"
  ON public.tax_regimes FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- POLÍTICAS: taxpayer_regime_status
-- ============================================================
CREATE POLICY "Users can view own regime status"
  ON public.taxpayer_regime_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own regime status"
  ON public.taxpayer_regime_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own regime status"
  ON public.taxpayer_regime_status FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own regime status"
  ON public.taxpayer_regime_status FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- POLÍTICAS: obligations
-- ============================================================
CREATE POLICY "Users can view own obligations"
  ON public.obligations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own obligations"
  ON public.obligations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own obligations"
  ON public.obligations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- POLÍTICAS: e_fiscal_address
-- ============================================================
CREATE POLICY "Users can view own e_fiscal_address"
  ON public.e_fiscal_address FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own e_fiscal_address"
  ON public.e_fiscal_address FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own e_fiscal_address"
  ON public.e_fiscal_address FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- POLÍTICAS: notifications
-- ============================================================
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- POLÍTICAS: points_of_sale
-- ============================================================
CREATE POLICY "Users can view own points of sale"
  ON public.points_of_sale FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points of sale"
  ON public.points_of_sale FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own points of sale"
  ON public.points_of_sale FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own points of sale"
  ON public.points_of_sale FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- POLÍTICAS: invoices
-- ============================================================
CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- POLÍTICAS: invoice_items
-- ============================================================
CREATE POLICY "Users can view own invoice items"
  ON public.invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own invoice items"
  ON public.invoice_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own invoice items"
  ON public.invoice_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- ============================================================
-- POLÍTICAS: activity_log
-- ============================================================
CREATE POLICY "Users can view own activity log"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity log"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);
