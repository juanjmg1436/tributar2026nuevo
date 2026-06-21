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
import { IIBB_ACTIVITIES } from '@/lib/constants/misiones'
import { Stamp, Plus, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import type { ProvSR341 } from '@/types/provincial'

export default function SR341Page() {
  const { user, loading: userLoading } = useUser()
  const { taxpayer, loading: tpLoading } = useProvincialTaxpayer(user?.id)
  const supabase = createClient()
  const [records, setRecords] = useState<ProvSR341[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const now = new Date()
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0')}`

  const [form, setForm] = useState({
    period: defaultPeriod,
    retained_cuit: '',
    retained_name: '',
    activity_code: '',
    gross_amount: '',
    rate: '3',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  async function load() {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('prov_sr341')
      .select('*')
      .eq('user_id', user!.id)
      .order('period', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function handleSave(status: 'draft' | 'submitted') {
    if (!user || !taxpayer) return
    setError(null)
    const grossAmount = parseFloat(form.gross_amount) || 0
    if (grossAmount <= 0) { setError('El importe bruto debe ser mayor a cero.'); return }
    if (!form.retained_cuit) { setError('Ingresá el CUIT del retenido.'); return }

    setSaving(true)
    try {
      const rate = parseFloat(form.rate) / 100
      const retainedAmount = grossAmount * rate
      const activity = IIBB_ACTIVITIES.find(a => a.code === form.activity_code)
      const db = supabase as any

      await db.from('prov_sr341').insert({
        user_id: user.id,
        taxpayer_id: taxpayer.id,
        period: form.period,
        retention_month: formatPeriodLabel(form.period),
        retained_cuit: form.retained_cuit,
        retained_name: form.retained_name,
        activity_code: form.activity_code,
        gross_amount: grossAmount,
        rate,
        retained_amount: retainedAmount,
        payment_date: form.payment_date,
        notes: form.notes || null,
        status,
      })

      // Create payment record for the deposit
      await db.from('prov_payments').insert({
        user_id: user.id,
        taxpayer_id: taxpayer.id,
        tax_type: 'sr341',
        concept: `SR-341 — Retención a ${form.retained_name || form.retained_cuit} (${formatPeriodLabel(form.period)})`,
        period: form.period,
        due_date: new Date(
          parseInt(form.period.split('-')[0]),
          parseInt(form.period.split('-')[1]),
          10
        ).toISOString().split('T')[0],
        amount: retainedAmount,
        surcharge: 0,
        total_amount: retainedAmount,
        status: 'pending',
      })

      setSuccess(`Retención registrada: ${formatCurrency(retainedAmount)}`)
      setShowForm(false)
      setForm(f => ({ ...f, retained_cuit: '', retained_name: '', gross_amount: '', notes: '' }))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const retainedAmount = (parseFloat(form.gross_amount) || 0) * (parseFloat(form.rate) / 100)
  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

  if (userLoading || tpLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer title="SR-341 — Agente de retención" subtitle="Formulario de retenciones de IIBB (simulación)">
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
          {/* Info box */}
          <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-semibold mb-1">¿Qué es el SR-341?</p>
              <p className="text-xs leading-relaxed">
                El <strong>formulario SR-341</strong> es el instrumento mediante el cual los agentes de retención del IIBB en Misiones
                informan y depositan las retenciones practicadas a sus proveedores y contratistas.
                Se presenta mensualmente antes del día 10 del mes siguiente al de las retenciones.
              </p>
            </div>
          </div>

          {error && <Alert variant="error" className="mb-4">{error}</Alert>}
          {success && <Alert variant="success" className="mb-4">{success}</Alert>}

          {/* Actions */}
          <div className="flex justify-between items-center mb-5">
            <p className="text-sm text-slate-600">{records.length} retenciones registradas</p>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 mr-1" /> Registrar retención
            </Button>
          </div>

          {/* Form */}
          {showForm && (
            <Card padding="md" className="mb-5 border-primary-200 bg-primary-50/20">
              <h3 className="font-semibold text-slate-700 mb-4 text-sm">Nueva retención — SR-341</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Período</label>
                  <input type="month" value={form.period} onChange={e => setForm(f => ({...f, period: e.target.value}))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fecha de pago al proveedor</label>
                  <input type="date" value={form.payment_date} onChange={e => setForm(f => ({...f, payment_date: e.target.value}))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>CUIT del retenido</label>
                  <input value={form.retained_cuit} onChange={e => setForm(f => ({...f, retained_cuit: e.target.value}))} className={inputCls} placeholder="XX-XXXXXXXX-X" />
                </div>
                <div>
                  <label className={labelCls}>Nombre / Razón social del retenido</label>
                  <input value={form.retained_name} onChange={e => setForm(f => ({...f, retained_name: e.target.value}))} className={inputCls} placeholder="Nombre del proveedor" />
                </div>
                <div>
                  <label className={labelCls}>Actividad</label>
                  <select value={form.activity_code} onChange={e => setForm(f => ({...f, activity_code: e.target.value}))} className={inputCls}>
                    <option value="">Sin especificar</option>
                    {IIBB_ACTIVITIES.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Alícuota de retención (%)</label>
                  <select value={form.rate} onChange={e => setForm(f => ({...f, rate: e.target.value}))} className={inputCls}>
                    <option value="1">1%</option>
                    <option value="1.5">1,5%</option>
                    <option value="2">2%</option>
                    <option value="2.5">2,5%</option>
                    <option value="3">3%</option>
                    <option value="3.5">3,5%</option>
                    <option value="4">4%</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Importe bruto pagado ($)</label>
                  <input type="number" value={form.gross_amount} onChange={e => setForm(f => ({...f, gross_amount: e.target.value}))} className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelCls}>Retención calculada</label>
                  <div className="px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg text-sm font-bold text-primary-700">
                    {formatCurrency(retainedAmount)}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Observaciones (opcional)</label>
                  <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className={inputCls} placeholder="Notas adicionales" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button size="sm" variant="outline" onClick={() => handleSave('draft')} loading={saving}>Guardar borrador</Button>
                <Button size="sm" onClick={() => handleSave('submitted')} loading={saving}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Presentar SR-341
                </Button>
              </div>
            </Card>
          )}

          {/* Records */}
          {records.length === 0 ? (
            <Card padding="lg" className="text-center">
              <Stamp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Sin retenciones registradas.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {records.map(r => (
                <Card key={r.id} padding="md">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-800 text-sm">{r.retained_name || r.retained_cuit}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'submitted' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                          {r.status === 'submitted' ? 'Presentado' : 'Borrador'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">CUIT: {r.retained_cuit} · Período: {r.retention_month}</p>
                      <p className="text-xs text-slate-500">Importe bruto: {formatCurrency(r.gross_amount)} · Alíc.: {(r.rate * 100).toFixed(1)}%</p>
                      <p className="text-xs text-slate-500">Pago al proveedor: {formatDate(r.payment_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Retención</p>
                      <p className="text-lg font-bold text-primary-700">{formatCurrency(r.retained_amount)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Summary if records exist */}
          {records.length > 0 && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs text-slate-500">
                <strong>Total retenido acumulado:</strong>{' '}
                {formatCurrency(records.reduce((s, r) => s + r.retained_amount, 0))}
                {' '}·{' '}
                <strong>Pendiente de presentar:</strong>{' '}
                {records.filter(r => r.status === 'draft').length} retención/es
              </p>
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}
