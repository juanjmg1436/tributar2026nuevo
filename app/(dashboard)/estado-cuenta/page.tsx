'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge, ObligationBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CreditCard, Filter, RefreshCw, CheckCircle2, AlertCircle, Clock, Info, ChevronDown, ChevronUp } from 'lucide-react'
import type { Obligation } from '@/types'

type FilterType = 'all' | 'pending' | 'submitted' | 'paid' | 'overdue'

export default function EstadoCuentaPage() {
  const { user, loading: userLoading } = useUser()
  const [obligations, setObligations] = useState<Obligation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    try {
      setLoading(true)
      const [stepsRes, obligationsRes, regimeStatusRes] = await Promise.all([
        supabase.from('registration_steps').select('status').eq('user_id', user!.id),
        supabase.from('obligations').select('*').eq('user_id', user!.id).order('due_date', { ascending: false }),
        supabase.from('taxpayer_regime_status').select('*, tax_regimes(name, code)').eq('user_id', user!.id).eq('status', 'active'),
      ])

      const completedSteps = (stepsRes.data || []).filter(s => s.status === 'completed').length
      setIsRegistrationComplete(completedSteps === 6)

      let obs = obligationsRes.data || []

      // Generate demo obligations if active regime and none exist
      if (completedSteps === 6 && (regimeStatusRes.data || []).length > 0 && obs.length === 0) {
        const demoObligations = generateDemoObligations(user!.id, regimeStatusRes.data || [])
        if (demoObligations.length > 0) {
          const { data: created } = await supabase.from('obligations').insert(demoObligations).select()
          obs = created || []
        }
      }

      setObligations(obs)
    } finally {
      setLoading(false)
    }
  }

  function generateDemoObligations(userId: string, regimeStatuses: any[]): any[] {
    const obligations: any[] = []
    const now = new Date()

    for (const rs of regimeStatuses) {
      const regime = rs.tax_regimes
      if (!regime) continue

      if (regime.code === 'MONOTRIBUTO') {
        for (let i = 0; i < 3; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 20)
          obligations.push({
            user_id: userId,
            regime_id: rs.regime_id,
            concept: 'Cuota Monotributo',
            period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            due_date: date.toISOString().split('T')[0],
            amount_demo: 25000 + Math.random() * 5000,
            status: i === 0 ? 'pending' : i === 1 ? 'paid' : 'paid',
            description: 'Cuota mensual de Monotributo (incluye IVA, Ganancias y aportes previsionales)',
            origin: 'system',
          })
        }
      }

      if (regime.code === 'REGIMEN_GENERAL') {
        for (let i = 0; i < 3; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 18)
          obligations.push({
            user_id: userId,
            regime_id: rs.regime_id,
            concept: 'IVA — Período Fiscal',
            period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            due_date: date.toISOString().split('T')[0],
            amount_demo: 80000 + Math.random() * 20000,
            status: i === 0 ? 'pending' : 'submitted',
            description: 'Declaración jurada mensual de IVA (Régimen General)',
            origin: 'system',
          })
          obligations.push({
            user_id: userId,
            regime_id: rs.regime_id,
            concept: 'Ganancias — Anticipo',
            period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            due_date: new Date(date.getFullYear(), date.getMonth() + 1, 5).toISOString().split('T')[0],
            amount_demo: 45000 + Math.random() * 15000,
            status: i === 0 ? 'overdue' : 'paid',
            description: 'Anticipo mensual del impuesto a las Ganancias',
            origin: 'system',
          })
        }
      }
    }
    return obligations
  }

  async function markAsPaid(id: string) {
    setUpdating(id)
    await supabase.from('obligations').update({ status: 'paid' }).eq('id', id)
    await supabase.from('activity_log').insert({
      user_id: user!.id,
      action_type: 'MARK_PAID',
      description: 'Obligación marcada como pagada (simulación)',
      module: 'estado_cuenta',
      metadata: { obligation_id: id },
    })
    await loadData()
    setUpdating(null)
  }

  async function markAsSubmitted(id: string) {
    setUpdating(id)
    await supabase.from('obligations').update({ status: 'submitted' }).eq('id', id)
    await loadData()
    setUpdating(null)
  }

  const filtered = obligations.filter(o => filter === 'all' || o.status === filter)
  const summary = {
    total: obligations.length,
    pending: obligations.filter(o => o.status === 'pending').length,
    overdue: obligations.filter(o => o.status === 'overdue').length,
    paid: obligations.filter(o => o.status === 'paid').length,
    submitted: obligations.filter(o => o.status === 'submitted').length,
  }

  const totalPending = obligations.filter(o => ['pending', 'overdue'].includes(o.status)).reduce((sum, o) => sum + o.amount_demo, 0)

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  if (!isRegistrationComplete) {
    return (
      <PageContainer title="Estado de cuenta" subtitle="Obligaciones fiscales simuladas">
        <Alert variant="warning">
          <strong>Módulo bloqueado.</strong> Completá el alta registral para visualizar tu estado de cuenta.{' '}
          <a href="/alta-rut" className="underline font-semibold">Ir al alta registral →</a>
        </Alert>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="Estado de cuenta" subtitle="Resumen de tus obligaciones fiscales simuladas.">
      <Alert variant="info" className="mb-6">
        <strong>¿Qué es el estado de cuenta?</strong> Muestra las obligaciones impositivas del contribuyente: qué debe presentar, cuándo vence y cuál es el estado de cada obligación. Los montos y fechas son ficticios con fines educativos.
      </Alert>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-orange-600">{summary.pending}</p>
          <p className="text-xs text-slate-500 mt-1">Pendientes</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-red-600">{summary.overdue}</p>
          <p className="text-xs text-slate-500 mt-1">Vencidas</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-blue-600">{summary.submitted}</p>
          <p className="text-xs text-slate-500 mt-1">Presentadas</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{summary.paid}</p>
          <p className="text-xs text-slate-500 mt-1">Pagadas</p>
        </Card>
      </div>

      {totalPending > 0 && (
        <Alert variant="warning" className="mb-6">
          <strong>Total pendiente de pago (DEMO):</strong> {formatCurrency(totalPending)}
        </Alert>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {([
          { key: 'all', label: 'Todas' },
          { key: 'pending', label: 'Pendientes' },
          { key: 'overdue', label: 'Vencidas' },
          { key: 'submitted', label: 'Presentadas' },
          { key: 'paid', label: 'Pagadas' },
        ] as { key: FilterType; label: string }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f.key ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {f.label}
          </button>
        ))}
        <button onClick={loadData} className="ml-auto p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg" title="Actualizar">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Obligations list */}
      {filtered.length === 0 ? (
        <Card padding="lg" className="text-center">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">
            {obligations.length === 0
              ? 'No hay obligaciones generadas aún. Activá un régimen tributario para ver obligaciones.'
              : 'No hay obligaciones con el filtro seleccionado.'}
          </p>
          {obligations.length === 0 && (
            <a href="/administrador-relaciones" className="inline-block mt-3 text-sm text-primary-600 underline">
              Ir al Administrador de Relaciones →
            </a>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(ob => (
            <Card key={ob.id} padding="none" className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(expanded === ob.id ? null : ob.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{ob.concept}</p>
                      <ObligationBadge status={ob.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Período: {ob.period} — Vence: {formatDate(ob.due_date)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(ob.amount_demo)}</p>
                    {expanded === ob.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
              </div>
              {expanded === ob.id && (
                <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                  <p className="text-sm text-slate-600 mb-3">{ob.description}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                    <div>
                      <p className="text-slate-400">Concepto</p>
                      <p className="font-medium text-slate-700">{ob.concept}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Período</p>
                      <p className="font-medium text-slate-700">{ob.period}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Vencimiento</p>
                      <p className="font-medium text-slate-700">{formatDate(ob.due_date)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Monto (DEMO)</p>
                      <p className="font-bold text-slate-800">{formatCurrency(ob.amount_demo)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(ob.status === 'pending' || ob.status === 'overdue') && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => markAsSubmitted(ob.id)} loading={updating === ob.id}>
                          Marcar como presentada
                        </Button>
                        <Button size="sm" onClick={() => markAsPaid(ob.id)} loading={updating === ob.id}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Simular pago
                        </Button>
                      </>
                    )}
                    {ob.status === 'submitted' && (
                      <Button size="sm" onClick={() => markAsPaid(ob.id)} loading={updating === ob.id}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Simular pago
                      </Button>
                    )}
                    {ob.status === 'paid' && (
                      <Badge variant="success" dot>Obligación cancelada</Badge>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          <strong>Simulación educativa:</strong> Los montos, períodos y vencimientos mostrados son ficticios. Las acciones "Simular pago" y "Marcar como presentada" son solo ejercicios pedagógicos sin ningún efecto real.
        </p>
      </div>
    </PageContainer>
  )
}
