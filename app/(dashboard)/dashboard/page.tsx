'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { ProgressCard } from '@/components/dashboard/ProgressCard'
import { StageCard } from '@/components/dashboard/StageCard'
import { NotificationCard } from '@/components/dashboard/NotificationCard'
import { useUser } from '@/hooks/useUser'
import { useProgress } from '@/hooks/useProgress'
import { useNotifications } from '@/hooks/useNotifications'
import {
  ArrowRight, User, FileText, Settings, CreditCard,
  Mail, ShoppingBag, Receipt, CheckCircle2, AlertCircle,
  Clock, TrendingUp
} from 'lucide-react'
import type { TaxpayerProfile } from '@/types'
import { formatDate } from '@/lib/utils'

export default function DashboardPage() {
  const router = useRouter()
  const { user, profile, loading: userLoading } = useUser()
  const { progress, stages, loading: progressLoading } = useProgress(user?.id ?? null)
  const { notifications, unreadCount, markAsRead } = useNotifications(user?.id ?? null)
  const [taxpayer, setTaxpayer] = useState<TaxpayerProfile | null>(null)
  const [activeRegimeName, setActiveRegimeName] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    async function loadData() {
      const { data: tp } = await supabase
        .from('taxpayer_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single()
      setTaxpayer(tp || null)

      if (tp) {
        const { data: regime } = await supabase
          .from('taxpayer_regime_status')
          .select('regime_id, tax_regimes(name)')
          .eq('user_id', user!.id)
          .eq('status', 'active')
          .single()
        if (regime && regime.tax_regimes) {
          setActiveRegimeName((regime.tax_regimes as any).name)
        }
      }
    }
    loadData()
  }, [user])

  if (userLoading || progressLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      </PageContainer>
    )
  }

  const quickActions = [
    {
      title: 'Completar perfil del contribuyente',
      description: 'El primer paso es crear tu contribuyente simulado',
      href: '/perfil-contribuyente',
      icon: <User className="w-5 h-5 text-primary-600" />,
      done: progress?.hasTaxpayerProfile ?? false,
    },
    {
      title: 'Alta registral inicial',
      description: 'Completá el proceso de inscripción paso a paso',
      href: '/alta-rut',
      icon: <FileText className="w-5 h-5 text-primary-600" />,
      done: progress?.registrationComplete ?? false,
      locked: !progress?.hasTaxpayerProfile,
    },
    {
      title: 'Elegir régimen tributario',
      description: 'Seleccioná tu condición fiscal: monotributo, general u otro',
      href: '/administrador-relaciones',
      icon: <Settings className="w-5 h-5 text-primary-600" />,
      done: progress?.hasActiveRegime ?? false,
      locked: !progress?.registrationComplete,
    },
    {
      title: 'Constituir Domicilio Fiscal Electrónico',
      description: 'Habilitá tu buzón de notificaciones oficial',
      href: '/domicilio-fiscal',
      icon: <Mail className="w-5 h-5 text-primary-600" />,
      done: progress?.hasEFiscalAddress ?? false,
      locked: !progress?.hasActiveRegime,
    },
    {
      title: 'Habilitar punto de venta',
      description: 'Dalo de alta para poder emitir comprobantes',
      href: '/puntos-venta',
      icon: <ShoppingBag className="w-5 h-5 text-primary-600" />,
      done: progress?.hasPOS ?? false,
      locked: !progress?.registrationComplete,
    },
  ]

  const pendingActions = quickActions.filter(a => !a.done && !a.locked)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <PageContainer title={`${greeting}, ${profile?.full_name?.split(' ')[0] || 'Estudiante'} 👋`} subtitle="Aquí está el resumen de tu simulación fiscal educativa.">
      {/* Alert si es nuevo */}
      {!progress?.hasTaxpayerProfile && (
        <Alert variant="info" className="mb-6">
          <strong>¡Bienvenido/a al simulador!</strong> Para comenzar, primero debés crear tu perfil de contribuyente simulado. Hacé clic en "Perfil del contribuyente" en el menú lateral.
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          {progress && <ProgressCard progress={progress} />}

          {/* Quick actions pending */}
          {pendingActions.length > 0 && (
            <Card padding="md">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-orange-500" />
                <CardTitle>Acciones pendientes</CardTitle>
                <Badge variant="warning">{pendingActions.length}</Badge>
              </div>
              <div className="space-y-3">
                {pendingActions.map((action, i) => (
                  <Link key={i} href={action.href} className="flex items-center gap-4 p-3 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all group">
                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
                      {action.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{action.title}</p>
                      <p className="text-xs text-slate-500">{action.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-600 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* All completed */}
          {progress?.completionPercentage === 100 && (
            <Alert variant="success">
              <strong>¡Simulación completa!</strong> Completaste todas las etapas del simulador. Podés seguir explorando los módulos o revisar tu historial de acciones.
            </Alert>
          )}

          {/* Stages */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <CardTitle>Etapas del recorrido</CardTitle>
            </div>
            <div className="space-y-3">
              {stages.map((stage, i) => (
                <StageCard key={i} stage={stage} isLast={i === stages.length - 1} />
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Situación actual */}
          <Card padding="md">
            <CardTitle className="mb-4">Situación actual</CardTitle>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${taxpayer ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <div>
                  <p className="text-xs font-semibold text-slate-500">CONTRIBUYENTE</p>
                  <p className="text-sm text-slate-800">{taxpayer?.entity_name || 'Sin crear'}</p>
                  {taxpayer && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {taxpayer.subject_type === 'persona_humana' ? 'Persona Humana' : 'Persona Jurídica'} — CUIT: {taxpayer.cuit}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${activeRegimeName ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <div>
                  <p className="text-xs font-semibold text-slate-500">RÉGIMEN</p>
                  <p className="text-sm text-slate-800">{activeRegimeName || 'Sin definir'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${progress?.hasEFiscalAddress ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <div>
                  <p className="text-xs font-semibold text-slate-500">DOM. FISCAL ELECTRÓNICO</p>
                  <p className="text-sm text-slate-800">{progress?.hasEFiscalAddress ? 'Constituido' : 'Pendiente'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${progress?.hasPOS ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <div>
                  <p className="text-xs font-semibold text-slate-500">PUNTO DE VENTA</p>
                  <p className="text-sm text-slate-800">{progress?.hasPOS ? 'Habilitado' : 'Sin habilitar'}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Módulos rápidos */}
          <Card padding="md">
            <CardTitle className="mb-4">Acceso rápido</CardTitle>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/estado-cuenta', label: 'Estado de cuenta', icon: <CreditCard className="w-4 h-4" />, locked: !progress?.registrationComplete },
                { href: '/comprobantes', label: 'Comprobantes', icon: <Receipt className="w-4 h-4" />, locked: !progress?.hasPOS },
                { href: '/puntos-venta', label: 'Puntos de venta', icon: <ShoppingBag className="w-4 h-4" />, locked: !progress?.registrationComplete },
                { href: '/historial', label: 'Historial', icon: <FileText className="w-4 h-4" />, locked: false },
              ].map((item, i) => (
                item.locked ? (
                  <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-slate-50 opacity-50 cursor-not-allowed text-center">
                    <div className="text-slate-400">{item.icon}</div>
                    <span className="text-xs text-slate-400">{item.label}</span>
                  </div>
                ) : (
                  <Link key={i} href={item.href} className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-center">
                    <div className="text-primary-600">{item.icon}</div>
                    <span className="text-xs font-medium text-slate-700">{item.label}</span>
                  </Link>
                )
              ))}
            </div>
          </Card>

          {/* Notificaciones recientes */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Notificaciones</CardTitle>
              {unreadCount > 0 && <Badge variant="info">{unreadCount} nuevas</Badge>}
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Sin notificaciones</p>
            ) : (
              <div className="space-y-1">
                {notifications.slice(0, 4).map((n) => (
                  <NotificationCard key={n.id} notification={n} onMarkRead={markAsRead} />
                ))}
              </div>
            )}
            {notifications.length > 4 && (
              <Link href="/domicilio-fiscal" className="block text-xs text-primary-600 hover:underline mt-3 text-center">
                Ver todas las notificaciones
              </Link>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
