import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface Step {
  number: number
  label: string
  status: 'completed' | 'current' | 'upcoming'
}

interface StepIndicatorProps {
  steps: Step[]
  className?: string
}

export function StepIndicator({ steps, className }: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-0', className)}>
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all',
                step.status === 'completed' && 'bg-emerald-500 border-emerald-500 text-white',
                step.status === 'current' && 'bg-primary-600 border-primary-600 text-white',
                step.status === 'upcoming' && 'bg-white border-slate-300 text-slate-400'
              )}
            >
              {step.status === 'completed' ? <Check className="w-4 h-4" /> : step.number}
            </div>
            <span
              className={cn(
                'text-[10px] font-medium mt-1 text-center max-w-[60px] leading-tight hidden sm:block',
                step.status === 'completed' && 'text-emerald-600',
                step.status === 'current' && 'text-primary-600',
                step.status === 'upcoming' && 'text-slate-400'
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={cn('flex-1 h-0.5 mx-1 mb-4 sm:mb-5', step.status === 'completed' ? 'bg-emerald-400' : 'bg-slate-200')} />
          )}
        </div>
      ))}
    </div>
  )
}
