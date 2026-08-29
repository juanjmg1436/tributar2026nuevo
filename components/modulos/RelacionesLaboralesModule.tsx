'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useUser } from '@/hooks/useUser'
import { useBilletera } from '@/hooks/useBilletera'
import { BilleteraFiscal } from '@/components/BilleteraFiscal'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import {
  Users, Link2, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink,
  TrendingUp, FileText, Info, XCircle, UserPlus, UserMinus,
  CreditCard, Clock, CheckCircle, Lock,
} from 'lucide-react'

type Tab = 'vincular' | 'empleados' | 'liquidaciones' | 'f931'
type TabDef = { id: Tab; label: string; icon: React.ReactNode; locked: boolean; lockReason?: string }

interface S360Employee {
  id: string; apellido: string; nombre: string; cuil: string
  puesto?: string; sueldo_basico: number; status: string
  fecha_ingreso?: string; jornada?: string; modalidad?: string
}
interface S360Payroll {
  id: string; periodo: string; tipo: string; status: string
  total_bruto: number; total_neto: number
  total_contribuciones_patronales: number; total_aportes_trabajador: number
  total_costo_laboral: number; fecha_pago?: string
}
interface S360F931 {
  id: string; periodo: string; cantidad_empleados: number
  total_remuneraciones: number; total_aportes_jubilatorios: number
  total_contribuciones_patronales: number; total_general: number
  status: string; presentado_at?: string; pagado_at?: string
}
interface SyncData {
  s360_company_id: string; company_name: string; company_cuit: string
  employee_count: number
  employees_json: S360Employee[]; payroll_runs_json: S360Payroll[]; f931_json: S360F931[]
  last_period: string | null; total_bruto: number; total_neto: number
  total_contribuciones: number; synced_at: string
}
interface VepRecord {
  id: string; periodo: string; total_amount: number; due_date: string
  vep_number: string; status: string; paid_at?: string; comprobante_number?: string
}

const PAYROLL_LABELS: Record<string, string> = {
  borrador: 'Borrador', calculada: 'Calculada', cerrada: 'Cerrada', rectificada: 'Rectificada',
}
const F931_LABELS: Record<string, string> = {
  borrador: 'Borrador', presentado: 'Presentado', pagado: 'Pagado', rectificativo: 'Rectificativo',
}
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmtPeriod(p: string) {
  const [y, m] = p.split('-')
  return `${MONTHS[parseInt(m) - 1]} ${y}`
}

function vepDueDate(periodo: string, cuit: string) {
  const [y, m] = periodo.split('-').map(Number)
  const nm = m === 12 ? 1 : m + 1
  const ny = m === 12 ? y + 1 : y
  const last = parseInt(cuit.replace(/\D/g, '').slice(-1) || '0')
  const day = 10 + Math.floor(last / 2)
  return `${ny}-${String(nm).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

const EMPTY_ALTA = {
  apellido: '', nombre: '', cuil: '', puesto: '',
  sueldo_basico: '', fecha_ingreso: '', jornada: 'completa', modalidad: 'mensual',
}

export function RelacionesLaboralesModule() {
  const { user } = useUser()
  const supabase = createClient()
  const { balance, debitarPago, reload: reloadBilletera } = useBilletera()

  const [tab, setTab]           = useState<Tab>('vincular')
  const [loading, setLoading]   = useState(true)
  const [syncing, setSyncing]   = useState(false)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)
  const [saldoInsuficiente, setSaldoInsuficiente] = useState<number | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [syncData, setSyncData] = useState<SyncData | null>(null)
  const [veps, setVeps]         = useState<VepRecord[]>([])
  const [showAlta, setShowAlta] = useState(false)
  const [altaForm, setAltaForm] = useState({ ...EMPTY_ALTA })
  const [bajaTarget, setBajaTarget] = useState<S360Employee | null>(null)

  // ── carga inicial ──────────────────────────────────────────────────────────
  const loadVeps = useCallback(async (companyId: string) => {
    if (!user) return
    const { data } = await (supabase as any)
      .from('cargas_sociales_veps')
      .select('*')
      .eq('user_id', user.id)
      .eq('s360_company_id', companyId)
    setVeps(data || [])
  }, [user])

  async function init() {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('sueldos360_imports').select('*')
      .eq('user_id', user!.id).maybeSingle()
    if (data) {
      setSyncData(data)
      await loadVeps(data.s360_company_id)
      setTab('empleados')
    }
    setLoading(false)
  }

  useEffect(() => { if (user) init() }, [user])

  // ── auth helper ───────────────────────────────────────────────────────────
  async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    return session
      ? { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' }
  }

  // ── sync ──────────────────────────────────────────────────────────────────
  async function handleSync() {
    if (!tokenInput.trim()) { setError('Ingresá el código de sincronización.'); return }
    setSyncing(true); setError(null)
    try {
      const res = await fetch(
        `/api/sueldos-sync?action=sync&token=${encodeURIComponent(tokenInput.trim())}`,
        { headers: await authHeaders() },
      )
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Error al sincronizar'); return }
      setSuccess(`¡Conectado! ${json.employee_count} empleados importados.`)
      await init()
    } catch { setError('Error de red.') } finally { setSyncing(false) }
  }

  async function handleClear() {
    await Promise.all([
      (supabase as any).from('sueldos360_imports').delete().eq('user_id', user!.id),
      (supabase as any).from('cargas_sociales_veps').delete().eq('user_id', user!.id),
    ])
    setSyncData(null); setVeps([]); setTab('vincular'); setTokenInput('')
    setSuccess('Vinculación eliminada.')
  }

  // ── alta empleado ─────────────────────────────────────────────────────────
  async function handleAlta() {
    if (!syncData) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/sueldos-sync', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          action: 'alta-empleado',
          companyId: syncData.s360_company_id,
          ...altaForm,
          sueldo_basico: Number(altaForm.sueldo_basico),
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Error al dar de alta'); return }
      setSuccess(`Alta registrada: ${altaForm.apellido}, ${altaForm.nombre}`)
      setShowAlta(false); setAltaForm({ ...EMPTY_ALTA })
      await init()
    } catch { setError('Error de red.') } finally { setBusy(false) }
  }

  // ── baja empleado ─────────────────────────────────────────────────────────
  async function handleBaja(emp: S360Employee) {
    if (!syncData) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/sueldos-sync', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          action: 'baja-empleado',
          companyId: syncData.s360_company_id,
          employeeId: emp.id,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Error al dar de baja'); return }
      setSuccess(`Baja registrada: ${emp.apellido}, ${emp.nombre}`)
      setBajaTarget(null)
      await init()
    } catch { setError('Error de red.') } finally { setBusy(false) }
  }

  // ── VEP ───────────────────────────────────────────────────────────────────
  async function handleGenerateVep(f: S360F931) {
    if (!syncData || !user) return
    setBusy(true)
    const vepNumber = `VEP-${f.periodo.replace('-','')}-${Math.floor(Math.random()*900000+100000)}`
    const dueDate   = vepDueDate(f.periodo, syncData.company_cuit)
    await (supabase as any).from('cargas_sociales_veps').upsert({
      user_id: user.id, s360_company_id: syncData.s360_company_id,
      periodo: f.periodo, total_amount: f.total_general,
      due_date: dueDate, vep_number: vepNumber, status: 'pendiente',
    }, { onConflict: 'user_id,s360_company_id,periodo' })
    await loadVeps(syncData.s360_company_id)
    setSuccess(`VEP generado para ${fmtPeriod(f.periodo)}`)
    setBusy(false)
  }

  async function handlePayVep(vep: VepRecord) {
    if (!user) return
    if (balance < vep.total_amount) { setSaldoInsuficiente(vep.total_amount - balance); return }
    setSaldoInsuficiente(null)
    setBusy(true)
    const comprobante = `F931-${vep.periodo.replace('-','')}-${Math.floor(Math.random()*90000+10000)}`
    await (supabase as any).from('cargas_sociales_veps').update({
      status: 'pagado', paid_at: new Date().toISOString(), comprobante_number: comprobante,
    }).eq('id', vep.id)
    await debitarPago(
      vep.total_amount,
      `F.931 — ${vep.periodo} (${syncData?.company_name ?? ''})`,
      comprobante,
      'homebanking',
    )
    await loadVeps(syncData!.s360_company_id)
    setSuccess(`Pago registrado — Comprobante ${comprobante}`)
    setBusy(false)
  }

  const employees    = syncData?.employees_json    || []
  const payrolls     = syncData?.payroll_runs_json || []
  const f931s        = syncData?.f931_json         || []
  const isLinked     = !!syncData
  const hasEmployees = employees.length > 0

  const TABS: TabDef[] = [
    { id: 'vincular',      label: 'Vincular',      icon: <Link2      className="w-3.5 h-3.5" />, locked: false },
    { id: 'empleados',     label: 'Empleados',     icon: <Users      className="w-3.5 h-3.5" />, locked: false },
    {
      id: 'liquidaciones', label: 'Liquidaciones', icon: <TrendingUp className="w-3.5 h-3.5" />,
      locked: !hasEmployees,
      lockReason: isLinked ? 'Primero registrá al menos un empleado activo.' : 'Primero vinculá tu empresa en Sueldos 360.',
    },
    {
      id: 'f931',          label: 'F.931 / VEP',   icon: <FileText   className="w-3.5 h-3.5" />,
      locked: !hasEmployees,
      lockReason: isLinked ? 'Primero registrá al menos un empleado activo.' : 'Primero vinculá tu empresa en Sueldos 360.',
    },
  ]

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">

      {/* disclaimer */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex gap-2 items-center flex-wrap">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium">SIMULADOR DIDÁCTICO — SIN VALIDEZ FISCAL NI LEGAL</p>
        <a href="https://sueldos360.vercel.app/dashboard" target="_blank" rel="noreferrer"
          className="ml-auto text-xs font-semibold text-violet-700 hover:underline flex items-center gap-1">
          Ir a Sueldos 360 <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id}
            onClick={() => { if (!t.locked) setTab(t.id) }}
            title={t.locked ? t.lockReason : undefined}
            aria-disabled={t.locked}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
              tab === t.id && !t.locked ? 'bg-white text-slate-800 shadow-sm' :
              t.locked ? 'text-slate-300 cursor-not-allowed select-none' :
              'text-slate-500 hover:text-slate-700',
            )}>
            {t.locked ? <Lock className="w-3.5 h-3.5" /> : t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {error   && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* ══ VINCULAR ══════════════════════════════════════════════════════════ */}
      {tab === 'vincular' && (
        <div className="space-y-4">
          <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl flex gap-3">
            <Info className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-violet-700 leading-relaxed">
              <p className="font-bold mb-1">Cómo vincular con Sueldos 360</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Andá a <a href="https://sueldos360.vercel.app/dashboard/empresas" target="_blank" className="underline font-semibold">Sueldos 360 → Empresas</a></li>
                <li>Copiá el <strong>Código de sincronización</strong> de la tarjeta violeta</li>
                <li>Pegalo abajo y hacé click en <strong>Sincronizar</strong></li>
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
                    <p className="text-xs text-emerald-600">CUIT: {syncData.company_cuit} · Sync: {formatDate(syncData.synced_at)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleClear} className="text-xs">
                    <XCircle className="w-3 h-3 mr-1" /> Desvincular
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Empleados', val: String(syncData.employee_count) },
                    { label: 'Último bruto', val: formatCurrency(syncData.total_bruto) },
                    { label: 'Período', val: syncData.last_period ?? '—' },
                  ].map(s => (
                    <div key={s.label} className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-400 mb-0.5">{s.label}</p>
                      <p className="text-sm font-black text-slate-700">{s.val}</p>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline" onClick={init} className="w-full text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" /> Actualizar datos
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Código de sincronización</label>
                  <input type="text" value={tokenInput}
                    onChange={e => setTokenInput(e.target.value.toUpperCase())}
                    placeholder="Ej: A3F7B2C1" maxLength={10}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-violet-500" />
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

      {/* ══ EMPLEADOS ════════════════════════════════════════════════════════ */}
      {tab === 'empleados' && (
        <div className="space-y-3">
          <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl text-xs text-violet-700">
            <strong>Alta (F2/45):</strong> la empresa tiene <strong>24 hs</strong> para notificar el alta a ARCA antes del inicio de tareas.
            La <strong>baja (F2/46)</strong> debe comunicarse dentro de los <strong>5 días hábiles</strong> del cese.
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">{employees.length} empleados activos</p>
            {syncData && (
              <Button size="sm" onClick={() => setShowAlta(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Nueva alta
              </Button>
            )}
          </div>

          {employees.length === 0 ? (
            <Alert variant="warning">
              {syncData ? 'No hay empleados activos.' : 'Primero vinculá tu empresa en "Vincular".'}
            </Alert>
          ) : (
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
                      {emp.fecha_ingreso && (
                        <p className="text-[10px] text-slate-400">Ingreso: {formatDate(emp.fecha_ingreso)}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <p className="text-sm font-bold text-slate-700">{formatCurrency(emp.sueldo_basico)}</p>
                      <button onClick={() => { setError(null); setBajaTarget(emp) }}
                        className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5 font-semibold">
                        <UserMinus className="w-3 h-3" /> Dar de baja
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ LIQUIDACIONES ════════════════════════════════════════════════════ */}
      {tab === 'liquidaciones' && (
        <div className="space-y-3">
          {!hasEmployees ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <Lock className="w-7 h-7 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Sin empleados registrados</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  {isLinked
                    ? 'No podés liquidar sueldos si no hay empleados dados de alta. Registrá al menos uno en la solapa Empleados.'
                    : 'Primero vinculá tu empresa en Sueldos 360 y registrá empleados.'}
                </p>
              </div>
              <button
                onClick={() => setTab('empleados')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors">
                <UserPlus className="w-3.5 h-3.5" />
                {isLinked ? 'Ir a Empleados' : 'Vincular empresa'}
              </button>
            </div>
          ) : payrolls.length === 0 ? (
            <Alert variant="warning">No hay liquidaciones en Sueldos 360.</Alert>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-700">Últimas {payrolls.length} liquidaciones</p>
              {payrolls.map(pr => (
                <Card key={pr.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-2 h-12 rounded-full flex-shrink-0',
                      pr.status === 'cerrada' ? 'bg-emerald-400' : pr.status === 'calculada' ? 'bg-blue-400' : 'bg-amber-400')} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-slate-800">{fmtPeriod(pr.periodo)}</p>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold',
                          pr.status === 'cerrada' ? 'bg-emerald-100 text-emerald-700' :
                          pr.status === 'calculada' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700')}>
                          {PAYROLL_LABELS[pr.status] ?? pr.status}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">{pr.tipo}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div><p className="text-slate-400">Bruto</p><p className="font-bold text-slate-700">{formatCurrency(pr.total_bruto)}</p></div>
                        <div><p className="text-slate-400">Neto</p><p className="font-bold text-slate-700">{formatCurrency(pr.total_neto)}</p></div>
                        <div><p className="text-slate-400">Contrib. patron.</p><p className="font-bold text-slate-700">{formatCurrency(pr.total_contribuciones_patronales)}</p></div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
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
            </>
          )}
        </div>
      )}

      {/* ══ F.931 / VEP ══════════════════════════════════════════════════════ */}
      {tab === 'f931' && (
        <div className="space-y-3">
          {!hasEmployees ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <Lock className="w-7 h-7 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Sin empleados registrados</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  {isLinked
                    ? 'No podés generar el F.931 sin empleados dados de alta. La declaración de cargas sociales requiere al menos un trabajador activo.'
                    : 'Primero vinculá tu empresa en Sueldos 360 y registrá empleados.'}
                </p>
              </div>
              <button
                onClick={() => setTab('empleados')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors">
                <UserPlus className="w-3.5 h-3.5" />
                {isLinked ? 'Ir a Empleados' : 'Vincular empresa'}
              </button>
            </div>
          ) : (
          <>
          <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl text-xs text-violet-700">
            <strong>F.931</strong> — DDJJ mensual de cargas sociales. Al presentarla en ARCA, se genera un
            <strong> VEP</strong> para abonar entre los días 10 y 14 del mes siguiente (según último dígito del CUIT).
            Código de concepto: <strong>354</strong>.
          </div>

          {f931s.length === 0 ? (
            <Alert variant="warning">No hay F.931 en Sueldos 360.</Alert>
          ) : (
            <div className="space-y-3">
              {f931s.map(f => {
                const vep = veps.find(v => v.periodo === f.periodo)
                return (
                  <Card key={f.id} padding="sm">
                    {/* encabezado */}
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-violet-600 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800">F.931 — {fmtPeriod(f.periodo)}</p>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold',
                            f.status === 'pagado' ? 'bg-emerald-100 text-emerald-700' :
                            f.status === 'presentado' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700')}>
                            {F931_LABELS[f.status] ?? f.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{f.cantidad_empleados} empleados declarados</p>
                      </div>
                    </div>

                    {/* importes */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] mb-3">
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
                        <p className="text-violet-500 font-semibold">TOTAL A PAGAR</p>
                        <p className="font-black text-violet-800">{formatCurrency(f.total_general)}</p>
                      </div>
                    </div>

                    {/* VEP */}
                    {!vep ? (
                      <Button size="sm" onClick={() => handleGenerateVep(f)} loading={busy}
                        className="w-full text-xs bg-violet-600 hover:bg-violet-700 text-white">
                        <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Generar VEP
                      </Button>
                    ) : vep.status === 'pendiente' ? (
                      <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-amber-800">VEP PENDIENTE — {vep.vep_number}</p>
                            <p className="text-[10px] text-amber-600">
                              Vence: {formatDate(vep.due_date)} · {formatCurrency(vep.total_amount)}
                            </p>
                          </div>
                        </div>
                        <BilleteraFiscal compact montoSugerido={vep.total_amount - balance} onSaldoCargado={() => { reloadBilletera(); setSaldoInsuficiente(null) }} />
                        {balance < vep.total_amount && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-[10px] font-bold text-red-700">
                              Saldo insuficiente — faltan {formatCurrency(vep.total_amount - balance)}
                            </p>
                            <p className="text-[10px] text-red-600 mt-0.5">
                              Mora por pago tardío del F.931: <strong>interés resarcitorio 3% mensual</strong> (0,1% diario) — Art. 37 Ley 11.683
                            </p>
                          </div>
                        )}
                        <Button size="sm" onClick={() => handlePayVep(vep)} loading={busy} disabled={balance < vep.total_amount}
                          className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Pagar VEP — {formatCurrency(vep.total_amount)}
                        </Button>
                      </div>
                    ) : (
                      <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-emerald-800">PAGADO — {vep.comprobante_number}</p>
                            <p className="text-[10px] text-emerald-600">
                              {vep.paid_at ? formatDate(vep.paid_at) : ''} · {formatCurrency(vep.total_amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
          </>
          )}
        </div>
      )}

      {/* ══ MODAL ALTA ════════════════════════════════════════════════════════ */}
      {showAlta && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-slate-800">Alta de empleado</p>
                <p className="text-xs text-slate-400">Comunicación a ARCA — F2/45</p>
              </div>
              <button onClick={() => { setShowAlta(false); setAltaForm({ ...EMPTY_ALTA }); setError(null) }}>
                <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {(['apellido','nombre'] as const).map(k => (
                  <div key={k}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 capitalize">{k} *</label>
                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      value={altaForm[k]} onChange={e => setAltaForm(f => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">CUIL *</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="XX-XXXXXXXX-X" value={altaForm.cuil}
                  onChange={e => setAltaForm(f => ({ ...f, cuil: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Puesto / Función</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={altaForm.puesto} onChange={e => setAltaForm(f => ({ ...f, puesto: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Sueldo básico ($) *</label>
                <input type="number" min="0" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={altaForm.sueldo_basico}
                  onChange={e => setAltaForm(f => ({ ...f, sueldo_basico: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de ingreso</label>
                <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={altaForm.fecha_ingreso}
                  onChange={e => setAltaForm(f => ({ ...f, fecha_ingreso: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jornada</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={altaForm.jornada} onChange={e => setAltaForm(f => ({ ...f, jornada: e.target.value }))}>
                    <option value="completa">Completa</option>
                    <option value="parcial">Parcial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Modalidad</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={altaForm.modalidad} onChange={e => setAltaForm(f => ({ ...f, modalidad: e.target.value }))}>
                    <option value="mensual">Mensual</option>
                    <option value="jornal">Jornal</option>
                    <option value="quincenal">Quincenal</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <strong>Recordatorio legal:</strong> El alta en ARCA debe comunicarse <em>antes</em> del inicio
                de las tareas. El CUIL debe estar activo en ANSES.
              </div>

              {error && <Alert variant="error">{error}</Alert>}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1"
                  onClick={() => { setShowAlta(false); setAltaForm({ ...EMPTY_ALTA }); setError(null) }}>
                  Cancelar
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  loading={busy} onClick={handleAlta}
                  disabled={!altaForm.apellido || !altaForm.nombre || !altaForm.cuil || !altaForm.sueldo_basico}>
                  <UserPlus className="w-4 h-4 mr-1" /> Confirmar alta
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL BAJA ════════════════════════════════════════════════════════ */}
      {bajaTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <UserMinus className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Confirmar baja</p>
                <p className="text-xs text-slate-500">{bajaTarget.apellido}, {bajaTarget.nombre} · CUIL {bajaTarget.cuil}</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              La comunicación de baja a ARCA (F2/46) debe realizarse dentro de los
              <strong> 5 días hábiles</strong> posteriores al cese de la relación laboral.
              El incumplimiento genera multas.
            </div>
            {error && <Alert variant="error">{error}</Alert>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setBajaTarget(null); setError(null) }}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                loading={busy} onClick={() => handleBaja(bajaTarget)}>
                <UserMinus className="w-4 h-4 mr-1" /> Confirmar baja
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
