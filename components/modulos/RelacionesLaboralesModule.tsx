'use client'

/**
 * RelacionesLaboralesModule — integración con Sueldos 360.
 * Importa empleados, liquidaciones y F.931 usando el sync_token de la empresa.
 * Tabs: Vincular | Empleados | Liquidaciones | F.931
 */

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useUser } from '@/hooks/useUser'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import {
  Users, Link2, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink,
  TrendingUp, FileText, Info, XCircle,
} from 'lucide-react'

type Tab = 'vincular' | 'empleados' | 'liquidaciones' | 'f931'

interface S360Employee { id: string; apellido: string; nombre: string; cuil: string; puesto?: string; sueldo_basico: number; status: string }
interface S360Payroll { id: string; periodo: string; tipo: string; status: string; total_bruto: number; total_neto: number; total_contribuciones_patronales: number; total_aportes_trabajador: number; total_costo_laboral: number; fecha_pago?: string }
interface S360F931 { id: string; periodo: string; cantidad_empleados: number; total_remuneraciones: number; total_aportes_jubilatorios: number; total_contribuciones_patronales: number; total_general: number; status: string; presentado_at?: string; pagado_at?: string }

interface SyncData {
  company_name: string
  company_cuit: string
  employee_count: number
  employees_json: S360Employee[]
  payroll_runs_json: S360Payroll[]
  f931_json: S360F931[]
  last_period: string | null
  total_bruto: number
  total_neto: number
  total_contribuciones: number
  synced_at: string
}

const PAYROLL_STATUS_LABEL: Record<string, string> = {
  borrador: 'Borrador', calculada: 'Calculada', observada: 'Observada',
  cerrada: 'Cerrada', rectificada: 'Rectificada',
}
const F931_STATUS_LABEL: Record<string, string> = {
  borrador: 'Borrador', presentado: 'Presentado', rectificativo: 'Rectificativo', pagado: 'Pagado',
}

export function RelacionesLaboralesModule() {
  const { user } = useUser()
  const supabase   = createClient()

  const [tab, setTab]       = useState<Tab>('vincular')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [tokenInput, setTokenInput] = useState('')

  // Datos sincronizados
  const [syncData, setSyncData] = useState<SyncData | null>(null)

  useEffect(() => { if (user) init() }, [user])

  async function init() {
    setLoading(true)
    // Cargar datos ya importados de TRIBUT.AR
    const { data } = await (supabase as any)
      .from('sueldos360_imports')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle()

    if (data) {
      setSyncData(data)
      setTab('empleados')
    }
    setLoading(false)
  }

  async function apiHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { 'Authorization': `Bearer ${session.access_token}` } : {}
  }

  async function handleSync() {
    if (!tokenInput.trim()) {
      setError('Ingresá el código de sincronización de Sueldos 360.')
      return
    }
    setSyncing(true)
    setError(null)
    try {
      const headers = await apiHeaders()
      const res = await fetch(`/api/sueldos-sync?action=sync&token=${encodeURIComponent(tokenInput.trim())}`, { headers })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Error al sincronizar'); return }
      setSuccess(`¡Conectado! ${json.employee_count} empleados · ${json.payroll_runs?.length || 0} liquidaciones importadas.`)
      await init()
    } catch (e) {
      setError('Error de red al conectar con Sueldos 360.')
    } finally {
      setSyncing(false)
    }
  }

  async function handleClear() {
    await (supabase as any).from('sueldos360_imports').delete().eq('user_id', user!.id)
    setSyncData(null)
    setTab('vincular')
    setTokenInput('')
    setSuccess('Vinculación eliminada.')
  }

  const employees  = syncData?.employees_json  || []
  const payrolls   = syncData?.payroll_runs_json || []
  const f931s      = syncData?.f931_json         || []

  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'vincular',       label: 'Vincular',       icon: <Link2      className="w-3.5 h-3.5" /> },
    { id: 'empleados',      label: 'Empleados',      icon: <Users      className="w-3.5 h-3.5" /> },
    { id: 'liquidaciones',  label: 'Liquidaciones',  icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'f931',           label: 'F.931',          icon: <FileText   className="w-3.5 h-3.5" /> },
  ]

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">

      {/* Disclaimer */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex gap-2 items-center flex-wrap">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium">SIMULADOR DIDÁCTICO — SIN VALIDEZ FISCAL NI LEGAL</p>
        <div className="ml-auto flex items-center gap-3">
          <a href="https://sueldos360.vercel.app/dashboard" target="_blank" rel="noreferrer"
            className="text-xs font-semibold text-violet-700 hover:underline flex items-center gap-1 whitespace-nowrap">
            Ir a Sueldos 360 <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
              tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t.icon}<span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {error   && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* ══════════ TAB: VINCULAR ══════════ */}
      {tab === 'vincular' && (
        <div className="space-y-4">
          <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl flex gap-3">
            <Info className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-violet-700 leading-relaxed">
              <p className="font-bold mb-1">Cómo vincular con Sueldos 360</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Andá a <a href="https://sueldos360.vercel.app/dashboard/empresas" target="_blank" className="underline font-semibold">Sueldos 360 → Empresas</a></li>
                <li>Copiá el <strong>Código de sincronización</strong> de la tarjeta violeta</li>
                <li>Pegalo en el campo de abajo y hacé click en <strong>Sincronizar</strong></li>
              </ol>
            </div>
          </div>

          <Card padding="md">
            {syncData ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-emerald-800">{syncData.company_name}</p>
                    <p className="text-xs text-emerald-600">CUIT: {syncData.company_cuit} · Última sync: {formatDate(syncData.synced_at)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleClear} className="text-xs">
                    <XCircle className="w-3 h-3 mr-1" /> Desvincular
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-slate-50 rounded-xl text-center">
                    <p className="text-xs text-slate-400 mb-0.5">Empleados</p>
                    <p className="text-xl font-black text-slate-700">{syncData.employee_count}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-center">
                    <p className="text-xs text-slate-400 mb-0.5">Último bruto</p>
                    <p className="text-sm font-black text-slate-700">{formatCurrency(syncData.total_bruto)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-center">
                    <p className="text-xs text-slate-400 mb-0.5">Período</p>
                    <p className="text-sm font-black text-slate-700">{syncData.last_period ?? '—'}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={init} className="w-full text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" /> Actualizar datos
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Código de sincronización
                  </label>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value.toUpperCase())}
                    placeholder="Ej: A3F7B2C1"
                    maxLength={8}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Encontralo en Sueldos 360 → Empresas → tarjeta violeta &quot;Código de sincronización&quot;
                  </p>
                </div>
                <Button onClick={handleSync} loading={syncing} className="w-full bg-violet-700 hover:bg-violet-800 text-white">
                  <Link2 className="w-4 h-4 mr-2" /> Sincronizar con Sueldos 360
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══════════ TAB: EMPLEADOS ══════════ */}
      {tab === 'empleados' && (
        <div className="space-y-3">
          {employees.length === 0 ? (
            <Alert variant="warning">
              {syncData ? 'No hay empleados activos en la empresa sincronizada.' : 'Primero vinculá tu empresa de Sueldos 360 en el tab "Vincular".'}
            </Alert>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">{employees.length} empleados activos</p>
                <span className="text-xs text-slate-400">Fuente: Sueldos 360 · {syncData?.company_name}</span>
              </div>
              <div className="space-y-2">
                {employees.map(emp => (
                  <Card key={emp.id} padding="sm" className="hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-violet-700 font-bold text-sm">{emp.apellido.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{emp.apellido}, {emp.nombre}</p>
                        <p className="text-xs text-slate-500">CUIL: {emp.cuil} · {emp.puesto || 'Sin puesto'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-slate-700">{formatCurrency(emp.sueldo_basico)}</p>
                        <p className="text-[10px] text-slate-400">sueldo básico</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ TAB: LIQUIDACIONES ══════════ */}
      {tab === 'liquidaciones' && (
        <div className="space-y-3">
          {payrolls.length === 0 ? (
            <Alert variant="warning">
              {syncData ? 'No hay liquidaciones registradas en Sueldos 360.' : 'Primero vinculá tu empresa de Sueldos 360 en el tab "Vincular".'}
            </Alert>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">Últimas {payrolls.length} liquidaciones</p>
                <span className="text-xs text-slate-400">Fuente: Sueldos 360</span>
              </div>
              <div className="space-y-2">
                {payrolls.map(pr => (
                  <Card key={pr.id} padding="sm">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-2 h-12 rounded-full flex-shrink-0',
                        pr.status === 'cerrada' ? 'bg-emerald-400' :
                        pr.status === 'calculada' ? 'bg-blue-400' :
                        'bg-amber-400')} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-slate-800">{pr.periodo}</p>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold',
                            pr.status === 'cerrada' ? 'bg-emerald-100 text-emerald-700' :
                            pr.status === 'calculada' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700')}>
                            {PAYROLL_STATUS_LABEL[pr.status] ?? pr.status}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">{pr.tipo}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                          <div>
                            <p className="text-slate-400">Bruto</p>
                            <p className="font-bold text-slate-700">{formatCurrency(pr.total_bruto)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Neto</p>
                            <p className="font-bold text-slate-700">{formatCurrency(pr.total_neto)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Contrib. patronal</p>
                            <p className="font-bold text-slate-700">{formatCurrency(pr.total_contribuciones_patronales)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {/* Totales */}
              {payrolls.length > 0 && (
                <Card padding="sm" className="bg-violet-50 border-violet-200">
                  <p className="text-xs font-bold text-violet-700 mb-2">Última liquidación — resumen</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-violet-500">Costo laboral total</p>
                      <p className="text-lg font-black text-violet-800">{formatCurrency(payrolls[0].total_costo_laboral)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-violet-500">Aportes trabajadores</p>
                      <p className="text-lg font-black text-violet-800">{formatCurrency(payrolls[0].total_aportes_trabajador)}</p>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════ TAB: F.931 ══════════ */}
      {tab === 'f931' && (
        <div className="space-y-3">
          <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl">
            <p className="text-xs text-violet-700">
              <strong>F.931</strong> es la declaración jurada de cargas sociales que los empleadores presentan mensualmente a ARCA (ex AFIP).
              Consolida los aportes de los trabajadores y las contribuciones patronales por SIPA, obra social y PAMI.
            </p>
          </div>
          {f931s.length === 0 ? (
            <Alert variant="warning">
              {syncData ? 'No hay formularios F.931 generados en Sueldos 360.' : 'Primero vinculá tu empresa de Sueldos 360 en el tab "Vincular".'}
            </Alert>
          ) : (
            <div className="space-y-2">
              {f931s.map(f => (
                <Card key={f.id} padding="sm">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-violet-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">F.931 — {f.periodo}</p>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold',
                          f.status === 'pagado' ? 'bg-emerald-100 text-emerald-700' :
                          f.status === 'presentado' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700')}>
                          {F931_STATUS_LABEL[f.status] ?? f.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{f.cantidad_empleados} empleados declarados</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-slate-400">Total remuneraciones</p>
                      <p className="font-bold text-slate-700">{formatCurrency(f.total_remuneraciones)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-slate-400">Aportes jubilatorios</p>
                      <p className="font-bold text-slate-700">{formatCurrency(f.total_aportes_jubilatorios)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-slate-400">Contrib. patronales</p>
                      <p className="font-bold text-slate-700">{formatCurrency(f.total_contribuciones_patronales)}</p>
                    </div>
                    <div className="bg-violet-50 rounded-lg p-2">
                      <p className="text-violet-500 font-semibold">TOTAL GENERAL</p>
                      <p className="font-black text-violet-800">{formatCurrency(f.total_general)}</p>
                    </div>
                  </div>
                  {f.presentado_at && (
                    <p className="text-[10px] text-slate-400 mt-2">Presentado: {formatDate(f.presentado_at)}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
