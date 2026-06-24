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
import { formatPeriodLabel } from '@/lib/constants/misiones'
import { FileText, Plus, CheckCircle2, Clock, AlertCircle, AlertTriangle, Printer, CreditCard, Link2 } from 'lucide-react'
import type { ProvIIBBDDJJ } from '@/types/provincial'

type FilterStatus = 'all' | 'draft' | 'submitted' | 'paid' | 'overdue'

export default function IIBBPage() {
  const { user, loading: userLoading } = useUser()
  const { taxpayer, loading: tpLoading } = useProvincialTaxpayer(user?.id)
  const [ddjjs, setDDJJs] = useState<ProvIIBBDDJJ[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  async function load() {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('prov_iibb_ddjj')
      .select('*, origin, submitted_at')
      .eq('user_id', user!.id)
      .order('period', { ascending: false })
    setDDJJs(data || [])
    setLoading(false)
  }

  async function markPaid(id: string) {
    await (supabase as any).from('prov_iibb_ddjj').update({ status: 'paid', submitted_at: new Date().toISOString() }).eq('id', id)
    await load()
  }

  async function markSubmitted(id: string) {
    await (supabase as any).from('prov_iibb_ddjj').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', id)
    await load()
  }

  const filtered = ddjjs.filter(d => filter === 'all' || d.status === filter)

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    draft: { icon: <Clock className="w-4 h-4" />, color: 'text-orange-600 bg-orange-50 border-orange-200', label: 'Borrador' },
    submitted: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Presentada' },
    paid: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'Pagada' },
    overdue: { icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-600 bg-red-50 border-red-200', label: 'Vencida' },
  }

  const summary = {
    total: ddjjs.length,
    draft: ddjjs.filter(d => d.status === 'draft').length,
    submitted: ddjjs.filter(d => d.status === 'submitted').length,
    paid: ddjjs.filter(d => d.status === 'paid').length,
    overdue: ddjjs.filter(d => d.status === 'overdue').length,
  }

  if (userLoading || tpLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer title="Ingresos Brutos — DDJJ" subtitle="Declaraciones juradas mensuales de Ingresos Brutos (simulación)">
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-xs text-red-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {!taxpayer ? (
        <Alert variant="warning">
          Primero debés completar el{' '}
          <a href="/misiones/alta" className="underline font-semibold">alta provincial →</a>
        </Alert>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card padding="sm" className="text-center">
              <p className="text-2xl font-bold text-orange-600">{summary.draft}</p>
              <p className="text-xs text-slate-500 mt-1">Borradores</p>
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

          {/* Actions + filters */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <a href="/misiones/iibb/nueva">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" /> Nueva DDJJ
              </Button>
            </a>
            <div className="flex gap-2 flex-wrap ml-auto">
              {(['all', 'draft', 'overdue', 'submitted', 'paid'] as FilterStatus[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {{ all: 'Todas', draft: 'Borradores', overdue: 'Vencidas', submitted: 'Presentadas', paid: 'Pagadas' }[f]}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <Card padding="lg" className="text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                {ddjjs.length === 0 ? 'Sin declaraciones. Creá tu primera DDJJ.' : 'Sin resultados para el filtro seleccionado.'}
              </p>
              {ddjjs.length === 0 && (
                <a href="/misiones/iibb/nueva" className="inline-block mt-3 text-sm text-primary-600 underline">
                  Nueva DDJJ →
                </a>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(d => {
                const sc = statusConfig[d.status] || statusConfig.draft
                const origin = (d as any).origin as 'manual' | 'pymez360' | undefined
                const submittedAt = (d as any).submitted_at as string | undefined
                return (
                  <Card key={d.id} padding="none" className="overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-slate-800 text-sm">{d.period_label}</p>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${sc.color}`}>
                              {sc.icon} {sc.label}
                            </span>
                            {origin === 'pymez360' && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-violet-200 bg-violet-50 text-violet-600 font-medium">
                                <Link2 className="w-2.5 h-2.5" /> PyMEZ 360
                              </span>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs text-slate-500">Vencimiento: {formatDate(d.due_date)}</p>
                            {submittedAt && (
                              <p className="text-xs text-slate-500">Presentada: {formatDate(submittedAt)}</p>
                            )}
                            <p className="text-xs text-slate-500">
                              Base gravada: {formatCurrency(d.total_taxable_revenue)}
                              {d.total_withholdings > 0 && ` · Retenciones: ${formatCurrency(d.total_withholdings)}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-slate-400 font-medium">Impuesto a pagar</p>
                          <p className="text-xl font-bold text-primary-700">{formatCurrency(d.net_tax)}</p>
                          {d.status === 'paid' && (
                            <p className="text-xs text-emerald-600 font-semibold mt-0.5">✓ Pagada</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 flex-wrap border-t border-slate-100 pt-3">
                        <a href={`/misiones/iibb/${d.id}`}>
                          <Button size="sm" variant="outline">Ver / Imprimir</Button>
                        </a>
                        {(d.status === 'draft' || d.status === 'overdue') && (
                          <Button size="sm" variant="outline" onClick={() => markSubmitted(d.id)}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Presentar DDJJ
                          </Button>
                        )}
                        {(d.status === 'draft' || d.status === 'overdue' || d.status === 'submitted') && d.net_tax > 0 && (
                          <a href={`/misiones/iibb/${d.id}`}>
                            <Button size="sm">
                              <CreditCard className="w-3.5 h-3.5 mr-1" /> Pagar
                            </Button>
                          </a>
                        )}
                        {d.status === 'paid' && (
                          <a href={`/misiones/iibb/${d.id}`}>
                            <Button size="sm" variant="outline">
                              <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir comprobante
                            </Button>
                          </a>
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
