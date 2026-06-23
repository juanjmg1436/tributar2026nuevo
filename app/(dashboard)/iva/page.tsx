'use client'

import { useRegime } from '@/hooks/useRegime'
import { PageContainer } from '@/components/layout/PageContainer'
import { RegimeGate } from '@/components/ui/RegimeGate'
import { Spinner } from '@/components/ui/Spinner'
import { RegimenGeneralModule } from '@/components/modulos/RegimenGeneralModule'

export default function IvaPage() {
  const regime = useRegime()

  if (regime.loading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="DDJJ IVA" subtitle="Declaración Jurada mensual de IVA — ARCA 2026">
      {regime.regime === 'no_definido' && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl flex gap-3 items-start">
          <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-800">Régimen fiscal no definido</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Para presentar DDJJ de IVA necesitás estar inscripto como <strong>Responsable Inscripto</strong>.
              Si sos Monotributista, el IVA va incluido en la cuota mensual y no usás este módulo.{' '}
              <a href="/administrador-relaciones" className="underline font-semibold">Definí tu régimen →</a>
            </p>
          </div>
        </div>
      )}
      {!regime.canUseIVA ? (
        <RegimeGate
          moduleName="DDJJ IVA"
          reason={regime.ivaBlockReason!}
          currentRegime={regime.label}
          alternativeHref="/administrador-relaciones"
          alternativeLabel="Ir a Administrador de Relaciones →"
        />
      ) : (
        <RegimenGeneralModule defaultTab="iva" />
      )}
    </PageContainer>
  )
}
