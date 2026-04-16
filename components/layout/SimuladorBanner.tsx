import { AlertTriangle } from 'lucide-react'

export function SimuladorBanner() {
  return (
    <div className="simulator-banner sticky top-0 z-50 flex items-center justify-center gap-2">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>
        SIMULADOR DIDÁCTICO — NO OFICIAL — SIN VALIDEZ FISCAL/LEGAL — DATOS DEMO
      </span>
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
    </div>
  )
}
