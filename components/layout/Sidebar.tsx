'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserProgress } from '@/types'
import {
  LayoutDashboard, User, FileText, Settings, CreditCard,
  Mail, ShoppingBag, Receipt, History, LogOut, ChevronRight,
  Lock, BookOpen
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

export function Sidebar({ progress, onSignOut, userName }: SidebarProps) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Panel principal',
      icon: <LayoutDashboard className="w-5 h-5" />,
      locked: false,
    },
    {
      href: '/perfil-contribuyente',
      label: 'Perfil del contribuyente',
      icon: <User className="w-5 h-5" />,
      locked: false,
    },
    {
      href: '/alta-rut',
      label: 'Alta registral',
      icon: <FileText className="w-5 h-5" />,
      locked: !progress?.hasTaxpayerProfile,
    },
    {
      href: '/administrador-relaciones',
      label: 'Administrador de relaciones',
      icon: <Settings className="w-5 h-5" />,
      locked: !progress?.registrationComplete,
    },
    {
      href: '/estado-cuenta',
      label: 'Estado de cuenta',
      icon: <CreditCard className="w-5 h-5" />,
      locked: !progress?.registrationComplete,
    },
    {
      href: '/domicilio-fiscal',
      label: 'Domicilio fiscal electrónico',
      icon: <Mail className="w-5 h-5" />,
      locked: !progress?.hasActiveRegime,
    },
    {
      href: '/puntos-venta',
      label: 'Puntos de venta',
      icon: <ShoppingBag className="w-5 h-5" />,
      locked: !progress?.registrationComplete,
    },
    {
      href: '/comprobantes',
      label: 'Comprobantes',
      icon: <Receipt className="w-5 h-5" />,
      locked: !progress?.hasPOS,
    },
    {
      href: '/historial',
      label: 'Historial de acciones',
      icon: <History className="w-5 h-5" />,
      locked: false,
    },
  ]

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-slate-200 fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-primary-800 text-lg leading-tight">TRIBUT.AR</p>
            <p className="text-[10px] text-slate-500 leading-tight">Simulador Educativo</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <div key={item.href}>
              {item.locked ? (
                <div className={cn('nav-link nav-link-locked gap-3')}>
                  {item.icon}
                  <span className="flex-1 truncate">{item.label}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={cn('nav-link', isActive && 'nav-link-active')}
                >
                  {item.icon}
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4" />}
                </Link>
              )}
            </div>
          )
        })}
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
          <p className="text-xs text-slate-400 mt-1.5">Etapa {progress.currentStage} de 6</p>
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
        <a
          href="https://cafecito.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 transition-colors"
        >
          ☕ Apoyar el proyecto
        </a>
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
