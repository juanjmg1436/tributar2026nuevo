'use client'

import { useEffect, useRef, useState } from 'react'
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

  // Una sola instancia — no recrear en cada render
  const supabase = useRef(createClient()).current

  async function fetchProfiles(authUser: User) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (profileError) throw profileError
    setProfile(profileData ?? null)

    const { data: taxpayerData, error: taxpayerError } = await supabase
      .from('taxpayer_profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .maybeSingle()

    if (taxpayerError) throw taxpayerError
    setTaxpayerProfile(taxpayerData ?? null)
  }

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      // getSession() lee cookies sin hacer llamada de red.
      // El middleware ya verificó el token en el servidor — aquí alcanza con la sesión local.
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setUser(null)
        setProfile(null)
        setTaxpayerProfile(null)
        return
      }

      setUser(session.user)
      await fetchProfiles(session.user)
    } catch (err) {
      console.error('[useUser] error:', err)
      // No limpiar user: puede ser error de red en profiles, no falla de auth
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setTaxpayerProfile(null)
          setLoading(false)
          return
        }
        if (session?.user) {
          setUser(session.user)
          setLoading(true)
          try {
            await fetchProfiles(session.user)
          } catch (err) {
            console.error('[useUser] profiles error:', err)
          } finally {
            setLoading(false)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { user, profile, taxpayerProfile, loading, error, refresh: fetchData }
}
