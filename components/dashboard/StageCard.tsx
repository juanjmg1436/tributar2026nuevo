import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, Lock, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { StageInfo } from '@/types'

interface StageCardProps {
  stage: StageInfo
  isLast?: boolean
}

export function StageCard({ stage, isLast }: StageCardProps) {
  const statusConfig = {
    completed: {
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      title: 'text-emerald-800',
    },
    current: {
      icon: <Circle className="w-6 h-6 text-primary-600 fill-primary-600" />,
      bg: 'bg-primary-50',
      border: 'border-primary-200',
      title: 'text-primary-800',
    },
    locked: {
      icon: <Lock className="w-5 h-5 text-slate-400" />,
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      title: 'text-slate-500',
    },
  }

  const config = statusConfig[stage.status]

  const content = (
    <div className={cn('rounded-xl border p-4 transition-all', config.bg, config.border,
      stage.status !== 'locked' && stage.route ? 'hover:shadow-md cursor-pointer' : ''
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Etapa {stage.number}</span>
          </div>
          <p className={cn('text-sm font-semibold mt-0.5', config.title)}>{stage.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{stage.description}</p>
        </div>
        {stage.status !== 'locked' && stage.route && (
          <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
        )}
      </div>
    </div>
  )

  if (stage.status !== 'locked' && stage.route) {
    return <Link href={stage.route}>{content}</Link>
  }
  return content
}
