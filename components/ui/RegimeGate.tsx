'use client'

import { Ban } from 'lucide-react'

interface RegimeGateProps {
  /** Nombre del módulo bloqueado */
  moduleName: string
  /** Razón explicativa (pedagógica) del bloqueo */
  reason: string
  /** Régimen actual del usuario para mostrar en el bloque */
  currentRegime: string
  /** Link opcional a la acción alternativa */
  alternativeHref?: string
  /** Texto del link alternativo */
  alternativeLabel?: string
}

/**
 * Muestra un bloqueo educativo cuando el módulo no aplica al régimen del usuario.
 * En vez de error genérico, explica la razón fiscal real y el régimen alternativo.
 */
export function RegimeGate({
  moduleName,
  reason,
  currentRegime,
  alternativeHref,
  alternativeLabel,
}: RegimeGateProps) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-8 text-center max-w-xl mx-auto mt-6">
      <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <Ban className="w-7 h-7 text-slate-400" />
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Módulo no aplicable</p>
      <h3 className="text-lg font-bold text-slate-700 mb-2">{moduleName}</h3>
      <div className="mb-4 inline-block bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1 rounded-full">
        Tu régimen: {currentRegime}
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-5">{reason}</p>
      {alternativeHref && alternativeLabel && (
        <a
          href={alternativeHref}
          className="inline-block px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
        >
          {alternativeLabel}
        </a>
      )}
    </div>
  )
}
