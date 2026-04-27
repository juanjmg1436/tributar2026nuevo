'use client'

/**
 * useProgress — Calcula el progreso global del estudiante en el simulador.
 *
 * 10 etapas pedagógicas con pesos proporcionales al contenido actual del simulador:
 *
 * ETAPA 1 — Registro e inicio          (auto, base)
 * ETAPA 2 — Perfil del contribuyente   8 pts
 * ETAPA 3 — Alta registral             10 pts
 * ETAPA 4 — Situación tributaria       8 pts
 * ETAPA 5 — Domicilio Fiscal Electr.   7 pts
 * ETAPA 6 — Facturación                12 pts  (POS + comprobante + compra)
 * ETAPA 7 — Declaraciones juradas      20 pts  (IVA o Mono + Ganancias o Mono + pago)
 * ETAPA 8 — Módulo laboral             15 pts  (empleador + empleado + sueldo + F.931)
 * ETAPA 9 — Impuestos provinciales     12 pts  (alta Misiones + IIBB + pago)
 * ETAPA 10 — Estado fiscal integral    8 pts   (revisión + VEP generado)
 *                                    ─────
 *                                    100 pts
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserProgress, StageInfo } from '@/types'

// Extendemos UserProgress con los nuevos flags
export interface ProgressDetail extends UserProgress {
  // Facturación
  hasInvoice: boolean
  hasPurchase: boolean
  // DDJJ
  hasVatReturn: boolean       // IVA presentado/pagado
  hasMonoPayment: boolean     // Cuota Mono pagada
  hasIncomeTaxReturn: boolean // Ganancias presentado/pagado
  hasMonoProfile: boolean     // Perfil Mono activo
  hasAnyFiscalPayment: boolean // Al menos 1 VEP pagado
  // Laboral
  hasEmployer: boolean
  hasEmployee: boolean
  hasPayrollRun: boolean
  hasSocialSecurityReturn: boolean
  // Provincial
  hasProvincialProfile: boolean
  hasIIBBReturn: boolean
  hasProvincialPayment: boolean
  // Score
  fiscalScore: number         // 0-100 escala anterior (cumplimiento DDJJ)
}

export function useProgress(userId: string | null) {
  const [progress, setProgress] = useState<ProgressDetail | null>(null)
  const [stages, setStages] = useState<StageInfo[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function calculateProgress() {
    if (!userId) { setLoading(false); return }

    try {
      setLoading(true)
      const db = supabase as any

      // ── Etapas 2-5: Base registral ──────────────────────────────────────────
      const [taxpayerRes, stepsRes, regimeRes, fiscalAddrRes, posRes] = await Promise.all([
        supabase.from('taxpayer_profiles').select('status').eq('user_id', userId).maybeSingle(),
        supabase.from('registration_steps').select('status').eq('user_id', userId),
        supabase.from('taxpayer_regime_status').select('status').eq('user_id', userId).eq('status', 'active'),
        supabase.from('e_fiscal_address').select('status').eq('user_id', userId).maybeSingle(),
        supabase.from('points_of_sale').select('id').eq('user_id', userId).eq('status', 'active'),
      ])

      const hasTaxpayerProfile = !!taxpayerRes.data
      const allSteps = stepsRes.data || []
      const completedSteps = allSteps.filter((s: any) => s.status === 'completed').length
      const totalSteps = 6
      const registrationComplete = completedSteps >= totalSteps
      const hasActiveRegime = (regimeRes.data?.length || 0) > 0
      const hasEFiscalAddress = fiscalAddrRes.data?.status === 'constituted'
      const hasPOS = (posRes.data?.length || 0) > 0

      // ── Etapa 6: Facturación ────────────────────────────────────────────────
      const [invoiceRes, purchaseRes] = await Promise.all([
        db.from('invoices').select('id').eq('user_id', userId).neq('status', 'cancelled').limit(1),
        db.from('purchases').select('id').eq('user_id', userId).eq('status', 'active').limit(1),
      ])
      const hasInvoice = (invoiceRes.data?.length || 0) > 0
      const hasPurchase = (purchaseRes.data?.length || 0) > 0

      // ── Etapa 7: DDJJ ───────────────────────────────────────────────────────
      const [vatRes, monoProfileRes, monoRegimeRes, monoPayRes, incomeTaxRes, vepRes] = await Promise.all([
        db.from('vat_returns').select('id').eq('user_id', userId).in('status', ['submitted', 'paid', 'credit']).limit(1),
        db.from('monotributo_profiles').select('id').eq('user_id', userId).eq('status', 'active').maybeSingle(),
        // También considerar activo en taxpayer_regime_status con code=MONOTRIBUTO
        supabase.from('taxpayer_regime_status')
          .select('id, tax_regimes(code)')
          .eq('user_id', userId)
          .eq('status', 'active'),
        db.from('monotributo_payments').select('id').eq('user_id', userId).eq('status', 'paid').limit(1),
        db.from('income_tax_returns').select('id').eq('user_id', userId).in('status', ['submitted', 'paid']).limit(1),
        db.from('simulated_veps').select('id').eq('user_id', userId).eq('status', 'paid').limit(1),
      ])
      const hasVatReturn = (vatRes.data?.length || 0) > 0
      const monoInRegimeStatus = (monoRegimeRes.data || []).some(
        (s: any) => s.tax_regimes?.code === 'MONOTRIBUTO'
      )
      const hasMonoProfile = !!monoProfileRes.data || monoInRegimeStatus
      const hasMonoPayment = (monoPayRes.data?.length || 0) > 0
      const hasIncomeTaxReturn = (incomeTaxRes.data?.length || 0) > 0
      const hasAnyFiscalPayment = (vepRes.data?.length || 0) > 0

      // DDJJ "principal" satisfecha: IVA presentado (RI) ó cuota mono pagada
      const ddjjPrincipalOk = hasVatReturn || hasMonoPayment
      // Ganancias satisfecha: DDJJ presentada ó es Mono (ya incluido)
      const gananciasSatisfecha = hasIncomeTaxReturn || hasMonoProfile

      // ── Etapa 8: Laboral ────────────────────────────────────────────────────
      const [empRes, workerRes, payrollRes, ssRes] = await Promise.all([
        db.from('employers').select('id').eq('user_id', userId).maybeSingle(),
        db.from('employees').select('id').eq('user_id', userId).eq('status', 'active').limit(1),
        db.from('payroll_runs').select('id').eq('user_id', userId).eq('status', 'confirmed').limit(1),
        db.from('social_security_returns').select('id').eq('user_id', userId).in('status', ['submitted', 'paid']).limit(1),
      ])
      const hasEmployer = !!empRes.data
      const hasEmployee = (workerRes.data?.length || 0) > 0
      const hasPayrollRun = (payrollRes.data?.length || 0) > 0
      const hasSocialSecurityReturn = (ssRes.data?.length || 0) > 0

      // ── Etapa 9: Provincial (ATM Misiones) ──────────────────────────────────
      const [provProfileRes, iibbRes, provPayRes] = await Promise.all([
        db.from('prov_taxpayers').select('id').eq('user_id', userId).maybeSingle(),
        db.from('prov_iibb_ddjj').select('id').eq('user_id', userId).in('status', ['submitted', 'paid']).limit(1),
        db.from('prov_payments').select('id').eq('user_id', userId).limit(1),
      ])
      const hasProvincialProfile = !!provProfileRes.data
      const hasIIBBReturn = (iibbRes.data?.length || 0) > 0
      const hasProvincialPayment = (provPayRes.data?.length || 0) > 0

      // ── Cálculo del porcentaje ───────────────────────────────────────────────
      let pct = 0

      // ETAPA 2 — Perfil del contribuyente (8 pts)
      if (hasTaxpayerProfile) pct += 8

      // ETAPA 3 — Alta registral (10 pts, proporcional a los pasos completados)
      if (completedSteps > 0) pct += Math.round((completedSteps / totalSteps) * 10)

      // ETAPA 4 — Situación tributaria (8 pts)
      if (hasActiveRegime) pct += 8

      // ETAPA 5 — Domicilio Fiscal Electrónico (7 pts)
      if (hasEFiscalAddress) pct += 7

      // ETAPA 6 — Facturación (12 pts: 4 POS + 4 comprobante + 4 compra)
      if (hasPOS) pct += 4
      if (hasInvoice) pct += 4
      if (hasPurchase) pct += 4

      // ETAPA 7 — Declaraciones juradas (20 pts)
      // DDJJ principal (10 pts): IVA ó cuota Mono pagada
      if (ddjjPrincipalOk) pct += 10
      // Ganancias ó perfil Mono (5 pts)
      if (gananciasSatisfecha) pct += 5
      // Pago efectivizado / VEP pagado (5 pts)
      if (hasAnyFiscalPayment) pct += 5

      // ETAPA 8 — Módulo laboral (15 pts: 3+4+4+4)
      if (hasEmployer) pct += 3
      if (hasEmployee) pct += 4
      if (hasPayrollRun) pct += 4
      if (hasSocialSecurityReturn) pct += 4

      // ETAPA 9 — Impuestos provinciales (12 pts: 4+4+4)
      if (hasProvincialProfile) pct += 4
      if (hasIIBBReturn) pct += 4
      if (hasProvincialPayment) pct += 4

      // ETAPA 10 — Estado fiscal (8 pts: 4 tener perfil Mono ó VEP, 4 F.931)
      if (ddjjPrincipalOk && (hasVatReturn || hasMonoPayment)) pct += 4
      if (hasSocialSecurityReturn || hasIIBBReturn) pct += 4

      pct = Math.min(pct, 100)

      // ── Etapa actual (para breadcrumb lateral) ─────────────────────────────
      const currentStage = !hasTaxpayerProfile ? 2
        : !registrationComplete ? 3
        : !hasActiveRegime ? 4
        : !hasEFiscalAddress ? 5
        : !hasPOS || !hasInvoice ? 6
        : !ddjjPrincipalOk ? 7
        : !hasEmployer ? 8
        : !hasProvincialProfile ? 9
        : 10

      // ── Progress data ───────────────────────────────────────────────────────
      const progressData: ProgressDetail = {
        hasProfile: true,
        hasTaxpayerProfile,
        registrationComplete,
        hasActiveRegime,
        hasEFiscalAddress,
        hasPOS,
        completionPercentage: pct,
        currentStage,
        // nuevos flags
        hasInvoice,
        hasPurchase,
        hasVatReturn,
        hasMonoPayment,
        hasIncomeTaxReturn,
        hasMonoProfile,
        hasAnyFiscalPayment,
        hasEmployer,
        hasEmployee,
        hasPayrollRun,
        hasSocialSecurityReturn,
        hasProvincialProfile,
        hasIIBBReturn,
        hasProvincialPayment,
        fiscalScore: pct,
      }

      setProgress(progressData)

      // ── Etapas para StageCard ───────────────────────────────────────────────
      const stageList: StageInfo[] = [
        {
          number: 1,
          title: 'Registro e inicio de sesión',
          description: 'Creación de cuenta en el simulador',
          status: 'completed',
          route: '/dashboard',
        },
        {
          number: 2,
          title: 'Perfil del contribuyente',
          description: 'Datos básicos: nombre, CUIT, actividad, domicilio',
          status: hasTaxpayerProfile ? 'completed' : 'current',
          route: '/perfil-contribuyente',
        },
        {
          number: 3,
          title: 'Alta registral',
          description: 'Proceso de inscripción paso a paso (6 pasos)',
          status: !hasTaxpayerProfile ? 'locked' : registrationComplete ? 'completed' : 'current',
          route: '/alta-rut',
        },
        {
          number: 4,
          title: 'Situación tributaria',
          description: 'Régimen impositivo, relaciones y administrador',
          status: !registrationComplete ? 'locked' : hasActiveRegime ? 'completed' : 'current',
          route: '/administrador-relaciones',
        },
        {
          number: 5,
          title: 'Domicilio Fiscal Electrónico',
          description: 'Constitución del buzón oficial de notificaciones',
          status: !hasActiveRegime ? 'locked' : hasEFiscalAddress ? 'completed' : 'current',
          route: '/domicilio-fiscal',
        },
        {
          number: 6,
          title: 'Facturación',
          description: 'Punto de venta, comprobantes emitidos y compras cargadas',
          status: !hasEFiscalAddress ? 'locked' : (hasPOS && hasInvoice && hasPurchase) ? 'completed' : 'current',
          route: '/comprobantes',
        },
        {
          number: 7,
          title: 'Declaraciones juradas',
          description: 'IVA o Monotributo · Ganancias · VEPs y pagos',
          status: !hasPOS ? 'locked' : (ddjjPrincipalOk && gananciasSatisfecha && hasAnyFiscalPayment) ? 'completed' : 'current',
          route: hasMonoProfile ? '/monotributo' : '/iva',
        },
        {
          number: 8,
          title: 'Módulo laboral',
          description: 'Alta empleador · Nómina · Sueldos · F.931',
          status: !ddjjPrincipalOk ? 'locked' : (hasEmployer && hasEmployee && hasPayrollRun && hasSocialSecurityReturn) ? 'completed' : 'current',
          route: '/empleados',
        },
        {
          number: 9,
          title: 'Impuestos provinciales',
          description: 'ATM Misiones: alta, IIBB, boletas y pagos',
          status: !hasEFiscalAddress ? 'locked' : (hasProvincialProfile && hasIIBBReturn) ? 'completed' : 'current',
          route: '/misiones',
        },
        {
          number: 10,
          title: 'Estado fiscal integral',
          description: 'Revisión global, puntaje de cumplimiento y configuración',
          status: !(ddjjPrincipalOk || hasProvincialProfile) ? 'locked' : pct >= 80 ? 'completed' : 'current',
          route: '/estado-fiscal',
        },
      ]

      setStages(stageList)
    } catch (err) {
      console.error('Error calculando progreso:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { calculateProgress() }, [userId])

  return { progress, stages, loading, refresh: calculateProgress }
}
