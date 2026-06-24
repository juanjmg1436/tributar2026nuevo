'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useUser } from '@/hooks/useUser'
import { MISIONES_DEPARTMENTS, IIBB_ACTIVITIES, IIBB_REGIMES } from '@/lib/constants/misiones'
import { Building2, User, MapPin, FileText, CheckCircle2, ChevronRight, ChevronLeft, AlertTriangle, Info } from 'lucide-react'

// ── Schemas por paso ─────────────────────────────────────────────────────────
const step1Schema = z.object({
  subject_type: z.enum(['persona_humana', 'persona_juridica']),
  entity_name: z.string().min(3, 'Ingresá el nombre completo o razón social'),
  cuit: z.string().regex(/^\d{2}-\d{8}-\d{1}$/, 'Formato: XX-XXXXXXXX-X'),
})

const step2Schema = z.object({
  department: z.string().min(1, 'Seleccioná un departamento'),
  locality: z.string().min(1, 'Seleccioná una localidad'),
  street: z.string().min(3, 'Ingresá la calle'),
  street_number: z.string().min(1, 'Ingresá el número'),
  postal_code: z.string().min(3, 'Ingresá el código postal'),
})

const step3Schema = z.object({
  primary_activity_code: z.string().min(1, 'Seleccioná una actividad'),
  start_date: z.string().min(1, 'Ingresá la fecha de inicio'),
  iibb_regime: z.enum(['local', 'convenio_multilateral', 'exento']),
  iibb_number: z.string().optional(),
})

const step4Schema = z.object({
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>
type Step4Data = z.infer<typeof step4Schema>

const STEPS = [
  { number: 1, title: 'Identificación', icon: <User className="w-4 h-4" /> },
  { number: 2, title: 'Domicilio', icon: <MapPin className="w-4 h-4" /> },
  { number: 3, title: 'Actividad', icon: <FileText className="w-4 h-4" /> },
  { number: 4, title: 'Contacto', icon: <Building2 className="w-4 h-4" /> },
]

export default function AltaProvincialPage() {
  const { user } = useUser()
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<Step1Data & Step2Data & Step3Data & Step4Data>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema), defaultValues: formData as Step1Data })
  const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema), defaultValues: formData as Step2Data })
  const form3 = useForm<Step3Data>({ resolver: zodResolver(step3Schema), defaultValues: formData as Step3Data })
  const form4 = useForm<Step4Data>({ resolver: zodResolver(step4Schema), defaultValues: formData as Step4Data })

  const selectedDept = form2.watch('department')
  const selectedLocalities = MISIONES_DEPARTMENTS.find(d => d.code === selectedDept)?.localities || []

  async function handleStep1(data: Step1Data) {
    setFormData(prev => ({ ...prev, ...data }))
    setStep(2)
  }
  async function handleStep2(data: Step2Data) {
    setFormData(prev => ({ ...prev, ...data }))
    setStep(3)
  }
  async function handleStep3(data: Step3Data) {
    setFormData(prev => ({ ...prev, ...data }))
    setStep(4)
  }

  async function handleStep4(data: Step4Data) {
    if (!user) return
    const all = { ...formData, ...data }
    setSaving(true)
    setError(null)

    try {
      const activity = IIBB_ACTIVITIES.find(a => a.code === all.primary_activity_code)
      const dept = MISIONES_DEPARTMENTS.find(d => d.code === all.department)
      const db = supabase as any

      // Check if already exists
      const { data: existing } = await db
        .from('prov_taxpayers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        setError('Ya tenés una inscripción provincial activa. Podés gestionarla desde el panel de Misiones.')
        return
      }

      const { error: insertErr } = await db.from('prov_taxpayers').insert({
        user_id: user.id,
        cuit: all.cuit,
        entity_name: all.entity_name,
        subject_type: all.subject_type,
        primary_activity_code: all.primary_activity_code,
        primary_activity_name: activity?.name || '',
        start_date: all.start_date,
        department: dept?.name || all.department || '',
        locality: all.locality,
        street: all.street,
        street_number: all.street_number,
        postal_code: all.postal_code,
        email: all.email,
        phone: all.phone || null,
        iibb_regime: all.iibb_regime,
        iibb_number: all.iibb_number || null,
        status: 'active',
      })

      if (insertErr) throw new Error(insertErr.message)

      // Log
      await (supabase as any).from('activity_log').insert({
        user_id: user.id,
        action_type: 'PROV_ALTA',
        description: `Alta provincial ATM Misiones — ${all.entity_name}`,
        module: 'misiones',
        metadata: { cuit: all.cuit },
      }).catch(() => {})

      router.push('/misiones?alta=ok')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

  return (
    <PageContainer title="Alta Provincial — ATM Misiones" subtitle="Inscripción como contribuyente provincial (simulación educativa)">

      {/* Banner simulador */}
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 flex gap-2 items-center">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-xs text-red-700 font-medium">
          SIMULADOR DIDÁCTICO — DATOS DE PRUEBA — SIN VALIDEZ FISCAL NI LEGAL
        </p>
      </div>

      {/* Aviso: ATM es organismo provincial independiente de ARCA */}
      <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-blue-800 mb-1">
            ATM Misiones es un organismo provincial — distinto e independiente de ARCA / AFIP
          </p>
          <div className="text-xs text-blue-700 space-y-1 leading-relaxed">
            <p>
              La <strong>Administración Tributaria de Misiones (ATM)</strong> es el fisco provincial,
              separado del fisco nacional (ARCA, ex-AFIP). Tu usuario y clave de ARCA <strong>no sirven</strong> aquí:
              debés crear una cuenta propia en el sistema de ATM y realizar la inscripción como contribuyente de
              Ingresos Brutos (IIBB) de forma independiente.
            </p>
            <div className="bg-blue-100 rounded-lg p-2 mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
              <div className="flex items-start gap-1">
                <span className="text-blue-400">✗</span>
                <span>Cuenta ARCA / AFIP</span>
              </div>
              <div className="flex items-start gap-1">
                <span className="text-blue-500">✓</span>
                <span>Cuenta ATM Misiones (atm.misiones.gov.ar)</span>
              </div>
              <div className="flex items-start gap-1">
                <span className="text-blue-400">✗</span>
                <span>CUIT como clave fiscal ARCA</span>
              </div>
              <div className="flex items-start gap-1">
                <span className="text-blue-500">✓</span>
                <span>N° contribuyente IIBB asignado por ATM</span>
              </div>
            </div>
            <p className="text-blue-500 italic text-[11px] mt-1">
              En el simulador completás este formulario de alta provincial con tus datos de prueba. En la realidad,
              el trámite se hace en <strong>atm.misiones.gov.ar</strong> con clave ATM propia.
            </p>
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              step === s.number ? 'bg-primary-700 text-white' :
              step > s.number ? 'bg-emerald-100 text-emerald-700' :
              'bg-slate-100 text-slate-400'
            }`}>
              {step > s.number ? <CheckCircle2 className="w-4 h-4" /> : s.icon}
              <span className="hidden sm:block">{s.title}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-1 ${step > s.number ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {/* Step 1 — Identificación */}
      {step === 1 && (
        <Card padding="lg">
          <h2 className="text-base font-semibold text-slate-800 mb-5">Datos identificatorios</h2>
          <form onSubmit={form1.handleSubmit(handleStep1)} className="space-y-4">
            <div>
              <label className={labelCls}>Tipo de sujeto</label>
              <select {...form1.register('subject_type')} className={inputCls}>
                <option value="persona_humana">Persona humana</option>
                <option value="persona_juridica">Persona jurídica (empresa/sociedad)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Nombre completo / Razón social</label>
              <input {...form1.register('entity_name')} className={inputCls} placeholder="Ej: Juan Pérez o Empresa SRL" />
              {form1.formState.errors.entity_name && <p className="text-xs text-red-500 mt-1">{form1.formState.errors.entity_name.message}</p>}
            </div>
            <div>
              <label className={labelCls}>CUIT</label>
              <input {...form1.register('cuit')} className={inputCls} placeholder="XX-XXXXXXXX-X" />
              {form1.formState.errors.cuit && <p className="text-xs text-red-500 mt-1">{form1.formState.errors.cuit.message}</p>}
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit">Siguiente <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 2 — Domicilio */}
      {step === 2 && (
        <Card padding="lg">
          <h2 className="text-base font-semibold text-slate-800 mb-5">Domicilio fiscal en Misiones</h2>
          <form onSubmit={form2.handleSubmit(handleStep2)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Departamento</label>
                <select {...form2.register('department')} className={inputCls}>
                  <option value="">Seleccioná...</option>
                  {MISIONES_DEPARTMENTS.map(d => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
                {form2.formState.errors.department && <p className="text-xs text-red-500 mt-1">{form2.formState.errors.department.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Localidad</label>
                <select {...form2.register('locality')} className={inputCls} disabled={!selectedDept}>
                  <option value="">Seleccioná...</option>
                  {selectedLocalities.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                {form2.formState.errors.locality && <p className="text-xs text-red-500 mt-1">{form2.formState.errors.locality.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Calle</label>
                <input {...form2.register('street')} className={inputCls} placeholder="Nombre de la calle" />
                {form2.formState.errors.street && <p className="text-xs text-red-500 mt-1">{form2.formState.errors.street.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Número</label>
                <input {...form2.register('street_number')} className={inputCls} placeholder="Ej: 1234" />
                {form2.formState.errors.street_number && <p className="text-xs text-red-500 mt-1">{form2.formState.errors.street_number.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Código postal</label>
                <input {...form2.register('postal_code')} className={inputCls} placeholder="Ej: 3300" />
                {form2.formState.errors.postal_code && <p className="text-xs text-red-500 mt-1">{form2.formState.errors.postal_code.message}</p>}
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-1" /> Anterior</Button>
              <Button type="submit">Siguiente <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 3 — Actividad */}
      {step === 3 && (
        <Card padding="lg">
          <h2 className="text-base font-semibold text-slate-800 mb-5">Actividad económica e IIBB</h2>
          <form onSubmit={form3.handleSubmit(handleStep3)} className="space-y-4">
            <div>
              <label className={labelCls}>Actividad principal</label>
              <select {...form3.register('primary_activity_code')} className={inputCls}>
                <option value="">Seleccioná una actividad...</option>
                {['comercio', 'servicios', 'industria', 'primario', 'construccion'].map(cat => (
                  <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                    {IIBB_ACTIVITIES.filter(a => a.category === cat).map(a => (
                      <option key={a.code} value={a.code}>
                        {a.code} — {a.name} (alíc. {(a.rate * 100).toFixed(1)}%)
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {form3.formState.errors.primary_activity_code && <p className="text-xs text-red-500 mt-1">{form3.formState.errors.primary_activity_code.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Fecha de inicio de actividades</label>
              <input type="date" {...form3.register('start_date')} className={inputCls} />
              {form3.formState.errors.start_date && <p className="text-xs text-red-500 mt-1">{form3.formState.errors.start_date.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Régimen IIBB</label>
              {IIBB_REGIMES.map(r => (
                <label key={r.value} className="flex items-start gap-2 p-3 border border-slate-200 rounded-lg mb-2 cursor-pointer hover:bg-slate-50">
                  <input type="radio" {...form3.register('iibb_regime')} value={r.value} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{r.label}</p>
                    <p className="text-xs text-slate-500">{r.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <div>
              <label className={labelCls}>N° inscripción IIBB (si ya tenés)</label>
              <input {...form3.register('iibb_number')} className={inputCls} placeholder="Ej: 30-71234567-8 (opcional)" />
            </div>
            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4 mr-1" /> Anterior</Button>
              <Button type="submit">Siguiente <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 4 — Contacto */}
      {step === 4 && (
        <Card padding="lg">
          <h2 className="text-base font-semibold text-slate-800 mb-5">Datos de contacto</h2>
          <form onSubmit={form4.handleSubmit(handleStep4)} className="space-y-4">
            <div>
              <label className={labelCls}>Email de contacto</label>
              <input type="email" {...form4.register('email')} className={inputCls} placeholder="ejemplo@correo.com" />
              {form4.formState.errors.email && <p className="text-xs text-red-500 mt-1">{form4.formState.errors.email.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Teléfono (opcional)</label>
              <input {...form4.register('phone')} className={inputCls} placeholder="+54 376 4XXXXXX" />
            </div>

            {/* Resumen */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Resumen del alta</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400">Contribuyente:</span> <span className="font-medium">{formData.entity_name}</span></div>
                <div><span className="text-slate-400">CUIT:</span> <span className="font-medium">{formData.cuit}</span></div>
                <div><span className="text-slate-400">Localidad:</span> <span className="font-medium">{formData.locality}</span></div>
                <div><span className="text-slate-400">Régimen:</span> <span className="font-medium">{formData.iibb_regime}</span></div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(3)}><ChevronLeft className="w-4 h-4 mr-1" /> Anterior</Button>
              <Button type="submit" loading={saving}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar alta provincial
              </Button>
            </div>
          </form>
        </Card>
      )}
    </PageContainer>
  )
}
