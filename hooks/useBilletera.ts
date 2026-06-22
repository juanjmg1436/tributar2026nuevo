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

export function useBilletera() {
  const { user }  = useUser()
  const supabase  = createClient()
  const [balance, setBalance]       = useState<number>(0)
  const [movimientos, setMovimientos] = useState<BilleteraMovimiento[]>([])
  const [loading, setLoading]       = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const db = supabase as any
    const [wRes, mRes] = await Promise.all([
      db.from('billetera_fiscal').select('balance').eq('user_id', user.id).maybeSingle(),
      db.from('billetera_movimientos').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(30),
    ])
    setBalance(wRes.data?.balance ?? 0)
    setMovimientos(mRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function cargarSaldo(monto: number, metodo: string) {
    if (!user || monto <= 0) return
    const db = supabase as any
    const newBalance = balance + monto
    await db.from('billetera_fiscal').upsert(
      { user_id: user.id, balance: newBalance, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    await db.from('billetera_movimientos').insert({
      user_id: user.id, tipo: 'credito', monto,
      concepto: `Carga de saldo — ${metodo}`, metodo,
    })
    setBalance(newBalance)
    await load()
  }

  async function debitarPago(monto: number, concepto: string, referencia: string, metodo: string) {
    if (!user) return
    const db = supabase as any
    const newBalance = balance - monto
    await db.from('billetera_fiscal').upsert(
      { user_id: user.id, balance: newBalance, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    await db.from('billetera_movimientos').insert({
      user_id: user.id, tipo: 'debito', monto, concepto, referencia, metodo,
    })
    setBalance(newBalance)
    await load()
  }

  return { balance, movimientos, loading, cargarSaldo, debitarPago, reload: load }
}
