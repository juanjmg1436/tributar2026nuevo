'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserProgress, StageInfo } from '@/types'

export function useProgress(userId: string | null) {
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [stages, setStages] = useState<StageInfo[]>([])
  const [activeRegimeCodes, setActiveRegimeCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function calculateProgress() {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const [taxpayerResult, stepsResult, regimeResult, fiscalResult, posResult] = await Promise.all([
        supabase.from('taxpayer_profiles').select('status').eq('user_id', userId).eq('is_active', true).maybeSingle(),
        supabase.from('registration_steps').select('status').eq('user_id', userId),
        supabase.from('taxpayer_regime_status' as any).select('status, tax_regimes(code)').eq('user_id', userId).eq('status', 'active'),
        supabase.from('e_fiscal_address').select('status').eq('user_id', userId).maybeSingle(),
        supabase.from('points_of_sale').select('id').eq('user_id', userId).eq('status', 'active'),
      ])

      const hasTaxpayerProfile = !!taxpayerResult.data
      const allSteps = (stepsResult.data || []) as any[]
      const completedSteps = allSteps.filter((s: any) => s.status === 'completed').length
      const totalSteps = 6
      const registrationComplete = completedSteps === totalSteps
      const activeRegimes = (regimeResult.data || []) as any[]
      const hasActiveRegime = activeRegimes.length > 0
      const codes = activeRegimes.map((r: any) => r.tax_regimes?.code).filter(Boolean) as string[]
      setActiveRegimeCodes(codes)
      const hasEFiscalAddress = (fiscalResult.data as any)?.status === 'constituted'
      const hasPOS = (posResult.data?.length || 0) > 0

      let completionPct = 0
      if (hasTaxpayerProfile) completionPct += 15
      if (completedSteps > 0) completionPct += Math.round((completedSteps / totalSteps) * 35)
      if (hasActiveRegime) completionPct += 20
      if (hasEFiscalAddress) completionPct += 15
      if (hasPOS) completionPct += 15

      const currentStage = !hasTaxpayerProfile ? 2
        : !registrationComplete ? 3
        : !hasActiveRegime ? 4
        : !hasEFiscalAddress ? 5
        : 6

      const progressData: UserProgress = {
        hasProfile: true,
        hasTaxpayerProfile,
        registrationComplete,
        hasActiveRegime,
        hasEFiscalAddress,
        hasPOS,
        completionPercentage: Math.min(completionPct, 100),
        currentStage,
      }

      setProgress(progressData)

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
          description: 'Datos básicos del contribuyente simulado',
          status: hasTaxpayerProfile ? 'completed' : 'current',
          route: '/perfil-contribuyente',
        },
        {
          number: 3,
          title: 'Alta registral inicial',
          description: 'Proceso equivalente al formulario de alta',
          status: !hasTaxpayerProfile ? 'locked' : registrationComplete ? 'completed' : 'current',
          route: '/alta-rut',
        },
        {
          number: 4,
          title: 'Situación tributaria',
          description: 'Régimen impositivo y relaciones',
          status: !registrationComplete ? 'locked' : hasActiveRegime ? 'completed' : 'current',
          route: '/administrador-relaciones',
        },
        {
          number: 5,
          title: 'Domicilio Fiscal Electrónico',
          description: 'Constitución del domicilio electrónico',
          status: !hasActiveRegime ? 'locked' : hasEFiscalAddress ? 'completed' : 'current',
          route: '/domicilio-fiscal',
        },
        {
          number: 6,
          title: 'Operación normal',
          description: 'Puntos de venta, comprobantes y obligaciones',
          status: !hasEFiscalAddress ? 'locked' : 'current',
          route: '/dashboard',
        },
      ]

      setStages(stageList)
    } catch (err) {
      console.error('Error calculando progreso:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    calculateProgress()
  }, [userId])

  return { progress, stages, activeRegimeCodes, loading, refresh: calculateProgress }
}
