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
