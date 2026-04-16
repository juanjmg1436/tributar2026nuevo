import { Progress } from '@/components/ui'
import { getProgressLabel } from '@/lib/utils'
import type { UserProgress } from '@/types'
import { CheckCircle2, Circle, Lock } from 'lucide-react'

interface ProgressCardProps {
  progress: UserProgress
}

export function ProgressCard({ progress }: ProgressCardProps) {
  const checkItems = [
    { label: 'Perfil del contribuyente', done: progress.hasTaxpayerProfile },
    { label: 'Alta registral completa', done: progress.registrationComplete },
    { label: 'Régimen activo', done: progress.hasActiveRegime },
    { label: 'Domicilio fiscal electrónico', done: progress.hasEFiscalAddress },
    { label: 'Punto de venta habilitado', done: progress.hasPOS },
  ]

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-800">Progreso del simulador</h3>
        <span className="text-2xl font-bold text-primary-700">{progress.completionPercentage}%</span>
      </div>
      <Progress value={progress.completionPercentage} showPercent={false} size="lg" className="mb-4" />
      <p className="text-sm text-slate-500 mb-4">{getProgressLabel(progress.completionPercentage)}</p>
      <div className="space-y-2.5">
        {checkItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            {item.done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
            )}
            <span className={`text-sm ${item.done ? 'text-slate-700 line-through decoration-slate-400' : 'text-slate-600'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
