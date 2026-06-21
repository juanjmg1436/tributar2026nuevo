'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { StepIndicator } from '@/components/forms/StepIndicator'
import { useUser } from '@/hooks/useUser'
import { CheckCircle2, Lock, ArrowRight, ArrowLeft, Info, FileText } from 'lucide-react'
import type { TaxpayerProfile, RegistrationStep } from '@/types'
import { REGISTRATION_STEPS_CONFIG } from '@/lib/constants/regimes'
import { formatDate } from '@/lib/utils'

const STEP_LABELS = ['Identificación', 'Domicilio', 'Actividad', 'Condición', 'Contacto', 'Confirmación']

export default function AltaRutPage() {
  const { user, taxpayerProfile: activeTaxpayerProfile, loading: userLoading } = useUser()
  const [taxpayer, setTaxpayer] = useState<TaxpayerProfile | null>(null)
  const [steps, setSteps] = useState<RegistrationStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allCompleted, setAllCompleted] = useState(false)

  // Step 4 - condition form
  const [conditionIntent, setConditionIntent] = useState('')
  // Step 5 - contact form
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user, activeTaxpayerProfile?.id])

  async function loadData() {
    try {
      setLoading(true)
      const { data: tp } = await supabase
        .from('taxpayer_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle()
      setTaxpayer(tp || null)

      if (tp) {
        const { data: stepsData } = await supabase
          .from('registration_steps')
          .select('*')
          .eq('taxpayer_profile_id', tp.id)
          .order('step_number')

        if (!stepsData || stepsData.length === 0) {
          // Initialize steps for this contributor
          const initialSteps = REGISTRATION_STEPS_CONFIG.map(sc => ({
            user_id: user!.id,
            taxpayer_profile_id: tp.id,
            step_number: sc.step_number,
            step_key: sc.step_key,
            step_name: sc.step_name,
            status: sc.step_number === 1 ? 'in_progress' : 'pending' as any,
            step_data: {},
          }))
          const { data: created } = await supabase
            .from('registration_steps')
            .insert(initialSteps)
            .select()
          setSteps(created || [])
        } else {
          setSteps(stepsData)
          const completedCount = stepsData.filter(s => s.status === 'completed').length
          if (completedCount === 6) {
            setAllCompleted(true)
          }
          // Find current step
          const currentIdx = stepsData.findIndex(s => s.status === 'in_progress')
          if (currentIdx >= 0) setCurrentStep(currentIdx)
          else if (completedCount < 6) {
            const nextPending = stepsData.findIndex(s => s.status === 'pending')
            if (nextPending >= 0) setCurrentStep(nextPending)
          }
          // Restore contact data
          const contactStep = stepsData.find(s => s.step_key === 'datos_contacto')
          if (contactStep?.step_data) {
            const d = contactStep.step_data as any
            setContactEmail(d.email || '')
            setContactPhone(d.phone || '')
          }
          const conditionStep = stepsData.find(s => s.step_key === 'condicion_inicial')
          if (conditionStep?.step_data) {
            const d = conditionStep.step_data as any
            setConditionIntent(d.condition_intent || '')
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function completeStep(stepKey: string, extraData: Record<string, any> = {}) {
    if (!user) return
    try {
      setSaving(true)
      setError(null)

      const tpId = taxpayer?.id
      // Mark current step as completed
      await supabase
        .from('registration_steps')
        .update({
          status: 'completed',
          step_data: extraData,
          completed_at: new Date().toISOString(),
        })
        .eq('taxpayer_profile_id', tpId)
        .eq('step_key', stepKey)

      // If there's a next step, mark it in_progress
      const nextStepConfig = REGISTRATION_STEPS_CONFIG.find(s => s.step_number === currentStep + 2)
      if (nextStepConfig) {
        await supabase
          .from('registration_steps')
          .update({ status: 'in_progress' })
          .eq('taxpayer_profile_id', tpId)
          .eq('step_key', nextStepConfig.step_key)
      }

      // Log activity
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action_type: 'COMPLETE_STEP',
        description: `Paso completado: ${REGISTRATION_STEPS_CONFIG[currentStep]?.step_name}`,
        module: 'alta_rut',
        metadata: { step: stepKey, step_number: currentStep + 1 },
      })

      if (currentStep === 5) {
        // All done!
        setAllCompleted(true)
        await supabase
          .from('taxpayer_profiles')
          .update({ status: 'active' })
          .eq('id', taxpayer?.id)
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: '¡Alta registral completada!',
          message: 'Tu proceso de inscripción simulada finalizó correctamente. El siguiente paso es elegir tu régimen tributario.',
          notification_type: 'success',
          link_to: '/administrador-relaciones',
        })
      } else {
        setCurrentStep(prev => prev + 1)
      }

      await loadData()
    } catch (err: any) {
      setError(err.message || 'Error al guardar el paso.')
    } finally {
      setSaving(false)
    }
  }

  const stepsForIndicator = STEP_LABELS.map((label, i) => ({
    number: i + 1,
    label,
    status: (allCompleted || i < currentStep ? 'completed' : i === currentStep ? 'current' : 'upcoming') as 'completed' | 'current' | 'upcoming',
  }))

  if (userLoading || loading) {
    return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>
  }

  if (!taxpayer) {
    return (
      <PageContainer title="Alta registral" subtitle="Proceso de inscripción tributaria simulada">
        <Alert variant="warning">
          <strong>Primero debés crear tu perfil del contribuyente.</strong> Antes de avanzar con el alta registral, completá el perfil del contribuyente.
          <br /><a href="/perfil-contribuyente" className="font-semibold underline mt-2 inline-block">Ir al perfil del contribuyente →</a>
        </Alert>
      </PageContainer>
    )
  }

  if (allCompleted) {
    return (
      <PageContainer title="Alta registral" subtitle="Proceso de inscripción tributaria simulada">
        <Card padding="lg" className="text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">¡Alta registral completada!</h2>
          <p className="text-slate-500 mb-6">Completaste los 6 pasos del proceso de inscripción simulada. Tu contribuyente quedó marcado como activo en el simulador.</p>
          <div className="space-y-3">
            {steps.map(step => (
              <div key={step.id} className="flex items-center gap-3 text-left p-3 bg-emerald-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">{step.step_name}</p>
                  {step.completed_at && <p className="text-xs text-slate-400">Completado el {formatDate(step.completed_at)}</p>}
                </div>
              </div>
            ))}
          </div>
          <Button className="mt-6 w-full" onClick={() => window.location.href = '/administrador-relaciones'}>
            Siguiente: Elegir régimen tributario
          </Button>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Alta registral inicial"
      subtitle={taxpayer.subject_type === 'persona_humana'
        ? 'Proceso de inscripción para Persona Humana (equivalente didáctico al F-460/F)'
        : 'Proceso de inscripción para Persona Jurídica (equivalente didáctico al F-460/J)'}
    >
      <Alert variant="info" className="mb-6">
        El proceso de alta registral es el trámite mediante el cual un contribuyente se inscribe ante el organismo recaudador. En este simulador, recorrés ese proceso paso a paso de forma educativa.
      </Alert>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <StepIndicator steps={stepsForIndicator} className="mb-8" />

      {/* Step 0: Datos identificatorios */}
      {currentStep === 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info">Paso 1 de 6</Badge>
          </div>
          <CardTitle className="mt-2 mb-1">Datos identificatorios</CardTitle>
          <CardDescription className="mb-6">Confirmá los datos de identidad del contribuyente. Estos provienen de tu perfil creado previamente.</CardDescription>
          <div className="space-y-4 bg-slate-50 rounded-xl p-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de sujeto</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{taxpayer.subject_type === 'persona_humana' ? 'Persona Humana' : 'Persona Jurídica'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{taxpayer.subject_type === 'persona_humana' ? 'Apellido y nombre' : 'Razón social'}</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{taxpayer.entity_name}</p>
            </div>
            {taxpayer.trade_name && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre de fantasía</p>
                <p className="text-sm font-medium text-slate-800 mt-1">{taxpayer.trade_name}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CUIT (DEMO)</p>
              <p className="text-sm font-mono font-medium text-slate-800 mt-1">{taxpayer.cuit}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inicio de actividad</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{taxpayer.activity_start_date ? formatDate(taxpayer.activity_start_date) : '—'}</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-700">
              <Info className="w-3.5 h-3.5 inline mr-1" />
              En el sistema real, estos datos se obtienen del DNI o del estatuto social. Si necesitás modificarlos, volvé al <a href="/perfil-contribuyente" className="underline font-medium">Perfil del contribuyente</a>.
            </p>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={() => completeStep('datos_identificatorios', { confirmed: true })} loading={saving}>
              Confirmar y continuar <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 1: Domicilio fiscal */}
      {currentStep === 1 && (
        <Card padding="md">
          <Badge variant="info" className="mb-2">Paso 2 de 6</Badge>
          <CardTitle className="mt-2 mb-1">Domicilio fiscal</CardTitle>
          <CardDescription className="mb-6">Confirmá el domicilio fiscal donde el contribuyente desarrolla su actividad principal.</CardDescription>
          <div className="space-y-4 bg-slate-50 rounded-xl p-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dirección</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{taxpayer.street} {taxpayer.street_number}{taxpayer.floor_apt ? ` ${taxpayer.floor_apt}` : ''}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Localidad</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{taxpayer.municipality}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Provincia</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{taxpayer.province}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Código postal</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{taxpayer.postal_code}</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-700">
              <Info className="w-3.5 h-3.5 inline mr-1" />
              El domicilio fiscal puede ser diferente del domicilio real de la persona. Es el lugar que el organismo recaudador considera como la dirección oficial del contribuyente.
            </p>
          </div>
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setCurrentStep(0)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <Button onClick={() => completeStep('domicilio_fiscal', { confirmed: true })} loading={saving}>
              Confirmar y continuar <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Actividad económica */}
      {currentStep === 2 && (
        <Card padding="md">
          <Badge variant="info" className="mb-2">Paso 3 de 6</Badge>
          <CardTitle className="mt-2 mb-1">Actividad económica</CardTitle>
          <CardDescription className="mb-6">Confirmá las actividades económicas declaradas por el contribuyente.</CardDescription>
          <div className="space-y-4 bg-slate-50 rounded-xl p-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actividad principal</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{taxpayer.main_activity_code} — {taxpayer.main_activity_name || 'Sin especificar'}</p>
            </div>
            {taxpayer.secondary_activity_code && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actividad secundaria</p>
                <p className="text-sm font-medium text-slate-800 mt-1">{taxpayer.secondary_activity_code} — {taxpayer.secondary_activity_name || 'Sin especificar'}</p>
              </div>
            )}
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-700">
              <Info className="w-3.5 h-3.5 inline mr-1" />
              El código de actividad económica (basado en el Clasificador de Actividades Económicas) define qué tipo de actividad realiza el contribuyente y es clave para determinar sus obligaciones.
            </p>
          </div>
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <Button onClick={() => completeStep('actividad_economica', { confirmed: true })} loading={saving}>
              Confirmar y continuar <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Condición inicial */}
      {currentStep === 3 && (
        <Card padding="md">
          <Badge variant="info" className="mb-2">Paso 4 de 6</Badge>
          <CardTitle className="mt-2 mb-1">Condición inicial</CardTitle>
          <CardDescription className="mb-6">Indicá la condición tributaria con la que el contribuyente comienza su actividad. Esto determinará sus obligaciones iniciales.</CardDescription>
          <div className="space-y-3 mb-4">
            {[
              { value: 'monotributista', label: 'Monotributista', desc: 'Régimen simplificado para pequeños contribuyentes. Cuota fija mensual que incluye IVA, Ganancias y obra social.', applies: taxpayer.subject_type === 'persona_humana' },
              { value: 'responsable_inscripto', label: 'Responsable Inscripto (IVA)', desc: 'Inscripto ante el IVA. Liquida mensualmente. Corresponde al Régimen General.', applies: true },
              { value: 'exento', label: 'Exento de IVA', desc: 'El contribuyente está exento del impuesto al valor agregado por el tipo de actividad que realiza.', applies: true },
              { value: 'no_alcanzado', label: 'No alcanzado por IVA', desc: 'La actividad no está gravada por el IVA, diferente a estar exento.', applies: true },
            ].filter(o => o.applies).map(option => (
              <label key={option.value} className={`cursor-pointer flex gap-3 p-4 rounded-xl border-2 transition-all ${conditionIntent === option.value ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="condition" value={option.value} checked={conditionIntent === option.value} onChange={e => setConditionIntent(e.target.value)} className="mt-1 accent-primary-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">{option.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{option.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <Button
              onClick={() => conditionIntent && completeStep('condicion_inicial', { condition_intent: conditionIntent })}
              disabled={!conditionIntent}
              loading={saving}
            >
              Confirmar y continuar <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Datos de contacto */}
      {currentStep === 4 && (
        <Card padding="md">
          <Badge variant="info" className="mb-2">Paso 5 de 6</Badge>
          <CardTitle className="mt-2 mb-1">Datos de contacto</CardTitle>
          <CardDescription className="mb-6">Ingresá los datos de contacto del contribuyente. El email se usará para las notificaciones del domicilio fiscal electrónico.</CardDescription>
          <div className="space-y-4">
            <Input
              id="contact_email"
              type="email"
              label="Email de contacto"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="contribuyente@email.com"
              required
              helpText="Este email recibirá notificaciones del domicilio fiscal electrónico (simuladas)."
            />
            <Input
              id="contact_phone"
              type="tel"
              label="Teléfono de contacto (opcional)"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              placeholder="Ej: 011-1234-5678"
            />
          </div>
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setCurrentStep(3)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <Button
              onClick={() => contactEmail && completeStep('datos_contacto', { email: contactEmail, phone: contactPhone })}
              disabled={!contactEmail}
              loading={saving}
            >
              Confirmar y continuar <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 5: Confirmación final */}
      {currentStep === 5 && (
        <Card padding="md">
          <Badge variant="info" className="mb-2">Paso 6 de 6</Badge>
          <CardTitle className="mt-2 mb-1">Confirmación final</CardTitle>
          <CardDescription className="mb-6">Revisá el resumen de tu alta registral antes de confirmar.</CardDescription>
          <div className="space-y-3 bg-slate-50 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-sm text-slate-500">Contribuyente</span>
              <span className="text-sm font-semibold text-slate-800">{taxpayer.entity_name}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-sm text-slate-500">CUIT (DEMO)</span>
              <span className="text-sm font-mono font-semibold text-slate-800">{taxpayer.cuit}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-sm text-slate-500">Tipo</span>
              <span className="text-sm font-semibold text-slate-800">{taxpayer.subject_type === 'persona_humana' ? 'Persona Humana' : 'Persona Jurídica'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-sm text-slate-500">Domicilio fiscal</span>
              <span className="text-sm font-semibold text-slate-800 text-right max-w-[200px]">{taxpayer.fiscal_address}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-sm text-slate-500">Condición inicial</span>
              <span className="text-sm font-semibold text-slate-800 capitalize">{conditionIntent.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">Email de contacto</span>
              <span className="text-sm font-semibold text-slate-800">{contactEmail}</span>
            </div>
          </div>
          <Alert variant="warning" className="mb-5">
            Al confirmar, estás finalizando el proceso de alta registral simulada. Tu contribuyente pasará al estado <strong>Activo</strong> y podrás avanzar con los módulos siguientes.
          </Alert>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <Button onClick={() => completeStep('confirmacion', { final_confirmation: true })} loading={saving}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar alta registral
            </Button>
          </div>
        </Card>
      )}
    </PageContainer>
  )
}
