'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProvTaxpayer, ProvSummary, ProvIIBBDDJJ, ProvPayment } from '@/types/provincial'

interface UseProvincialTaxpayerReturn {
  taxpayer: ProvTaxpayer | null
  summary: ProvSummary
  loading: boolean
  error: string | null
  reload: () => void
}

export function useProvincialTaxpayer(userId: string | undefined): UseProvincialTaxpayerReturn {
  const [taxpayer, setTaxpayer] = useState<ProvTaxpayer | null>(null)
  const [summary, setSummary] = useState<ProvSummary>({
    hasTaxpayer: false,
    iibbPending: 0,
    iibbOverdue: 0,
    paymentsPending: 0,
    paymentsOverdue: 0,
    complianceScore: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const db = supabase as any

      // Load taxpayer
      const { data: tp, error: tpErr } = await db
        .from('prov_taxpayers')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (tpErr) throw new Error(tpErr.message)
      setTaxpayer(tp)

      if (!tp) {
        setSummary({ hasTaxpayer: false, iibbPending: 0, iibbOverdue: 0, paymentsPending: 0, paymentsOverdue: 0, complianceScore: 0 })
        return
      }

      // Load IIBB DDJJ summary
      const { data: ddjjs } = await db
        .from('prov_iibb_ddjj')
        .select('status, period')
        .eq('user_id', userId)
        .order('period', { ascending: false })

      const ddjjList = (ddjjs || []) as ProvIIBBDDJJ[]
      const iibbPending = ddjjList.filter(d => d.status === 'draft').length
      const iibbOverdue = ddjjList.filter(d => d.status === 'overdue').length
      const lastPeriod = ddjjList[0]?.period

      // Load payments summary
      const { data: payments } = await db
        .from('prov_payments')
        .select('status')
        .eq('user_id', userId)

      const paymentList = (payments || []) as ProvPayment[]
      const paymentsPending = paymentList.filter(p => p.status === 'pending').length
      const paymentsOverdue = paymentList.filter(p => p.status === 'overdue').length

      // Simple compliance score
      const total = ddjjList.length
      const compliant = ddjjList.filter(d => d.status === 'submitted' || d.status === 'paid').length
      const complianceScore = total > 0 ? Math.round((compliant / total) * 100) : 100

      setSummary({
        hasTaxpayer: true,
        iibbPending,
        iibbOverdue,
        paymentsPending,
        paymentsOverdue,
        complianceScore,
        lastDDJJPeriod: lastPeriod,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos provinciales')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  return { taxpayer, summary, loading, error, reload: load }
}
