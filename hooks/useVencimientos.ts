'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './useUser'
import { AUTONOMOS_CATEGORIES } from '@/lib/fiscal-engine/autonomos'

export interface Vencimiento {
  id: string
  tipo: 'monotributo' | 'autonomos' | 'f931'
  concepto: string
  monto: number | null
  dueDate: Date
  periodo: string
  pagado: boolean
  vencido: boolean
}

export function useVencimientos() {
  const { user } = useUser()
  const supabase = createClient()
  const [vencimientos, setVencimientos] = useState<Vencimiento[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    const db  = supabase as any
    const now = new Date()
    const y   = now.getFullYear()
    const m   = now.getMonth() // 0-indexed
    const currentPeriod = `${y}-${String(m + 1).padStart(2, '0')}`
    const ny = m === 11 ? y + 1 : y
    const nm = m === 11 ? 1 : m + 2
    const nextPeriod    = `${ny}-${String(nm).padStart(2, '0')}`
    const periods = [currentPeriod, nextPeriod]
    const result: Vencimiento[] = []

    // ── Monotributo ──────────────────────────────────────────────────────────
    const [monoProf, monoCats, monoPays] = await Promise.all([
      db.from('monotributo_profiles')
        .select('category_code, activity_type')
        .eq('user_id', user.id).eq('status', 'active').maybeSingle(),
      db.from('monotributo_demo_categories')
        .select('category_code, monthly_total_services, monthly_total_goods')
        .eq('is_active', true),
      db.from('monotributo_payments')
        .select('period, status').eq('user_id', user.id).in('period', periods),
    ])

    if (monoProf.data) {
      const mp   = monoProf.data
      const cats = monoCats.data ?? []
      const cat  = cats.find((c: any) => c.category_code === mp.category_code)
      for (const periodo of periods) {
        const [py, pmth] = periodo.split('-').map(Number)
        const dueDate = new Date(py, pmth - 1, 20)
        const pago    = (monoPays.data ?? []).find((p: any) => p.period === periodo)
        const monto   = cat
          ? (mp.activity_type === 'bienes' ? cat.monthly_total_goods : cat.monthly_total_services)
          : null
        result.push({
          id: `mono-${periodo}`,
          tipo: 'monotributo',
          concepto: `Monotributo Cat. ${mp.category_code}`,
          monto,
          dueDate,
          periodo,
          pagado: pago?.status === 'paid',
          vencido: pago?.status !== 'paid' && now > dueDate,
        })
      }
    }

    // ── Autónomos ─────────────────────────────────────────────────────────────
    const [autoProf, autoPays] = await Promise.all([
      db.from('autonomos_profiles').select('category').eq('user_id', user.id).maybeSingle(),
      db.from('autonomos_payments').select('period, status')
        .eq('user_id', user.id).in('period', periods),
    ])

    if (autoProf.data) {
      const ap  = autoProf.data
      const cat = AUTONOMOS_CATEGORIES.find(c => c.code === ap.category)
      for (const periodo of periods) {
        const [py, pmth] = periodo.split('-').map(Number)
        // Autónomos: vence el 15 del mes SIGUIENTE al devengado
        const nextY = pmth === 12 ? py + 1 : py
        const nextM = pmth === 12 ? 1 : pmth + 1
        const dueDate = new Date(nextY, nextM - 1, 15)
        const pago    = (autoPays.data ?? []).find((p: any) => p.period === periodo)
        result.push({
          id: `auto-${periodo}`,
          tipo: 'autonomos',
          concepto: `Aportes Autónomos Cat. ${ap.category}`,
          monto: cat?.totalMensual ?? null,
          dueDate,
          periodo,
          pagado: pago?.status === 'paid',
          vencido: pago?.status !== 'paid' && now > dueDate,
        })
      }
    }

    // ── F.931 VEPs pendientes ─────────────────────────────────────────────────
    const vepRes = await db.from('cargas_sociales_veps')
      .select('id, periodo, total_amount, due_date')
      .eq('user_id', user.id).eq('status', 'pendiente')
    for (const vep of vepRes.data ?? []) {
      const dueDate = new Date(vep.due_date)
      result.push({
        id: `f931-${vep.id}`,
        tipo: 'f931',
        concepto: 'F.931 (cargas sociales)',
        monto: vep.total_amount,
        dueDate,
        periodo: vep.periodo,
        pagado: false,
        vencido: now > dueDate,
      })
    }

    result.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    setVencimientos(result)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  return { vencimientos, loading, reload: load }
}
