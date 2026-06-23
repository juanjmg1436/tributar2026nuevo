'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, ArrowLeft, CheckCircle2, Info } from 'lucide-react'
import type { PointOfSale, TaxpayerProfile } from '@/types'
import { useRegime } from '@/hooks/useRegime'

const itemSchema = z.object({
  description: z.string().min(1, 'Descripción requerida'),
  quantity: z.coerce.number().min(0.01, 'Cantidad debe ser mayor a 0'),
  unit_price: z.coerce.number().min(0, 'Precio debe ser mayor o igual a 0'),
})

const schema = z.object({
  invoice_type: z.enum(['A', 'B', 'C', 'X', 'DEMO']),
  pos_id: z.string().min(1, 'Seleccioná un punto de venta'),
  receiver_name: z.string().min(2, 'Nombre del receptor requerido'),
  receiver_cuit: z.string().optional(),
  receiver_condition: z.string().optional(),
  concept: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Agregá al menos un ítem'),
})
type FormData = z.infer<typeof schema>

export default function NuevoComprobantePage() {
  const { user, loading: userLoading } = useUser()
  const regime = useRegime()
  const router = useRouter()
  const [posList, setPosList] = useState<PointOfSale[]>([])
  const [taxpayer, setTaxpayer] = useState<TaxpayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeRegimeCode, setActiveRegimeCode] = useState<string | null>(null)
  const supabase = createClient()

  // Default al primer tipo permitido por régimen (C para mono, A para RI)
  const defaultInvoiceType = regime.regime === 'monotributista' ? 'C'
    : (regime.regime === 'responsable_inscripto' || regime.regime === 'empresa') ? 'A'
    : 'C'

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoice_type: defaultInvoiceType as FormData['invoice_type'],
      concept: 'Servicios',
      items: [{ description: '', quantity: 1, unit_price: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')
  const watchedType = watch('invoice_type')

  const subtotal = watchedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
  const ivaAmount = watchedType === 'A' ? subtotal * 0.21 : 0
  const total = subtotal + ivaAmount

  useEffect(() => {
    if (!user) return
    async function loadData() {
      const [posRes, tpRes, regimeRes] = await Promise.all([
        supabase.from('points_of_sale').select('*').eq('user_id', user!.id).eq('status', 'active'),
        supabase.from('taxpayer_profiles').select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle(),
        supabase.from('taxpayer_regime_status').select('*, tax_regimes(code)').eq('user_id', user!.id).eq('status', 'active'),
      ])
      setPosList(posRes.data || [])
      setTaxpayer(tpRes.data || null)
      const activeRegime = (regimeRes.data || [])[0]
      if (activeRegime?.tax_regimes) {
        setActiveRegimeCode((activeRegime.tax_regimes as any).code)
      }
      setLoading(false)
    }
    loadData()
  }, [user])

  async function onSubmit(data: FormData) {
    if (!user) return
    try {
      setSaving(true)
      setError(null)

      const pos = posList.find(p => p.id === data.pos_id)
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('user_id', user.id)
        .eq('pos_number', pos?.pos_number || 1)
        .eq('invoice_type', data.invoice_type)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const nextNumber = lastInvoice ? String(parseInt(lastInvoice.invoice_number) + 1).padStart(8, '0') : '00000001'

      const { data: invoice, error: invoiceErr } = await supabase.from('invoices').insert({
        user_id: user.id,
        point_of_sale_id: data.pos_id,
        pos_number: pos?.pos_number || 1,
        invoice_type: data.invoice_type,
        invoice_number: nextNumber,
        issue_date: new Date().toISOString().split('T')[0],
        receiver_name: data.receiver_name,
        receiver_cuit: data.receiver_cuit || null,
        receiver_condition: data.receiver_condition || null,
        concept: data.concept || 'Servicios',
        subtotal,
        iva_amount: ivaAmount,
        total,
        status: 'issued',
      }).select().single()

      if (invoiceErr) throw invoiceErr

      // Insert items
      const itemsToInsert = data.items.map(item => ({
        invoice_id: invoice!.id,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total: Number(item.quantity) * Number(item.unit_price),
      }))
      await supabase.from('invoice_items').insert(itemsToInsert)

      await supabase.from('activity_log').insert({
        user_id: user.id,
        action_type: 'EMIT_INVOICE',
        description: `Emisión de Factura ${data.invoice_type} N°${String(pos?.pos_number || 1).padStart(4, '0')}-${nextNumber} a ${data.receiver_name}`,
        module: 'comprobantes',
        metadata: { invoice_type: data.invoice_type, total, receiver: data.receiver_name },
      })

      router.push('/comprobantes')
    } catch (err: any) {
      setError(err.message || 'Error al emitir el comprobante.')
    } finally {
      setSaving(false)
    }
  }

  const ALL_INVOICE_TYPES = [
    { value: 'A',    label: 'Factura A — Para responsables inscriptos (discrimina IVA 21%)', ri: true,   mono: false },
    { value: 'B',    label: 'Factura B — Para consumidores finales (RI emite a no-inscriptos)', ri: true,   mono: false },
    { value: 'C',    label: 'Factura C — Para monotributistas (no discrimina IVA)',            ri: false,  mono: true  },
    { value: 'X',    label: 'Comprobante X — Genérico del simulador',                          ri: true,   mono: true  },
    { value: 'DEMO', label: 'Comprobante DEMO — Educativo de práctica',                        ri: true,   mono: true  },
  ]

  const allowed = regime.allowedInvoiceTypes
  const invoiceTypeOptions = ALL_INVOICE_TYPES.filter(t => allowed.includes(t.value))

  const posOptions = posList.map(p => ({ value: p.id, label: `N°${p.pos_number} — ${p.name}` }))

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  return (
    <PageContainer
      title="Emitir comprobante"
      subtitle="Completá los datos para emitir un comprobante simulado."
      actions={
        <Button variant="outline" onClick={() => router.push('/comprobantes')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
      }
    >
      <Alert variant="info" className="mb-6">
        Los comprobantes emitidos aquí son ficticios. El tipo de comprobante correcto depende de tu condición tributaria y la del receptor.
        {activeRegimeCode === 'MONOTRIBUTO' && ' Como monotributista, normalmente emitís Factura C.'}
        {activeRegimeCode === 'REGIMEN_GENERAL' && ' En Régimen General, emitís Factura A (a inscriptos) o Factura B (a consumidores finales).'}
      </Alert>

      {error && <Alert variant="error" className="mb-4" dismissible>{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tipo y punto de venta */}
        <Card padding="md">
          <CardTitle className="mb-1">Tipo de comprobante y punto de venta</CardTitle>
          <CardDescription className="mb-4">Seleccioná el tipo de factura y el punto de venta desde donde emitís.</CardDescription>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              {...register('invoice_type')}
              id="invoice_type"
              label="Tipo de comprobante"
              options={invoiceTypeOptions}
              required
              error={errors.invoice_type?.message}
            />
            <Select
              {...register('pos_id')}
              id="pos_id"
              label="Punto de venta"
              options={posOptions}
              placeholder="Seleccioná un PdV"
              required
              error={errors.pos_id?.message}
            />
          </div>
        </Card>

        {/* Receptor */}
        <Card padding="md">
          <CardTitle className="mb-1">Datos del receptor</CardTitle>
          <CardDescription className="mb-4">Información de quien recibe el comprobante.</CardDescription>
          <div className="space-y-4">
            <Input
              {...register('receiver_name')}
              id="receiver_name"
              label="Nombre / Razón social del receptor"
              placeholder="Ej: Consumidor Final / Empresa S.A."
              error={errors.receiver_name?.message}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                {...register('receiver_cuit')}
                id="receiver_cuit"
                label="CUIT del receptor (opcional)"
                placeholder="Ej: 20-12345678-9"
              />
              <Input
                {...register('receiver_condition')}
                id="receiver_condition"
                label="Condición fiscal del receptor (opcional)"
                placeholder="Ej: Responsable Inscripto / Consumidor Final"
              />
            </div>
            <Input
              {...register('concept')}
              id="concept"
              label="Concepto facturado"
              placeholder="Ej: Servicios profesionales, Venta de productos"
            />
          </div>
        </Card>

        {/* Items */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>Ítems del comprobante</CardTitle>
              <CardDescription>Agregá los productos o servicios a facturar.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}>
              <Plus className="w-4 h-4 mr-1" /> Agregar ítem
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-6">
                  <Input
                    {...register(`items.${index}.description`)}
                    label={index === 0 ? 'Descripción' : undefined}
                    placeholder="Descripción del ítem"
                    error={errors.items?.[index]?.description?.message}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    {...register(`items.${index}.quantity`)}
                    type="number"
                    step="0.01"
                    label={index === 0 ? 'Cantidad' : undefined}
                    placeholder="1"
                    error={errors.items?.[index]?.quantity?.message}
                  />
                </div>
                <div className="col-span-5 sm:col-span-3">
                  <Input
                    {...register(`items.${index}.unit_price`)}
                    type="number"
                    step="0.01"
                    label={index === 0 ? 'Precio unit.' : undefined}
                    placeholder="0.00"
                    error={errors.items?.[index]?.unit_price?.message}
                  />
                </div>
                <div className="col-span-3 sm:col-span-1 flex justify-center pb-0.5">
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 border-t border-slate-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {watchedType === 'A' && (
              <div className="flex justify-between text-slate-600">
                <span>IVA (21%)</span>
                <span>{formatCurrency(ivaAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t border-slate-200 pt-2">
              <span>TOTAL</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </Card>

        {/* Leyenda simulador */}
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-center">
          <p className="font-bold text-amber-800">SIMULADOR DIDÁCTICO — NO OFICIAL — SIN VALIDEZ FISCAL/LEGAL — DATOS DEMO</p>
          <p className="text-xs text-amber-600 mt-1">Este comprobante es ficticio con fines educativos exclusivamente.</p>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/comprobantes')}>Cancelar</Button>
          <Button type="submit" loading={saving} size="lg">
            <CheckCircle2 className="w-4 h-4 mr-1" /> Emitir comprobante
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
