'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './useUser'

export interface BilleteraMovimiento {
  id: string
  tipo: 'credito' | 'debito'
  monto: number
  concepto: string
  referencia?: string
  metodo?: string
  created_at: string
}

export interface DebitarResult {
  success: boolean
  /** Cuánto falta para completar el pago (solo cuando success=false) */
  shortfall?: number
}

export function useBilletera() {
  const { user, taxpayerProfile } = useUser()
  const supabase = createClient()
  const [balance, setBalance]         = useState<number>(0)
  const [movimientos, setMovimientos] = useState<BilleteraMovimiento[]>([])
  const [loading, setLoading]         = useState(true)

  const profileId = taxpayerProfile?.id

  const load = useCallback(async () => {
    if (!user || !profileId) { setLoading(false); return }
    const db = supabase as any
    const [wRes, mRes] = await Promise.all([
      db.from('billetera_fiscal').select('balance')
        .eq('taxpayer_profile_id', profileId).maybeSingle(),
      db.from('billetera_movimientos').select('*')
        .eq('taxpayer_profile_id', profileId)
        .order('created_at', { ascending: false }).limit(30),
    ])
    setBalance(wRes.data?.balance ?? 0)
    setMovimientos(mRes.data ?? [])
    setLoading(false)
  }, [user, profileId])

  useEffect(() => { load() }, [load])

  async function cargarSaldo(monto: number, metodo: string) {
    if (!user || !profileId || monto <= 0) return
    const db = supabase as any
    const newBalance = balance + monto
    await db.from('billetera_fiscal').upsert(
      { user_id: user.id, taxpayer_profile_id: profileId, balance: newBalance, updated_at: new Date().toISOString() },
      { onConflict: 'taxpayer_profile_id' },
    )
    await db.from('billetera_movimientos').insert({
      user_id: user.id, taxpayer_profile_id: profileId,
      tipo: 'credito', monto, concepto: `Carga de saldo — ${metodo}`, metodo,
    })
    setBalance(newBalance)
    await load()
  }

  async function debitarPago(
    monto: number,
    concepto: string,
    referencia: string,
    metodo: string,
  ): Promise<DebitarResult> {
    if (!user || !profileId) return { success: false }
    if (balance < monto) {
      return { success: false, shortfall: Math.ceil(monto - balance) }
    }
    const db = supabase as any
    const newBalance = balance - monto
    await db.from('billetera_fiscal').upsert(
      { user_id: user.id, taxpayer_profile_id: profileId, balance: newBalance, updated_at: new Date().toISOString() },
      { onConflict: 'taxpayer_profile_id' },
    )
    await db.from('billetera_movimientos').insert({
      user_id: user.id, taxpayer_profile_id: profileId,
      tipo: 'debito', monto, concepto, referencia, metodo,
    })
    setBalance(newBalance)
    await load()
    return { success: true }
  }

  return { balance, movimientos, loading, cargarSaldo, debitarPago, reload: load }
}
