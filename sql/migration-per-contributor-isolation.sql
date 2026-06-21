-- ============================================================
-- MIGRACIÓN: Aislamiento por contribuyente (per-contributor isolation)
-- TRIBUT.AR — SIMULADOR EDUCATIVO
-- Aplicar DESPUÉS de: migration-multi-contribuyente.sql
-- ============================================================
-- Agrega taxpayer_profile_id a las tablas de progreso para que
-- cada contribuyente (slot 1 y slot 2) tenga datos completamente
-- independientes: pasos de alta, regímenes, domicilio fiscal y PdV.

-- 1. Agregar columna a cada tabla
ALTER TABLE registration_steps
  ADD COLUMN IF NOT EXISTS taxpayer_profile_id UUID REFERENCES taxpayer_profiles(id) ON DELETE CASCADE;

ALTER TABLE taxpayer_regime_status
  ADD COLUMN IF NOT EXISTS taxpayer_profile_id UUID REFERENCES taxpayer_profiles(id) ON DELETE CASCADE;

ALTER TABLE e_fiscal_address
  ADD COLUMN IF NOT EXISTS taxpayer_profile_id UUID REFERENCES taxpayer_profiles(id) ON DELETE CASCADE;

ALTER TABLE points_of_sale
  ADD COLUMN IF NOT EXISTS taxpayer_profile_id UUID REFERENCES taxpayer_profiles(id) ON DELETE CASCADE;

-- 2. Backfill: asignar el perfil de slot=1 a todos los registros existentes
WITH slot1 AS (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM taxpayer_profiles
  ORDER BY user_id, slot ASC
)
UPDATE registration_steps rs
SET taxpayer_profile_id = s.id
FROM slot1 s WHERE s.user_id = rs.user_id AND rs.taxpayer_profile_id IS NULL;

WITH slot1 AS (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM taxpayer_profiles
  ORDER BY user_id, slot ASC
)
UPDATE taxpayer_regime_status trs
SET taxpayer_profile_id = s.id
FROM slot1 s WHERE s.user_id = trs.user_id AND trs.taxpayer_profile_id IS NULL;

WITH slot1 AS (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM taxpayer_profiles
  ORDER BY user_id, slot ASC
)
UPDATE e_fiscal_address efa
SET taxpayer_profile_id = s.id
FROM slot1 s WHERE s.user_id = efa.user_id AND efa.taxpayer_profile_id IS NULL;

WITH slot1 AS (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM taxpayer_profiles
  ORDER BY user_id, slot ASC
)
UPDATE points_of_sale pos
SET taxpayer_profile_id = s.id
FROM slot1 s WHERE s.user_id = pos.user_id AND pos.taxpayer_profile_id IS NULL;

-- 3. Índices de performance
CREATE INDEX IF NOT EXISTS idx_reg_steps_profile_id     ON registration_steps(taxpayer_profile_id);
CREATE INDEX IF NOT EXISTS idx_regime_status_profile_id  ON taxpayer_regime_status(taxpayer_profile_id);
CREATE INDEX IF NOT EXISTS idx_efiscal_profile_id        ON e_fiscal_address(taxpayer_profile_id);
CREATE INDEX IF NOT EXISTS idx_pos_profile_id            ON points_of_sale(taxpayer_profile_id);
