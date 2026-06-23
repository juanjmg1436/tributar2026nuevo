'use client'

/**
 * useRegime — Determina el régimen fiscal del usuario en el simulador.
 *
 * Lógica de detección (por orden de precedencia):
 *  1. taxpayer_regime_status con code=MONOTRIBUTO activo → Monotributista
 *     (incluye también si existe monotributo_profile activo)
 *  2. subject_type === 'persona_juridica' → Empresa (RI automático)
 *  3. taxpayer_regime_status con code=REGIMEN_GENERAL activo → Responsable Inscripto
 *  4. Sin régimen definido → no_definido
 *
 * Impacto por régimen:
 *  MONOTRIBUTISTA
 *    ✅ Monotributo (cuota mensual unificada)
 *    ✅ Compras/gastos (registro sin crédito fiscal IVA)
 *    ✅ Empleados / Sueldos / Cargas Sociales
 *    ✅ IIBB Provincial
 *    ❌ IVA DDJJ  (el IVA está incluido en la cuota)
 *    ❌ Ganancias  (las ganancias están incluidas en la cuota)
 *
 *  RESPONSABLE INSCRIPTO / EMPRESA
 *    ✅ IVA DDJJ mensual
 *    ✅ Ganancias DDJJ anual
 *    ✅ Compras/gastos (con crédito fiscal IVA)
 *    ✅ Empleados / Sueldos / Cargas Sociales
 *    ✅ IIBB Provincial
 *    ❌ Monotributo  (régimen simplificado incompatible)
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'

export type FiscalRegime =
  | 'monotributista'
  | 'responsable_inscripto'
  | 'empresa'   // persona jurídica RI
  | 'no_definido'

export interface RegimeInfo {
  regime: FiscalRegime
  label: string               // Etiqueta para mostrar en UI
  subjectType: 'persona_humana' | 'persona_juridica' | null
  loading: boolean

  // Flags de acceso a cada módulo
  canUseIVA: boolean          // DDJJ IVA mensual
  canUseGanancias: boolean    // DDJJ Ganancias anual
  canUseMonotributo: boolean  // Cuota monotributo
  canUseAutonomos: boolean    // Módulo de aportes autónomos
  canUseComprasCredito: boolean // Crédito fiscal de compras (solo RI)
  canUseLaboral: boolean      // Empleados / sueldos / F.931

  // Tipos de comprobante habilitados para emisión
  allowedInvoiceTypes: string[]  // ej. ['A','B'] para RI, ['C'] para Mono

  // Mensajes explicativos para módulos bloqueados
  ivaBlockReason: string | null
  gananciasBlockReason: string | null
  monotributoBlockReason: string | null
  autonomosBlockReason: string | null
}

const LOADING_STATE: RegimeInfo = {
  regime: 'no_definido',
  label: 'Cargando...',
  subjectType: null,
  loading: true,
  canUseIVA: true,
  canUseGanancias: true,
  canUseMonotributo: true,
  canUseAutonomos: true,
  canUseComprasCredito: true,
  canUseLaboral: true,
  allowedInvoiceTypes: ['A', 'B', 'C', 'X', 'DEMO'],
  ivaBlockReason: null,
  gananciasBlockReason: null,
  monotributoBlockReason: null,
  autonomosBlockReason: null,
}

export function useRegime(): RegimeInfo {
  const { user, taxpayerProfile, loading: userLoading } = useUser()
  const supabase = createClient()

  // Regímenes activos en taxpayer_regime_status (con su code)
  const [activeRegimeCodes, setActiveRegimeCodes] = useState<string[]>([])
  // Perfil de monotributo (para saber si completó el wizard)
  const [monoProfile, setMonoProfile] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!user) { setLoadingData(false); return }

    async function load() {
      setLoadingData(true)
      try {
        const [statusRes, monoRes] = await Promise.all([
          // Activos en taxpayer_regime_status con el code del régimen
          supabase
            .from('taxpayer_regime_status')
            .select('regime_id, tax_regimes(code)')
            .eq('user_id', user!.id)
            .eq('status', 'active'),
          // Perfil de monotributo activo
          (supabase as any)
            .from('monotributo_profiles')
            .select('id')
            .eq('user_id', user!.id)
            .eq('status', 'active')
            .maybeSingle(),
        ])

        const codes: string[] = (statusRes.data || [])
          .map((s: any) => s.tax_regimes?.code)
          .filter(Boolean)

        setActiveRegimeCodes(codes)
        setMonoProfile(monoRes.data || null)
      } catch {
        // silently ignore
      } finally {
        setLoadingData(false)
      }
    }

    load()
  }, [user])

  if (userLoading || loadingData) {
    return LOADING_STATE
  }

  const subjectType = (taxpayerProfile?.subject_type as 'persona_humana' | 'persona_juridica' | null) ?? null
  const isMonotributista = activeRegimeCodes.includes('MONOTRIBUTO') || !!monoProfile
  const isRegimeGeneral = activeRegimeCodes.includes('REGIMEN_GENERAL')
  const hasAnyActiveRegime = activeRegimeCodes.length > 0

  // ── Monotributista ────────────────────────────────────────────────────────────
  if (isMonotributista) {
    return {
      regime: 'monotributista',
      label: 'Monotributista',
      subjectType,
      loading: false,
      canUseIVA: false,
      canUseGanancias: false,
      canUseMonotributo: true,
      canUseAutonomos: false,
      canUseComprasCredito: false,
      canUseLaboral: true,
      allowedInvoiceTypes: ['C', 'X', 'DEMO'],
      ivaBlockReason:
        'Como Monotributista, el IVA está incluido en tu cuota mensual. ' +
        'No presentás DDJJ de IVA por separado. Solo los Responsables Inscriptos ' +
        'declaran débito y crédito fiscal mensualmente.',
      gananciasBlockReason:
        'Como Monotributista, el Impuesto a las Ganancias está incluido en tu cuota mensual. ' +
        'No presentás DDJJ de Ganancias. Solo los Responsables Inscriptos y empresas ' +
        'presentan DDJJ anual de Ganancias.',
      monotributoBlockReason: null,
      autonomosBlockReason:
        'El Monotributo reemplaza los aportes de Autónomos al SIPA. Como Monotributista, ' +
        'tu aporte jubilatorio está incluido en la cuota mensual — no podés estar inscripto ' +
        'simultáneamente como Autónomo (Ley 26565, art. 26). Para usar este módulo debés ' +
        'darte de baja del Monotributo y pasar al Régimen General.',
    }
  }

  // ── Empresa (Persona Jurídica) ─────────────────────────────────────────────────
  if (subjectType === 'persona_juridica') {
    return {
      regime: 'empresa',
      label: 'Responsable Inscripto (Empresa)',
      subjectType,
      loading: false,
      canUseIVA: true,
      canUseGanancias: true,
      canUseMonotributo: false,
      canUseAutonomos: false,
      canUseComprasCredito: true,
      canUseLaboral: true,
      allowedInvoiceTypes: ['A', 'B', 'X', 'DEMO'],
      ivaBlockReason: null,
      gananciasBlockReason: null,
      monotributoBlockReason:
        'Las personas jurídicas (empresas, SRL, SA) no pueden adherirse al Monotributo. ' +
        'Este régimen simplificado es exclusivo para personas humanas con ingresos ' +
        'que no superen los límites de la categoría K.',
      autonomosBlockReason:
        'Las personas jurídicas (SRL, SA, etc.) no se inscriben como trabajadores autónomos. ' +
        'El régimen de Autónomos aplica exclusivamente a personas humanas que trabajan por cuenta propia. ' +
        'Las empresas aportan a la seguridad social de sus empleados como empleadoras.',
    }
  }

  // ── Responsable Inscripto (Persona Humana con Régimen General activo) ──────────
  if (isRegimeGeneral || (hasAnyActiveRegime && !isMonotributista)) {
    return {
      regime: 'responsable_inscripto',
      label: 'Responsable Inscripto',
      subjectType,
      loading: false,
      canUseIVA: true,
      canUseGanancias: true,
      canUseMonotributo: false,
      canUseAutonomos: true,
      canUseComprasCredito: true,
      canUseLaboral: true,
      allowedInvoiceTypes: ['A', 'B', 'X', 'DEMO'],
      ivaBlockReason: null,
      gananciasBlockReason: null,
      monotributoBlockReason:
        'Estás inscripto como Responsable Inscripto en IVA. ' +
        'Los Responsables Inscriptos no pueden adherirse al Monotributo simultáneamente. ' +
        'Para pasarte al Monotributo debés darte de baja en IVA y cumplir los límites de ingresos.',
      autonomosBlockReason: null,
    }
  }

  // ── Sin régimen definido ───────────────────────────────────────────────────────
  return {
    regime: 'no_definido',
    label: 'Régimen no definido',
    subjectType,
    loading: false,
    canUseIVA: true,
    canUseGanancias: true,
    canUseMonotributo: true,
    canUseAutonomos: true,
    canUseComprasCredito: true,
    canUseLaboral: true,
    allowedInvoiceTypes: ['A', 'B', 'C', 'X', 'DEMO'],
    ivaBlockReason: null,
    gananciasBlockReason: null,
    monotributoBlockReason: null,
    autonomosBlockReason: null,
  }
}
