import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'pending' | 'gray'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  dot?: boolean
}

export function Badge({ children, variant = 'default', className, dot }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-primary-100 text-primary-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    pending: 'bg-orange-100 text-orange-700',
    gray: 'bg-slate-100 text-slate-600',
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full', variants[variant], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full bg-current')} />}
      {children}
    </span>
  )
}

export function ObligationBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'Pendiente', variant: 'pending' },
    submitted: { label: 'Presentada', variant: 'info' },
    paid: { label: 'Pagada', variant: 'success' },
    overdue: { label: 'Vencida', variant: 'danger' },
  }
  const config = map[status] || { label: status, variant: 'gray' }
  return <Badge variant={config.variant} dot>{config.label}</Badge>
}

export function RegimeBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    active: { label: 'Activo', variant: 'success' },
    inactive: { label: 'Inactivo', variant: 'gray' },
    suspended: { label: 'Suspendido', variant: 'warning' },
    pending_activation: { label: 'En proceso', variant: 'info' },
  }
  const config = map[status] || { label: status, variant: 'gray' }
  return <Badge variant={config.variant} dot>{config.label}</Badge>
}
