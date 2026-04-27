'use client'

/**
 * useRegime — Determina el régimen fiscal del usuario en el simulador.
 *
 * Lógica de detección:
 *  - Si existe un monotributo_profile activo → Monotributista
 *  - Si subject_type === 'persona_juridica' → Empresa (RI automático)
 *  - En otro caso → Responsable Inscripto (persona humana)
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
  canUseComprasCredito: boolean // Crédito fiscal de compras (solo RI)
  canUseLaboral: boolean      // Empleados / sueldos / F.931

  // Mensajes explicativos para módulos bloqueados
  ivaBlockReason: string | null
  gananciasBlockReason: string | null
  monotributoBlockReason: string | null
}

const NO_DEFINIDO: RegimeInfo = {
  regime: 'no_definido',
  label: 'Régimen no definido',
  subjectType: null,
  loading: false,
  canUseIVA: true,
  canUseGanancias: true,
  canUseMonotributo: true,
  canUseComprasCredito: true,
  canUseLaboral: true,
  ivaBlockReason: null,
  gananciasBlockReason: null,
  monotributoBlockReason: null,
}

export function useRegime(): RegimeInfo {
  const { user, taxpayerProfile, loading: userLoading } = useUser()
  const supabase = createClient()
  const [monoProfile, setMonoProfile] = useState<any>(null)
  const [loadingMono, setLoadingMono] = useState(true)

  useEffect(() => {
    if (!user) { setLoadingMono(false); return }
    ;(supabase as any)
      .from('monotributo_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }: any) => {
        setMonoProfile(data || null)
        setLoadingMono(false)
      })
  }, [user])

  const loading = userLoading || loadingMono

  if (loading) {
    return { ...NO_DEFINIDO, loading: true }
  }

  const subjectType = (taxpayerProfile?.subject_type as 'persona_humana' | 'persona_juridica' | null) ?? null

  // ── Monotributista ────────────────────────────────────────────────────────────
  if (monoProfile) {
    return {
      regime: 'monotributista',
      label: 'Monotributista',
      subjectType,
      loading: false,
      canUseIVA: false,
      canUseGanancias: false,
      canUseMonotributo: true,
      canUseComprasCredito: false,   // Las compras se registran, pero sin crédito IVA
      canUseLaboral: true,
      ivaBlockReason:
        'Como Monotributista, el IVA está incluido en tu cuota mensual. ' +
        'No presentás DDJJ de IVA por separado. Solo los Responsables Inscriptos ' +
        'declaran débito y crédito fiscal mensualmente.',
      gananciasBlockReason:
        'Como Monotributista, el Impuesto a las Ganancias está incluido en tu cuota mensual. ' +
        'No presentás DDJJ de Ganancias. Solo los Responsables Inscriptos y empresas ' +
        'presentan DDJJ anual de Ganancias.',
      monotributoBlockReason: null,
    }
  }

  // ── Empresa (Persona Jurídica RI) ─────────────────────────────────────────────
  if (subjectType === 'persona_juridica') {
    return {
      regime: 'empresa',
      label: 'Responsable Inscripto (Empresa)',
      subjectType,
      loading: false,
      canUseIVA: true,
      canUseGanancias: true,
      canUseMonotributo: false,
      canUseComprasCredito: true,
      canUseLaboral: true,
      ivaBlockReason: null,
      gananciasBlockReason: null,
      monotributoBlockReason:
        'Las personas jurídicas (empresas, SRL, SA) no pueden adherirse al Monotributo. ' +
        'Este régimen simplificado es exclusivo para personas humanas con ingresos ' +
        'que no superen los límites de la categoría K.',
    }
  }

  // ── Responsable Inscripto (Persona Humana) ────────────────────────────────────
  return {
    regime: 'responsable_inscripto',
    label: 'Responsable Inscripto',
    subjectType,
    loading: false,
    canUseIVA: true,
    canUseGanancias: true,
    canUseMonotributo: false,
    canUseComprasCredito: true,
    canUseLaboral: true,
    ivaBlockReason: null,
    gananciasBlockReason: null,
    monotributoBlockReason:
      'Estás inscripto como Responsable Inscripto en IVA. ' +
      'Los Responsables Inscriptos no pueden adherirse al Monotributo simultáneamente. ' +
      'Para pasarte al Monotributo debés darte de baja en IVA y cumplir los límites de ingresos.',
  }
}
