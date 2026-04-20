-- ============================================================
-- MIGRACIÓN: Soporte multi-contribuyente (hasta 3 por usuario)
-- TRIBUT.AR — SIMULADOR EDUCATIVO
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Eliminar la restricción UNIQUE(user_id) que impedía múltiples contribuyentes
ALTER TABLE public.taxpayer_profiles
  DROP CONSTRAINT IF EXISTS taxpayer_profiles_user_id_key;

-- 2. Agregar columna 'slot' (1, 2 o 3) para identificar cada contribuyente
ALTER TABLE public.taxpayer_profiles
  ADD COLUMN IF NOT EXISTS slot INTEGER NOT NULL DEFAULT 1
    CHECK (slot IN (1, 2, 3));

-- 3. Agregar columna 'alias' para nombre descriptivo del contribuyente
ALTER TABLE public.taxpayer_profiles
  ADD COLUMN IF NOT EXISTS alias TEXT NOT NULL DEFAULT 'Contribuyente 1';

-- 4. Agregar columna 'is_active' para marcar el contribuyente activo
ALTER TABLE public.taxpayer_profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 5. Nueva restricción: máximo 1 contribuyente por usuario por slot
ALTER TABLE public.taxpayer_profiles
  DROP CONSTRAINT IF EXISTS taxpayer_profiles_user_slot_key;
ALTER TABLE public.taxpayer_profiles
  ADD CONSTRAINT taxpayer_profiles_user_slot_key UNIQUE (user_id, slot);

-- 6. Actualizar los registros existentes para que tengan slot=1
UPDATE public.taxpayer_profiles
  SET slot = 1, alias = 'Contribuyente 1', is_active = true
  WHERE slot IS NULL OR slot = 0;

-- 7. Índice para búsquedas rápidas por user_id + is_active
CREATE INDEX IF NOT EXISTS idx_taxpayer_profiles_active
  ON public.taxpayer_profiles (user_id, is_active);

-- ============================================================
-- Función para garantizar que solo haya 1 activo por usuario
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_single_active_taxpayer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.taxpayer_profiles
      SET is_active = false
      WHERE user_id = NEW.user_id
        AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_single_active_taxpayer ON public.taxpayer_profiles;
CREATE TRIGGER trg_single_active_taxpayer
  AFTER INSERT OR UPDATE OF is_active ON public.taxpayer_profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_single_active_taxpayer();

-- ============================================================
-- Función para limitar a 3 contribuyentes por usuario
-- ============================================================
CREATE OR REPLACE FUNCTION check_max_taxpayer_profiles()
RETURNS TRIGGER AS $$
DECLARE
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count
    FROM public.taxpayer_profiles
    WHERE user_id = NEW.user_id;

  IF profile_count >= 3 THEN
    RAISE EXCEPTION 'Máximo 3 contribuyentes por usuario';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_max_taxpayer_profiles ON public.taxpayer_profiles;
CREATE TRIGGER trg_max_taxpayer_profiles
  BEFORE INSERT ON public.taxpayer_profiles
  FOR EACH ROW EXECUTE FUNCTION check_max_taxpayer_profiles();

-- ============================================================
-- Verificación
-- ============================================================
SELECT
  'taxpayer_profiles columns' AS check_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'taxpayer_profiles'
  AND column_name IN ('slot', 'alias', 'is_active')
ORDER BY column_name;
