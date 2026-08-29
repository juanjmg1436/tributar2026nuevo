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

/**
 * Un fallo de la base no puede pasar desapercibido: la operación se veía
 * exitosa en pantalla, el saldo volvía al valor anterior al recargar y el
 * alumno no tenía forma de entender por qué. Se registra el detalle técnico
 * en consola y se lanza el error para que lo muestre quien haya llamado.
 */
function fallar(accion: string, error: unknown): never {
  console.error(`[billetera] no se pudo ${accion}`, error)
  const detalle = (error as { message?: string } | null)?.message
  throw new Error(`No se pudo ${accion}.${detalle ? ` ${detalle}` : ''}`)
}

export function useBilletera() {
  const { user, taxpayerProfile } = useUser()
  const supabase = createClient()
  const [balance, setBalance]         = useState<number>(0)
  const [movimientos, setMovimientos] = useState<BilleteraMovimiento[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

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
    const fallo = wRes.error ?? mRes.error
    if (fallo) {
      console.error('[billetera] no se pudo leer la billetera', fallo)
      setError('No se pudo leer la billetera. Recargá la página; si sigue fallando, avisale al docente.')
    } else {
      setError(null)
    }
    setBalance(wRes.data?.balance ?? 0)
    setMovimientos(mRes.data ?? [])
    setLoading(false)
  }, [user, profileId])

  useEffect(() => { load() }, [load])

  async function cargarSaldo(monto: number, metodo: string) {
    if (!user || !profileId) {
      throw new Error('No hay un contribuyente activo: entrá a un contribuyente antes de cargar saldo.')
    }
    if (monto <= 0) throw new Error('El monto a cargar tiene que ser mayor a cero.')

    const db = supabase as any
    const { error: wErr } = await db.from('billetera_fiscal').upsert(
      {
        user_id: user.id, taxpayer_profile_id: profileId,
        balance: balance + monto, updated_at: new Date().toISOString(),
      },
      { onConflict: 'taxpayer_profile_id' },
    )
    if (wErr) fallar('acreditar el saldo', wErr)

    const { error: mErr } = await db.from('billetera_movimientos').insert({
      user_id: user.id, taxpayer_profile_id: profileId,
      tipo: 'credito', monto, concepto: `Carga de saldo — ${metodo}`, metodo,
    })
    if (mErr) fallar('registrar el movimiento de la carga', mErr)

    // El saldo se relee de la base: si algo falla, no queda un número
    // optimista en pantalla que no existe en ningún lado.
    await load()
  }

  async function debitarPago(
    monto: number,
    concepto: string,
    referencia: string,
    metodo: string,
  ): Promise<DebitarResult> {
    if (!user || !profileId) {
      throw new Error('No hay un contribuyente activo: entrá a un contribuyente antes de pagar.')
    }
    if (balance < monto) {
      return { success: false, shortfall: Math.ceil(monto - balance) }
    }

    const db = supabase as any
    const { error: wErr } = await db.from('billetera_fiscal').upsert(
      {
        user_id: user.id, taxpayer_profile_id: profileId,
        balance: balance - monto, updated_at: new Date().toISOString(),
      },
      { onConflict: 'taxpayer_profile_id' },
    )
    if (wErr) fallar('debitar el pago de la billetera', wErr)

    const { error: mErr } = await db.from('billetera_movimientos').insert({
      user_id: user.id, taxpayer_profile_id: profileId,
      tipo: 'debito', monto, concepto, referencia, metodo,
    })
    if (mErr) fallar('registrar el movimiento del pago', mErr)

    await load()
    return { success: true }
  }

  return { balance, movimientos, loading, error, cargarSaldo, debitarPago, reload: load }
}
