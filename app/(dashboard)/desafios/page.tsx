'use client'

import { useUser } from '@/hooks/useUser'
import { useProgress } from '@/hooks/useProgress'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  Trophy, Lock, CheckCircle2, ChevronRight,
  User, FileText, Building2, CreditCard, Wallet,
  Receipt, Users, DollarSign, MapPin, BookOpen,
  BarChart3, Target, Zap, Link2, Calculator, GraduationCap,
  Star,
} from 'lucide-react'

interface Desafio {
  id: string
  titulo: string
  descripcion: string
  href: string
  icon: React.ReactNode
  puntos: number
  categoria: string
  completado?: boolean
  bloqueado?: boolean
}

function DesafioCard({ d }: { d: Desafio }) {
  const inner = (
    <div className={cn(
      'group relative p-4 rounded-2xl border-2 transition-all h-full flex flex-col',
      d.completado
        ? 'border-emerald-200 bg-emerald-50'
        : d.bloqueado
          ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
          : 'border-slate-200 bg-white hover:border-violet-300 hover:shadow-md cursor-pointer',
    )}>
      <div className={cn(
        'absolute top-3 right-3 text-[10px] font-black px-2 py-0.5 rounded-full',
        d.completado ? 'bg-emerald-200 text-emerald-800' : 'bg-violet-100 text-violet-700',
      )}>
        {d.completado ? '✓' : `+${d.puntos} pts`}
      </div>

      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center mb-3 flex-shrink-0',
        d.completado ? 'bg-emerald-200 text-emerald-700'
          : d.bloqueado ? 'bg-slate-200 text-slate-400'
          : 'bg-violet-100 text-violet-700 group-hover:bg-violet-200',
      )}>
        {d.bloqueado ? <Lock className="w-4 h-4" /> : d.icon}
      </div>

      <p className={cn('text-sm font-bold mb-1', d.completado ? 'text-emerald-800' : 'text-slate-800')}>
        {d.titulo}
      </p>
      <p className="text-xs text-slate-500 leading-relaxed flex-1">{d.descripcion}</p>

      {!d.bloqueado && !d.completado && (
        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-violet-600">
          Ir al módulo <ChevronRight className="w-3.5 h-3.5" />
        </div>
      )}
      {d.completado && (
        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5" /> Completado
        </div>
      )}
    </div>
  )

  if (d.bloqueado || d.completado) return inner
  return <Link href={d.href} className="h-full">{inner}</Link>
}

export default function DesafiosPage() {
  const { user }     = useUser()
  const { progress } = useProgress(user?.id ?? null)

  const desafios: Desafio[] = [
    // ── Primeros pasos ──────────────────────────────────────────────────────
    {
      id: 'perfil',
      titulo: 'Crear perfil de contribuyente',
      descripcion: 'Completá tu CUIT, nombre y datos básicos. Es el primer paso en ARCA.',
      href: '/perfil-contribuyente',
      icon: <User className="w-5 h-5" />,
      puntos: 50,
      categoria: 'Primeros pasos',
      completado: progress?.hasTaxpayerProfile,
    },
    {
      id: 'alta',
      titulo: 'Alta en el padrón',
      descripcion: 'Simulá el Alta Registral (F. 460/F) para quedar inscripto en ARCA.',
      href: '/alta-rut',
      icon: <FileText className="w-5 h-5" />,
      puntos: 100,
      categoria: 'Primeros pasos',
      completado: progress?.registrationComplete,
      bloqueado: !progress?.hasTaxpayerProfile,
    },
    {
      id: 'domicilio',
      titulo: 'Domicilio fiscal electrónico',
      descripcion: 'Habilitá la casilla oficial de notificaciones de ARCA.',
      href: '/domicilio-fiscal',
      icon: <Building2 className="w-5 h-5" />,
      puntos: 75,
      categoria: 'Primeros pasos',
      completado: progress?.hasEFiscalAddress,
      bloqueado: !progress?.registrationComplete,
    },

    // ── Monotributo ─────────────────────────────────────────────────────────
    {
      id: 'mono-categoria',
      titulo: 'Elegir categoría Monotributo',
      descripcion: 'Calculá la categoría correcta según tus ingresos y actividad.',
      href: '/monotributo',
      icon: <BarChart3 className="w-5 h-5" />,
      puntos: 100,
      categoria: 'Monotributo',
      completado: progress?.hasMonoProfile,
      bloqueado: !progress?.hasActiveRegime,
    },
    {
      id: 'mono-pago',
      titulo: 'Pagar cuota mensual',
      descripcion: 'Abonás la cuota unificada (impuesto + obra social + jubilación).',
      href: '/monotributo',
      icon: <CreditCard className="w-5 h-5" />,
      puntos: 150,
      categoria: 'Monotributo',
      completado: progress?.hasMonoPayment,
      bloqueado: !progress?.hasActiveRegime,
    },
    {
      id: 'mono-factura',
      titulo: 'Emitir primera factura C',
      descripcion: 'Generá un comprobante tipo C como monotributista.',
      href: '/comprobantes/nuevo',
      icon: <Receipt className="w-5 h-5" />,
      puntos: 200,
      categoria: 'Monotributo',
      completado: progress?.hasInvoice && progress?.hasMonoProfile,
      bloqueado: !progress?.hasPOS,
    },

    // ── Autónomos ───────────────────────────────────────────────────────────
    {
      id: 'auto-aportes',
      titulo: 'Calcular aportes autónomos',
      descripcion: 'Determiná la categoría y el monto mensual de aportes a ANSES.',
      href: '/autonomos',
      icon: <DollarSign className="w-5 h-5" />,
      puntos: 150,
      categoria: 'Autónomos',
    },
    {
      id: 'auto-vep',
      titulo: 'Pagar VEP de autónomos',
      descripcion: 'Simulá el pago electrónico de aportes previsionales.',
      href: '/autonomos',
      icon: <Wallet className="w-5 h-5" />,
      puntos: 100,
      categoria: 'Autónomos',
    },

    // ── Empleador ───────────────────────────────────────────────────────────
    {
      id: 'emp-vincular',
      titulo: 'Vincular empresa (Sueldos 360)',
      descripcion: 'Conectá una empresa con código de sincronización para ver empleados y liquidaciones.',
      href: '/administrador-relaciones',
      icon: <Users className="w-5 h-5" />,
      puntos: 200,
      categoria: 'Empleador',
      completado: progress?.hasEmployer,
    },
    {
      id: 'emp-alta',
      titulo: 'Dar de alta un empleado',
      descripcion: 'Presentá el F.2/45 (alta temprana) de un nuevo trabajador.',
      href: '/administrador-relaciones',
      icon: <Users className="w-5 h-5" />,
      puntos: 150,
      categoria: 'Empleador',
      completado: progress?.hasEmployee,
      bloqueado: !progress?.hasEmployer,
    },
    {
      id: 'emp-f931',
      titulo: 'Presentar F.931 y pagar VEP',
      descripcion: 'Declará las cargas sociales del mes y pagá el VEP de contribuciones patronales.',
      href: '/administrador-relaciones',
      icon: <BarChart3 className="w-5 h-5" />,
      puntos: 250,
      categoria: 'Empleador',
      completado: progress?.hasSocialSecurityReturn,
      bloqueado: !progress?.hasEmployee,
    },

    // ── Billetera ───────────────────────────────────────────────────────────
    {
      id: 'billetera-carga',
      titulo: 'Cargar saldo en la Billetera Fiscal',
      descripcion: 'Ingresá fondos por homebanking, MercadoPago o débito automático.',
      href: '/billetera',
      icon: <Wallet className="w-5 h-5" />,
      puntos: 75,
      categoria: 'Billetera Fiscal',
      completado: progress?.hasAnyFiscalPayment,
    },

    // ── Régimen General ─────────────────────────────────────────────────────
    {
      id: 'rg-pymez',
      titulo: 'Conectar facturación (PyMEZ 360)',
      descripcion: 'Sincronizá las ventas y compras del período para calcular IVA e IIBB automáticamente.',
      href: '/regimen-general',
      icon: <Link2 className="w-5 h-5" />,
      puntos: 150,
      categoria: 'Régimen General',
      completado: progress?.hasPOS && progress?.hasInvoice,
      bloqueado: !progress?.hasActiveRegime,
    },
    {
      id: 'rg-iva-ddjj',
      titulo: 'Calcular y presentar DDJJ IVA',
      descripcion: 'Determiná el débito y crédito fiscal del período. El saldo a pagar se genera como VEP.',
      href: '/regimen-general',
      icon: <Calculator className="w-5 h-5" />,
      puntos: 200,
      categoria: 'Régimen General',
      completado: progress?.hasVatReturn,
      bloqueado: !progress?.hasActiveRegime,
    },
    {
      id: 'rg-ganancias',
      titulo: 'Anticipo de Ganancias',
      descripcion: 'Calculá el anticipo mensual de Impuesto a las Ganancias sobre la utilidad estimada.',
      href: '/regimen-general',
      icon: <BarChart3 className="w-5 h-5" />,
      puntos: 150,
      categoria: 'Régimen General',
      completado: progress?.hasIncomeTaxReturn,
      bloqueado: !progress?.hasActiveRegime,
    },
    {
      id: 'rg-factura-a',
      titulo: 'Emitir factura tipo A',
      descripcion: 'Generá un comprobante tipo A para un cliente Responsable Inscripto.',
      href: '/comprobantes/nuevo',
      icon: <Receipt className="w-5 h-5" />,
      puntos: 100,
      categoria: 'Régimen General',
      completado: progress?.hasInvoice && progress?.hasVatReturn,
      bloqueado: !progress?.hasPOS,
    },

    // ── Provincial ──────────────────────────────────────────────────────────
    {
      id: 'prov-inscripcion',
      titulo: 'Inscripción en IIBB Misiones',
      descripcion: 'Completá el alta en Ingresos Brutos en la ATM de la provincia de Misiones.',
      href: '/misiones',
      icon: <MapPin className="w-5 h-5" />,
      puntos: 150,
      categoria: 'Impuestos provinciales',
      completado: progress?.hasProvincialProfile,
    },
    {
      id: 'prov-ddjj-manual',
      titulo: 'Presentar DDJJ de IIBB',
      descripcion: 'Declaración jurada mensual de Ingresos Brutos ante la ATM Misiones.',
      href: '/misiones/iibb/nueva',
      icon: <BookOpen className="w-5 h-5" />,
      puntos: 200,
      categoria: 'Impuestos provinciales',
      completado: progress?.hasIIBBReturn,
      bloqueado: !progress?.hasProvincialProfile,
    },
    {
      id: 'prov-ddjj-pymez',
      titulo: 'DDJJ IIBB con datos de PyMEZ 360',
      descripcion: 'Importá los ingresos de facturación desde PyMEZ 360 para pre-completar la base imponible.',
      href: '/misiones/iibb/nueva',
      icon: <Link2 className="w-5 h-5" />,
      puntos: 250,
      categoria: 'Impuestos provinciales',
      completado: progress?.hasIIBBReturn && progress?.hasProvincialPayment,
      bloqueado: !progress?.hasProvincialProfile,
    },
  ]

  const categorias    = Array.from(new Set(desafios.map(d => d.categoria)))
  const totalPuntos   = desafios.filter(d => d.completado).reduce((s, d) => s + d.puntos, 0)
  const completados   = desafios.filter(d => d.completado).length
  const pctGlobal     = Math.round((completados / desafios.length) * 100)
  const completionPct = progress?.completionPercentage ?? 0
  const examDisponible = completionPct >= 60

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" /> Desafíos fiscales
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Completá desafíos para aprender haciendo. Cada módulo tiene una misión real.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
            <p className="text-xl font-black text-amber-700">{totalPuntos}</p>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">puntos</p>
          </div>
          <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-2 text-center">
            <p className="text-xl font-black text-violet-700">{completados}/{desafios.length}</p>
            <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide">completados</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center">
            <p className="text-xl font-black text-blue-700">{completionPct}%</p>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">simulador</p>
          </div>
        </div>
      </div>

      {/* Barra de progreso global */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-4 h-4 text-violet-600" />
          <p className="text-sm font-bold text-slate-700">Progreso en desafíos</p>
          <span className="ml-auto text-sm font-black text-violet-700">{pctGlobal}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${pctGlobal}%` }}
          />
        </div>
        {completados === desafios.length && (
          <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> ¡Completaste todos los desafíos! Sos un experto fiscal.
          </p>
        )}
      </div>

      {/* Desafíos por categoría */}
      {categorias.map(cat => {
        const items   = desafios.filter(d => d.categoria === cat)
        const catComp = items.filter(d => d.completado).length
        const catPct  = Math.round((catComp / items.length) * 100)
        return (
          <section key={cat}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">{cat}</h2>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${catPct}%` }}
                  />
                </div>
                <span className={cn(
                  'text-[10px] font-bold',
                  catComp === items.length ? 'text-emerald-600' : 'text-slate-400',
                )}>
                  {catComp}/{items.length} · {catPct}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(d => <DesafioCard key={d.id} d={d} />)}
            </div>
          </section>
        )
      })}

      {/* Examen final */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Examen final del simulador</h2>
          <span className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
            examDisponible
              ? 'text-amber-700 bg-amber-50 border-amber-200'
              : 'text-slate-400 bg-slate-50 border-slate-200',
          )}>
            {examDisponible ? 'Disponible' : `Requiere 60% del simulador · tu avance: ${completionPct}%`}
          </span>
        </div>

        {examDisponible ? (
          <Link href="/examen/tributar">
            <div className="group border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 hover:shadow-lg hover:border-amber-400 cursor-pointer transition-all">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                  <GraduationCap className="w-7 h-7 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-base font-black text-slate-800">Examen Final: Simulador TRIBUT.AR</p>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">+1000 XP</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    15 preguntas sobre el uso del ecosistema digital. Pondrás a prueba tu dominio
                    del simulador: navegación, integración entre plataformas y flujo fiscal completo.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500" /> 70% mínimo para aprobar</span>
                    <span>20 minutos</span>
                    <span>15 preguntas</span>
                    <span className="flex items-center gap-1 text-amber-700 font-bold ml-auto">
                      Comenzar examen <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="border-2 border-slate-200 bg-slate-50 rounded-2xl p-5 opacity-70">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                <Lock className="w-7 h-7 text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="text-base font-black text-slate-500 mb-1">Examen Final: Simulador TRIBUT.AR</p>
                <p className="text-sm text-slate-400 mb-3">
                  El examen final se desbloquea al alcanzar el 60% de completud en el simulador.
                  Continuá explorando los módulos para desbloquearlo.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[200px]">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((completionPct / 60) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">{completionPct}/60%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
