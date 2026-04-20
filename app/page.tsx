import Link from 'next/link'
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
            <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold text-primary-900 tracking-tight">TRIBUT.AR</span>
            <span className="hidden sm:inline-block text-xs font-medium text-slate-400 ml-1 border border-slate-200 rounded px-1.5 py-0.5">Beta</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-primary-700 transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-primary-700 hover:bg-primary-800 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Registrarse gratis
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
              emisión de comprobantes — en un entorno seguro, sin consecuencias reales.
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
                { value: '9', label: 'módulos didácticos' },
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

      {/* ── FEATURES ────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-3">¿Qué podés hacer?</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Todo lo que necesitás saber sobre tributos, en un solo lugar.
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Simulá los trámites más comunes ante la AFIP en un ambiente controlado, sin riesgo de cometer errores reales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <FileText className="w-6 h-6" />,
                color: 'bg-blue-50 text-primary-700',
                title: 'Alta registral completa',
                desc: 'Simulá el proceso de inscripción de una empresa ante AFIP, elegí actividades económicas y configurá tu situación tributaria inicial.',
              },
              {
                icon: <Settings className="w-6 h-6" />,
                color: 'bg-violet-50 text-violet-700',
                title: 'Régimen tributario',
                desc: 'Comprendé las diferencias entre Monotributo, Responsable Inscripto y otros regímenes. Elegí el que corresponde a tu situación.',
              },
              {
                icon: <Mail className="w-6 h-6" />,
                color: 'bg-emerald-50 text-emerald-700',
                title: 'Domicilio fiscal electrónico',
                desc: 'Aprendé a constituir y gestionar el domicilio fiscal electrónico, el canal oficial de comunicación con el organismo.',
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                color: 'bg-amber-50 text-amber-700',
                title: 'Estado de cuenta',
                desc: 'Visualizá el estado de tus obligaciones tributarias: vencimientos, saldos, pagos y la posición financiera ante el fisco.',
              },
              {
                icon: <Layers className="w-6 h-6" />,
                color: 'bg-rose-50 text-rose-700',
                title: 'Puntos de venta y comprobantes',
                desc: 'Habilitá puntos de venta virtuales y simulá la emisión de facturas A, B y C, aprendiendo el flujo completo de facturación.',
              },
              {
                icon: <Users className="w-6 h-6" />,
                color: 'bg-sky-50 text-sky-700',
                title: 'Administrador de relaciones',
                desc: 'Gestioná relaciones de representación y apoderamiento como se hace en los servicios de AFIP en el mundo real.',
              },
            ].map(({ icon, color, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {icon}
                </div>
                <h3 className="font-semibold text-slate-900 text-base mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ───────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-3">Paso a paso</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">¿Cómo funciona?</h2>
          </div>
          <div className="space-y-6">
            {[
              {
                n: '01',
                title: 'Creás tu cuenta gratuita',
                desc: 'Registrate con tu email. No hace falta CUIT real ni datos fiscales — el simulador trabaja con datos de prueba.',
              },
              {
                n: '02',
                title: 'Configurás tu perfil de contribuyente',
                desc: 'Ingresás datos ficticios de una empresa o persona física para simular situaciones tributarias variadas.',
              },
              {
                n: '03',
                title: 'Completás los módulos en orden',
                desc: 'Cada módulo desbloquea el siguiente. El simulador te guía y explica cada concepto antes de que realices la acción.',
              },
              {
                n: '04',
                title: 'Aprendés sin consecuencias',
                desc: 'Podés cometer errores, reiniciar, explorar alternativas y repetir los pasos cuantas veces necesites.',
              },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-6 items-start bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-700 text-white rounded-xl flex items-center justify-center font-bold text-lg">
                  {n}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base mb-1">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARA QUIÉN ──────────────────────────────────── */}
      <section className="py-24 bg-white">
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

      {/* ── AUTOR ───────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-slate-900 to-primary-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <p className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-3">Sobre el autor</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-12">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
              {/* Avatar placeholder */}
              <div className="flex-shrink-0 w-24 h-24 bg-primary-700 rounded-2xl flex items-center justify-center text-4xl font-bold text-white border-4 border-primary-600">
                JG
              </div>
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
                  Supabase y Tailwind CSS, la plataforma busca democratizar el acceso al conocimiento
                  fiscal en Argentina desde las aulas universitarias.
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
                  href="mailto:gomezjuanmanuel.1436@gmail.com"
                  className="flex items-center gap-2 text-sm text-blue-300 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Contacto
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── APOYÁ EL PROYECTO ───────────────────────────── */}
      <section className="py-16 bg-amber-50 border-y border-amber-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="text-3xl mb-4">☕</div>
          <h2 className="text-2xl font-bold text-amber-900 mb-3">¿Te resultó útil TRIBUT.AR?</h2>
          <p className="text-amber-700 text-base mb-6 max-w-xl mx-auto">
            Esta herramienta es y seguirá siendo <strong>gratuita</strong>. Si querés apoyar el
            desarrollo de nuevos módulos y mejoras, podés hacer un aporte voluntario.
            Cada colaboración ayuda a mantener el proyecto activo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://cafecito.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-7 py-3.5 rounded-xl text-sm shadow-md transition-all hover:scale-105"
            >
              ☕ Invitame un café en Cafecito
            </a>
            <a
              href="https://mpago.la/donate"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold px-7 py-3.5 rounded-xl text-sm shadow-md transition-all hover:scale-105"
            >
              💙 Colaborar por Mercado Pago
            </a>
          </div>
          <p className="text-xs text-amber-600 mt-4">El aporte es completamente voluntario. Gracias 🙏</p>
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
                  <a href="mailto:gomezjuanmanuel.1436@gmail.com" className="hover:text-white transition-colors">
                    Contacto
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
