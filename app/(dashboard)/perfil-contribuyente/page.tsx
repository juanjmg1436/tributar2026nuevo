'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { PROVINCES } from '@/lib/constants/provinces'
import { ACTIVITIES } from '@/lib/constants/activities'
import { generateDemoCUIT } from '@/lib/utils'
import { User, Building2, CheckCircle2, RefreshCw, Info } from 'lucide-react'
import type { TaxpayerProfile } from '@/types'

const schema = z.object({
  subject_type: z.enum(['persona_humana', 'persona_juridica']),
  entity_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  trade_name: z.string().optional(),
  main_activity_code: z.string().min(1, 'Seleccioná una actividad principal'),
  secondary_activity_code: z.string().optional(),
  street: z.string().min(2, 'Ingresá la calle').max(100),
  street_number: z.string().min(1, 'Ingresá el número').max(10),
  floor_apt: z.string().optional(),
  province: z.string().min(1, 'Seleccioná una provincia'),
  municipality: z.string().min(2, 'Ingresá el municipio').max(100),
  postal_code: z.string().min(4, 'Ingresá el código postal').max(8),
  activity_start_date: z.string().min(1, 'Seleccioná la fecha de inicio'),
})

type FormData = z.infer<typeof schema>

export default function PerfilContribuyentePage() {
  const { user, loading: userLoading } = useUser()
  const [existing, setExisting] = useState<TaxpayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cuit, setCuit] = useState<string>('')
  const supabase = createClient()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { subject_type: 'persona_humana' },
  })

  const subjectType = watch('subject_type')
  const mainActivityCode = watch('main_activity_code')

  useEffect(() => {
    if (!user) return
    async function loadExisting() {
      const { data } = await supabase
        .from('taxpayer_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle()
      if (data) {
        setExisting(data)
        setCuit(data.cuit)
        reset({
          subject_type: data.subject_type,
          entity_name: data.entity_name,
          trade_name: data.trade_name || '',
          main_activity_code: data.main_activity_code || '',
          secondary_activity_code: data.secondary_activity_code || '',
          street: data.street || '',
          street_number: data.street_number || '',
          floor_apt: data.floor_apt || '',
          province: data.province || '',
          municipality: data.municipality || '',
          postal_code: data.postal_code || '',
          activity_start_date: data.activity_start_date || '',
        })
      } else {
        setCuit(generateDemoCUIT('persona_humana'))
      }
      setLoading(false)
    }
    loadExisting()
  }, [user])

  useEffect(() => {
    if (!existing) {
      setCuit(generateDemoCUIT(subjectType))
    }
  }, [subjectType])

  function regenerateCuit() {
    setCuit(generateDemoCUIT(subjectType))
  }

  async function onSubmit(data: FormData) {
    if (!user) return
    try {
      setSaving(true)
      setError(null)

      const mainActivity = ACTIVITIES.find(a => a.code === data.main_activity_code)
      const secondaryActivity = ACTIVITIES.find(a => a.code === data.secondary_activity_code)

      const payload = {
        user_id: user.id,
        subject_type: data.subject_type,
        entity_name: data.entity_name,
        trade_name: data.trade_name || null,
        cuit,
        main_activity_code: data.main_activity_code,
        main_activity_name: mainActivity?.name || null,
        secondary_activity_code: data.secondary_activity_code || null,
        secondary_activity_name: secondaryActivity?.name || null,
        street: data.street,
        street_number: data.street_number,
        floor_apt: data.floor_apt || null,
        fiscal_address: `${data.street} ${data.street_number}${data.floor_apt ? ` ${data.floor_apt}` : ''}, ${data.municipality}, ${data.province}`,
        province: data.province,
        municipality: data.municipality,
        postal_code: data.postal_code,
        activity_start_date: data.activity_start_date,
        status: 'incomplete' as const,
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from('taxpayer_profiles')
          .update(payload)
          .eq('id', existing.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('taxpayer_profiles')
          .insert({ ...payload, slot: 1, alias: payload.entity_name, is_active: true })
        if (insertError) throw insertError
      }

      // Log activity
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action_type: existing ? 'UPDATE' : 'CREATE',
        description: existing ? 'Actualización del perfil del contribuyente' : 'Creación del perfil del contribuyente',
        module: 'perfil_contribuyente',
        metadata: { entity_name: data.entity_name, subject_type: data.subject_type },
      })

      // Welcome notification if new
      if (!existing) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: '¡Perfil del contribuyente creado!',
          message: `Tu contribuyente "${data.entity_name}" fue creado exitosamente. El siguiente paso es completar el alta registral.`,
          notification_type: 'success',
          link_to: '/alta-rut',
        })
      }

      setSuccess(true)
      setExisting({ ...payload, id: existing?.id || '', created_at: existing?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() })
      setTimeout(() => setSuccess(false), 4000)
    } catch (err: any) {
      setError(err.message || 'Error al guardar. Intentá nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const activityOptions = ACTIVITIES.map(a => ({ value: a.code, label: `${a.code} — ${a.name}` }))
  const provinceOptions = PROVINCES.map(p => ({ value: p.name, label: p.name }))

  if (userLoading || loading) {
    return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>
  }

  return (
    <PageContainer
      title="Perfil del contribuyente"
      subtitle="Creá o editá los datos del contribuyente simulado que vas a usar en el simulador."
    >
      <Alert variant="info" className="mb-6">
        <strong>¿Qué es el perfil del contribuyente?</strong> En el sistema real, cuando una persona o empresa se inscribe ante el organismo recaudador, debe informar sus datos básicos: quién es, dónde está ubicado, qué actividad realiza y desde cuándo. Este formulario simula ese proceso inicial.
      </Alert>

      {success && (
        <Alert variant="success" className="mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Perfil guardado correctamente. {!existing && 'El siguiente paso es completar el alta registral.'}</span>
          </div>
        </Alert>
      )}
      {error && <Alert variant="error" className="mb-6">{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tipo de sujeto */}
        <Card padding="md">
          <CardTitle className="mb-1">Tipo de contribuyente</CardTitle>
          <CardDescription className="mb-5">Elegí si vas a simular una persona humana (persona física) o una persona jurídica (empresa, sociedad, etc.).</CardDescription>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className={`cursor-pointer rounded-xl border-2 p-5 transition-all ${subjectType === 'persona_humana' ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <input type="radio" {...register('subject_type')} value="persona_humana" className="sr-only" />
              <div className="flex items-start gap-3">
                <User className={`w-6 h-6 mt-0.5 ${subjectType === 'persona_humana' ? 'text-primary-600' : 'text-slate-400'}`} />
                <div>
                  <p className="font-semibold text-slate-800">Persona Humana</p>
                  <p className="text-xs text-slate-500 mt-1">También llamada persona física. Es un individuo que realiza actividad económica. Sigue el circuito equivalente al formulario 460/F.</p>
                </div>
              </div>
            </label>
            <label className={`cursor-pointer rounded-xl border-2 p-5 transition-all ${subjectType === 'persona_juridica' ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <input type="radio" {...register('subject_type')} value="persona_juridica" className="sr-only" />
              <div className="flex items-start gap-3">
                <Building2 className={`w-6 h-6 mt-0.5 ${subjectType === 'persona_juridica' ? 'text-primary-600' : 'text-slate-400'}`} />
                <div>
                  <p className="font-semibold text-slate-800">Persona Jurídica</p>
                  <p className="text-xs text-slate-500 mt-1">Una empresa, sociedad o entidad con personería jurídica. Sigue el circuito equivalente al formulario 460/J.</p>
                </div>
              </div>
            </label>
          </div>
        </Card>

        {/* Datos identificatorios */}
        <Card padding="md">
          <CardTitle className="mb-1">Datos identificatorios</CardTitle>
          <CardDescription className="mb-5">Nombre o razón social, nombre de fantasía y CUIT simulado.</CardDescription>
          <div className="space-y-4">
            <Input
              {...register('entity_name')}
              id="entity_name"
              label={subjectType === 'persona_humana' ? 'Apellido y nombre' : 'Razón social'}
              placeholder={subjectType === 'persona_humana' ? 'Ej: García, Juan Manuel' : 'Ej: Empresa Demo S.R.L.'}
              error={errors.entity_name?.message}
              required
            />
            <Input
              {...register('trade_name')}
              id="trade_name"
              label="Nombre de fantasía (opcional)"
              placeholder="Nombre comercial con el que opera"
              helpText="Es el nombre con el que el negocio se conoce públicamente, distinto de la razón social."
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                CUIT simulado <span className="text-slate-400 font-normal">(generado automáticamente)</span>
              </label>
              <div className="flex gap-2 items-center">
                <div className="flex-1 px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-sm font-mono text-slate-700">
                  {cuit}
                </div>
                {!existing && (
                  <Button type="button" variant="outline" size="sm" onClick={regenerateCuit} className="flex-shrink-0">
                    <RefreshCw className="w-4 h-4" />
                    Regenerar
                  </Button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                El CUIT (Clave Única de Identificación Tributaria) es el número que identifica al contribuyente. Este es un número DEMO sin validez real.
              </p>
            </div>
          </div>
        </Card>

        {/* Actividad económica */}
        <Card padding="md">
          <CardTitle className="mb-1">Actividad económica</CardTitle>
          <CardDescription className="mb-5">La actividad principal define el código bajo el cual tributás. Podés agregar una actividad secundaria.</CardDescription>
          <div className="space-y-4">
            <Select
              id="main_activity_code"
              label="Actividad principal"
              {...register('main_activity_code')}
              options={activityOptions}
              placeholder="Seleccioná una actividad"
              error={errors.main_activity_code?.message}
              required
              helpText="Elegí la actividad económica que mejor describe tu negocio o profesión."
            />
            <Select
              id="secondary_activity_code"
              label="Actividad secundaria (opcional)"
              {...register('secondary_activity_code')}
              options={[{ value: '', label: 'Ninguna' }, ...activityOptions]}
            />
          </div>
        </Card>

        {/* Domicilio fiscal */}
        <Card padding="md">
          <CardTitle className="mb-1">Domicilio fiscal</CardTitle>
          <CardDescription className="mb-5">El domicilio fiscal es el lugar donde el contribuyente desarrolla su actividad principal o donde se puede localizar. Es diferente al domicilio particular.</CardDescription>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Input
                  {...register('street')}
                  id="street"
                  label="Calle"
                  placeholder="Ej: Av. Rivadavia"
                  error={errors.street?.message}
                  required
                />
              </div>
              <Input
                {...register('street_number')}
                id="street_number"
                label="Número"
                placeholder="Ej: 1234"
                error={errors.street_number?.message}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                {...register('floor_apt')}
                id="floor_apt"
                label="Piso / Departamento (opcional)"
                placeholder="Ej: 3° B"
              />
              <Input
                {...register('postal_code')}
                id="postal_code"
                label="Código postal"
                placeholder="Ej: 1406"
                error={errors.postal_code?.message}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                id="province"
                label="Provincia"
                {...register('province')}
                options={provinceOptions}
                placeholder="Seleccioná una provincia"
                error={errors.province?.message}
                required
              />
              <Input
                {...register('municipality')}
                id="municipality"
                label="Localidad / Municipio"
                placeholder="Ej: Buenos Aires"
                error={errors.municipality?.message}
                required
              />
            </div>
          </div>
        </Card>

        {/* Fecha de inicio */}
        <Card padding="md">
          <CardTitle className="mb-1">Fecha de inicio de actividad</CardTitle>
          <CardDescription className="mb-4">La fecha desde la cual el contribuyente comenzó o comenzará a desarrollar su actividad.</CardDescription>
          <Input
            {...register('activity_start_date')}
            id="activity_start_date"
            type="date"
            label="Fecha de inicio"
            error={errors.activity_start_date?.message}
            required
            max={new Date().toISOString().split('T')[0]}
          />
        </Card>

        {/* Recordatorio de simulador */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            <strong>Recordatorio:</strong> Todos los datos que ingresás en este formulario son ficticios y tienen fines educativos exclusivamente. No tienen ningún valor legal ni fiscal.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} size="lg">
            {existing ? 'Guardar cambios' : 'Crear perfil del contribuyente'}
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
