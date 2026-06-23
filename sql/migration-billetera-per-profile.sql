-- ============================================================
-- MIGRACIÓN: Billetera Fiscal aislada por contribuyente
-- TRIBUT.AR — SIMULADOR EDUCATIVO
-- Ejecutar DESPUÉS de: migration-per-contributor-isolation.sql
-- ============================================================
-- Antes de esta migración, billetera_fiscal usaba user_id como
-- clave única, por lo tanto ambos contribuyentes (slot 1 y 2)
-- compartían el mismo saldo. Esto es incorrecto: cada contribuyente
-- debe tener su propia billetera independiente.

-- 1. Agregar taxpayer_profile_id a billetera_fiscal
ALTER TABLE billetera_fiscal
  ADD COLUMN IF NOT EXISTS taxpayer_profile_id UUID
    REFERENCES taxpayer_profiles(id) ON DELETE CASCADE;

-- 2. Agregar taxpayer_profile_id a billetera_movimientos
ALTER TABLE billetera_movimientos
  ADD COLUMN IF NOT EXISTS taxpayer_profile_id UUID
    REFERENCES taxpayer_profiles(id) ON DELETE CASCADE;

-- 3. Backfill: asignar perfil slot=1 a filas existentes
WITH slot1 AS (
  SELECT DISTINCT ON (user_id) id AS profile_id, user_id
  FROM taxpayer_profiles
  ORDER BY user_id, COALESCE(slot, 1) ASC
)
UPDATE billetera_fiscal bf
SET taxpayer_profile_id = s.profile_id
FROM slot1 s
WHERE s.user_id = bf.user_id AND bf.taxpayer_profile_id IS NULL;

WITH slot1 AS (
  SELECT DISTINCT ON (user_id) id AS profile_id, user_id
  FROM taxpayer_profiles
  ORDER BY user_id, COALESCE(slot, 1) ASC
)
UPDATE billetera_movimientos bm
SET taxpayer_profile_id = s.profile_id
FROM slot1 s
WHERE s.user_id = bm.user_id AND bm.taxpayer_profile_id IS NULL;

-- 4. Quitar restricción única sobre user_id (ya no aplica)
ALTER TABLE billetera_fiscal
  DROP CONSTRAINT IF EXISTS billetera_fiscal_user_id_key;

-- 5. Nueva restricción: una billetera por perfil de contribuyente
DO $$ BEGIN
  ALTER TABLE billetera_fiscal
    ADD CONSTRAINT billetera_fiscal_profile_key UNIQUE (taxpayer_profile_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- 6. Índices de performance
CREATE INDEX IF NOT EXISTS idx_billetera_fiscal_profile_id
  ON billetera_fiscal(taxpayer_profile_id);
CREATE INDEX IF NOT EXISTS idx_billetera_movimientos_profile_id
  ON billetera_movimientos(taxpayer_profile_id);
