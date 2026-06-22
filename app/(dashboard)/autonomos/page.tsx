'use client'

import { PageContainer } from '@/components/layout/PageContainer'
import { AutonomosModule } from '@/components/modulos/AutonomosModule'

export default function AutonomosPage() {
  return (
    <PageContainer
      title="Autónomos"
      subtitle="Régimen de trabajadores independientes — SIPA + IVA + Ganancias"
    >
      <AutonomosModule />
    </PageContainer>
  )
}
