'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { formatDate } from '@/lib/utils'
import { ShoppingBag, Plus, X, CheckCircle2, Info, Store, ToggleLeft, ToggleRight } from 'lucide-react'
import type { PointOfSale } from '@/types'
import { POS_MODALITIES } from '@/lib/constants/regimes'

const schema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  modality: z.enum(['electronica', 'manual', 'pos_fiscal', 'otro']),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function PuntosVentaPage() {
  const { user, taxpayerProfile, loading: userLoading } = useUser()
  const [positions, setPositions] = useState<PointOfSale[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const supabase = createClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { modality: 'electronica' },
  })

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user, taxpayerProfile?.id])

  async function loadData() {
    setLoading(true)
    const profileId = taxpayerProfile?.id
    const [stepsRes, posRes] = await Promise.all([
      profileId
        ? supabase.from('registration_steps').select('status').eq('taxpayer_profile_id', profileId)
        : supabase.from('registration_steps').select('status').eq('user_id', user!.id),
      profileId
        ? supabase.from('points_of_sale').select('*').eq('taxpayer_profile_id', profileId).order('pos_number')
        : supabase.from('points_of_sale').select('*').eq('user_id', user!.id).order('pos_number'),
    ])
    const completed = (stepsRes.data || []).filter((s: any) => s.status === 'completed').length
    setIsRegistrationComplete(completed === 6)
    setPositions(posRes.data || [])
    setLoading(false)
  }

  async function onSubmit(data: FormData) {
    if (!user) return
    try {
      setSaving(true)
      setError(null)
      const nextNumber = positions.length > 0 ? Math.max(...positions.map(p => p.pos_number)) + 1 : 1

      const profileId = taxpayerProfile?.id
      const { error: insertErr } = await supabase.from('points_of_sale').insert({
        user_id: user.id,
        ...(profileId ? { taxpayer_profile_id: profileId } : {}),
        pos_number: nextNumber,
        name: data.name,
        modality: data.modality,
        status: 'active',
        activation_date: new Date().toISOString().split('T')[0],
        notes: data.notes || null,
      })
      if (insertErr) throw insertErr

      await supabase.from('activity_log').insert({
        user_id: user.id,
        action_type: 'CREATE_POS',
        description: `Alta de punto de venta N°${nextNumber}: ${data.name}`,
        module: 'puntos_venta',
        metadata: { pos_number: nextNumber, name: data.name, modality: data.modality },
      })

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: `Punto de venta N°${nextNumber} habilitado`,
        message: `El punto de venta "${data.name}" fue habilitado exitosamente. Ya podés comenzar a emitir comprobantes.`,
        notification_type: 'success',
        link_to: '/comprobantes',
      })

      setSuccess(`Punto de venta N°${nextNumber} creado correctamente.`)
      reset()
      setShowForm(false)
      await loadData()
      setTimeout(() => setSuccess(null), 4000)
    } catch (err: any) {
      setError(err.message || 'Error al crear el punto de venta.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(pos: PointOfSale) {
    setTogglingId(pos.id)
    const newStatus = pos.status === 'active' ? 'inactive' : 'active'
    await supabase.from('points_of_sale').update({ status: newStatus }).eq('id', pos.id)
    await supabase.from('activity_log').insert({
      user_id: user!.id,
      action_type: newStatus === 'active' ? 'ACTIVATE_POS' : 'DEACTIVATE_POS',
      description: `${newStatus === 'active' ? 'Activación' : 'Desactivación'} del punto de venta N°${pos.pos_number}`,
      module: 'puntos_venta',
      metadata: { pos_number: pos.pos_number },
    })
    await loadData()
    setTogglingId(null)
  }

  const modalityLabels: Record<string, string> = {
    electronica: 'Factura Electrónica',
    manual: 'Manual (talonario)',
    pos_fiscal: 'Controlador Fiscal',
    otro: 'Otro',
  }

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  if (!isRegistrationComplete) {
    return (
      <PageContainer title="Puntos de venta" subtitle="Gestión de puntos de venta habilitados">
        <Alert variant="warning">
          <strong>Módulo bloqueado.</strong> Debés completar el alta registral para habilitar puntos de venta.{' '}
          <a href="/alta-rut" className="underline font-semibold">Ir al alta registral →</a>
        </Alert>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Puntos de venta"
      subtitle="Habilitá y gestioná tus puntos de venta para emitir comprobantes."
      actions={
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'primary'}>
          {showForm ? <><X className="w-4 h-4 mr-1" /> Cancelar</> : <><Plus className="w-4 h-4 mr-1" /> Nuevo punto de venta</>}
        </Button>
      }
    >
      <Alert variant="info" className="mb-6">
        <strong>¿Qué es un punto de venta?</strong> En el sistema real, el punto de venta identifica el lugar o modalidad desde donde el contribuyente emite sus comprobantes (facturas, recibos, notas de crédito). Cada contribuyente puede tener múltiples puntos de venta. El número de punto de venta aparece en los comprobantes.
      </Alert>

      {error && <Alert variant="error" className="mb-4" dismissible>{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" dismissible>{success}</Alert>}

      {/* New POS Form */}
      {showForm && (
        <Card padding="md" className="mb-6 border-primary-200">
          <CardTitle className="mb-1">Nuevo punto de venta</CardTitle>
          <CardDescription className="mb-5">Completá los datos para habilitar un nuevo punto de venta.</CardDescription>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                {...register('name')}
                id="name"
                label="Nombre del punto de venta"
                placeholder="Ej: Local principal, Oficina central"
                error={errors.name?.message}
                required
              />
              <Select
                {...register('modality')}
                id="modality"
                label="Modalidad"
                options={POS_MODALITIES}
                required
                helpText="La modalidad define el tipo de emisión de comprobantes."
              />
            </div>
            <Input
              {...register('notes')}
              id="notes"
              label="Notas (opcional)"
              placeholder="Descripción adicional..."
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); reset() }}>Cancelar</Button>
              <Button type="submit" loading={saving}><CheckCircle2 className="w-4 h-4 mr-1" /> Habilitar punto de venta</Button>
            </div>
          </form>
        </Card>
      )}

      {/* POS List */}
      {positions.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Sin puntos de venta habilitados</p>
          <p className="text-sm text-slate-400 mt-1">Habilitá tu primer punto de venta para comenzar a emitir comprobantes.</p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Habilitar punto de venta
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {positions.map(pos => (
            <Card key={pos.id} padding="md" className={pos.status === 'inactive' ? 'opacity-60' : ''}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 font-bold text-lg">
                  {pos.pos_number}
                </div>
                <Badge variant={pos.status === 'active' ? 'success' : 'gray'} dot>
                  {pos.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{pos.name}</h3>
              <p className="text-xs text-slate-500 mb-1">Modalidad: {modalityLabels[pos.modality] || pos.modality}</p>
              {pos.activation_date && <p className="text-xs text-slate-400">Alta: {formatDate(pos.activation_date)}</p>}
              {pos.notes && <p className="text-xs text-slate-500 mt-1 italic">{pos.notes}</p>}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleStatus(pos)}
                  loading={togglingId === pos.id}
                  className="w-full text-slate-600"
                >
                  {pos.status === 'active'
                    ? <><ToggleRight className="w-4 h-4 mr-1 text-emerald-500" /> Desactivar</>
                    : <><ToggleLeft className="w-4 h-4 mr-1 text-slate-400" /> Activar</>}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          <strong>DEMO:</strong> Los puntos de venta creados aquí son ficticios. En el sistema real, la habilitación de puntos de venta requiere cumplir requisitos específicos y estar aprobada por el organismo recaudador.
        </p>
      </div>
    </PageContainer>
  )
}
