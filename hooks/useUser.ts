'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, TaxpayerProfile } from '@/types'
import type { User } from '@supabase/supabase-js'

interface UseUserReturn {
  user: User | null
  profile: Profile | null
  taxpayerProfile: TaxpayerProfile | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [taxpayerProfile, setTaxpayerProfile] = useState<TaxpayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      if (!authUser) {
        setLoading(false)
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      const { data: taxpayerData } = await supabase
        .from('taxpayer_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single()

      setTaxpayerProfile(taxpayerData || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuario')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchData()
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, profile, taxpayerProfile, loading, error, refresh: fetchData }
}
