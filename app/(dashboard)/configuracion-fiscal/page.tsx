'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { DEFAULT_PARAMS } from '@/lib/fiscal-engine/defaults'
import type { FiscalParameter } from '@/types/fiscal'
import { AlertTriangle, Settings, RefreshCw, RotateCcw, Save } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  iva: 'IVA',
  ganancias: 'Ganancias',
  monotributo: 'Monotributo',
  cargas_sociales: 'Cargas Sociales',
  mora: 'Mora y Multas',
  general: 'General',
}

export default function ConfiguracionFiscalPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [params, setParams] = useState<FiscalParameter[]>([])
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [activeCategory, setActiveCategory] = useState<string>('iva')

  useEffect(() => { if (!user) return; loadParams() }, [user])

  async function loadParams() {
    setLoading(true)
    const { data } = await (supabase as any).from('fiscal_parameters').select('*').order('category').order('param_name')
    const rows: FiscalParameter[] = data || []
    setParams(rows)
    const vals: Record<string, string> = {}
    for (const r of rows) {
      if (r.value_decimal !== null) vals[r.param_key] = String(r.value_decimal)
      else if (r.value_text !== null) vals[r.param_key] = r.value_text
    }
    setEditValues(vals)
    setLoading(false)
  }

  async function handleSave(param: FiscalParameter) {
    setSaving(param.param_key); setError(null)
    try {
      const newVal = parseFloat(editValues[param.param_key])
      if (isNaN(newVal)) { setError('Valor inválido.'); setSaving(null); return }
      const { error: err } = await (supabase as any)
        .from('fiscal_parameters')
        .update({ value_decimal: newVal })
        .eq('id', param.id)
      if (err) throw new Error(err.message)
      setSuccess(`"${param.param_name}" actualizado a ${newVal}.`)
      await loadParams()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar') }
    finally { setSaving(null) }
  }

  async function handleReset(param: FiscalParameter) {
    const defaultVal = (DEFAULT_PARAMS as any)[param.param_key]
    if (defaultVal === undefined) return
    setEditValues(v => ({ ...v, [param.param_key]: String(defaultVal) }))
    setSaving(param.param_key); setError(null)
    try {
      await (supabase as any).from('fiscal_parameters').update({ value_decimal: defaultVal }).eq('id', param.id)
      setSuccess(`"${param.param_name}" restaurado al valor por defecto (${defaultVal}).`)
      await loadParams()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(null) }
  }

  async function handleResetAll() {
    if (!confirm('¿Restaurar TODOS los parámetros a sus valores por defecto?')) return
    setSaving('all'); setError(null)
    try {
      const db = supabase as any
      for (const param of params) {
        const defaultVal = (DEFAULT_PARAMS as any)[param.param_key]
        if (defaultVal !== undefined) {
          await db.from('fiscal_parameters').update({ value_decimal: defaultVal }).eq('id', param.id)
        }
      }
      setSuccess('Todos los parámetros restaurados a sus valores por defecto.')
      await loadParams()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(null) }
  }

  const categories = [...new Set(params.map(p => p.category))]
  const filtered = params.filter(p => p.category === activeCategory && p.editable_by_teacher)

  const formatDefault = (key: string) => {
    const v = (DEFAULT_PARAMS as any)[key]
    if (v === undefined) return '—'
    if (v < 1 && v > 0) return `${Math.round(v * 100)}% (${v})`
    return String(v)
  }

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer title="Configuración fiscal (Docente)" subtitle="Parámetros tributarios editables para simulación didáctica">
      {/* Disclaimer */}
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium">PANEL DOCENTE — Los cambios afectan todos los cálculos del simulador para este usuario</p>
      </div>

      <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Panel docente:</strong> Aquí podés modificar las alícuotas y parámetros fiscales que usa el simulador.
          Esto permite crear escenarios didácticos personalizados:
          simular cambios de alícuota de IVA, modificar el MNI de Ganancias, ajustar cargas sociales, etc.
          Los cambios se reflejan en tiempo real en todos los módulos de cálculo.
          Los valores por defecto corresponden a las tasas vigentes en Argentina (2026).
        </p>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      {/* Tabs por categoría */}
      <div className="flex flex-wrap gap-1 mb-5 bg-slate-100 rounded-xl p-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeCategory === cat ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
        <button onClick={loadParams} className="ml-auto p-1.5 text-slate-400 hover:text-slate-600"><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>

      {/* Parámetros de la categoría */}
      <Card padding="md" className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-700">{CATEGORY_LABELS[activeCategory] || activeCategory}</p>
            <span className="text-xs text-slate-400">({filtered.length} parámetros)</span>
          </div>
          <Button size="sm" variant="outline" onClick={handleResetAll} loading={saving === 'all'}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset todo
          </Button>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No hay parámetros editables en esta categoría.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(param => {
              const defaultVal = (DEFAULT_PARAMS as any)[param.param_key]
              const currentVal = parseFloat(editValues[param.param_key] || '0')
              const isChanged = defaultVal !== undefined && Math.abs(currentVal - defaultVal) > 0.0001
              return (
                <div key={param.id} className={`p-3 rounded-xl border ${isChanged ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm font-semibold text-slate-800">{param.param_name}</p>
                      {param.description && <p className="text-xs text-slate-500 mt-0.5">{param.description}</p>}
                      <div className="flex gap-3 mt-1 text-[10px] text-slate-400">
                        <span>Tipo: {param.param_type}</span>
                        <span>Por defecto: {formatDefault(param.param_key)}</span>
                        {isChanged && <span className="text-amber-600 font-semibold">⚠ Modificado</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step={param.param_type === 'rate' ? '0.001' : '1'}
                        value={editValues[param.param_key] || ''}
                        onChange={e => setEditValues(v => ({ ...v, [param.param_key]: e.target.value }))}
                        className="w-32 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSave(param)}
                        loading={saving === param.param_key}
                      >
                        <Save className="w-3.5 h-3.5" />
                      </Button>
                      {isChanged && defaultVal !== undefined && (
                        <button
                          onClick={() => handleReset(param)}
                          title="Restaurar default"
                          className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Indicador visual para alícuotas */}
                  {param.param_type === 'rate' && currentVal > 0 && currentVal < 1 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>0%</span>
                        <span className="font-semibold text-slate-600">{Math.round(currentVal * 100)}%</span>
                        <span>50%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(currentVal * 200, 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Categorías monotributo */}
      <Card padding="md" className="mb-5">
        <p className="text-sm font-semibold text-slate-700 mb-3">Categorías Monotributo (demo 2026)</p>
        <p className="text-xs text-slate-500 mb-3">
          Los valores de las categorías se editan directamente en la base de datos.
          Aquí podés ver la tabla actual. Para modificar, usar el panel de Supabase o una migración SQL.
        </p>
        <MonotributoCategoriesTable supabase={supabase} />
      </Card>

      {/* Escenarios pedagógicos predefinidos */}
      <Card padding="md" className="mb-5">
        <p className="text-sm font-semibold text-slate-700 mb-3">Escenarios pedagógicos rápidos</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              title: 'Escenario: Crisis fiscal',
              desc: 'Sube mora al 5% y multa al 75% — simula presión tributaria en contexto de alta inflación.',
              params: { mora_tasa_mensual: 0.05, multa_omision_pct: 0.75 },
            },
            {
              title: 'Escenario: Reforma IVA diferencial',
              desc: 'Baja IVA diferencial al 5% — simula beneficio para sectores priorizados.',
              params: { iva_diferencial: 0.05 },
            },
            {
              title: 'Escenario: Aumento cargas',
              desc: 'Sube jubilación empleador al 20% — simula mayor presión sobre el empleo formal.',
              params: { jubilacion_empleador: 0.20 },
            },
          ].map(scenario => (
            <div key={scenario.title} className="p-3 border border-slate-200 rounded-xl">
              <p className="text-xs font-bold text-slate-700 mb-1">{scenario.title}</p>
              <p className="text-xs text-slate-500 mb-3">{scenario.desc}</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={async () => {
                  setSaving('scenario'); setError(null)
                  try {
                    const db = supabase as any
                    for (const [key, val] of Object.entries(scenario.params)) {
                      await db.from('fiscal_parameters').update({ value_decimal: val }).eq('param_key', key)
                    }
                    setSuccess(`Escenario "${scenario.title}" aplicado.`)
                    await loadParams()
                  } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
                  finally { setSaving(null) }
                }}
                loading={saving === 'scenario'}
              >
                Aplicar escenario
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </PageContainer>
  )
}

function MonotributoCategoriesTable({ supabase }: { supabase: any }) {
  const [cats, setCats] = useState<any[]>([])
  useEffect(() => {
    ;(supabase as any).from('monotributo_demo_categories').select('*').eq('is_active', true).order('max_annual_income').then(({ data }: any) => setCats(data || []))
  }, [])

  const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="text-left py-1.5 px-2">Cat.</th>
            <th className="text-right py-1.5 px-2">Límite anual</th>
            <th className="text-right py-1.5 px-2">Imp. servicios</th>
            <th className="text-right py-1.5 px-2">SIPA</th>
            <th className="text-right py-1.5 px-2">OS</th>
            <th className="text-right py-1.5 px-2">Total servicios</th>
            <th className="text-right py-1.5 px-2">Total bienes</th>
          </tr>
        </thead>
        <tbody>
          {cats.map(c => (
            <tr key={c.id} className="border-b border-slate-100">
              <td className="py-1 px-2 font-bold">{c.category_code}</td>
              <td className="py-1 px-2 text-right">{fmt(c.max_annual_income)}</td>
              <td className="py-1 px-2 text-right">{fmt(c.monthly_tax_services)}</td>
              <td className="py-1 px-2 text-right">{fmt(c.monthly_sipa)}</td>
              <td className="py-1 px-2 text-right">{fmt(c.monthly_obra_social)}</td>
              <td className="py-1 px-2 text-right font-semibold text-primary-700">{fmt(c.monthly_total_services)}</td>
              <td className="py-1 px-2 text-right font-semibold text-slate-700">{fmt(c.monthly_total_goods)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
