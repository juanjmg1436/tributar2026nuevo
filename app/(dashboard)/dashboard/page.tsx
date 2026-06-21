'use client'

import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { useProgress } from '@/hooks/useProgress'
import { useNotifications } from '@/hooks/useNotifications'
import { useMissions } from '@/hooks/useMissions'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import { MisionesPanel } from '@/components/gamification/MisionesPanel'
import { XpLevelBar } from '@/components/gamification/XpLevelBar'
import { NotificationCard } from '@/components/dashboard/NotificationCard'
import type { ProgressDetail } from '@/hooks/useProgress'
import {
  ArrowRight, CreditCard, Receipt, ShoppingBag, FileText,
  Users, Settings, Info, Trophy,
} from 'lucide-react'

export default function DashboardPage() {
  const { user, profile, taxpayerProfile } = useUser()
  const { progress: progressRaw, activeRegimeCodes, loading: progressLoading } = useProgress(user?.id ?? null, taxpayerProfile?.id ?? null)
  const progress = progressRaw as ProgressDetail | null
  const { notifications, unreadCount, markAsRead } = useNotifications(user?.id ?? null)
  const { tracks, totalXp, levelInfo, loading: missionsLoading } = useMissions(
    user?.id ?? null,
    taxpayerProfile?.id ?? null,
    activeRegimeCodes,
    progress,
  )

  const loading = progressLoading || missionsLoading

  if (loading) {
    return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = profile?.full_name?.split(' ')[0] || 'Estudiante'

  const hasAnyRegime = activeRegimeCodes.length > 0
  const isMonotributista = activeRegimeCodes.includes('MONOTRIBUTO')
  const isRI = activeRegimeCodes.includes('REGIMEN_GENERAL')

  return (
    <PageContainer
      title={`${greeting}, ${firstName}`}
      subtitle={taxpayerProfile ? `Contribuyente activo: ${taxpayerProfile.entity_name}` : 'Simulador Fiscal Educativo'}
    >
      {/* ── XP Level Bar ──────────────────────────────────── */}
      {(totalXp > 0 || progress?.hasTaxpayerProfile) && (
        <div className="mb-6">
          <XpLevelBar xp={totalXp} levelInfo={levelInfo} />
        </div>
      )}

      {/* ── Bienvenida nueva cuenta ───────────────────────── */}
      {!progress?.hasTaxpayerProfile && (
        <Alert variant="info" className="mb-6">
          <strong>¡Bienvenido/a al Simulador Fiscal!</strong> Para comenzar, creá tu perfil de contribuyente simulado. Luego elegís entre la <strong>Ruta del Monotributista</strong> o la <strong>Ruta del Régimen General</strong> y ganás XP completando misiones pedagógicas.
        </Alert>
      )}

      {/* ── Prompt para elegir régimen ────────────────────── */}
      {progress?.registrationComplete && !hasAnyRegime && (
        <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">¿Qué régimen vas a practicar?</p>
            <p className="text-xs text-amber-700 mt-0.5 mb-3">
              Elegí tu situación fiscal para desbloquear la ruta de misiones.
              Con dos contribuyentes podés practicar ambas rutas simultáneamente.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Link href="/administrador-relaciones" className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors">
                🟢 Monotributo <ArrowRight className="w-3 h-3" />
              </Link>
              <Link href="/administrador-relaciones" className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors">
                🔵 Régimen General <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── COLUMNA IZQUIERDA: Misiones ─────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {tracks.length > 0 ? (
            tracks.map(track => (
              <MisionesPanel key={track.regime} track={track} />
            ))
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <span>🟢</span>
                  <p className="font-bold text-slate-700 text-sm">Ruta del Monotributista</p>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  Para pequeños contribuyentes. Practicás cuota mensual, categorías, Factura C y recategorización semestral.
                </p>
                <ul className="text-xs text-slate-600 space-y-1">
                  {['Inscripción al Monotributo', 'Factura C electrónica', 'Pago de cuota mensual', 'Recategorización semestral (enero y julio)'].map(t => (
                    <li key={t} className="flex items-center gap-2"><span className="text-slate-300">○</span>{t}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <span>🔵</span>
                  <p className="font-bold text-slate-700 text-sm">Ruta del Régimen General</p>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  Para empresas y profesionales RI. Practicás DDJJ de IVA, Ganancias, VEPs y más.
                </p>
                <ul className="text-xs text-slate-600 space-y-1">
                  {['Inscripción en IVA + Ganancias', 'Factura A y B electrónicas', 'DDJJ IVA mensual (F.2002)', 'DDJJ Ganancias anual (F.713)', 'F.931 si tenés empleados'].map(t => (
                    <li key={t} className="flex items-center gap-2"><span className="text-slate-300">○</span>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Logro si nivel alto */}
          {levelInfo.level >= 4 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-800">Nivel {levelInfo.level}: {levelInfo.name}</p>
                <p className="text-[10px] text-amber-600">Seguí completando misiones para desbloquear nuevas etapas.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── COLUMNA DERECHA ──────────────────────────────── */}
        <div className="space-y-5">

          {/* Situación del contribuyente activo */}
          <Card padding="md">
            <CardTitle className="mb-3">Contribuyente activo</CardTitle>
            <div className="space-y-2.5">
              <StatusRow
                label="PERFIL"
                value={taxpayerProfile?.entity_name || 'Sin crear'}
                sub={taxpayerProfile ? `${taxpayerProfile.subject_type === 'persona_humana' ? 'Persona Humana' : 'Persona Jurídica'} · ${taxpayerProfile.cuit}` : undefined}
                active={!!taxpayerProfile}
              />
              <StatusRow
                label="RÉGIMEN"
                value={
                  isMonotributista && isRI ? 'Monotributo + Rég. General'
                  : isMonotributista ? 'Monotributista'
                  : isRI ? 'Responsable Inscripto'
                  : activeRegimeCodes.length > 0 ? activeRegimeCodes.join(', ')
                  : 'Sin definir'
                }
                active={hasAnyRegime}
              />
              <StatusRow
                label="DOM. FISCAL ELECTRÓNICO"
                value={progress?.hasEFiscalAddress ? 'Constituido' : 'Pendiente'}
                active={!!progress?.hasEFiscalAddress}
              />
              <StatusRow
                label="PUNTO DE VENTA"
                value={progress?.hasPOS ? 'Habilitado' : 'Sin habilitar'}
                active={!!progress?.hasPOS}
              />
              {progress?.hasInvoice !== undefined && (
                <StatusRow
                  label="FACTURACIÓN"
                  value={progress.hasInvoice ? 'Con comprobantes' : 'Sin comprobantes'}
                  active={!!progress.hasInvoice}
                />
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <Link href="/contribuyentes" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                <Users className="w-3 h-3" /> Gestionar contribuyentes
              </Link>
            </div>
          </Card>

          {/* Acceso rápido */}
          <Card padding="md">
            <CardTitle className="mb-3">Acceso rápido</CardTitle>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/estado-cuenta',            label: 'Estado de cuenta', icon: <CreditCard className="w-4 h-4" />,  locked: !progress?.registrationComplete },
                { href: '/comprobantes',              label: 'Comprobantes',     icon: <Receipt className="w-4 h-4" />,      locked: !progress?.hasPOS },
                { href: '/puntos-venta',              label: 'Puntos de venta',  icon: <ShoppingBag className="w-4 h-4" />,  locked: !progress?.registrationComplete },
                { href: '/administrador-relaciones',  label: 'Regímenes',        icon: <Settings className="w-4 h-4" />,     locked: !progress?.registrationComplete },
                { href: '/historial',                 label: 'Historial',        icon: <FileText className="w-4 h-4" />,     locked: false },
                { href: '/contribuyentes',            label: 'Contribuyentes',   icon: <Users className="w-4 h-4" />,        locked: false },
              ].map((item) => (
                item.locked ? (
                  <div key={item.href} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-slate-50 opacity-40 cursor-not-allowed text-center">
                    <div className="text-slate-400">{item.icon}</div>
                    <span className="text-[10px] text-slate-400">{item.label}</span>
                  </div>
                ) : (
                  <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-center group">
                    <div className="text-slate-500 group-hover:text-primary-600 transition-colors">{item.icon}</div>
                    <span className="text-[10px] font-medium text-slate-600 group-hover:text-primary-700">{item.label}</span>
                  </Link>
                )
              ))}
            </div>
          </Card>

          {/* Notificaciones recientes */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <CardTitle>Notificaciones</CardTitle>
              {unreadCount > 0 && <Badge variant="info">{unreadCount} nuevas</Badge>}
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">Sin notificaciones aún</p>
            ) : (
              <div className="space-y-1">
                {notifications.slice(0, 3).map(n => (
                  <NotificationCard key={n.id} notification={n} onMarkRead={markAsRead} />
                ))}
              </div>
            )}
            {notifications.length > 3 && (
              <Link href="/domicilio-fiscal" className="block text-[10px] text-primary-600 hover:underline mt-2 text-center">
                Ver todas ({notifications.length}) →
              </Link>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}

function StatusRow({ label, value, sub, active }: { label: string; value: string; sub?: string; active: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${active ? 'bg-emerald-500' : 'bg-slate-200'}`} />
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xs text-slate-800 leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}
