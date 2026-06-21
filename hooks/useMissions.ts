'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EXAM_STORAGE_KEY, type ExamResult } from '@/lib/constants/examenes'
import type { UserProgress } from '@/types'

export interface Mission {
  code: string
  title: string
  description: string
  xp: number
  status: 'completed' | 'available' | 'locked' | 'coming_soon'
  href?: string
  category: 'inscripcion' | 'regimen' | 'obligaciones' | 'comprobantes'
}

export interface MissionTrack {
  regime: 'MONOTRIBUTO' | 'REGIMEN_GENERAL'
  label: string
  icon: string
  description: string
  missions: Mission[]
  earnedXp: number
  availableXp: number   // XP máximo alcanzable hoy (excluye coming_soon)
  totalXp: number       // XP total incluyendo coming_soon
  completedCount: number
  activeCount: number   // missions not coming_soon
}

export interface LevelInfo {
  level: number
  name: string
  color: string
  minXp: number
  maxXp: number
  nextLevelXp: number
}

const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Nuevo Contribuyente',     color: 'slate',  minXp: 0,    maxXp: 199,  nextLevelXp: 200  },
  { level: 2, name: 'En Alta',                 color: 'blue',   minXp: 200,  maxXp: 449,  nextLevelXp: 450  },
  { level: 3, name: 'Inscripto',               color: 'indigo', minXp: 450,  maxXp: 849,  nextLevelXp: 850  },
  { level: 4, name: 'Contribuyente Activo',    color: 'violet', minXp: 850,  maxXp: 1299, nextLevelXp: 1300 },
  { level: 5, name: 'Cumplidor',               color: 'purple', minXp: 1300, maxXp: 1799, nextLevelXp: 1800 },
  { level: 6, name: 'Contribuyente Avanzado',  color: 'amber',  minXp: 1800, maxXp: 2399, nextLevelXp: 2400 },
  { level: 7, name: 'Especialista Fiscal',     color: 'orange', minXp: 2400, maxXp: 2999, nextLevelXp: 3000 },
  { level: 8, name: 'Experto Tributario',      color: 'yellow', minXp: 3000, maxXp: Infinity, nextLevelXp: Infinity },
]

export function getLevelInfo(xp: number): LevelInfo {
  return LEVELS.findLast(l => xp >= l.minXp) ?? LEVELS[0]
}

export function useMissions(
  userId: string | null,
  taxpayerProfileId: string | null,
  activeRegimeCodes: string[],
  progress: UserProgress | null,
) {
  const [tracks, setTracks] = useState<MissionTrack[]>([])
  const [totalXp, setTotalXp] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    compute()
  }, [userId, taxpayerProfileId, activeRegimeCodes.join(','), progress?.completionPercentage])

  async function compute() {
    setLoading(true)
    try {
      const { data: invoices } = await (supabase as any)
        .from('invoices')
        .select('invoice_type')
        .eq('user_id', userId!)

      const byType: Record<string, number> = {}
      ;(invoices || []).forEach((inv: any) => {
        byType[inv.invoice_type] = (byType[inv.invoice_type] || 0) + 1
      })

      const hasFacturaC  = (byType['C'] || 0) > 0
      const hasFacturaAB = (byType['A'] || 0) + (byType['B'] || 0) > 0

      const hasMonotributo   = activeRegimeCodes.includes('MONOTRIBUTO')
      const hasRegGral       = activeRegimeCodes.includes('REGIMEN_GENERAL')
      const hasAutonomos     = activeRegimeCodes.includes('AUTONOMOS')
      const hasRelLaborales  = activeRegimeCodes.includes('RELACIONES_LABORALES')
      const hasAny           = activeRegimeCodes.length > 0

      // Helper para misiones comunes a ambas rutas
      function commonMissions(regimeActive: boolean, regimenCode: string): Mission[] {
        return [
          {
            code: 'PERFIL',
            title: 'Crear perfil del contribuyente',
            description: 'Completá los datos básicos: razón social, actividad, domicilio fiscal y CUIT',
            xp: 100,
            status: progress?.hasTaxpayerProfile ? 'completed' : 'available',
            href: '/perfil-contribuyente',
            category: 'inscripcion',
          },
          {
            code: 'ALTA',
            title: 'Completar alta registral',
            description: 'Procesá los 6 pasos del formulario de inscripción ante AFIP/ARCA',
            xp: 200,
            status: !progress?.hasTaxpayerProfile ? 'locked'
              : progress?.registrationComplete ? 'completed' : 'available',
            href: '/alta-rut',
            category: 'inscripcion',
          },
          {
            code: `REGIMEN_${regimenCode}`,
            title: regimenCode === 'MONOTRIBUTO'
              ? 'Adherirse al Monotributo'
              : regimenCode === 'REGIMEN_GENERAL'
              ? 'Inscribirse en IVA y Ganancias'
              : 'Activar régimen impositivo',
            description: regimenCode === 'MONOTRIBUTO'
              ? 'Alta en el régimen simplificado para pequeños contribuyentes'
              : 'Alta en el régimen general como Responsable Inscripto ante IVA y Ganancias',
            xp: 200,
            status: !progress?.registrationComplete ? 'locked'
              : regimeActive ? 'completed' : 'available',
            href: '/administrador-relaciones',
            category: 'regimen',
          },
          {
            code: 'DIFE',
            title: 'Constituir Domicilio Fiscal Electrónico',
            description: 'El DIFE es el buzón oficial para recibir notificaciones del organismo',
            xp: 150,
            status: !hasAny ? 'locked'
              : progress?.hasEFiscalAddress ? 'completed' : 'available',
            href: '/domicilio-fiscal',
            category: 'inscripcion',
          },
          {
            code: 'POS',
            title: 'Habilitar punto de venta',
            description: 'Registrá el POS ante el organismo para poder emitir comprobantes electrónicos',
            xp: 150,
            status: !progress?.registrationComplete ? 'locked'
              : progress?.hasPOS ? 'completed' : 'available',
            href: '/puntos-venta',
            category: 'comprobantes',
          },
        ]
      }

      const computedTracks: MissionTrack[] = []

      // ═══════════════════════════════════════════════
      // RUTA MONOTRIBUTISTA
      // ═══════════════════════════════════════════════
      if (hasMonotributo || !hasAny) {
        const missions: Mission[] = [
          ...commonMissions(hasMonotributo, 'MONOTRIBUTO'),
          {
            code: 'MT_FACTURA_C',
            title: 'Emitir primera Factura C',
            description: 'El Monotributista solo emite Fact. C — no discrimina IVA, el impuesto está incluido en la cuota',
            xp: 200,
            status: !progress?.hasPOS ? 'locked' : hasFacturaC ? 'completed' : 'available',
            href: '/comprobantes/nuevo',
            category: 'comprobantes',
          },
          {
            code: 'MT_CUOTA',
            title: 'Pagar cuota mensual de Monotributo',
            description: 'La cuota integrada incluye impuesto + SIPA (previsional) + obra social',
            xp: 200,
            status: 'coming_soon',
            href: '/monotributo',
            category: 'obligaciones',
          },
          {
            code: 'MT_RECATEGORIZACION',
            title: 'Recategorización semestral (enero y julio)',
            description: 'Cada semestre debés verificar si tus ingresos anuales corresponden a tu categoría actual',
            xp: 250,
            status: 'coming_soon',
            href: '/monotributo',
            category: 'obligaciones',
          },
          {
            code: 'MT_EXCLUSION',
            title: 'Simular exclusión por exceso de ingresos',
            description: 'Si superás la categoría K, quedás excluido del Monotributo y debés pasar a Régimen General',
            xp: 300,
            status: 'coming_soon',
            href: '/monotributo',
            category: 'obligaciones',
          },
        ]

        const earned    = missions.filter(m => m.status === 'completed').reduce((s, m) => s + m.xp, 0)
        const available = missions.filter(m => m.status !== 'coming_soon').reduce((s, m) => s + m.xp, 0)
        const total     = missions.reduce((s, m) => s + m.xp, 0)

        computedTracks.push({
          regime: 'MONOTRIBUTO',
          label: 'Ruta del Monotributista',
          icon: '🟢',
          description: 'Practicá el ciclo fiscal completo de un pequeño contribuyente adherido al Monotributo',
          missions,
          earnedXp: earned,
          availableXp: available,
          totalXp: total,
          completedCount: missions.filter(m => m.status === 'completed').length,
          activeCount: missions.filter(m => m.status !== 'coming_soon').length,
        })
      }

      // ═══════════════════════════════════════════════
      // RUTA RÉGIMEN GENERAL
      // ═══════════════════════════════════════════════
      if (hasRegGral || hasAutonomos || (!hasAny && !hasMonotributo)) {
        const missions: Mission[] = [
          ...commonMissions(hasRegGral, 'REGIMEN_GENERAL'),
          {
            code: 'RG_FACTURA_AB',
            title: 'Emitir primera Factura A o B',
            description: 'Los RI emiten Fact. A a otros RI (discriminando IVA) y Fact. B a consumidores finales',
            xp: 200,
            status: !progress?.hasPOS ? 'locked' : hasFacturaAB ? 'completed' : 'available',
            href: '/comprobantes/nuevo',
            category: 'comprobantes',
          },
          {
            code: 'RG_IVA',
            title: 'Presentar DDJJ de IVA mensual (F.2002)',
            description: 'Declaración mensual: débito fiscal (ventas) − crédito fiscal (compras) = IVA a ingresar',
            xp: 300,
            status: 'coming_soon',
            href: '/iva',
            category: 'obligaciones',
          },
          {
            code: 'RG_VEP_IVA',
            title: 'Generar y pagar VEP de IVA',
            description: 'El Volante Electrónico de Pago liquida el saldo mensual de IVA',
            xp: 200,
            status: 'coming_soon',
            href: '/veps',
            category: 'obligaciones',
          },
          {
            code: 'RG_GANANCIAS',
            title: 'Presentar DDJJ de Ganancias (F.713)',
            description: 'Declaración anual: resultado impositivo × alícuota de Ganancias',
            xp: 350,
            status: 'coming_soon',
            href: '/ganancias',
            category: 'obligaciones',
          },
          {
            code: 'RG_ANTICIPOS',
            title: 'Calcular anticipos de Ganancias',
            description: 'Los anticipos son pagos a cuenta del impuesto del próximo ejercicio',
            xp: 250,
            status: 'coming_soon',
            href: '/ganancias',
            category: 'obligaciones',
          },
          ...(hasAutonomos ? [{
            code: 'AU_CUOTA',
            title: 'Abonar cuota de Autónomos (SIPA)',
            description: 'Aportes previsionales mensuales obligatorios para trabajadores independientes',
            xp: 200,
            status: 'coming_soon' as const,
            href: '/autonomos',
            category: 'obligaciones' as const,
          }] : []),
          ...(hasRelLaborales ? [
            {
              code: 'RL_EMPLEADO',
              title: 'Registrar empleado en el simulador',
              description: 'Alta de relación laboral: cargo, sueldo bruto, categoría convenio',
              xp: 250,
              status: 'coming_soon' as const,
              href: '/empleados',
              category: 'obligaciones' as const,
            },
            {
              code: 'RL_F931',
              title: 'Presentar F.931 — Cargas Sociales',
              description: 'Declaración mensual de aportes y contribuciones sobre nómina salarial',
              xp: 350,
              status: 'coming_soon' as const,
              href: '/cargas-sociales',
              category: 'obligaciones' as const,
            },
          ] : []),
        ]

        const earned    = missions.filter(m => m.status === 'completed').reduce((s, m) => s + m.xp, 0)
        const available = missions.filter(m => m.status !== 'coming_soon').reduce((s, m) => s + m.xp, 0)
        const total     = missions.reduce((s, m) => s + m.xp, 0)

        computedTracks.push({
          regime: 'REGIMEN_GENERAL',
          label: 'Ruta del Régimen General',
          icon: '🔵',
          description: 'Practicá el ciclo completo de un Responsable Inscripto (RI): IVA, Ganancias y más',
          missions,
          earnedXp: earned,
          availableXp: available,
          totalXp: total,
          completedCount: missions.filter(m => m.status === 'completed').length,
          activeCount: missions.filter(m => m.status !== 'coming_soon').length,
        })
      }

      // Sumar XP de exámenes aprobados (almacenados en localStorage)
      let examXp = 0
      if (typeof window !== 'undefined') {
        for (const track of computedTracks) {
          const key = EXAM_STORAGE_KEY(userId!, track.regime)
          const stored = localStorage.getItem(key)
          if (stored) {
            try {
              const result: ExamResult = JSON.parse(stored)
              if (result.passed) examXp += result.xpAwarded
            } catch { /* ignore */ }
          }
        }
      }

      const xp = computedTracks.reduce((s, t) => s + t.earnedXp, 0) + examXp
      setTracks(computedTracks)
      setTotalXp(xp)
    } finally {
      setLoading(false)
    }
  }

  return { tracks, totalXp, levelInfo: getLevelInfo(totalXp), loading }
}
