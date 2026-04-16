'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Bell, LogOut, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  userName?: string
  unreadNotifications?: number
  onMenuToggle?: () => void
  onSignOut?: () => void
  title?: string
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Panel principal',
  '/perfil-contribuyente': 'Perfil del contribuyente',
  '/alta-rut': 'Alta registral',
  '/administrador-relaciones': 'Administrador de relaciones',
  '/estado-cuenta': 'Estado de cuenta',
  '/domicilio-fiscal': 'Domicilio Fiscal Electrónico',
  '/puntos-venta': 'Puntos de venta',
  '/comprobantes': 'Comprobantes',
  '/historial': 'Historial de acciones',
}

export function Header({ userName, unreadNotifications = 0, onMenuToggle, onSignOut }: HeaderProps) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] || 'TRIBUT.AR'

  return (
    <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-[42px] z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-700 rounded-lg flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-primary-800">TRIBUT.AR</span>
        </div>
        <h1 className="hidden lg:block text-base font-semibold text-slate-800">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/domicilio-fiscal"
          className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </Link>
        <div className="hidden md:flex items-center gap-2 ml-1">
          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs">
            {userName?.charAt(0).toUpperCase() || 'E'}
          </div>
          <span className="text-sm text-slate-700 font-medium hidden lg:block">{userName}</span>
        </div>
        <button
          onClick={onSignOut}
          className="p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
