'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/hooks/useUser'
import { useProvincialTaxpayer } from '@/hooks/useProvincialTaxpayer'
import { formatDate, formatCurrency } from '@/lib/utils'
import { MODULE_INFO } from '@/lib/constants/misiones'
import {
  Building2, FileText, CreditCard, Scale, Car, Stamp, ClipboardCheck,
  BookOpen, ShieldCheck, AlertTriangle, CheckCircle2, ChevronRight,
  MapPin, Info
} from 'lucide-react'
import type { ProvIIBBDDJJ, ProvPayment } from '@/types/provincial'

export default function MisionesPage() {
  const { user, loading: userLoading } = useUser()
  const { taxpayer, summary, loading } = useProvincialTaxpayer(user?.id)
  const [recentDDJJs, setRecentDDJJs] = useState<ProvIIBBDDJJ[]>([])
  const [recentPayments, setRecentPayments] = useState<ProvPayment[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!user || !taxpayer) return
    loadRecent()
  }, [user, taxpayer])

  async function loadRecent() {
    const db = supabase as any
    const [ddjjRes, paymentsRes] = await Promise.all([
      db.from('prov_iibb_ddjj').select('*').eq('user_id', user!.id).order('period', { ascending: false }).limit(3),
      db.from('prov_payments').select('*').eq('user_id', user!.id).order('due_date', { ascending: false }).limit(4),
    ])
    setRecentDDJJs(ddjjRes.data || [])
    setRecentPayments(paymentsRes.data || [])
  }

  if (userLoading || loading) {
    return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>
  }

  const modules = [
    { href: '/misiones/alta', label: 'Alta provincial', icon: <Building2 className="w-5 h-5" />, desc: 'Registro como contribuyente provincial', color: 'blue', locked: false },
    { href: '/misiones/iibb', label: 'Ingresos Brutos', icon: <FileText className="w-5 h-5" />, desc: 'DDJJ mensuales IIBB', color: 'indigo', locked: !taxpayer },
    { href: '/misiones/boletas', label: 'Boletas y pagos', icon: <CreditCard className="w-5 h-5" />, desc: 'Gestión de boletas de pago', color: 'emerald', locked: !taxpayer },
    { href: '/misiones/otros-tributos', label: 'Otros tributos', icon: <Scale className="w-5 h-5" />, desc: 'Inmobiliario · Automotor · Sellos', color: 'orange', locked: !taxpayer },
    { href: '/misiones/sr341', label: 'SR-341', icon: <Stamp className="w-5 h-5" />, desc: 'Agentes de retención', color: 'purple', locked: !taxpayer },
    { href: '/misiones/cumplimiento', label: 'Cumplimiento', icon: <ClipboardCheck className="w-5 h-5" />, desc: 'Estado de obligaciones', color: 'teal', locked: !taxpayer },
    { href: '/misiones/casos', label: 'Casos prácticos', icon: <BookOpen className="w-5 h-5" />, desc: '3 ejercicios guiados', color: 'amber', locked: false },
    { href: '/misiones/admin', label: 'Panel docente', icon: <ShieldCheck className="w-5 h-5" />, desc: 'Seguimiento de estudiantes', color: 'slate', locked: false },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  }

  const statusColors: Record<string, string> = {
    draft: 'text-orange-600 bg-orange-50',
    submitted: 'text-blue-600 bg-blue-50',
    paid: 'text-emerald-600 bg-emerald-50',
    overdue: 'text-red-600 bg-red-50',
    pending: 'text-orange-600 bg-orange-50',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Borrador', submitted: 'Presentada', paid: 'Pagada', overdue: 'Vencida', pending: 'Pendiente',
  }

  return (
    <PageContainer
      title="ATM Misiones Simulado"
      subtitle="Simulador didáctico del sistema tributario provincial de Misiones"
    >
      {/* Banner didáctico */}
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-3 flex gap-3 items-start">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-700 uppercase tracking-wide">
            SIMULADOR DIDÁCTICO — NO OFICIAL — SIN VALIDEZ FISCAL NI LEGAL — DATOS DEMO
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            Este módulo simula el sistema tributario provincial de Misiones con fines exclusivamente educativos.
            Los trámites reales deben realizarse en{' '}
            <a href={MODULE_INFO.atm_website} target="_blank" rel="noopener noreferrer" className="underline">
              atm.misiones.gov.ar
            </a>
          </p>
        </div>
      </div>

      {/* Estado del contribuyente provincial */}
      {taxpayer ? (
        <Card padding="md" className="mb-6 border-emerald-200 bg-emerald-50/40">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-emerald-800">Inscripto como contribuyente provincial</span>
              </div>
              <p className="text-sm text-emerald-700 font-medium">{taxpayer.entity_name}</p>
              <p className="text-xs text-emerald-600">CUIT: {taxpayer.cuit} · IIBB N° {taxpayer.iibb_number ?? 'Pendiente asignación'}</p>
              <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                <MapPin className="w-3 h-3" /> {taxpayer.locality}, {taxpayer.department}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white rounded-lg px-4 py-2 border border-emerald-200">
                <p className="text-xl font-bold text-orange-600">{summary.iibbPending + summary.iibbOverdue}</p>
                <p className="text-xs text-slate-500">DDJJ pendientes</p>
              </div>
              <div className="bg-white rounded-lg px-4 py-2 border border-emerald-200">
                <p className="text-xl font-bold text-emerald-600">{summary.complianceScore}%</p>
                <p className="text-xs text-slate-500">Cumplimiento</p>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Alert variant="warning" className="mb-6">
          <strong>Sin inscripción provincial.</strong> Para acceder a todos los módulos, primero completá el{' '}
          <a href="/misiones/alta" className="underline font-semibold">Alta Provincial →</a>
        </Alert>
      )}

      {/* Módulos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {modules.map(m => (
          <a
            key={m.href}
            href={m.locked ? '#' : m.href}
            className={`block rounded-xl border p-4 transition-all ${
              m.locked
                ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200'
                : `${colorMap[m.color]} hover:shadow-md hover:scale-[1.02]`
            }`}
          >
            <div className="mb-2">{m.icon}</div>
            <p className="font-semibold text-sm leading-tight">{m.label}</p>
            <p className="text-xs mt-1 opacity-70">{m.desc}</p>
            {m.locked && <p className="text-xs mt-2 text-slate-400">Requiere alta provincial</p>}
          </a>
        ))}
      </div>

      {/* Actividad reciente */}
      {taxpayer && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DDJJ recientes */}
          <Card padding="none">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-700 text-sm">Últimas DDJJ IIBB</h3>
              <a href="/misiones/iibb" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                Ver todas <ChevronRight className="w-3 h-3" />
              </a>
            </div>
            {recentDDJJs.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                Sin declaraciones aún.{' '}
                <a href="/misiones/iibb/nueva" className="text-primary-600 underline">Nueva DDJJ →</a>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentDDJJs.map(d => (
                  <a key={d.id} href={`/misiones/iibb/${d.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{d.period_label}</p>
                      <p className="text-xs text-slate-400">Vence: {formatDate(d.due_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{formatCurrency(d.net_tax)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[d.status] || ''}`}>
                        {statusLabels[d.status] || d.status}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Card>

          {/* Pagos recientes */}
          <Card padding="none">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-700 text-sm">Boletas recientes</h3>
              <a href="/misiones/boletas" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                Ver todas <ChevronRight className="w-3 h-3" />
              </a>
            </div>
            {recentPayments.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                Sin boletas generadas.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{p.concept}</p>
                      <p className="text-xs text-slate-400">{p.period ? `Período: ${p.period}` : `Vence: ${formatDate(p.due_date)}`}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{formatCurrency(p.total_amount)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[p.status] || ''}`}>
                        {statusLabels[p.status] || p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Info footer */}
      <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl flex gap-3">
        <Info className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">
          <strong>Módulo educativo:</strong> {MODULE_INFO.legalDisclaimer}
        </p>
      </div>
    </PageContainer>
  )
}
