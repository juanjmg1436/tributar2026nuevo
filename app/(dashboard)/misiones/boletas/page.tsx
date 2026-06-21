'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { useProvincialTaxpayer } from '@/hooks/useProvincialTaxpayer'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CreditCard, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'
import type { ProvPayment } from '@/types/provincial'

export default function BoletasPage() {
  const { user, loading: userLoading } = useUser()
  const { taxpayer, loading: tpLoading } = useProvincialTaxpayer(user?.id)
  const [payments, setPayments] = useState<ProvPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all')
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  async function load() {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('prov_payments')
      .select('*')
      .eq('user_id', user!.id)
      .order('due_date', { ascending: false })
    setPayments(data || [])
    setLoading(false)
  }

  async function markPaid(id: string) {
    setUpdating(id)
    await (supabase as any).from('prov_payments').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('id', id)
    // If it's an IIBB payment, also update the DDJJ
    const payment = payments.find(p => p.id === id)
    if (payment?.reference_id && payment.tax_type === 'iibb') {
      await (supabase as any).from('prov_iibb_ddjj').update({ status: 'paid' }).eq('id', payment.reference_id)
    }
    await load()
    setUpdating(null)
  }

  const filtered = payments.filter(p => filter === 'all' || p.status === filter)
  const totalPending = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + p.total_amount, 0)

  const statusConfig: Record<string, { color: string; label: string }> = {
    pending: { color: 'text-orange-600 bg-orange-50 border-orange-200', label: 'Pendiente' },
    overdue: { color: 'text-red-600 bg-red-50 border-red-200', label: 'Vencida' },
    paid: { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'Pagada' },
  }

  const taxTypeLabels: Record<string, string> = {
    iibb: 'IIBB', inmobiliario: 'Inmobiliario', automotor: 'Automotor', sellos: 'Sellos', sr341: 'SR-341',
  }

  if (userLoading || tpLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer title="Boletas y pagos" subtitle="Gestión de boletas de pago provinciales (simulación)">
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-xs text-red-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {!taxpayer ? (
        <Alert variant="warning">
          Primero completá el <a href="/misiones/alta" className="underline font-semibold">alta provincial →</a>
        </Alert>
      ) : (
        <>
          {totalPending > 0 && (
            <Alert variant="warning" className="mb-5">
              <strong>Total pendiente de pago (DEMO):</strong> {formatCurrency(totalPending)}
            </Alert>
          )}

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <Card padding="sm" className="text-center">
              <p className="text-xl font-bold text-orange-600">{payments.filter(p => p.status === 'pending').length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Pendientes</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-xl font-bold text-red-600">{payments.filter(p => p.status === 'overdue').length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Vencidas</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-xl font-bold text-emerald-600">{payments.filter(p => p.status === 'paid').length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Pagadas</p>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap mb-5">
            {(['all', 'pending', 'overdue', 'paid'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {{ all: 'Todas', pending: 'Pendientes', overdue: 'Vencidas', paid: 'Pagadas' }[f]}
              </button>
            ))}
            <button onClick={load} className="ml-auto p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {filtered.length === 0 ? (
            <Card padding="lg" className="text-center">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                {payments.length === 0
                  ? 'Sin boletas generadas. Las boletas se crean al presentar una DDJJ o registrar un tributo.'
                  : 'Sin boletas para el filtro seleccionado.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => {
                const sc = statusConfig[p.status] || statusConfig.pending
                return (
                  <Card key={p.id} padding="md">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-slate-800 text-sm">{p.concept}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sc.color}`}>
                            {sc.label}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                            {taxTypeLabels[p.tax_type] || p.tax_type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">Vencimiento: {formatDate(p.due_date)}</p>
                        {p.period && <p className="text-xs text-slate-500">Período: {p.period}</p>}
                        {p.surcharge > 0 && (
                          <p className="text-xs text-red-500">Recargo por mora: {formatCurrency(p.surcharge)}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Total</p>
                        <p className="text-lg font-bold text-slate-800">{formatCurrency(p.total_amount)}</p>
                        {p.status !== 'paid' && (
                          <Button size="sm" className="mt-2" onClick={() => markPaid(p.id)} loading={updating === p.id}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Simular pago
                          </Button>
                        )}
                        {p.status === 'paid' && p.paid_at && (
                          <p className="text-xs text-emerald-600 mt-1">Pagado: {formatDate(p.paid_at)}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}
