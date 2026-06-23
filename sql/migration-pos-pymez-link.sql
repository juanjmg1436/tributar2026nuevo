-- Migración: vinculación Punto de Venta TRIBUT.AR ↔ PyMEZ 360
-- Ejecutar en Supabase SQL Editor del proyecto TRIBUT.AR (tapxqpuhfzymocgdheab)

ALTER TABLE points_of_sale
  ADD COLUMN IF NOT EXISTS pymez_link_code     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pymez_linked_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pymez_company_name  TEXT;

-- Índice para búsqueda por código (PyMEZ 360 llama con el código)
CREATE INDEX IF NOT EXISTS idx_pos_pymez_link_code ON points_of_sale (pymez_link_code);
