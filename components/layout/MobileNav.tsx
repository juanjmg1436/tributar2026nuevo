'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserProgress } from '@/types'
import {
  LayoutDashboard, User, FileText, Settings, CreditCard, Mail, ShoppingBag,
  Receipt, History, Lock, X, BookOpen, MapPin, ShoppingCart,
  Users, DollarSign, BarChart3, GraduationCap
} from 'lucide-react'

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
  progress?: UserProgress | null
  userName?: string
  onSignOut?: () => void
}

export function MobileNav({ isOpen, onClose, progress, userName, onSignOut }: MobileNavProps) {
  const pathname = usePathname()

  const mainItems = [
    { href: '/dashboard', label: 'Panel principal', icon: <LayoutDashboard className="w-4 h-4" />, locked: false },
    { href: '/perfil-contribuyente', label: 'Perfil', icon: <User className="w-4 h-4" />, locked: false },
    { href: '/alta-rut', label: 'Alta registral', icon: <FileText className="w-4 h-4" />, locked: !progress?.hasTaxpayerProfile },
    { href: '/administrador-relaciones', label: 'Relaciones', icon: <Settings className="w-4 h-4" />, locked: !progress?.registrationComplete },
    { href: '/estado-cuenta', label: 'Estado de cuenta', icon: <CreditCard className="w-4 h-4" />, locked: !progress?.registrationComplete },
    { href: '/domicilio-fiscal', label: 'Domicilio fiscal', icon: <Mail className="w-4 h-4" />, locked: !progress?.hasActiveRegime },
    { href: '/puntos-venta', label: 'Puntos de venta', icon: <ShoppingBag className="w-4 h-4" />, locked: !progress?.registrationComplete },
    { href: '/comprobantes', label: 'Comprobantes', icon: <Receipt className="w-4 h-4" />, locked: !progress?.hasPOS },
    { href: '/historial', label: 'Historial', icon: <History className="w-4 h-4" />, locked: false },
  ]

  const sections = [
    {
      title: 'Facturación y compras',
      items: [{ href: '/compras', label: 'Compras y gastos', icon: <ShoppingCart className="w-4 h-4" /> }],
    },
    {
      title: 'Laboral',
      items: [
        { href: '/empleados', label: 'Empleados', icon: <Users className="w-4 h-4" /> },
        { href: '/sueldos', label: 'Sueldos', icon: <DollarSign className="w-4 h-4" /> },
        { href: '/cargas-sociales', label: 'Cargas Sociales', icon: <BarChart3 className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Resumen',
      items: [{ href: '/estado-fiscal', label: 'Estado fiscal integral', icon: <LayoutDashboard className="w-4 h-4" /> }],
    },
    {
      title: 'Impuestos provinciales',
      items: [{ href: '/misiones', label: 'ATM Misiones', icon: <MapPin className="w-4 h-4" /> }],
    },
    {
      title: 'Docente',
      items: [{ href: '/configuracion-fiscal', label: 'Config. fiscal', icon: <GraduationCap className="w-4 h-4" /> }],
    },
  ]

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      <div className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 lg:hidden flex flex-col">
        <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-primary-800">TRIBUT.AR</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <nav className="flex-1 min-h-0 px-3 py-3 overflow-y-auto">
          {/* Principal */}
          <p className="px-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Principal</p>
          {mainItems.map(item => (
            <div key={item.href}>
              {item.locked ? (
                <div className="nav-link nav-link-locked text-sm py-2">
                  {item.icon}<span className="flex-1">{item.label}</span><Lock className="w-3 h-3" />
                </div>
              ) : (
                <Link href={item.href} onClick={onClose} className={cn('nav-link text-sm py-2', pathname.startsWith(item.href) && 'nav-link-active')}>
                  {item.icon}<span className="flex-1">{item.label}</span>
                </Link>
              )}
            </div>
          ))}

          {/* Secciones fiscales */}
          {sections.map(section => (
            <div key={section.title} className="pt-2">
              <p className="px-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{section.title}</p>
              {section.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn('nav-link text-sm py-2', (pathname === item.href || pathname.startsWith(item.href + '/')) && 'nav-link-active')}
                >
                  {item.icon}<span className="flex-1">{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-100">
          <p className="text-sm font-medium text-slate-700">{userName}</p>
          <button onClick={onSignOut} className="mt-2 w-full text-left text-sm text-red-600 hover:underline">
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  )
}
