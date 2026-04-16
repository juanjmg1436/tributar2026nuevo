'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { NotificationCard } from '@/components/dashboard/NotificationCard'
import { useUser } from '@/hooks/useUser'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDate } from '@/lib/utils'
import { Mail, CheckCircle2, Clock, Bell, Info, RefreshCw, BellOff } from 'lucide-react'
import type { EFiscalAddress } from '@/types'

export default function DomicilioFiscalPage() {
  const { user, loading: userLoading } = useUser()
  const [address, setAddress] = useState<EFiscalAddress | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasActiveRegime, setHasActiveRegime] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh: refreshNotifications } = useNotifications(user?.id ?? null)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    try {
      setLoading(true)
      const [addrRes, regimeRes] = await Promise.all([
        supabase.from('e_fiscal_address').select('*').eq('user_id', user!.id).single(),
        supabase.from('taxpayer_regime_status').select('id').eq('user_id', user!.id).eq('status', 'active'),
      ])
      if (addrRes.data) {
        setAddress(addrRes.data)
        setEmail(addrRes.data.notification_email || '')
        setPhone(addrRes.data.phone || '')
      }
      setHasActiveRegime((regimeRes.data || []).length > 0)
    } finally {
      setLoading(false)
    }
  }

  async function constitute() {
    if (!user || !email) return
    try {
      setSaving(true)
      setError(null)
      const now = new Date().toISOString()

      if (address) {
        await supabase.from('e_fiscal_address').update({
          status: 'constituted',
          notification_email: email,
          phone: phone || null,
          constitution_date: now,
        }).eq('user_id', user.id)
      } else {
        await supabase.from('e_fiscal_address').insert({
          user_id: user.id,
          status: 'constituted',
          notification_email: email,
          phone: phone || null,
          constitution_date: now,
        })
      }

      // Create demo notifications
      const demoNotifications = [
        { title: 'Domicilio Fiscal Electrónico constituido', message: 'Tu Domicilio Fiscal Electrónico fue constituido correctamente. A partir de ahora, las notificaciones del organismo recaudador llegarán a este buzón.', notification_type: 'success' as const },
        { title: 'Recordatorio: Obligación próxima a vencer', message: 'Recordatorio automático: Tenés una obligación fiscal próxima a vencer. Revisá tu estado de cuenta para más detalles.', notification_type: 'reminder' as const },
        { title: 'Tu alta registral fue confirmada', message: 'El proceso de alta registral de tu contribuyente fue completado y confirmado. Tu situación fiscal simulada está activa.', notification_type: 'info' as const },
        { title: 'Revisá tu estado de cuenta', message: 'Existen obligaciones pendientes en tu estado de cuenta. Recordá que los vencimientos son simulados y no tienen efecto real.', notification_type: 'warning' as const },
      ]
      for (const n of demoNotifications) {
        await supabase.from('notifications').insert({ user_id: user.id, ...n })
      }

      await supabase.from('activity_log').insert({
        user_id: user.id,
        action_type: 'CONSTITUTE_FISCAL_ADDRESS',
        description: 'Constitución del Domicilio Fiscal Electrónico',
        module: 'domicilio_fiscal',
        metadata: { email },
      })

      setSuccess(true)
      await loadData()
      await refreshNotifications()
      setTimeout(() => setSuccess(false), 4000)
    } catch (err: any) {
      setError(err.message || 'Error al constituir el domicilio fiscal.')
    } finally {
      setSaving(false)
    }
  }

  if (userLoading || loading) return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>

  if (!hasActiveRegime && !address) {
    return (
      <PageContainer title="Domicilio Fiscal Electrónico" subtitle="Constitución y bandeja de notificaciones">
        <Alert variant="warning">
          <strong>Módulo bloqueado.</strong> Debés tener al menos un régimen tributario activo antes de constituir el Domicilio Fiscal Electrónico.{' '}
          <a href="/administrador-relaciones" className="underline font-semibold">Ir al Administrador de Relaciones →</a>
        </Alert>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="Domicilio Fiscal Electrónico" subtitle="Constitución y bandeja de notificaciones">
      <Alert variant="info" className="mb-6">
        <strong>¿Qué es el Domicilio Fiscal Electrónico?</strong> Es el buzón oficial donde el organismo recaudador envía notificaciones, intimaciones, resoluciones y recordatorios al contribuyente. Una vez constituido, todas las comunicaciones oficiales se reciben en este domicilio electrónico. Su constitución es obligatoria en el sistema real.
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estado y constitución */}
        <div className="lg:col-span-1 space-y-5">
          <Card padding="md">
            <CardTitle className="mb-4">Estado del domicilio</CardTitle>
            <div className={`rounded-xl p-4 ${address?.status === 'constituted' ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {address?.status === 'constituted'
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  : <Clock className="w-5 h-5 text-amber-500" />}
                <span className={`font-semibold text-sm ${address?.status === 'constituted' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {address?.status === 'constituted' ? 'Constituido' : 'Pendiente de constitución'}
                </span>
              </div>
              {address?.constitution_date && (
                <p className="text-xs text-slate-500">Constituido el {formatDate(address.constitution_date)}</p>
              )}
              {address?.notification_email && (
                <p className="text-xs text-slate-600 mt-1 truncate">📧 {address.notification_email}</p>
              )}
            </div>
          </Card>

          {/* Form to constitute */}
          <Card padding="md">
            <CardTitle className="mb-1">{address?.status === 'constituted' ? 'Actualizar datos' : 'Constituir domicilio'}</CardTitle>
            <CardDescription className="mb-4">
              {address?.status === 'constituted'
                ? 'Podés actualizar el email y teléfono de notificación.'
                : 'Ingresá los datos para constituir tu domicilio fiscal electrónico.'}
            </CardDescription>

            {error && <Alert variant="error" className="mb-3">{error}</Alert>}
            {success && <Alert variant="success" className="mb-3">¡Domicilio fiscal electrónico constituido correctamente!</Alert>}

            <div className="space-y-3">
              <Input
                id="email"
                type="email"
                label="Email de notificación"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                helpText="Recibirás notificaciones en este email."
              />
              <Input
                id="phone"
                type="tel"
                label="Teléfono (opcional)"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ej: 011-1234-5678"
              />
              <Button onClick={constitute} loading={saving} className="w-full" disabled={!email}>
                <Mail className="w-4 h-4 mr-1" />
                {address?.status === 'constituted' ? 'Actualizar' : 'Constituir domicilio fiscal'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Bandeja de notificaciones */}
        <div className="lg:col-span-2">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary-600" />
                <CardTitle>Bandeja de notificaciones</CardTitle>
                {unreadCount > 0 && <Badge variant="info">{unreadCount} nuevas</Badge>}
              </div>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                    Marcar todas como leídas
                  </Button>
                )}
                <button onClick={refreshNotifications} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg" title="Actualizar">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {address?.status !== 'constituted' && (
              <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <BellOff className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Domicilio fiscal no constituido</p>
                <p className="text-sm text-slate-400 mt-1">Constituí tu domicilio fiscal para empezar a recibir notificaciones.</p>
              </div>
            )}

            {address?.status === 'constituted' && notifications.length === 0 && (
              <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No tenés notificaciones aún.</p>
              </div>
            )}

            {address?.status === 'constituted' && notifications.length > 0 && (
              <div className="space-y-1">
                {notifications.map(n => (
                  <NotificationCard key={n.id} notification={n} onMarkRead={markAsRead} />
                ))}
              </div>
            )}
          </Card>

          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              <strong>DEMO:</strong> Las notificaciones que aparecen en esta bandeja son generadas automáticamente como ejemplo educativo. No son notificaciones reales del organismo recaudador.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
