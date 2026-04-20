'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, TaxpayerProfile } from '@/types'
import type { User } from '@supabase/supabase-js'

interface UseUserReturn {
  user: User | null
  profile: Profile | null
  taxpayerProfile: TaxpayerProfile | null
  allTaxpayerProfiles: TaxpayerProfile[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  setActiveTaxpayer: (id: string) => Promise<void>
}

// Garantiza que las queries no cuelguen más de `ms` milisegundos
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Tiempo de espera agotado (${ms / 1000}s). Verificá la conexión.`)),
      ms
    )
  )
  return Promise.race([promise, timeout])
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [taxpayerProfile, setTaxpayerProfile] = useState<TaxpayerProfile | null>(null)
  const [allTaxpayerProfiles, setAllTaxpayerProfiles] = useState<TaxpayerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useRef(createClient()).current

  async function fetchProfiles(authUser: User) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (profileError) throw profileError
    setProfile(profileData ?? null)

    // Soporte multi-contribuyente: traer todos, ordenados por slot
    const { data: allTP, error: tpError } = await supabase
      .from('taxpayer_profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .order('slot', { ascending: true })

    if (tpError) throw tpError
    const profiles = allTP ?? []
    setAllTaxpayerProfiles(profiles)

    // Activo: el que tiene is_active=true, o el primero disponible
    const active = profiles.find((p: TaxpayerProfile) => (p as any).is_active) ?? profiles[0] ?? null
    setTaxpayerProfile(active)
  }

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      // getSession() lee la cookie — no hace llamada de red, nunca puede colgar
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setUser(null)
        setProfile(null)
        setTaxpayerProfile(null)
        setAllTaxpayerProfiles([])
        return
      }

      setUser(session.user)

      // Timeout de 8s: si Supabase no responde, la app igual termina de cargar
      await withTimeout(fetchProfiles(session.user), 8000)

    } catch (err) {
      console.error('[useUser]', err)
      // No limpiamos `user` — el error puede ser de la DB, no de auth
      setError(err instanceof Error ? err.message : 'Error al cargar datos del perfil')
    } finally {
      setLoading(false)
    }
  }

  // Cambiar contribuyente activo (de hasta 3)
  async function setActiveTaxpayer(id: string) {
    if (!user) return
    await supabase.from('taxpayer_profiles').update({ is_active: false } as any).eq('user_id', user.id)
    await supabase.from('taxpayer_profiles').update({ is_active: true } as any).eq('id', id)
    const found = allTaxpayerProfiles.find(p => p.id === id)
    if (found) {
      setTaxpayerProfile(found)
      setAllTaxpayerProfiles(prev => prev.map(p => ({ ...p, is_active: p.id === id } as any)))
    }
  }

  useEffect(() => {
    fetchData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null); setProfile(null); setTaxpayerProfile(null)
          setAllTaxpayerProfiles([]); setLoading(false)
          return
        }
        if (session?.user) {
          setUser(session.user)
          setLoading(true)
          try {
            await withTimeout(fetchProfiles(session.user), 8000)
          } catch (err) {
            console.error('[useUser] onAuthStateChange error:', err)
            setError(err instanceof Error ? err.message : 'Error al cargar datos')
          } finally {
            setLoading(false)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { user, profile, taxpayerProfile, allTaxpayerProfiles, loading, error, refresh: fetchData, setActiveTaxpayer }
}
