import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  max?: number
  label?: string
  showPercent?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning'
  className?: string
}

export function Progress({
  value,
  max = 100,
  label,
  showPercent,
  size = 'md',
  variant = 'default',
  className,
}: ProgressProps) {
  const percentage = Math.round((value / max) * 100)

  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }
  const colors = {
    default: 'bg-primary-600',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
  }

  const getColor = () => {
    if (variant !== 'default') return colors[variant]
    if (percentage < 30) return 'bg-orange-500'
    if (percentage < 70) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs font-medium text-slate-600">{label}</span>}
          {showPercent && <span className="text-xs font-semibold text-slate-700">{percentage}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-slate-200 rounded-full overflow-hidden', heights[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', getColor())}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}
