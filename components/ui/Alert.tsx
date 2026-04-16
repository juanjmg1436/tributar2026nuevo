'use client'

import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: React.ReactNode
  className?: string
  dismissible?: boolean
}

export function Alert({ variant = 'info', title, children, className, dismissible }: AlertProps) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  const styles: Record<AlertVariant, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <Info className="w-5 h-5 text-blue-500" />,
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      icon: <TriangleAlert className="w-5 h-5 text-amber-500" />,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    },
  }

  const s = styles[variant]

  return (
    <div className={cn('rounded-lg border p-4', s.bg, s.border, className)}>
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">{s.icon}</div>
        <div className="flex-1 min-w-0">
          {title && <p className={cn('text-sm font-semibold mb-1', s.text)}>{title}</p>}
          <div className={cn('text-sm', s.text)}>{children}</div>
        </div>
        {dismissible && (
          <button onClick={() => setVisible(false)} className={cn('flex-shrink-0', s.text, 'hover:opacity-70')}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
