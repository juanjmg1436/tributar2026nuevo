'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ShoppingCart, Plus, Trash2, AlertTriangle, RefreshCw, Info } from 'lucide-react'
import type { Purchase } from '@/types/fiscal'

const currentPeriod = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function ComprasPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterPeriod, setFilterPeriod] = useState(currentPeriod())

  const [form, setForm] = useState({
    purchase_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    supplier_cuit: '',
    invoice_type: 'A' as Purchase['invoice_type'],
    invoice_number: '',
    concept: '',
    subtotal: '',
    iva_rate: '0.21',
    is_iva_computable: true,
    notes: '',
  })

  useEffect(() => { if (!user) return; load() }, [user, filterPeriod])

  async function load() {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('purchases')
      .select('*')
      .eq('user_id', user!.id)
      .eq('period', filterPeriod)
      .eq('status', 'active')
      .order('purchase_date', { ascending: false })
    setPurchases(data || [])
    setLoading(false)
  }

  const subtotal = parseFloat(form.subtotal) || 0
  const ivaRate = parseFloat(form.iva_rate) || 0
  const ivaAmount = form.invoice_type === 'A' ? Math.round(subtotal * ivaRate * 100) / 100 : 0
  const total = subtotal + ivaAmount

  async function handleSave() {
    if (!user) return
    if (!form.supplier_name.trim()) { setError('Ingresá el nombre del proveedor.'); return }
    if (!form.concept.trim()) { setError('Ingresá el concepto de la compra.'); return }
    if (subtotal <= 0) { setError('El subtotal debe ser mayor a cero.'); return }
    setSaving(true); setError(null)
    try {
      const db = supabase as any
      const { error: err } = await db.from('purchases').insert({
        user_id: user.id,
        period: filterPeriod,
        purchase_date: form.purchase_date,
        supplier_name: form.supplier_name,
        supplier_cuit: form.supplier_cuit || null,
        invoice_type: form.invoice_type,
        invoice_number: form.invoice_number || null,
        concept: form.concept,
        subtotal,
        iva_rate: ivaRate,
        iva_amount: ivaAmount,
        total,
        is_iva_computable: form.is_iva_computable,
        notes: form.notes || null,
      })
      if (err) throw new Error(err.message)
      setShowForm(false)
      setForm(f => ({ ...f, supplier_name: '', supplier_cuit: '', invoice_number: '', concept: '', subtotal: '', notes: '' }))
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  async function handleCancel(id: string) {
    await (supabase as any).from('purchases').update({ status: 'cancelled' }).eq('id', id)
    await load()
  }

  const totals = {
    subtotal: purchases.reduce((s, p) => s + p.subtotal, 0),
    iva: purchases.reduce((s, p) => s + p.iva_amount, 0),
    total: purchases.reduce((s, p) => s + p.total, 0),
    ivaComputable: purchases.filter(p => p.is_iva_computable).reduce((s, p) => s + p.iva_amount, 0),
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  // Generate period options (last 6 months)
  const periodOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return { value: val, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` }
  })

  return (
    <PageContainer title="Compras y gastos" subtitle="Libro de compras y crédito fiscal IVA (simulación didáctica)">
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium">SIMULADOR DIDÁCTICO — DATOS DEMO — SIN VALIDEZ FISCAL NI LEGAL</p>
      </div>

      {/* Info pedagógica */}
      <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>¿Para qué sirve este módulo?</strong> Las compras y gastos generan <em>crédito fiscal IVA</em> que se descuenta del débito fiscal de las ventas.
          Solo las facturas A de proveedores inscritos generan crédito fiscal computable. Las facturas B, C o tickets no discriminan IVA y no son computables.
          Este registro alimenta automáticamente la DDJJ de IVA.
        </p>
      </div>

      {/* Período y acciones */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div>
          <label className="text-xs font-semibold text-slate-500 mr-2">Período:</label>
          <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
            {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" /> Cargar compra
        </Button>
        <button onClick={load} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {/* Formulario */}
      {showForm && (
        <Card padding="md" className="mb-5 border-primary-200 bg-primary-50/20">
          <h3 className="font-semibold text-slate-700 mb-4 text-sm">Nueva compra / gasto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Fecha</label>
              <input type="date" value={form.purchase_date} onChange={e => setForm(f => ({...f, purchase_date: e.target.value}))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tipo de comprobante</label>
              <select value={form.invoice_type} onChange={e => setForm(f => ({...f, invoice_type: e.target.value as any, iva_rate: e.target.value === 'A' ? '0.21' : '0'}))} className={inputCls}>
                <option value="A">Factura A (IVA discriminado)</option>
                <option value="B">Factura B (consumidor final)</option>
                <option value="C">Factura C (monotributista)</option>
                <option value="ticket">Ticket / Recibo</option>
                <option value="X">Comprobante X</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>N° de comprobante</label>
              <input value={form.invoice_number} onChange={e => setForm(f => ({...f, invoice_number: e.target.value}))} className={inputCls} placeholder="0001-00001234" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Proveedor</label>
              <input value={form.supplier_name} onChange={e => setForm(f => ({...f, supplier_name: e.target.value}))} className={inputCls} placeholder="Nombre o razón social del proveedor" />
            </div>
            <div>
              <label className={labelCls}>CUIT proveedor</label>
              <input value={form.supplier_cuit} onChange={e => setForm(f => ({...f, supplier_cuit: e.target.value}))} className={inputCls} placeholder="XX-XXXXXXXX-X" />
            </div>
            <div className="sm:col-span-3">
              <label className={labelCls}>Concepto / descripción</label>
              <input value={form.concept} onChange={e => setForm(f => ({...f, concept: e.target.value}))} className={inputCls} placeholder="Ej: Mercadería para reventa, Alquiler local, Servicio internet" />
            </div>
            <div>
              <label className={labelCls}>Subtotal / Neto ($)</label>
              <input type="number" value={form.subtotal} onChange={e => setForm(f => ({...f, subtotal: e.target.value}))} className={inputCls} placeholder="0.00" min="0" />
            </div>
            <div>
              <label className={labelCls}>Alícuota IVA</label>
              <select value={form.iva_rate} onChange={e => setForm(f => ({...f, iva_rate: e.target.value}))} className={inputCls} disabled={form.invoice_type !== 'A'}>
                <option value="0.21">21% — General</option>
                <option value="0.105">10.5% — Diferencial</option>
                <option value="0.025">2.5% — Reducida</option>
                <option value="0">0% — Exento/No gravado</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>IVA calculado</label>
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-700">{formatCurrency(ivaAmount)}</div>
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_iva_computable} onChange={e => setForm(f => ({...f, is_iva_computable: e.target.checked}))} className="w-4 h-4" />
                <span className="text-xs text-slate-600">IVA computable como crédito fiscal</span>
              </label>
              {!form.is_iva_computable && <p className="text-xs text-orange-600 mt-1">⚠️ Este IVA NO se computará en la DDJJ de IVA.</p>}
              {form.invoice_type !== 'A' && <p className="text-xs text-slate-400 mt-1">Solo facturas A discriminan IVA computable.</p>}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold mb-1">Total comprobante</p>
              <p className="text-lg font-bold text-primary-700">{formatCurrency(total)}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} loading={saving}>Guardar compra</Button>
          </div>
        </Card>
      )}

      {/* Resumen del período */}
      {purchases.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-slate-800">{formatCurrency(totals.subtotal)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Neto total</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-orange-600">{formatCurrency(totals.iva)}</p>
            <p className="text-xs text-slate-500 mt-0.5">IVA total</p>
          </Card>
          <Card padding="sm" className="text-center bg-emerald-50 border-emerald-200">
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(totals.ivaComputable)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Crédito fiscal</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-primary-700">{formatCurrency(totals.total)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total pagado</p>
          </Card>
        </div>
      )}

      {/* Lista */}
      {purchases.length === 0 ? (
        <Card padding="lg" className="text-center">
          <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Sin compras registradas para {filterPeriod}.</p>
          <p className="text-xs text-slate-400 mt-1">Cargá compras y gastos para alimentar la DDJJ de IVA automáticamente.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {purchases.map(p => (
            <Card key={p.id} padding="none">
              <div className="flex items-center justify-between gap-3 p-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">Fctura {p.invoice_type}</span>
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.supplier_name}</p>
                    {p.is_iva_computable && p.iva_amount > 0 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">IVA computable</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{p.concept} · {formatDate(p.purchase_date)}</p>
                  {p.invoice_number && <p className="text-xs text-slate-400">Comprobante: {p.invoice_number}</p>}
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Neto / IVA</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(p.subtotal)} + {formatCurrency(p.iva_amount)}</p>
                    <p className="text-xs text-slate-500">Total: <strong>{formatCurrency(p.total)}</strong></p>
                  </div>
                  <button onClick={() => handleCancel(p.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Anular">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {purchases.length > 0 && (
        <div className="mt-4 flex justify-end">
          <a href="/iva">
            <Button variant="outline" size="sm">Ver impacto en DDJJ IVA →</Button>
          </a>
        </div>
      )}
    </PageContainer>
  )
}
