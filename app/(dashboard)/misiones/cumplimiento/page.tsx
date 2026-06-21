'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { useProvincialTaxpayer } from '@/hooks/useProvincialTaxpayer'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CheckCircle2, XCircle, Clock, AlertTriangle, TrendingUp, ShieldCheck } from 'lucide-react'
import type { ProvIIBBDDJJ, ProvPayment } from '@/types/provincial'

interface ComplianceItem {
  id: string
  type: string
  concept: string
  period: string
  dueDate: string
  status: 'ok' | 'pending' | 'overdue'
  amount?: number
  link?: string
}

export default function CumplimientoPage() {
  const { user, loading: userLoading } = useUser()
  const { taxpayer, loading: tpLoading, summary } = useProvincialTaxpayer(user?.id)
  const [items, setItems] = useState<ComplianceItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  async function load() {
    setLoading(true)
    const db = supabase as any
    const [ddjjRes, paymentsRes] = await Promise.all([
      db.from('prov_iibb_ddjj').select('*').eq('user_id', user!.id).order('period', { ascending: false }),
      db.from('prov_payments').select('*').eq('user_id', user!.id).order('due_date', { ascending: false }),
    ])

    const ddjjs: ProvIIBBDDJJ[] = ddjjRes.data || []
    const payments: ProvPayment[] = paymentsRes.data || []
    const now = new Date()

    const complianceItems: ComplianceItem[] = [
      ...ddjjs.map(d => ({
        id: d.id,
        type: 'IIBB — DDJJ',
        concept: `Declaración Jurada IIBB — ${d.period_label}`,
        period: d.period,
        dueDate: d.due_date,
        status: d.status === 'paid' || d.status === 'submitted'
          ? 'ok'
          : new Date(d.due_date) < now ? 'overdue' : 'pending',
        amount: d.net_tax,
        link: `/misiones/iibb/${d.id}`,
      } as ComplianceItem)),
      ...payments
        .filter(p => !ddjjs.find(d => d.id === p.reference_id))  // evitar duplicados
        .map(p => ({
          id: p.id,
          type: p.tax_type.toUpperCase(),
          concept: p.concept,
          period: p.period || '',
          dueDate: p.due_date,
          status: p.status === 'paid'
            ? 'ok'
            : new Date(p.due_date) < now ? 'overdue' : 'pending',
          amount: p.total_amount,
        } as ComplianceItem)),
    ]

    setItems(complianceItems.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()))
    setLoading(false)
  }

  const okCount = items.filter(i => i.status === 'ok').length
  const pendingCount = items.filter(i => i.status === 'pending').length
  const overdueCount = items.filter(i => i.status === 'overdue').length
  const score = items.length > 0 ? Math.round((okCount / items.length) * 100) : 100

  const statusConfig = {
    ok: { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Cumplido' },
    pending: { icon: <Clock className="w-4 h-4 text-orange-500" />, color: 'text-orange-700 bg-orange-50 border-orange-200', label: 'Pendiente' },
    overdue: { icon: <XCircle className="w-4 h-4 text-red-500" />, color: 'text-red-700 bg-red-50 border-red-200', label: 'Vencido' },
  }

  if (userLoading || tpLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer title="Panel de cumplimiento" subtitle="Estado general de obligaciones provinciales (simulación)">
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
          {/* Score card */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <Card padding="md" className={`lg:col-span-1 text-center border-2 ${score >= 80 ? 'border-emerald-300 bg-emerald-50' : score >= 50 ? 'border-orange-300 bg-orange-50' : 'border-red-300 bg-red-50'}`}>
              <div className={`text-4xl font-black mb-1 ${score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                {score}%
              </div>
              <p className="text-xs font-semibold text-slate-600">Índice de cumplimiento</p>
              <div className="flex justify-center mt-2">
                <ShieldCheck className={`w-5 h-5 ${score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-orange-500' : 'text-red-500'}`} />
              </div>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{okCount}</p>
              <p className="text-xs text-slate-500 mt-1">Cumplidos</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
              <p className="text-xs text-slate-500 mt-1">Pendientes</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
              <p className="text-xs text-slate-500 mt-1">Vencidos</p>
            </Card>
          </div>

          {overdueCount > 0 && (
            <Alert variant="error" className="mb-5">
              <strong>Atención:</strong> Tenés {overdueCount} obligación/es vencida/s. En la realidad correspondería aplicar recargos e intereses por mora.
            </Alert>
          )}

          {/* Items list */}
          {items.length === 0 ? (
            <Card padding="lg" className="text-center">
              <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Sin obligaciones registradas. Presentá tu primera DDJJ de IIBB.</p>
              <a href="/misiones/iibb/nueva" className="inline-block mt-3 text-sm text-primary-600 underline">Nueva DDJJ →</a>
            </Card>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const sc = statusConfig[item.status]
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${item.status === 'overdue' ? 'bg-red-50/50 border-red-200' : item.status === 'pending' ? 'bg-orange-50/50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-center gap-3">
                      {sc.icon}
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.concept}</p>
                        <p className="text-xs text-slate-500">
                          {item.type}{item.period ? ` · ${item.period}` : ''} · Vence: {formatDate(item.dueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {item.amount !== undefined && (
                        <p className="text-sm font-bold text-slate-700">{formatCurrency(item.amount)}</p>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sc.color}`}>
                        {sc.label}
                      </span>
                      {item.link && (
                        <a href={item.link} className="text-xs text-primary-600 hover:underline">Ver →</a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Educational note */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs text-blue-700">
              <strong>💡 Concepto educativo:</strong> El índice de cumplimiento mide qué porcentaje de tus obligaciones tributarias provinciales están presentadas y/o pagadas en término.
              Un contribuyente con buen cumplimiento tiene menor riesgo de ser fiscalizado y evita recargos, multas e intereses resarcitorios.
            </p>
          </div>
        </>
      )}
    </PageContainer>
  )
}
