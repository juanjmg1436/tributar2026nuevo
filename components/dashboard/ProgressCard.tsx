import { Progress } from '@/components/ui'
import { getProgressLabel } from '@/lib/utils'
import type { ProgressDetail } from '@/hooks/useProgress'
import { CheckCircle2, Circle } from 'lucide-react'

interface ProgressCardProps {
  progress: ProgressDetail
}

export function ProgressCard({ progress }: ProgressCardProps) {
  const stages = [
    {
      label: 'Perfil del contribuyente',
      done: progress.hasTaxpayerProfile,
      pts: 8,
    },
    {
      label: 'Alta registral completa',
      done: progress.registrationComplete,
      pts: 10,
    },
    {
      label: 'Régimen tributario activo',
      done: progress.hasActiveRegime,
      pts: 8,
    },
    {
      label: 'Domicilio Fiscal Electrónico',
      done: progress.hasEFiscalAddress,
      pts: 7,
    },
    {
      label: 'Punto de venta habilitado',
      done: progress.hasPOS,
      pts: 4,
    },
    {
      label: 'Comprobante emitido',
      done: (progress as any).hasInvoice ?? false,
      pts: 4,
    },
    {
      label: 'Compra/gasto registrado',
      done: (progress as any).hasPurchase ?? false,
      pts: 4,
    },
    {
      label: 'DDJJ principal presentada (IVA o Monotributo)',
      done: ((progress as any).hasVatReturn || (progress as any).hasMonoPayment) ?? false,
      pts: 10,
    },
    {
      label: 'Ganancias / Monotributo',
      done: ((progress as any).hasIncomeTaxReturn || (progress as any).hasMonoProfile) ?? false,
      pts: 5,
    },
    {
      label: 'Pago fiscal efectuado (VEP)',
      done: (progress as any).hasAnyFiscalPayment ?? false,
      pts: 5,
    },
    {
      label: 'Empleador dado de alta',
      done: (progress as any).hasEmployer ?? false,
      pts: 3,
    },
    {
      label: 'Empleado incorporado',
      done: (progress as any).hasEmployee ?? false,
      pts: 4,
    },
    {
      label: 'Liquidación de sueldos confirmada',
      done: (progress as any).hasPayrollRun ?? false,
      pts: 4,
    },
    {
      label: 'F.931 presentado',
      done: (progress as any).hasSocialSecurityReturn ?? false,
      pts: 4,
    },
    {
      label: 'Alta ATM Misiones (IIBB)',
      done: (progress as any).hasProvincialProfile ?? false,
      pts: 4,
    },
    {
      label: 'DDJJ IIBB presentada',
      done: (progress as any).hasIIBBReturn ?? false,
      pts: 4,
    },
    {
      label: 'Pago provincial efectuado',
      done: (progress as any).hasProvincialPayment ?? false,
      pts: 4,
    },
  ]

  const completedCount = stages.filter(s => s.done).length

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Progreso del simulador</h3>
          <p className="text-xs text-slate-400 mt-0.5">{completedCount} de {stages.length} hitos completados</p>
        </div>
        <span className="text-2xl font-bold text-primary-700">{progress.completionPercentage}%</span>
      </div>
      <Progress value={progress.completionPercentage} showPercent={false} size="lg" className="mb-4" />
      <p className="text-sm text-slate-500 mb-4">{getProgressLabel(progress.completionPercentage)}</p>
      <div className="space-y-2">
        {stages.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            {item.done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
            )}
            <span className={`text-sm flex-1 ${item.done ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-600'}`}>
              {item.label}
            </span>
            <span className="text-[10px] font-semibold text-slate-300 tabular-nums">{item.pts}pt</span>
          </div>
        ))}
      </div>
    </div>
  )
}
