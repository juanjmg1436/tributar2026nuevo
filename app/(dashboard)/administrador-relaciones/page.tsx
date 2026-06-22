'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Badge, RegimeBadge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { useUser } from '@/hooks/useUser'
import { formatDate } from '@/lib/utils'
import { CertificadoModal } from '@/components/certificados/CertificadoModal'
import type { CertificadoData } from '@/components/certificados/CertificadoRegimen'
import {
  CheckCircle2, XCircle, AlertTriangle, Info, ChevronDown, ChevronUp,
  Users, Home, Briefcase, TrendingUp, Building2, Lock, FileText
} from 'lucide-react'
import type { TaxRegime, TaxpayerRegimeStatus, TaxpayerProfile } from '@/types'
import { MonotributoModule } from '@/components/modulos/MonotributoModule'

export default function AdministradorRelacionesPage() {
  const { user, taxpayerProfile, loading: userLoading } = useUser()
  const [taxpayer, setTaxpayer] = useState<TaxpayerProfile | null>(null)
  const [regimes, setRegimes] = useState<TaxRegime[]>([])
  const [regimeStatuses, setRegimeStatuses] = useState<TaxpayerRegimeStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [expandedRegime, setExpandedRegime] = useState<string | null>(null)
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false)
  const [certData, setCertData] = useState<CertificadoData | null>(null)
  const supabase = createClient()

  /** Genera el número de certificado simulado */
  function buildCertNumber(code: string, cuit: string, date: string) {
    const year = date?.split('-')[0] ?? new Date().getFullYear()
    const suffix = (cuit.replace(/-/g, '').slice(-6))
    const prefix = code.slice(0, 4).toUpperCase()
    return `${prefix}-${year}-${suffix}`
  }

  function openCertificate(regime: TaxRegime, status: TaxpayerRegimeStatus) {
    if (!taxpayer) return
    setCertData({
      entityName: taxpayer.entity_name,
      cuit: taxpayer.cuit,
      subjectType: taxpayer.subject_type as 'persona_humana' | 'persona_juridica',
      regimeCode: regime.code,
      regimeName: regime.name,
      startDate: status.start_date,
      certNumber: buildCertNumber(regime.code, taxpayer.cuit, status.start_date),
    })
  }

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user, taxpayerProfile?.id])

  async function loadData() {
    try {
      setLoading(true)
      const [tpRes, regimesRes] = await Promise.all([
        supabase.from('taxpayer_profiles').select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle(),
        supabase.from('tax_regimes').select('*').eq('is_active', true).order('sort_order'),
      ])
      const tp = tpRes.data || null
      setTaxpayer(tp)
      setRegimes(regimesRes.data || [])

      if (tp) {
        const [statusesRes, stepsRes] = await Promise.all([
          supabase.from('taxpayer_regime_status').select('*').eq('taxpayer_profile_id', tp.id),
          supabase.from('registration_steps').select('status').eq('taxpayer_profile_id', tp.id),
        ])
        setRegimeStatuses(statusesRes.data || [])
        const completedSteps = (stepsRes.data || []).filter((s: any) => s.status === 'completed').length
        setIsRegistrationComplete(completedSteps === 6)
      }
    } finally {
      setLoading(false)
    }
  }

  function getStatusForRegime(regimeId: string): TaxpayerRegimeStatus | undefined {
    return regimeStatuses.find(s => s.regime_id === regimeId)
  }

  function canActivate(regime: TaxRegime): { allowed: boolean; reason?: string } {
    if (!isRegistrationComplete) return { allowed: false, reason: 'Debés completar el alta registral antes de activar regímenes.' }
    if (!taxpayer) return { allowed: false, reason: 'Necesitás un perfil de contribuyente.' }

    if (regime.code === 'MONOTRIBUTO') {
      if (taxpayer.subject_type === 'persona_juridica') return { allowed: false, reason: 'El Monotributo solo aplica a personas humanas, no a personas jurídicas.' }
      const general = regimeStatuses.find(s => {
        const r = regimes.find(rg => rg.id === s.regime_id)
        return r?.code === 'REGIMEN_GENERAL' && s.status === 'active'
      })
      if (general) return { allowed: false, reason: 'No podés estar en Monotributo y Régimen General al mismo tiempo.' }
    }
    if (regime.code === 'REGIMEN_GENERAL') {
      const mono = regimeStatuses.find(s => {
        const r = regimes.find(rg => rg.id === s.regime_id)
        return r?.code === 'MONOTRIBUTO' && s.status === 'active'
      })
      if (mono) return { allowed: false, reason: 'No podés estar en Régimen General y Monotributo al mismo tiempo. Primero darte de baja del Monotributo.' }
    }
    if (regime.code === 'CASAS_PARTICULARES') {
      if (taxpayer.subject_type === 'persona_juridica') return { allowed: false, reason: 'El régimen de Casas Particulares solo aplica a personas humanas.' }
    }
    return { allowed: true }
  }

  async function activateRegime(regime: TaxRegime) {
    if (!user) return
    const check = canActivate(regime)
    if (!check.allowed) { setError(check.reason || 'No podés activar este régimen.'); return }
    try {
      setActionLoading(regime.id)
      setError(null)
      setSuccessMsg(null)

      const existing = getStatusForRegime(regime.id)
      if (existing) {
        await supabase.from('taxpayer_regime_status').update({ status: 'active', start_date: new Date().toISOString().split('T')[0], end_date: null }).eq('id', existing.id)
      } else {
        await supabase.from('taxpayer_regime_status').insert({
          user_id: user.id,
          taxpayer_profile_id: taxpayer!.id,
          regime_id: regime.id,
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
        })
      }

      await supabase.from('activity_log').insert({
        user_id: user.id,
        action_type: 'ACTIVATE_REGIME',
        description: `Alta en régimen: ${regime.name}`,
        module: 'administrador_relaciones',
        metadata: { regime_code: regime.code, regime_name: regime.name },
      })

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: `Alta en ${regime.name} registrada`,
        message: `Tu alta en el régimen "${regime.name}" fue registrada en el simulador. Revisá tu estado de cuenta para ver las obligaciones generadas.`,
        notification_type: 'success',
        link_to: '/estado-cuenta',
      })

      setSuccessMsg(`Alta en "${regime.name}" registrada correctamente.`)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Error al activar el régimen.')
    } finally {
      setActionLoading(null)
    }
  }

  async function deactivateRegime(regime: TaxRegime) {
    if (!user) return
    try {
      setActionLoading(regime.id)
      setError(null)
      setSuccessMsg(null)

      await supabase.from('taxpayer_regime_status')
        .update({ status: 'inactive', end_date: new Date().toISOString().split('T')[0] })
        .eq('taxpayer_profile_id', taxpayer!.id)
        .eq('regime_id', regime.id)

      await supabase.from('activity_log').insert({
        user_id: user.id,
        action_type: 'DEACTIVATE_REGIME',
        description: `Baja en régimen: ${regime.name}`,
        module: 'administrador_relaciones',
        metadata: { regime_code: regime.code },
      })

      setSuccessMsg(`Baja en "${regime.name}" registrada.`)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Error al dar de baja el régimen.')
    } finally {
      setActionLoading(null)
    }
  }

  const regimeIcons: Record<string, React.ReactNode> = {
    MONOTRIBUTO: <TrendingUp className="w-5 h-5" />,
    REGIMEN_GENERAL: <Building2 className="w-5 h-5" />,
    AUTONOMOS: <Briefcase className="w-5 h-5" />,
    RELACIONES_LABORALES: <Users className="w-5 h-5" />,
    CASAS_PARTICULARES: <Home className="w-5 h-5" />,
  }

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  if (!isRegistrationComplete) {
    return (
      <PageContainer title="Administrador de relaciones" subtitle="Gestión de regímenes tributarios">
        <Alert variant="warning">
          <strong>Módulo bloqueado.</strong> Para gestionar regímenes tributarios, primero debés completar el proceso de alta registral (6 pasos).{' '}
          <a href="/alta-rut" className="underline font-semibold">Completar alta registral →</a>
        </Alert>
      </PageContainer>
    )
  }

  return (
    <>
    {certData && (
      <CertificadoModal data={certData} onClose={() => setCertData(null)} />
    )}
    <PageContainer
      title="Administrador de relaciones"
      subtitle="Gestioná tus altas, bajas y modificaciones en regímenes tributarios."
    >
      <Alert variant="info" className="mb-6">
        <strong>¿Qué es el Administrador de Relaciones?</strong> En el sistema real, este módulo permite al contribuyente inscribirse, modificar o darse de baja de distintos regímenes tributarios. Cada régimen implica obligaciones diferentes. En este simulador podés explorar las distintas opciones.
      </Alert>

      {error && <Alert variant="error" className="mb-4" dismissible>{error}</Alert>}
      {successMsg && <Alert variant="success" className="mb-4" dismissible>{successMsg}</Alert>}

      <div className="space-y-4">
        {regimes.map((regime) => {
          const status = getStatusForRegime(regime.id)
          const isActive = status?.status === 'active'
          const check = canActivate(regime)
          const isExpanded = expandedRegime === regime.id
          const isLoading = actionLoading === regime.id

          return (
            <Card key={regime.id} padding="none" className="overflow-hidden">
              <div
                className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedRegime(isExpanded ? null : regime.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-emerald-100 text-emerald-600' : check.allowed ? 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-300'}`}>
                      {regimeIcons[regime.code] || <Briefcase className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800">{regime.name}</h3>
                        {isActive && <RegimeBadge status="active" />}
                        {status?.status === 'inactive' && <RegimeBadge status="inactive" />}
                        {!check.allowed && <Badge variant="gray"><Lock className="w-3 h-3 mr-1" />No disponible</Badge>}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{regime.short_description}</p>
                      {isActive && status?.start_date && (
                        <p className="text-xs text-emerald-600 mt-1">Activo desde: {formatDate(status.start_date)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100">
                  {/* Para Monotributo activo: mostrar el módulo completo */}
                  {regime.code === 'MONOTRIBUTO' && isActive ? (
                    <div className="p-5">
                      {/* Solo baja — la constancia está en el módulo (tab Mi Situación) */}
                      <div className="flex gap-3 flex-wrap mb-5 pb-4 border-b border-slate-200">
                        <Button variant="danger" onClick={() => deactivateRegime(regime)} loading={isLoading} size="sm">
                          <XCircle className="w-4 h-4 mr-1" /> Darme de baja del Monotributo
                        </Button>
                      </div>
                      <MonotributoModule />
                    </div>
                  ) : (
                    <div className="p-5 bg-slate-50/50">
                      <p className="text-sm text-slate-600 mb-4">{regime.full_description}</p>
                      {!check.allowed && (
                        <Alert variant="warning" className="mb-4">
                          <Lock className="w-4 h-4 inline mr-1" />
                          {check.reason}
                        </Alert>
                      )}
                      {check.allowed && !isActive && (
                        <Alert variant="info" className="mb-4">
                          Al activar este régimen, se generarán obligaciones simuladas en tu estado de cuenta. Podés darte de baja cuando quieras.
                        </Alert>
                      )}
                      {isActive && (
                        <Alert variant="warning" className="mb-4">
                          Estás actualmente activo en este régimen. Si te dás de baja, las obligaciones pendientes seguirán existiendo hasta ser regularizadas.
                        </Alert>
                      )}
                      <div className="flex gap-3 flex-wrap">
                        {!isActive && check.allowed && (
                          <Button onClick={() => activateRegime(regime)} loading={isLoading} size="sm">
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Darme de alta
                          </Button>
                        )}
                        {isActive && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => openCertificate(regime, status!)}>
                              <FileText className="w-4 h-4 mr-1.5" /> Ver certificado PDF
                            </Button>
                            <Button variant="danger" onClick={() => deactivateRegime(regime)} loading={isLoading} size="sm">
                              <XCircle className="w-4 h-4 mr-1" /> Darme de baja
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          <strong>Importante:</strong> Las altas y bajas en regímenes tributarios tienen efectos reales en el sistema oficial. En este simulador son educativas y sin consecuencias. En la práctica real, estos trámites deben ser realizados por un contador.
        </p>
      </div>
    </PageContainer>
    </>
  )
}
