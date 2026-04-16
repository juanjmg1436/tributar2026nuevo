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

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        throw authError
      }

      setUser(authUser)

      if (!authUser) {
        setProfile(null)
        setTaxpayerProfile(null)
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      setProfile(profileData ?? null)

      const { data: taxpayerData, error: taxpayerError } = await supabase
        .from('taxpayer_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle()

      if (taxpayerError) {
        throw taxpayerError
      }

      setTaxpayerProfile(taxpayerData ?? null)
    } catch (err) {
      console.error('useUser error:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar usuario')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchData()
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    profile,
    taxpayerProfile,
    loading,
    error,
    refresh: fetchData,
  }
}