'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserProgress } from '@/types'
import {
  LayoutDashboard, User, FileText, Settings, CreditCard,
  Mail, ShoppingBag, Receipt, History, LogOut, ChevronRight,
  Lock, BookOpen, TrendingUp, Calculator, Users, Building2,
  BadgePercent, Clock
} from 'lucide-react'

interface SidebarProps {
  progress?: UserProgress | null
  activeRegimeCodes?: string[]
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
  locked?: boolean
  badge?: 'Próximo' | 'Nuevo'
}

interface NavSection {
  label: string
  items: NavItem[]
}

export function Sidebar({ progress, activeRegimeCodes = [], onSignOut, userName, mobileOpen, onClose, unreadCount }: SidebarProps) {
  const pathname = usePathname()

  const hasMonotributo = activeRegimeCodes.includes('MONOTRIBUTO')
  const hasRegGral = activeRegimeCodes.includes('REGIMEN_GENERAL')
  const hasAutonomos = activeRegimeCodes.includes('AUTONOMOS')
  const hasRelLaborales = activeRegimeCodes.includes('RELACIONES_LABORALES')
  const hasAnyRegime = activeRegimeCodes.length > 0

  // Reglas de negocio reales:
  // - Monotributista NO liquida IVA ni Ganancias (todo en la cuota)
  // - RI (Régimen General) SÍ liquida IVA y Ganancias
  // - Autónomos pagan aportes previsionales (y Ganancias si corresponde)
  // - Relaciones Laborales: empleados + F.931
  // - Cualquier régimen puede tener domicilio fiscal electrónico

  const sections: NavSection[] = [
    {
      label: 'Configuración',
      items: [
        {
          href: '/dashboard',
          label: 'Panel principal',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
          href: '/contribuyentes',
          label: 'Mis contribuyentes',
          icon: <Users className="w-4 h-4" />,
        },
        {
          href: '/perfil-contribuyente',
          label: 'Perfil del contribuyente',
          icon: <User className="w-4 h-4" />,
        },
        {
          href: '/alta-rut',
          label: 'Alta registral',
          icon: <FileText className="w-4 h-4" />,
          locked: !progress?.hasTaxpayerProfile,
        },
        {
          href: '/administrador-relaciones',
          label: 'Regímenes tributarios',
          icon: <Settings className="w-4 h-4" />,
          locked: !progress?.registrationComplete,
        },
        {
          href: '/domicilio-fiscal',
          label: 'Domicilio Fiscal Electrónico',
          icon: <Mail className="w-4 h-4" />,
          locked: !hasAnyRegime,
        },
      ],
    },

    // ── MONOTRIBUTO ──────────────────────────────────────────
    ...(hasMonotributo ? [{
      label: 'Monotributo',
      items: [
        {
          href: '/monotributo',
          label: 'Cuota y categoría',
          icon: <TrendingUp className="w-4 h-4" />,
          badge: 'Próximo' as const,
        },
        {
          href: '/puntos-venta',
          label: 'Puntos de venta',
          icon: <ShoppingBag className="w-4 h-4" />,
          locked: !progress?.registrationComplete,
        },
        {
          href: '/comprobantes',
          label: 'Comprobantes (Fact. C)',
          icon: <Receipt className="w-4 h-4" />,
          locked: !progress?.hasPOS,
        },
      ],
    }] : []),

    // ── RÉGIMEN GENERAL ──────────────────────────────────────
    ...(hasRegGral ? [{
      label: 'Régimen General',
      items: [
        {
          href: '/iva',
          label: 'IVA — DDJJ Mensual',
          icon: <Calculator className="w-4 h-4" />,
          locked: !progress?.registrationComplete,
          badge: 'Próximo' as const,
        },
        {
          href: '/ganancias',
          label: 'Ganancias — DDJJ',
          icon: <TrendingUp className="w-4 h-4" />,
          locked: !progress?.registrationComplete,
          badge: 'Próximo' as const,
        },
        {
          href: '/puntos-venta',
          label: 'Puntos de venta',
          icon: <ShoppingBag className="w-4 h-4" />,
          locked: !progress?.registrationComplete,
        },
        {
          href: '/comprobantes',
          label: 'Comprobantes (Fact. A/B)',
          icon: <Receipt className="w-4 h-4" />,
          locked: !progress?.hasPOS,
        },
      ],
    }] : []),

    // ── AUTÓNOMOS ────────────────────────────────────────────
    ...(hasAutonomos && !hasMonotributo ? [{
      label: 'Autónomos',
      items: [
        {
          href: '/autonomos',
          label: 'Aportes autónomos',
          icon: <BadgePercent className="w-4 h-4" />,
          locked: !progress?.registrationComplete,
          badge: 'Próximo' as const,
        },
        ...(!hasRegGral ? [{
          href: '/ganancias',
          label: 'Ganancias — DDJJ',
          icon: <TrendingUp className="w-4 h-4" />,
          locked: !progress?.registrationComplete,
          badge: 'Próximo' as const,
        }] : []),
      ],
    }] : []),

    // ── RELACIONES LABORALES ─────────────────────────────────
    ...(hasRelLaborales ? [{
      label: 'Relaciones Laborales',
      items: [
        {
          href: '/empleados',
          label: 'Empleados',
          icon: <Users className="w-4 h-4" />,
          badge: 'Próximo' as const,
        },
        {
          href: '/cargas-sociales',
          label: 'Cargas Sociales — F.931',
          icon: <Building2 className="w-4 h-4" />,
          badge: 'Próximo' as const,
        },
      ],
    }] : []),

    // ── Sin régimen aún: mostrar guía ────────────────────────
    ...(!hasAnyRegime && progress?.registrationComplete ? [{
      label: 'Módulos impositivos',
      items: [
        {
          href: '/administrador-relaciones',
          label: 'Elegir régimen para habilitar módulos',
          icon: <Settings className="w-4 h-4" />,
        },
      ],
    }] : []),

    // ── GESTIÓN ──────────────────────────────────────────────
    {
      label: 'Gestión',
      items: [
        {
          href: '/estado-cuenta',
          label: 'Estado de cuenta',
          icon: <CreditCard className="w-4 h-4" />,
          locked: !progress?.registrationComplete,
        },
        {
          href: '/historial',
          label: 'Historial de acciones',
          icon: <History className="w-4 h-4" />,
        },
      ],
    },
  ]

  const sidebarContent = (
    <aside className="flex flex-col w-72 min-h-screen bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-primary-800 text-lg leading-tight">TRIBUT.AR</p>
            <p className="text-[10px] text-slate-500 leading-tight">Simulador Fiscal Educativo</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                if (item.locked) {
                  return (
                    <div key={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 cursor-not-allowed select-none">
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span className="flex-1 text-sm truncate">{item.label}</span>
                      <Lock className="w-3 h-3 flex-shrink-0" />
                    </div>
                  )
                }
                if (item.badge) {
                  return (
                    <div key={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 cursor-not-allowed select-none">
                      <span className="flex-shrink-0 text-slate-300">{item.icon}</span>
                      <span className="flex-1 text-sm truncate text-slate-400">{item.label}</span>
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {item.badge}
                      </span>
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
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
                    {!isActive && unreadCount && item.href === '/domicilio-fiscal' && unreadCount > 0 && (
                      <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                )
              })}
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
          <p className="text-[10px] text-slate-400 mt-1">Etapa {progress.currentStage} de 6</p>
        </div>
      )}

      {/* User + sign out */}
      <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
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
        <p className="text-[9px] text-slate-400 leading-relaxed text-center">
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
