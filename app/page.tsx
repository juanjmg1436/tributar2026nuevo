import Link from 'next/link'
import Image from 'next/image'
import { AuthorPhoto } from '@/components/ui/AuthorPhoto'
import {
  BookOpen,
  GraduationCap,
  BarChart3,
  ArrowRight,
  Star,
  FileText,
  Settings,
  Mail,
  Layers,
  Users,
  ShoppingCart,
  ReceiptText,
  TrendingUp,
  DollarSign,
  MapPin,
  LayoutDashboard,
  CheckCircle2,
  ShoppingBag,
  Receipt,
  Building2,
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">

      {/* ── BANNER EDUCATIVO ────────────────────────────── */}
      <div className="simulator-banner">
        ⚠️ SIMULADOR DIDÁCTICO — NO OFICIAL — SIN VALIDEZ FISCAL NI LEGAL — DATOS DEMO
      </div>

      {/* ── NAVBAR ──────────────────────────────────────── */}
      <nav className="sticky top-[42px] z-40 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/logo-tributar.png"
              alt="TRIBUT.AR"
              width={36}
              height={36}
              className="rounded-lg object-contain"
            />
            <span className="text-xl font-bold text-primary-900 tracking-tight">TRIBUT.AR</span>
            <span className="hidden sm:inline-block text-xs font-medium text-slate-400 ml-1 border border-slate-200 rounded px-1.5 py-0.5">Beta</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden sm:block text-sm font-medium text-slate-600 hover:text-primary-700 transition-colors whitespace-nowrap"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login"
              className="sm:hidden text-sm font-medium text-slate-600 hover:text-primary-700 transition-colors"
            >
              Ingresar
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-primary-700 hover:bg-primary-800 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              <span className="sm:hidden">Registrarse</span>
              <span className="hidden sm:inline">Registrarse gratis</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 text-white">
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* Orb decorations */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-600 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-accent-500 rounded-full blur-3xl opacity-15 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium text-blue-200 mb-8">
              <GraduationCap className="w-4 h-4" />
              Herramienta educativa gratuita
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight mb-6">
              Entendé el sistema{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-blue-300">
                fiscal argentino
              </span>
              {' '}sin miedo.
            </h1>

            <p className="text-lg sm:text-xl text-blue-200 leading-relaxed mb-10 max-w-2xl mx-auto">
              TRIBUT.AR es un simulador educativo que te guía paso a paso por los
              procesos tributarios de Argentina — desde el alta en AFIP hasta la
              liquidación de sueldos y los impuestos provinciales — en un entorno
              seguro, sin consecuencias reales.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-primary-800 hover:bg-blue-50 font-bold px-8 py-3.5 rounded-xl text-base shadow-lg shadow-primary-950/40 transition-all hover:scale-105"
              >
                Comenzar gratis
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-all"
              >
                Ya tengo cuenta
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-6 border-t border-white/10 pt-10">
              {[
                { value: '17', label: 'módulos didácticos' },
                { value: '100%', label: 'gratuito' },
                { value: '0', label: 'consecuencias reales' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-bold text-white">{value}</div>
                  <div className="text-sm text-blue-300 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── MÓDULOS ─────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-3">¿Qué podés simular?</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              17 módulos que cubren todo el ciclo fiscal.
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Desde la inscripción ante AFIP hasta los impuestos provinciales, pasando por sueldos, declaraciones juradas y facturación electrónica.
            </p>
          </div>

          {/* Categorías de módulos */}
          <div className="space-y-12">

            {/* Registral */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3">
                  📋 Registral e identidad fiscal
                </span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    icon: <Users className="w-5 h-5" />,
                    color: 'bg-blue-50 text-blue-700',
                    title: 'Perfil del contribuyente',
                    desc: 'Creá tu contribuyente simulado con CUIT, actividad económica y domicilio.',
                  },
                  {
                    icon: <FileText className="w-5 h-5" />,
                    color: 'bg-violet-50 text-violet-700',
                    title: 'Alta registral (6 pasos)',
                    desc: 'Simulá el proceso de inscripción ante AFIP con sus 6 etapas oficiales.',
                  },
                  {
                    icon: <Settings className="w-5 h-5" />,
                    color: 'bg-emerald-50 text-emerald-700',
                    title: 'Régimen tributario',
                    desc: 'Elegí entre Monotributo, Responsable Inscripto o Empresa. El simulador adapta todo.',
                  },
                  {
                    icon: <Mail className="w-5 h-5" />,
                    color: 'bg-amber-50 text-amber-700',
                    title: 'Domicilio Fiscal Electrónico',
                    desc: 'Constituí el buzón oficial de notificaciones de AFIP (DFE).',
                  },
                ].map(({ icon, color, title, desc }) => (
                  <ModuleCard key={title} icon={icon} color={color} title={title} desc={desc} />
                ))}
              </div>
            </div>

            {/* Facturación */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3">
                  🧾 Facturación y compras
                </span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    icon: <ShoppingBag className="w-5 h-5" />,
                    color: 'bg-sky-50 text-sky-700',
                    title: 'Puntos de venta',
                    desc: 'Habilitá puntos de venta virtuales para poder emitir comprobantes electrónicos.',
                  },
                  {
                    icon: <Receipt className="w-5 h-5" />,
                    color: 'bg-rose-50 text-rose-700',
                    title: 'Comprobantes (Factura A/B/C)',
                    desc: 'Emití facturas electrónicas, notas de crédito y débito con datos reales de diseño.',
                  },
                  {
                    icon: <ShoppingCart className="w-5 h-5" />,
                    color: 'bg-orange-50 text-orange-700',
                    title: 'Compras y gastos',
                    desc: 'Registrá compras a proveedores. El crédito fiscal IVA se computa automáticamente para RI.',
                  },
                ].map(({ icon, color, title, desc }) => (
                  <ModuleCard key={title} icon={icon} color={color} title={title} desc={desc} />
                ))}
              </div>
            </div>

            {/* DDJJ */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3">
                  📊 Declaraciones juradas e impuestos nacionales
                </span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    icon: <ReceiptText className="w-5 h-5" />,
                    color: 'bg-blue-50 text-blue-700',
                    title: 'DDJJ IVA mensual',
                    desc: 'Calculá débito y crédito fiscal, liquidá el saldo y generá el VEP de pago. Solo Responsables Inscriptos.',
                  },
                  {
                    icon: <TrendingUp className="w-5 h-5" />,
                    color: 'bg-emerald-50 text-emerald-700',
                    title: 'Ganancias (PH / PJ)',
                    desc: 'Presentá la DDJJ anual de Ganancias con deducciones, escalas de alícuotas y saldo a pagar.',
                  },
                  {
                    icon: <Layers className="w-5 h-5" />,
                    color: 'bg-amber-50 text-amber-700',
                    title: 'Monotributo',
                    desc: 'Calculá tu categoría, pagá la cuota mensual unificada y simulá la recategorización semestral.',
                  },
                ].map(({ icon, color, title, desc }) => (
                  <ModuleCard key={title} icon={icon} color={color} title={title} desc={desc} />
                ))}
              </div>
            </div>

            {/* Laboral */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3">
                  👥 Módulo laboral
                </span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    icon: <Building2 className="w-5 h-5" />,
                    color: 'bg-violet-50 text-violet-700',
                    title: 'Alta de empleados',
                    desc: 'Registrá empleados en relación de dependencia y gestioná el alta ante AFIP como empleador.',
                  },
                  {
                    icon: <DollarSign className="w-5 h-5" />,
                    color: 'bg-rose-50 text-rose-700',
                    title: 'Liquidación de sueldos',
                    desc: 'Calculá los recibos de sueldo mensuales con retenciones, aportes y contribuciones patronales.',
                  },
                  {
                    icon: <BarChart3 className="w-5 h-5" />,
                    color: 'bg-sky-50 text-sky-700',
                    title: 'Cargas Sociales (F.931)',
                    desc: 'Presentá el formulario 931 de cargas sociales con el detalle de cada empleado y el VEP de pago.',
                  },
                ].map(({ icon, color, title, desc }) => (
                  <ModuleCard key={title} icon={icon} color={color} title={title} desc={desc} />
                ))}
              </div>
            </div>

            {/* Provincial + Estado */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3">
                  🗺️ Provincial y resumen fiscal
                </span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    icon: <MapPin className="w-5 h-5" />,
                    color: 'bg-teal-50 text-teal-700',
                    title: 'ATM Misiones (alta)',
                    desc: 'Inscripción en Ingresos Brutos provincial ante la Agencia Tributaria Misiones.',
                  },
                  {
                    icon: <ReceiptText className="w-5 h-5" />,
                    color: 'bg-teal-50 text-teal-700',
                    title: 'DDJJ IIBB provincial',
                    desc: 'Presentá la declaración mensual de Ingresos Brutos y pagá la boleta provincial.',
                  },
                  {
                    icon: <LayoutDashboard className="w-5 h-5" />,
                    color: 'bg-primary-50 text-primary-700',
                    title: 'Estado fiscal integral',
                    desc: 'Tablero de cumplimiento global: puntaje 0-100, estado de cada obligación y VEPs emitidos.',
                  },
                  {
                    icon: <BarChart3 className="w-5 h-5" />,
                    color: 'bg-slate-100 text-slate-600',
                    title: 'Panel docente',
                    desc: 'Parámetros fiscales editables, escenarios pedagógicos y tabla de categorías de Monotributo.',
                  },
                ].map(({ icon, color, title, desc }) => (
                  <ModuleCard key={title} icon={icon} color={color} title={title} desc={desc} />
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 10 ETAPAS ───────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-3">Recorrido pedagógico</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">10 etapas que se desbloquean progresivamente</h2>
            <p className="text-slate-500 text-base max-w-xl mx-auto">
              Cada etapa completa la anterior. Aprendés haciendo, con explicaciones en cada paso.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { n: '01', title: 'Registro e inicio', desc: 'Creás tu cuenta y accedés al simulador.' },
              { n: '02', title: 'Perfil del contribuyente', desc: 'Configurás el contribuyente simulado con sus datos básicos.' },
              { n: '03', title: 'Alta registral', desc: 'Completás los 6 pasos del proceso de inscripción ante AFIP.' },
              { n: '04', title: 'Situación tributaria', desc: 'Elegís el régimen fiscal: Monotributo, RI o Empresa.' },
              { n: '05', title: 'Domicilio Fiscal Electrónico', desc: 'Constituís el buzón oficial de notificaciones del organismo.' },
              { n: '06', title: 'Facturación', desc: 'Habilitás punto de venta, emitís comprobantes y registrás compras.' },
              { n: '07', title: 'Declaraciones juradas', desc: 'Presentás IVA, Monotributo o Ganancias según tu régimen.' },
              { n: '08', title: 'Módulo laboral', desc: 'Das de alta empleados, liquidás sueldos y presentás el F.931.' },
              { n: '09', title: 'Impuestos provinciales', desc: 'Te inscribís en IIBB Misiones y presentás la DDJJ provincial.' },
              { n: '10', title: 'Estado fiscal integral', desc: 'Revisás tu puntaje de cumplimiento global y el historial de pagos.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-4 items-start bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-primary-700 text-white rounded-xl flex items-center justify-center font-bold text-sm">
                  {n}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-0.5">{title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RÉGIMEN ADAPTATIVO ──────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-3">Inteligencia fiscal</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">El simulador se adapta a tu régimen</h2>
            <p className="text-slate-500 text-base max-w-xl mx-auto">
              Monotributistas y Responsables Inscriptos tienen obligaciones distintas. TRIBUT.AR lo detecta y bloquea o habilita módulos automáticamente.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg font-bold text-amber-700">🟡 Monotributista</span>
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  ['✅', 'Cuota mensual unificada (IVA + Ganancias incluidos)'],
                  ['✅', 'Facturación (Facturas C)'],
                  ['✅', 'Registro de compras (sin crédito IVA)'],
                  ['✅', 'Empleados, sueldos y F.931'],
                  ['✅', 'IIBB provincial'],
                  ['❌', 'DDJJ IVA mensual (no aplica)'],
                  ['❌', 'DDJJ Ganancias (no aplica)'],
                ].map(([icon, text]) => (
                  <li key={text} className="flex items-start gap-2">
                    <span>{icon}</span>
                    <span className={icon === '❌' ? 'text-slate-400 line-through' : 'text-amber-800'}>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg font-bold text-emerald-700">🟢 Responsable Inscripto / Empresa</span>
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  ['✅', 'DDJJ IVA mensual (débito – crédito fiscal)'],
                  ['✅', 'DDJJ Ganancias anual (PH o PJ)'],
                  ['✅', 'Facturación (Facturas A y B)'],
                  ['✅', 'Compras con crédito fiscal IVA'],
                  ['✅', 'Empleados, sueldos y F.931'],
                  ['✅', 'IIBB provincial'],
                  ['❌', 'Monotributo (incompatible con RI)'],
                ].map(([icon, text]) => (
                  <li key={text} className="flex items-start gap-2">
                    <span>{icon}</span>
                    <span className={icon === '❌' ? 'text-slate-400 line-through' : 'text-emerald-800'}>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── PARA QUIÉN ──────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-3">Audiencia</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">¿Para quién está pensado?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                icon: <GraduationCap className="w-7 h-7" />,
                color: 'text-primary-700 bg-primary-50',
                title: 'Estudiantes universitarios',
                desc: 'Ideal para carreras de Contabilidad, Administración, Derecho y afines que incluyan materia tributaria en su currícula.',
              },
              {
                icon: <BookOpen className="w-7 h-7" />,
                color: 'text-violet-700 bg-violet-50',
                title: 'Docentes y capacitadores',
                desc: 'Utilizalo como herramienta pedagógica en clases presenciales o virtuales para ilustrar conceptos fiscales complejos.',
              },
              {
                icon: <Star className="w-7 h-7" />,
                color: 'text-amber-700 bg-amber-50',
                title: 'Emprendedores y curiosos',
                desc: 'Entendé cómo funciona el sistema impositivo argentino antes de arrancar tu emprendimiento, sin riesgos ni costos.',
              },
            ].map(({ icon, color, title, desc }) => (
              <div key={title} className="text-center p-6">
                <div className={`w-16 h-16 ${color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  {icon}
                </div>
                <h3 className="font-semibold text-slate-900 text-base mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APOYÁ EL PROYECTO ───────────────────────────── */}
      <section className="py-14 bg-blue-50 border-y border-blue-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Colaboraciones</p>
          <h2 className="text-2xl font-bold text-blue-900 mb-3">¿Te resultó útil TRIBUT.AR?</h2>
          <p className="text-blue-700 text-base mb-6 max-w-xl mx-auto">
            Esta herramienta es y seguirá siendo <strong>gratuita</strong>. Si querés apoyar el
            desarrollo de nuevos módulos, podés hacer un aporte voluntario por Mercado Pago.
          </p>
          <div className="inline-block bg-white border border-blue-200 rounded-2xl px-6 py-5 shadow-sm text-left">
            <p className="text-sm font-semibold text-blue-800 mb-2">💙 Transferir por Mercado Pago</p>
            <p className="text-xs text-blue-600 mb-1">
              CVU: <span className="font-mono font-semibold text-blue-900 select-all">0000003100045253425987</span>
            </p>
            <p className="text-xs text-blue-600">
              Alias: <span className="font-semibold text-blue-900 select-all">juanjmg14</span>
            </p>
          </div>
          <p className="text-xs text-blue-500 mt-4">
            Aporte voluntario · simulareducativo@gmail.com
          </p>
        </div>
      </section>

      {/* ── AUTOR ───────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-slate-900 to-primary-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <p className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-3">Sobre el autor</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-12">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
              <AuthorPhoto size={112} />
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">Juan Manuel Gómez</h3>
                <p className="text-blue-300 text-sm font-medium mb-1">📍 Wanda, Misiones, Argentina</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    '🎓 Prof. en Cs. Económicas — FHyCS, UNaM',
                    '📘 Lic. en Educación — Universidad FASTA',
                    '💡 Experto en Tecnología Educativa',
                  ].map(tag => (
                    <span key={tag} className="text-xs bg-white/10 text-blue-200 border border-white/10 rounded-full px-3 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-blue-100 text-sm leading-relaxed mb-6">
                  TRIBUT.AR nació de la necesidad de contar con una herramienta práctica y sin riesgos
                  para aprender el sistema impositivo argentino. Desarrollada con Next.js 14, TypeScript,
                  Supabase y Tailwind CSS, la plataforma cubre desde la inscripción ante AFIP hasta la
                  liquidación de sueldos y los impuestos provinciales, buscando democratizar el acceso
                  al conocimiento fiscal desde las aulas universitarias.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Next.js 14', 'TypeScript', 'Supabase', 'Tailwind CSS', 'React 18'].map(tech => (
                    <span
                      key={tech}
                      className="text-xs font-medium bg-white/10 text-blue-200 border border-white/10 rounded-full px-3 py-1"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-blue-300">
                © 2026 Juan Manuel Gómez — TRIBUT.AR. Todos los derechos reservados.
              </p>
              <div className="flex gap-3">
                <a
                  href="mailto:simulareducativo@gmail.com"
                  className="flex items-center gap-2 text-sm text-blue-300 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  simulareducativo@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="w-14 h-14 bg-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Empezá a aprender hoy, sin costo.</h2>
          <p className="text-slate-500 text-lg mb-8">
            Sin tarjeta de crédito. Sin datos fiscales reales. Solo aprendizaje.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-bold px-8 py-4 rounded-xl text-base shadow-lg shadow-primary-700/30 transition-all hover:scale-105"
          >
            Crear cuenta gratuita
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-primary-700 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold text-lg">TRIBUT.AR</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-400">
                Simulador didáctico del sistema fiscal argentino. Herramienta educativa sin validez legal ni fiscal.
              </p>
              <p className="text-xs mt-3 text-slate-500">
                Versión 1.0 · Desarrollado en Argentina 🇦🇷
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Plataforma</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/register" className="hover:text-white transition-colors">Registrarse</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link></li>
                <li><Link href="/diagnostico" className="hover:text-white transition-colors">Diagnóstico técnico</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terminos" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
                <li><Link href="/privacidad" className="hover:text-white transition-colors">Política de Privacidad</Link></li>
                <li>
                  <a href="mailto:simulareducativo@gmail.com" className="hover:text-white transition-colors">
                    simulareducativo@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>© 2026 Juan Manuel Gómez — TRIBUT.AR. Todos los derechos reservados.</p>
            <p className="text-center">
              Herramienta educativa · No oficial · Sin validez fiscal ni legal · Datos de demo
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}

/* ── Componente reutilizable para cards de módulo ── */
function ModuleCard({
  icon,
  color,
  title,
  desc,
}: {
  icon: React.ReactNode
  color: string
  title: string
  desc: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{title}</h3>
      <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
    </div>
  )
}
