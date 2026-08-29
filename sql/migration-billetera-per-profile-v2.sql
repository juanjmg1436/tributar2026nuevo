-- ============================================================
-- MIGRACIÓN: Billetera Fiscal aislada por contribuyente (v2)
-- TRIBUT.AR — SIMULADOR EDUCATIVO
-- Aplicada el 2026-08-28 sobre el proyecto Simulador_fiscal_2026.
-- ============================================================
-- Reemplaza a migration-billetera-per-profile.sql, que nunca se ejecutó
-- y que además no funcionaba sobre el esquema real: asumía una constraint
-- UNIQUE llamada billetera_fiscal_user_id_key, cuando en la base user_id
-- es la PRIMARY KEY. Con esa PK intacta, un usuario con dos contribuyentes
-- no podría tener una billetera por cada uno.
--
-- Sin esta migración, hooks/useBilletera.ts consulta y escribe una columna
-- taxpayer_profile_id que no existe: la carga de saldo falla y, como el hook
-- no miraba los errores, fallaba en silencio.
--
-- Las dos tablas estaban vacías al momento de aplicarla, así que no hizo
-- falta backfill.

ALTER TABLE public.billetera_fiscal
  ADD COLUMN IF NOT EXISTS taxpayer_profile_id uuid
    REFERENCES public.taxpayer_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.billetera_movimientos
  ADD COLUMN IF NOT EXISTS taxpayer_profile_id uuid
    REFERENCES public.taxpayer_profiles(id) ON DELETE CASCADE;

-- Una billetera por perfil de contribuyente (antes: una por usuario).
ALTER TABLE public.billetera_fiscal DROP CONSTRAINT IF EXISTS billetera_fiscal_pkey;
ALTER TABLE public.billetera_fiscal
  ADD CONSTRAINT billetera_fiscal_pkey PRIMARY KEY (taxpayer_profile_id);

ALTER TABLE public.billetera_movimientos
  ALTER COLUMN taxpayer_profile_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billetera_fiscal_user_id
  ON public.billetera_fiscal(user_id);
CREATE INDEX IF NOT EXISTS idx_billetera_movimientos_profile_id
  ON public.billetera_movimientos(taxpayer_profile_id);
CREATE INDEX IF NOT EXISTS idx_billetera_movimientos_user_id
  ON public.billetera_movimientos(user_id);
