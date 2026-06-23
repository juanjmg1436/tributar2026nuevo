'use client'

import { useRegime } from '@/hooks/useRegime'
import { PageContainer } from '@/components/layout/PageContainer'
import { RegimeGate } from '@/components/ui/RegimeGate'
import { Spinner } from '@/components/ui/Spinner'
import { AutonomosModule } from '@/components/modulos/AutonomosModule'

export default function AutonomosPage() {
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
    <PageContainer
      title="Autónomos"
      subtitle="Régimen de trabajadores independientes — SIPA + IVA + Ganancias"
    >
      {!regime.canUseAutonomos ? (
        <RegimeGate
          moduleName="Autónomos"
          reason={regime.autonomosBlockReason!}
          currentRegime={regime.label}
          alternativeHref="/administrador-relaciones"
          alternativeLabel="Ir a Administrador de Relaciones →"
        />
      ) : (
        <AutonomosModule />
      )}
    </PageContainer>
  )
}
