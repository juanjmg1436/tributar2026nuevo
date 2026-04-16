'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import { useUser } from '@/hooks/useUser'
import { formatDate, getRelativeTime } from '@/lib/utils'
import { History, Filter, RefreshCw, User, FileText, Settings, CreditCard, Mail, ShoppingBag, Receipt, Search } from 'lucide-react'
import type { ActivityLog } from '@/types'

const MODULE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  perfil_contribuyente: { label: 'Perfil', icon: <User className="w-3.5 h-3.5" />, color: 'bg-purple-100 text-purple-700' },
  alta_rut: { label: 'Alta registral', icon: <FileText className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700' },
  administrador_relaciones: { label: 'Relaciones', icon: <Settings className="w-3.5 h-3.5" />, color: 'bg-orange-100 text-orange-700' },
  estado_cuenta: { label: 'Estado de cuenta', icon: <CreditCard className="w-3.5 h-3.5" />, color: 'bg-teal-100 text-teal-700' },
  domicilio_fiscal: { label: 'Dom. Fiscal', icon: <Mail className="w-3.5 h-3.5" />, color: 'bg-indigo-100 text-indigo-700' },
  puntos_venta: { label: 'Puntos de venta', icon: <ShoppingBag className="w-3.5 h-3.5" />, color: 'bg-pink-100 text-pink-700' },
  comprobantes: { label: 'Comprobantes', icon: <Receipt className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-700' },
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creación',
  UPDATE: 'Modificación',
  COMPLETE_STEP: 'Paso completado',
  ACTIVATE_REGIME: 'Alta en régimen',
  DEACTIVATE_REGIME: 'Baja en régimen',
  CONSTITUTE_FISCAL_ADDRESS: 'Constitución DFE',
  CREATE_POS: 'Alta punto de venta',
  ACTIVATE_POS: 'Activación PdV',
  DEACTIVATE_POS: 'Desactivación PdV',
  EMIT_INVOICE: 'Emisión comprobante',
  MARK_PAID: 'Pago simulado',
}

export default function HistorialPage() {
  const { user, loading: userLoading } = useUser()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    loadLogs()
  }, [user])

  async function loadLogs() {
    setLoading(true)
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(100)
    setLogs(data || [])
    setLoading(false)
  }

  const modules = [...new Set(logs.map(l => l.module))]

  const filtered = logs.filter(log => {
    const matchModule = filter === 'all' || log.module === filter
    const matchSearch = !search || log.description.toLowerCase().includes(search.toLowerCase()) || log.action_type.toLowerCase().includes(search.toLowerCase())
    return matchModule && matchSearch
  })

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer title="Historial de acciones" subtitle="Registro cronológico de todas las acciones realizadas en el simulador.">
      <Alert variant="info" className="mb-6">
        El historial registra todas las acciones que realizaste en el simulador: altas, bajas, modificaciones, emisión de comprobantes y más. Es útil para hacer un seguimiento de tu recorrido educativo.
      </Alert>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en el historial..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === 'all' ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Todos
          </button>
          {modules.map(mod => {
            const cfg = MODULE_LABELS[mod]
            return (
              <button
                key={mod}
                onClick={() => setFilter(mod)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === mod ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {cfg?.label || mod}
              </button>
            )
          })}
        </div>
        <button onClick={loadLogs} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg flex-shrink-0" title="Actualizar">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {filtered.length === 0 ? (
        <Card padding="lg" className="text-center">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{logs.length === 0 ? 'No hay acciones registradas aún. Comenzá a explorar el simulador.' : 'No hay resultados con los filtros aplicados.'}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            const moduleCfg = MODULE_LABELS[log.module]
            return (
              <div key={log.id} className="flex gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${moduleCfg?.color || 'bg-slate-100 text-slate-500'}`}>
                  {moduleCfg?.icon || <History className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{log.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-slate-400">{moduleCfg?.label || log.module}</span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="text-xs text-slate-400">{ACTION_LABELS[log.action_type] || log.action_type}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400" title={formatDate(log.created_at, 'dd/MM/yyyy HH:mm:ss')}>
                        {getRelativeTime(log.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 text-center text-xs text-slate-400">
        Mostrando {filtered.length} de {logs.length} registros
      </div>
    </PageContainer>
  )
}
