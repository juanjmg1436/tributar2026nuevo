'use client'

import { useRegime } from '@/hooks/useRegime'
import { PageContainer } from '@/components/layout/PageContainer'
import { RegimeGate } from '@/components/ui/RegimeGate'
import { Spinner } from '@/components/ui/Spinner'
import { MonotributoModule } from '@/components/modulos/MonotributoModule'

export default function MonotributoPage() {
  const regime = useRegime()

  if (regime.loading) {
    return <PageContainer><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageContainer>
  }

  return (
    <PageContainer
      title="Monotributo"
      subtitle="Régimen Simplificado — ARCA 2026"
    >
      {!regime.canUseMonotributo ? (
        <RegimeGate
          moduleName="Monotributo"
          reason={regime.monotributoBlockReason!}
          currentRegime={regime.label}
          alternativeHref="/iva"
          alternativeLabel="Ir a DDJJ IVA →"
        />
      ) : (
        <MonotributoModule />
      )}
    </PageContainer>
  )
}
