'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserProgress } from '@/types'
import { LayoutDashboard, User, FileText, Settings, CreditCard, Mail, ShoppingBag, Receipt, History, Lock, X, BookOpen, MapPin } from 'lucide-react'

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
  progress?: UserProgress | null
  userName?: string
  onSignOut?: () => void
}

export function MobileNav({ isOpen, onClose, progress, userName, onSignOut }: MobileNavProps) {
  const pathname = usePathname()

  const items = [
    { href: '/dashboard', label: 'Panel principal', icon: <LayoutDashboard className="w-5 h-5" />, locked: false },
    { href: '/perfil-contribuyente', label: 'Perfil', icon: <User className="w-5 h-5" />, locked: false },
    { href: '/alta-rut', label: 'Alta registral', icon: <FileText className="w-5 h-5" />, locked: !progress?.hasTaxpayerProfile },
    { href: '/administrador-relaciones', label: 'Relaciones', icon: <Settings className="w-5 h-5" />, locked: !progress?.registrationComplete },
    { href: '/estado-cuenta', label: 'Estado de cuenta', icon: <CreditCard className="w-5 h-5" />, locked: !progress?.registrationComplete },
    { href: '/domicilio-fiscal', label: 'Domicilio fiscal', icon: <Mail className="w-5 h-5" />, locked: !progress?.hasActiveRegime },
    { href: '/puntos-venta', label: 'Puntos de venta', icon: <ShoppingBag className="w-5 h-5" />, locked: !progress?.registrationComplete },
    { href: '/comprobantes', label: 'Comprobantes', icon: <Receipt className="w-5 h-5" />, locked: !progress?.hasPOS },
    { href: '/historial', label: 'Historial', icon: <History className="w-5 h-5" />, locked: false },
  ]

  const provincialItems = [
    { href: '/misiones', label: 'ATM Misiones', icon: <MapPin className="w-5 h-5" />, locked: false },
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
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {items.map(item => (
            <div key={item.href}>
              {item.locked ? (
                <div className="nav-link nav-link-locked">
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  <Lock className="w-3.5 h-3.5" />
                </div>
              ) : (
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn('nav-link', pathname.startsWith(item.href) && 'nav-link-active')}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>
        {/* Sección provincial */}
        <div className="pt-2">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Impuestos provinciales</p>
          {provincialItems.map(item => (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className={cn('nav-link', pathname.startsWith(item.href) && 'nav-link-active')}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                <span className="text-[9px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded-full">NUEVO</span>
              </Link>
            </div>
          ))}
        </div>

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
