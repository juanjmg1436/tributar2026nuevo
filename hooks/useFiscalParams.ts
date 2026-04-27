'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_PARAMS } from '@/lib/fiscal-engine/defaults'
import type { FiscalParamsMap, FiscalParameter } from '@/types/fiscal'

interface UseFiscalParamsReturn {
  params: FiscalParamsMap
  rawParams: FiscalParameter[]
  loading: boolean
  reload: () => void
}

export function useFiscalParams(): UseFiscalParamsReturn {
  const [params, setParams] = useState<FiscalParamsMap>(DEFAULT_PARAMS)
  const [rawParams, setRawParams] = useState<FiscalParameter[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function load() {
    setLoading(true)
    try {
      const { data } = await (supabase as any)
        .from('fiscal_parameters')
        .select('*')
        .eq('is_active', true)

      if (data && data.length > 0) {
        setRawParams(data)
        // Build map from DB values
        const map: Partial<FiscalParamsMap> = {}
        for (const row of data as FiscalParameter[]) {
          if (row.value_decimal !== null) {
            ;(map as any)[row.param_key] = row.value_decimal
          }
        }
        setParams({ ...DEFAULT_PARAMS, ...map })
      }
    } catch {
      // Fallback to defaults silently
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return { params, rawParams, loading, reload: load }
}
