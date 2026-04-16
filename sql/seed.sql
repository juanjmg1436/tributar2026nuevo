-- ============================================================
-- TRIBUT.AR - Datos Semilla (Seed Data)
-- Datos de referencia para el simulador educativo
-- SIMULADOR EDUCATIVO - NO OFICIAL - SIN VALIDEZ LEGAL/FISCAL
-- ============================================================

-- ============================================================
-- REGÍMENES TRIBUTARIOS
-- ============================================================
INSERT INTO public.tax_regimes (code, name, short_description, full_description, applies_to, sort_order) VALUES
(
  'MONOTRIBUTO',
  'Monotributo',
  'Régimen simplificado para pequeños contribuyentes',
  'El Monotributo (Régimen Simplificado para Pequeños Contribuyentes) es un régimen que agrupa en una sola cuota el pago de impuestos (IVA y Ganancias) y la cotización previsional (jubilación y obra social). Está destinado a pequeños contribuyentes que realizan ventas de cosas muebles, locaciones o prestaciones de servicios.',
  'persona_humana',
  1
),
(
  'REGIMEN_GENERAL',
  'Régimen General',
  'Régimen general de impuestos (IVA + Ganancias)',
  'El Régimen General es el sistema tributario estándar en el que el contribuyente tributa por separado cada impuesto: IVA (mensual), Ganancias (anual con anticipos), entre otros. Aplica cuando los ingresos superan los límites del monotributo o cuando se opta por este régimen.',
  'both',
  2
),
(
  'AUTONOMOS',
  'Autónomos',
  'Régimen de trabajadores independientes',
  'El régimen de Autónomos corresponde a los trabajadores independientes que no están en relación de dependencia y que tributan individualmente Ganancias y realizan aportes a la jubilación como autónomos. Se usa en combinación con el Régimen General para quienes superan límites del monotributo.',
  'persona_humana',
  3
),
(
  'RELACIONES_LABORALES',
  'Relaciones Laborales',
  'Registro de empleados bajo relación de dependencia',
  'Este módulo permite simular el alta y baja de empleados en relación de dependencia. Incluye conceptos como contribuciones patronales, aportes al SIPA, obra social y ART.',
  'both',
  4
),
(
  'CASAS_PARTICULARES',
  'Casas Particulares',
  'Régimen especial para personal doméstico',
  'El régimen de Casas Particulares (Ley 26.844) establece un sistema especial de registro y aportes para el personal que trabaja en hogares particulares. Incluye liquidación simplificada de aportes y contribuciones.',
  'persona_humana',
  5
);
