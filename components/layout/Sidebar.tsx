'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserProgress } from '@/types'
import { useRegime } from '@/hooks/useRegime'
import {
  LayoutDashboard, User, FileText, Settings, CreditCard,
  Mail, ShoppingBag, Receipt, History, LogOut, ChevronRight,
  Lock, BookOpen, MapPin, ShoppingCart, ReceiptText, TrendingUp,
  Layers, Users, DollarSign, BarChart3, GraduationCap, Ban
} from 'lucide-react'

interface SidebarProps {
  progress?: UserProgress | null
  onSignOut?: () => void
  userName?: string
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  locked: boolean
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

export function Sidebar({ progress, onSignOut, userName }: SidebarProps) {
  const pathname = usePathname()
  const regime = useRegime()

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Panel principal', icon: <LayoutDashboard className="w-5 h-5" />, locked: false },
    { href: '/perfil-contribuyente', label: 'Perfil del contribuyente', icon: <User className="w-5 h-5" />, locked: false },
    { href: '/alta-rut', label: 'Alta registral', icon: <FileText className="w-5 h-5" />, locked: !progress?.hasTaxpayerProfile },
    { href: '/administrador-relaciones', label: 'Administrador de relaciones', icon: <Settings className="w-5 h-5" />, locked: !progress?.registrationComplete },
    { href: '/estado-cuenta', label: 'Estado de cuenta', icon: <CreditCard className="w-5 h-5" />, locked: !progress?.registrationComplete },
    { href: '/domicilio-fiscal', label: 'Domicilio fiscal electrónico', icon: <Mail className="w-5 h-5" />, locked: !progress?.hasActiveRegime },
    { href: '/puntos-venta', label: 'Puntos de venta', icon: <ShoppingBag className="w-5 h-5" />, locked: !progress?.registrationComplete },
    { href: '/comprobantes', label: 'Comprobantes', icon: <Receipt className="w-5 h-5" />, locked: !progress?.hasPOS },
    { href: '/historial', label: 'Historial de acciones', icon: <History className="w-5 h-5" />, locked: false },
  ]

  // Flags de acceso según régimen (defaults permisivos mientras carga)
  const canIVA = regime.loading || regime.canUseIVA
  const canGanancias = regime.loading || regime.canUseGanancias
  const canMono = regime.loading || regime.canUseMonotributo

  const fiscalSections: NavSection[] = [
    {
      title: 'Facturación y compras',
      items: [
        { href: '/compras', label: 'Compras y gastos', icon: <ShoppingCart className="w-4 h-4" />, locked: false },
      ],
    },
    {
      title: 'Impuestos nacionales',
      items: [
        { href: '/iva', label: 'DDJJ IVA', icon: <ReceiptText className="w-4 h-4" />, locked: false },
        { href: '/ganancias', label: 'Ganancias', icon: <TrendingUp className="w-4 h-4" />, locked: false },
        { href: '/monotributo', label: 'Monotributo', icon: <Layers className="w-4 h-4" />, locked: false },
      ],
    },
    {
      title: 'Laboral',
      items: [
        { href: '/empleados', label: 'Empleados', icon: <Users className="w-4 h-4" />, locked: false },
        { href: '/sueldos', label: 'Liquidación de sueldos', icon: <DollarSign className="w-4 h-4" />, locked: false },
        { href: '/cargas-sociales', label: 'Cargas Sociales (F.931)', icon: <BarChart3 className="w-4 h-4" />, locked: false },
      ],
    },
    {
      title: 'Resumen',
      items: [
        { href: '/estado-fiscal', label: 'Estado fiscal integral', icon: <LayoutDashboard className="w-4 h-4" />, locked: false },
      ],
    },
    {
      title: 'Impuestos provinciales',
      items: [
        { href: '/misiones', label: 'ATM Misiones', icon: <MapPin className="w-4 h-4" />, locked: false },
      ],
    },
    {
      title: 'Docente',
      items: [
        { href: '/configuracion-fiscal', label: 'Configuración fiscal', icon: <GraduationCap className="w-4 h-4" />, locked: false },
      ],
    },
  ]

  // Determina si un ítem está restringido por régimen (visible pero atenuado)
  function isRegimeRestricted(href: string): boolean {
    if (regime.loading) return false
    if (href === '/iva') return !regime.canUseIVA
    if (href === '/ganancias') return !regime.canUseGanancias
    if (href === '/monotributo') return !regime.canUseMonotributo
    return false
  }

  const renderItem = (item: NavItem) => {
    const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard')
    const restricted = isRegimeRestricted(item.href)
    return (
      <div key={item.href}>
        {item.locked ? (
          <div className="nav-link nav-link-locked gap-3">
            {item.icon}
            <span className="flex-1 truncate">{item.label}</span>
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          </div>
        ) : (
          <Link
            href={item.href}
            className={cn(
              'nav-link',
              isActive && 'nav-link-active',
              restricted && !isActive && 'opacity-50'
            )}
            title={restricted ? 'No aplica a tu régimen fiscal' : undefined}
          >
            <span className={cn(restricted && 'text-slate-400')}>{item.icon}</span>
            <span className={cn('flex-1 truncate', restricted && 'text-slate-400')}>{item.label}</span>
            {restricted && !isActive && <Ban className="w-3 h-3 text-slate-300" />}
            {item.badge && !isActive && !restricted && (
              <span className="text-[9px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded-full">{item.badge}</span>
            )}
            {isActive && <ChevronRight className="w-4 h-4" />}
          </Link>
        )}
      </div>
    )
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-white border-r border-slate-200 fixed left-0 top-0 z-40 overflow-hidden">
      {/* Logo + régimen */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-primary-800 text-lg leading-tight">TRIBUT.AR</p>
            <p className="text-[10px] text-slate-500 leading-tight">Simulador Educativo</p>
          </div>
        </div>
        {!regime.loading && regime.regime !== 'no_definido' && (
          <div className={cn(
            'text-[10px] font-bold px-2 py-1 rounded-lg text-center w-full',
            regime.regime === 'monotributista'
              ? 'bg-amber-100 text-amber-700'
              : regime.regime === 'empresa'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-emerald-100 text-emerald-700'
          )}>
            {regime.label}
          </div>
        )}
        {!regime.loading && regime.regime === 'no_definido' && (
          <div className="text-[10px] font-bold px-2 py-1 rounded-lg text-center w-full bg-slate-100 text-slate-500">
            Régimen no definido
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Sección principal */}
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Principal</p>
        {navItems.map(renderItem)}

        {/* Secciones fiscales */}
        {fiscalSections.map(section => (
          <div key={section.title} className="pt-3">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{section.title}</p>
            {section.items.map(renderItem)}
          </div>
        ))}
      </nav>

      {/* Progress */}
      {progress && (
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progreso general</span>
            <span className="font-semibold text-slate-700">{progress.completionPercentage}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all duration-500"
              style={{ width: `${progress.completionPercentage}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Etapa {progress.currentStage} de 10</p>
        </div>
      )}

      {/* User */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
            {userName?.charAt(0).toUpperCase() || 'E'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{userName || 'Estudiante'}</p>
            <p className="text-xs text-slate-400">Estudiante</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>

      {/* Apoyo al proyecto */}
      <div className="px-3 py-2 border-t border-slate-100">
        <div className="w-full text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
          <p className="font-semibold text-blue-700 mb-1">💙 Apoyar el proyecto</p>
          <p className="text-blue-600 leading-relaxed">
            Transferí por Mercado Pago:
          </p>
          <p className="font-mono text-[10px] text-blue-800 mt-1 break-all select-all">
            CVU: 0000003100045253425987
          </p>
          <p className="text-blue-600 mt-0.5">
            Alias: <span className="font-semibold select-all">juanjmg14</span>
          </p>
        </div>
      </div>

      {/* Credits */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <p className="text-[10px] text-slate-400 leading-relaxed text-center">
          <span className="font-semibold text-slate-500">Juan Manuel Gómez</span>
          <br />
          Prof. Cs. Ec. · FHyCS UNaM · Lic. Ed. FASTA
          <br />
          Wanda, Misiones · © 2026 TRIBUT.AR
        </p>
      </div>
    </aside>
  )
}
