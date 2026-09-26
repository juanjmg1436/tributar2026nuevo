-- Migración: un único VEP por obligación y período
-- Ejecutada en Supabase del proyecto TRIBUT.AR (tapxqpuhfzymocgdheab) el 2026-09-26.
--
-- Motivo: las cuatro pantallas que leen simulated_veps lo hacen con
-- .maybeSingle() filtrando por (user_id, obligation_type, period). maybeSingle()
-- devuelve error si encuentra más de una fila, así que un duplicado hacía que el
-- VEP se viera como inexistente: el botón de pago no se habilitaba nunca y cada
-- reintento insertaba otro duplicado, empeorando la situación.
--
-- El módulo de Monotributo insertaba el VEP sin verificar si ya existía, de modo
-- que volver a pagar el mismo mes generaba el duplicado. Eso se corrigió en el
-- mismo commit; este índice impide que vuelva a pasar por cualquier otra vía.

CREATE UNIQUE INDEX IF NOT EXISTS simulated_veps_usuario_obligacion_periodo_uniq
  ON public.simulated_veps (user_id, obligation_type, period)
  NULLS NOT DISTINCT;
