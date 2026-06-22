'use client'

import { useUser } from '@/hooks/useUser'
import { useProgress } from '@/hooks/useProgress'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  Trophy, Lock, CheckCircle2, ChevronRight,
  User, FileText, Building2, CreditCard, Wallet,
  Receipt, Users, DollarSign, MapPin, BookOpen,
  BarChart3, Target, Zap, Link2, Calculator,
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
      {/* Badge de puntos */}
      <div className={cn(
        'absolute top-3 right-3 text-[10px] font-black px-2 py-0.5 rounded-full',
        d.completado ? 'bg-emerald-200 text-emerald-800' : 'bg-violet-100 text-violet-700',
      )}>
        {d.completado ? '✓' : `+${d.puntos} pts`}
      </div>

      {/* Ícono */}
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
  const { user }                = useUser()
  const { progress }            = useProgress(user?.id ?? null)

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
    },
    {
      id: 'emp-alta',
      titulo: 'Dar de alta un empleado',
      descripcion: 'Presentá el F.2/45 (alta temprana) de un nuevo trabajador.',
      href: '/administrador-relaciones',
      icon: <Users className="w-5 h-5" />,
      puntos: 150,
      categoria: 'Empleador',
    },
    {
      id: 'emp-f931',
      titulo: 'Presentar F.931 y pagar VEP',
      descripcion: 'Declará las cargas sociales del mes y pagá el VEP de contribuciones patronales.',
      href: '/administrador-relaciones',
      icon: <BarChart3 className="w-5 h-5" />,
      puntos: 250,
      categoria: 'Empleador',
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
    },
    {
      id: 'prov-ddjj-manual',
      titulo: 'Presentar DDJJ de IIBB',
      descripcion: 'Declaración jurada mensual de Ingresos Brutos ante la ATM Misiones.',
      href: '/misiones/iibb/nueva',
      icon: <BookOpen className="w-5 h-5" />,
      puntos: 200,
      categoria: 'Impuestos provinciales',
    },
    {
      id: 'prov-ddjj-pymez',
      titulo: 'DDJJ IIBB con datos de PyMEZ 360',
      descripcion: 'Importá los ingresos de facturación directamente desde PyMEZ 360 para pre-completar la base imponible de IIBB.',
      href: '/misiones/iibb/nueva',
      icon: <Link2 className="w-5 h-5" />,
      puntos: 250,
      categoria: 'Impuestos provinciales',
    },
  ]

  const categorias = Array.from(new Set(desafios.map(d => d.categoria)))
  const totalPuntos = desafios.filter(d => d.completado).reduce((s, d) => s + d.puntos, 0)
  const completados  = desafios.filter(d => d.completado).length

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
        {/* Resumen de progreso */}
        <div className="flex gap-3 flex-wrap">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
            <p className="text-xl font-black text-amber-700">{totalPuntos}</p>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">puntos</p>
          </div>
          <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-2 text-center">
            <p className="text-xl font-black text-violet-700">{completados}/{desafios.length}</p>
            <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide">completados</p>
          </div>
        </div>
      </div>

      {/* Barra de progreso general */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-4 h-4 text-violet-600" />
          <p className="text-sm font-bold text-slate-700">Progreso general</p>
          <span className="ml-auto text-sm font-black text-violet-700">
            {Math.round((completados / desafios.length) * 100)}%
          </span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${(completados / desafios.length) * 100}%` }} />
        </div>
        {completados === desafios.length && (
          <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> ¡Completaste todos los desafíos! Sos un experto fiscal.
          </p>
        )}
      </div>

      {/* Desafíos por categoría */}
      {categorias.map(cat => {
        const items = desafios.filter(d => d.categoria === cat)
        const catCompletados = items.filter(d => d.completado).length
        return (
          <section key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">{cat}</h2>
              {catCompletados > 0 && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {catCompletados}/{items.length}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(d => <DesafioCard key={d.id} d={d} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}
