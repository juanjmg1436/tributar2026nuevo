// Valores por defecto del motor fiscal (fallback si la DB no responde)
import type { FiscalParamsMap } from '@/types/fiscal'

export const DEFAULT_PARAMS: FiscalParamsMap = {
  iva_general: 0.21,
  iva_diferencial: 0.105,
  iva_vencimiento_dia: 18,
  ganancias_alicuota_juridica: 0.35,
  ganancias_mni_mensual: 200000,
  ganancias_anticipo_pct: 0.10,
  mora_tasa_mensual: 0.03,
  multa_omision_pct: 0.50,
  jubilacion_trabajador: 0.11,
  obra_social_trabajador: 0.03,
  pami_trabajador: 0.03,
  jubilacion_empleador: 0.16,
  obra_social_empleador: 0.06,
  asig_familiares_empleador: 0.075,
  fondo_empleo_empleador: 0.0089,
  art_empleador: 0.015,
  seguro_vida_empleador: 250,
}
