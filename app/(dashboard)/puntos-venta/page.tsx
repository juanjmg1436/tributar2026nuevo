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
import {
  ShoppingBag, Plus, X, CheckCircle2, Info, Store,
  ToggleLeft, ToggleRight, Copy, Link2, Unlink, RefreshCw,
} from 'lucide-react'
import type { PointOfSale } from '@/types'
import { POS_MODALITIES } from '@/lib/constants/regimes'

const schema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  modality: z.enum(['electronica', 'manual', 'pos_fiscal', 'otro']),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

// Genera código único tipo PV1-XK9M2A (sin caracteres ambiguos)
function generatePosCode(posNumber: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return `PV${posNumber}-${suffix}`
}

export default function PuntosVentaPage() {
  const { user, taxpayerProfile, loading: userLoading } = useUser()
  const [positions, setPositions]         = useState<PointOfSale[]>([])
  const [loading, setLoading]             = useState(true)
  const [showForm, setShowForm]           = useState(false)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [success, setSuccess]             = useState<string | null>(null)
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false)
  const [togglingId, setTogglingId]       = useState<string | null>(null)
  const [generatingId, setGeneratingId]   = useState<string | null>(null)
  const [copiedId, setCopiedId]           = useState<string | null>(null)
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
        ? (supabase as any).from('points_of_sale').select('*').eq('taxpayer_profile_id', profileId).order('pos_number')
        : (supabase as any).from('points_of_sale').select('*').eq('user_id', user!.id).order('pos_number'),
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
      const nextNumber   = positions.length > 0 ? Math.max(...positions.map(p => p.pos_number)) + 1 : 1
      const pymezCode    = generatePosCode(nextNumber)
      const profileId    = taxpayerProfile?.id

      const { error: insertErr } = await (supabase as any).from('points_of_sale').insert({
        user_id:              user.id,
        ...(profileId ? { taxpayer_profile_id: profileId } : {}),
        pos_number:           nextNumber,
        name:                 data.name,
        modality:             data.modality,
        status:               'active',
        activation_date:      new Date().toISOString().split('T')[0],
        notes:                data.notes || null,
        pymez_link_code:      pymezCode,
      })
      if (insertErr) throw insertErr

      await Promise.all([
        (supabase as any).from('activity_log').insert({
          user_id: user.id,
          action_type: 'CREATE_POS',
          description: `Alta de punto de venta N°${nextNumber}: ${data.name}`,
          module: 'puntos_venta',
          metadata: { pos_number: nextNumber, name: data.name, modality: data.modality, pymez_link_code: pymezCode },
        }),
        (supabase as any).from('notifications').insert({
          user_id: user.id,
          title: `Punto de venta N°${nextNumber} habilitado`,
          message: `El punto de venta "${data.name}" fue habilitado. Código PyMEZ 360: ${pymezCode}`,
          notification_type: 'success',
          link_to: '/puntos-venta',
        }),
      ])

      setSuccess(`Punto de venta N°${nextNumber} habilitado. Código de vinculación: ${pymezCode}`)
      reset()
      setShowForm(false)
      await loadData()
      setTimeout(() => setSuccess(null), 8000)
    } catch (err: any) {
      setError(err.message || 'Error al crear el punto de venta.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(pos: PointOfSale) {
    setTogglingId(pos.id)
    const newStatus = pos.status === 'active' ? 'inactive' : 'active'
    await (supabase as any).from('points_of_sale').update({ status: newStatus }).eq('id', pos.id)
    await (supabase as any).from('activity_log').insert({
      user_id: user!.id,
      action_type: newStatus === 'active' ? 'ACTIVATE_POS' : 'DEACTIVATE_POS',
      description: `${newStatus === 'active' ? 'Activación' : 'Desactivación'} del punto de venta N°${pos.pos_number}`,
      module: 'puntos_venta',
      metadata: { pos_number: pos.pos_number },
    })
    await loadData()
    setTogglingId(null)
  }

  // Genera código para un POS que no tenía (puntos de venta existentes)
  async function generateCodeForPos(pos: PointOfSale) {
    setGeneratingId(pos.id)
    const code = generatePosCode(pos.pos_number)
    await (supabase as any).from('points_of_sale').update({ pymez_link_code: code }).eq('id', pos.id)
    await loadData()
    setGeneratingId(null)
  }

  async function unlinkPymez(pos: PointOfSale) {
    await (supabase as any).from('points_of_sale')
      .update({ pymez_linked_at: null, pymez_company_name: null })
      .eq('id', pos.id)
    await loadData()
  }

  function copyCode(pos: PointOfSale) {
    if (!(pos as any).pymez_link_code) return
    navigator.clipboard.writeText((pos as any).pymez_link_code)
    setCopiedId(pos.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const modalityLabels: Record<string, string> = {
    electronica: 'Factura Electrónica',
    manual:      'Manual (talonario)',
    pos_fiscal:  'Controlador Fiscal',
    otro:        'Otro',
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
        <strong>¿Qué es un punto de venta?</strong> En el sistema real, el punto de venta identifica el lugar o modalidad
        desde donde el contribuyente emite sus comprobantes. Cada uno genera un <strong>código de vinculación</strong> que
        se ingresa en PyMEZ 360 para habilitar la emisión de ventas.
      </Alert>

      {error   && <Alert variant="error"   className="mb-4" dismissible>{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" dismissible>{success}</Alert>}

      {/* Formulario nuevo POS */}
      {showForm && (
        <Card padding="md" className="mb-6 border-primary-200">
          <CardTitle className="mb-1">Nuevo punto de venta</CardTitle>
          <CardDescription className="mb-5">
            Al crear el punto de venta se genera automáticamente un código de vinculación para PyMEZ 360.
          </CardDescription>
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
              <Button type="submit" loading={saving}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Habilitar y generar código
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de POS */}
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
          {positions.map(pos => {
            const posAny    = pos as any
            const linkCode  = posAny.pymez_link_code as string | null
            const linkedAt  = posAny.pymez_linked_at as string | null
            const linkedCo  = posAny.pymez_company_name as string | null
            const isLinked  = !!linkedAt

            return (
              <Card key={pos.id} padding="md" className={pos.status === 'inactive' ? 'opacity-60' : ''}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 font-bold text-lg flex-shrink-0">
                    {pos.pos_number}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={pos.status === 'active' ? 'success' : 'gray'} dot>
                      {pos.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {isLinked && (
                      <Badge variant="info" dot>Vinculado PyMEZ</Badge>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-slate-800 mb-1">{pos.name}</h3>
                <p className="text-xs text-slate-500 mb-1">Modalidad: {modalityLabels[pos.modality] || pos.modality}</p>
                {pos.activation_date && <p className="text-xs text-slate-400">Alta: {formatDate(pos.activation_date)}</p>}
                {pos.notes && <p className="text-xs text-slate-500 mt-1 italic">{pos.notes}</p>}

                {/* ── Vinculación PyMEZ 360 ──────────────────────────────────── */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Link2 className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Vinculación PyMEZ 360</span>
                  </div>

                  {!linkCode ? (
                    /* Sin código todavía — generarlo */
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => generateCodeForPos(pos)}
                      loading={generatingId === pos.id}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Generar código
                    </Button>
                  ) : isLinked ? (
                    /* Vinculado */
                    <div className="space-y-2">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-emerald-600 font-semibold">Ventas habilitadas en PyMEZ 360</p>
                        <p className="text-xs font-bold text-emerald-800">{linkedCo}</p>
                        <p className="text-[10px] text-emerald-500">Desde: {formatDate(linkedAt!)}</p>
                      </div>
                      <button
                        onClick={() => unlinkPymez(pos)}
                        className="w-full flex items-center justify-center gap-1 text-[10px] text-red-500 hover:text-red-700 py-1"
                      >
                        <Unlink className="w-3 h-3" /> Desvincular
                      </button>
                    </div>
                  ) : (
                    /* Código generado, pendiente de vinculación */
                    <div className="space-y-2">
                      <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-violet-500 mb-1">Ingresá este código en PyMEZ 360 → Configuración → Punto de Venta</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 font-mono text-sm font-bold text-violet-800 tracking-widest">
                            {linkCode}
                          </code>
                          <button
                            onClick={() => copyCode(pos)}
                            className="p-1 hover:bg-violet-100 rounded text-violet-600"
                            title="Copiar código"
                          >
                            {copiedId === pos.id
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              : <Copy className="w-3.5 h-3.5" />
                            }
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 text-center">
                        Esperando vinculación desde PyMEZ 360…
                      </p>
                    </div>
                  )}
                </div>

                {/* Toggle activo/inactivo */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleStatus(pos)}
                    loading={togglingId === pos.id}
                    className="w-full text-slate-600"
                  >
                    {pos.status === 'active'
                      ? <><ToggleRight className="w-4 h-4 mr-1 text-emerald-500" /> Desactivar</>
                      : <><ToggleLeft  className="w-4 h-4 mr-1 text-slate-400"   /> Activar</>}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Info técnica para el docente */}
      <div className="mt-6 p-4 bg-violet-50 border border-violet-200 rounded-xl flex gap-3">
        <Link2 className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-violet-800">
          <p className="font-bold mb-1">¿Cómo funciona la vinculación con PyMEZ 360?</p>
          <ol className="space-y-1 text-xs text-violet-700 list-decimal list-inside">
            <li>Habilitás un punto de venta en TRIBUT.AR → se genera un código único (ej: <code className="font-mono font-bold">PV1-XK9M2A</code>)</li>
            <li>Ingresás ese código en PyMEZ 360 → Configuración → Punto de Venta TRIBUT.AR</li>
            <li>PyMEZ 360 valida el código con la API de TRIBUT.AR y habilita la emisión de ventas</li>
            <li>El POS en TRIBUT.AR muestra el estado "Vinculado" con el nombre de la empresa</li>
          </ol>
          <p className="text-[10px] text-violet-500 mt-2">
            API pública: <code className="font-mono">/api/pos-sync?action=validate&code=PV1-XXXXXX</code>
          </p>
        </div>
      </div>
    </PageContainer>
  )
}
