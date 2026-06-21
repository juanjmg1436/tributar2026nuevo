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
  Layers, Users, DollarSign, BarChart3, GraduationCap, Ban,
} from 'lucide-react'

interface SidebarProps {
  progress?: UserProgress | null
  onSignOut?: () => void
  userName?: string
  mobileOpen?: boolean
  onClose?: () => void
  unreadCount?: number
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

export function Sidebar({ progress, onSignOut, userName, mobileOpen, onClose, unreadCount }: SidebarProps) {
  const pathname = usePathname()
  const regime = useRegime()

  const navItems: NavItem[] = [
    { href: '/dashboard',                label: 'Panel principal',           icon: <LayoutDashboard className="w-4 h-4" />, locked: false },
    { href: '/contribuyentes',           label: 'Mis contribuyentes',        icon: <Users className="w-4 h-4" />,          locked: false },
    { href: '/perfil-contribuyente',     label: 'Perfil del contribuyente',  icon: <User className="w-4 h-4" />,           locked: false },
    { href: '/alta-rut',                 label: 'Alta registral',            icon: <FileText className="w-4 h-4" />,       locked: !progress?.hasTaxpayerProfile },
    { href: '/administrador-relaciones', label: 'Administrador de relaciones', icon: <Settings className="w-4 h-4" />,    locked: !progress?.registrationComplete },
    { href: '/estado-cuenta',            label: 'Estado de cuenta',          icon: <CreditCard className="w-4 h-4" />,     locked: !progress?.registrationComplete },
    { href: '/domicilio-fiscal',         label: 'Domicilio fiscal electrónico', icon: <Mail className="w-4 h-4" />,       locked: !(progress as any)?.hasActiveRegime },
    { href: '/puntos-venta',             label: 'Puntos de venta',           icon: <ShoppingBag className="w-4 h-4" />,    locked: !progress?.registrationComplete },
    { href: '/comprobantes',             label: 'Comprobantes',              icon: <Receipt className="w-4 h-4" />,        locked: !progress?.hasPOS },
    { href: '/historial',                label: 'Historial de acciones',     icon: <History className="w-4 h-4" />,        locked: false },
  ]

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
        { href: '/iva',          label: 'DDJJ IVA',   icon: <ReceiptText className="w-4 h-4" />, locked: false },
        { href: '/ganancias',    label: 'Ganancias',  icon: <TrendingUp className="w-4 h-4" />,  locked: false },
        { href: '/monotributo',  label: 'Monotributo', icon: <Layers className="w-4 h-4" />,     locked: false },
      ],
    },
    {
      title: 'Laboral',
      items: [
        { href: '/empleados',      label: 'Empleados',                  icon: <Users className="w-4 h-4" />,    locked: false },
        { href: '/sueldos',        label: 'Liquidación de sueldos',     icon: <DollarSign className="w-4 h-4" />, locked: false },
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

  function isRegimeRestricted(href: string): boolean {
    if (regime.loading) return false
    if (href === '/iva') return !regime.canUseIVA
    if (href === '/ganancias') return !regime.canUseGanancias
    if (href === '/monotributo') return !regime.canUseMonotributo
    return false
  }

  const renderItem = (item: NavItem) => {
    const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/')
    const restricted = isRegimeRestricted(item.href)
    const hasNotif = item.href === '/domicilio-fiscal' && !isActive && (unreadCount || 0) > 0

    if (item.locked) {
      return (
        <div key={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 cursor-not-allowed select-none text-sm">
          {item.icon}
          <span className="flex-1 truncate">{item.label}</span>
          <Lock className="w-3 h-3 flex-shrink-0" />
        </div>
      )
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
          isActive
            ? 'bg-primary-700 text-white font-medium'
            : restricted
            ? 'text-slate-400 opacity-60 hover:bg-slate-50'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        )}
        title={restricted ? 'No aplica a tu régimen fiscal' : undefined}
      >
        {item.icon}
        <span className="flex-1 truncate">{item.label}</span>
        {restricted && !isActive && <Ban className="w-3 h-3 text-slate-300" />}
        {hasNotif && (
          <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
            {(unreadCount || 0) > 9 ? '9+' : unreadCount}
          </span>
        )}
        {isActive && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
      </Link>
    )
  }

  const sidebarContent = (
    <aside className="flex flex-col w-64 h-screen bg-white border-r border-slate-200">
      {/* Logo + régimen badge */}
      <div className="px-4 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-primary-800 text-base leading-tight">TRIBUT.AR</p>
            <p className="text-[10px] text-slate-500 leading-tight">Simulador Fiscal Educativo</p>
          </div>
        </div>
        {!regime.loading && (
          <div className={cn(
            'text-[10px] font-bold px-2 py-1 rounded-lg text-center w-full',
            regime.regime === 'monotributista' ? 'bg-amber-100 text-amber-700'
            : regime.regime === 'empresa' ? 'bg-purple-100 text-purple-700'
            : regime.regime !== 'no_definido' ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-100 text-slate-500'
          )}>
            {regime.regime === 'no_definido' ? 'Régimen no definido' : regime.label}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 px-3 py-3 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Principal</p>
        <div className="space-y-0.5 mb-4">
          {navItems.map(item => renderItem(item))}
        </div>

        {fiscalSections.map(section => (
          <div key={section.title} className="mb-3">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map(item => renderItem(item))}
            </div>
          </div>
        ))}
      </nav>

      {/* Progress bar */}
      {progress && (
        <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Progreso</span>
            <span className="font-semibold text-slate-700">{progress.completionPercentage}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all duration-500"
              style={{ width: `${progress.completionPercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Etapa {progress.currentStage} de 10</p>
        </div>
      )}

      {/* Apoyo al proyecto */}
      <div className="px-3 py-2 border-t border-slate-100 flex-shrink-0">
        <div className="w-full text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <p className="font-semibold text-blue-700 mb-1">💙 Apoyar el proyecto</p>
          <p className="font-mono text-[10px] text-blue-800 break-all select-all">CVU: 0000003100045253425987</p>
          <p className="text-blue-600 mt-0.5 text-[10px]">Alias: <span className="font-semibold select-all">juanjmg14</span></p>
        </div>
      </div>

      {/* User + sign out */}
      <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs flex-shrink-0">
            {userName?.charAt(0).toUpperCase() || 'E'}
          </div>
          <p className="text-xs font-medium text-slate-700 truncate flex-1">{userName || 'Estudiante'}</p>
          <button
            onClick={onSignOut}
            className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors flex-shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Credits */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex-shrink-0">
        <p className="text-[9px] text-slate-400 text-center">
          <span className="font-semibold text-slate-500">Juan Manuel Gómez</span>
          {' '}· Prof. Cs. Ec. · FHyCS UNaM · © 2026
        </p>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block fixed left-0 top-0 h-full z-40">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />
          <div className="fixed left-0 top-0 h-full z-50 lg:hidden">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  )
}
