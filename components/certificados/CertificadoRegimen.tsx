'use client'

import { forwardRef } from 'react'
import { LogoIcon } from '@/components/ui/LogoIcon'

export interface CertificadoData {
  entityName: string
  cuit: string
  subjectType: 'persona_humana' | 'persona_juridica'
  regimeCode: string
  regimeName: string
  startDate: string          // 'YYYY-MM-DD'
  certNumber: string         // e.g. 'MONO-2026-004821'
}

interface Props {
  data: CertificadoData
}

/** Formatea YYYY-MM-DD → DD/MM/YYYY */
function fmtDate(d: string) {
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

const REGIME_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  MONOTRIBUTO:       { bg: '#FFFBEB', border: '#F59E0B', badge: '#F59E0B', text: '#92400E' },
  REGIMEN_GENERAL:   { bg: '#F0FDF4', border: '#22C55E', badge: '#16A34A', text: '#14532D' },
  AUTONOMOS:         { bg: '#EFF6FF', border: '#3B82F6', badge: '#2563EB', text: '#1E3A8A' },
  RELACIONES_LABORALES: { bg: '#F5F3FF', border: '#8B5CF6', badge: '#7C3AED', text: '#4C1D95' },
  CASAS_PARTICULARES:{ bg: '#FFF1F2', border: '#F43F5E', badge: '#E11D48', text: '#881337' },
}

const DEFAULT_COLOR = { bg: '#F8FAFC', border: '#64748B', badge: '#475569', text: '#1E293B' }

export const CertificadoRegimen = forwardRef<HTMLDivElement, Props>(
  function CertificadoRegimen({ data }, ref) {
    const col = REGIME_COLORS[data.regimeCode] ?? DEFAULT_COLOR

    return (
      <div
        ref={ref}
        style={{
          width: '794px',         // A4 aprox. en 96dpi
          minHeight: '562px',
          background: col.bg,
          border: `3px solid ${col.border}`,
          borderRadius: '16px',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          padding: '0',
          overflow: 'hidden',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        {/* Banda superior */}
        <div style={{
          background: `linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)`,
          padding: '24px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <LogoIcon size={56} />
            <div>
              <p style={{ color: 'white', fontWeight: 800, fontSize: '22px', margin: 0, letterSpacing: '-0.5px' }}>
                TRIBUT.AR
              </p>
              <p style={{ color: '#93C5FD', fontSize: '11px', margin: 0, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Simulador Fiscal Educativo · Simul.Ar
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#BFDBFE', fontSize: '10px', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Nro. Certificado
            </p>
            <p style={{ color: 'white', fontSize: '13px', fontWeight: 700, margin: '2px 0 0', fontFamily: 'monospace' }}>
              {data.certNumber}
            </p>
          </div>
        </div>

        {/* Título */}
        <div style={{ textAlign: 'center', padding: '28px 36px 0' }}>
          <p style={{ fontSize: '11px', color: '#64748B', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 6px' }}>
            República Argentina — A.F.I.P.
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
            CERTIFICADO DE INSCRIPCIÓN
          </h1>
          <div style={{
            display: 'inline-block',
            background: col.badge,
            color: 'white',
            padding: '4px 18px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700,
            marginTop: '10px',
            letterSpacing: '0.5px',
          }}>
            {data.regimeName}
          </div>
        </div>

        {/* Cuerpo */}
        <div style={{ padding: '28px 48px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
          {[
            { label: 'Razón Social / Nombre', value: data.entityName.toUpperCase() },
            { label: 'CUIT', value: data.cuit },
            { label: 'Condición', value: data.subjectType === 'persona_humana' ? 'Persona Humana' : 'Persona Jurídica' },
            { label: 'Régimen Tributario', value: data.regimeName },
            { label: 'Fecha de Inscripción', value: fmtDate(data.startDate) },
            { label: 'Estado', value: '✅  Activo' },
          ].map(({ label, value }) => (
            <div key={label} style={{ borderBottom: '1px solid #E2E8F0', padding: '10px 0' }}>
              <p style={{ fontSize: '10px', color: '#94A3B8', margin: '0 0 3px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                {label}
              </p>
              <p style={{ fontSize: '15px', color: '#1E293B', margin: 0, fontWeight: 700 }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Sello + firma */}
        <div style={{
          padding: '16px 48px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
        }}>
          {/* Sello circular simulado */}
          <div style={{
            width: '90px', height: '90px',
            borderRadius: '50%',
            border: `3px solid ${col.border}`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: col.badge,
            textAlign: 'center',
            padding: '8px',
            flexShrink: 0,
          }}>
            <p style={{ fontSize: '7px', fontWeight: 700, margin: 0, letterSpacing: '1px', lineHeight: 1.3 }}>
              TRIBUT.AR
            </p>
            <p style={{ fontSize: '18px', margin: '4px 0', fontWeight: 900 }}>✦</p>
            <p style={{ fontSize: '7px', fontWeight: 700, margin: 0, letterSpacing: '0.5px', lineHeight: 1.3 }}>
              SIMULADOR
              <br />EDUCATIVO
            </p>
          </div>

          {/* Texto legal */}
          <p style={{
            flex: 1,
            fontSize: '12px',
            color: '#475569',
            lineHeight: 1.6,
            margin: 0,
          }}>
            Se certifica que el contribuyente identificado precedentemente se encuentra inscripto en el
            régimen indicado en el sistema de simulación educativa <strong>TRIBUT.AR</strong>, con fecha
            de alta <strong>{fmtDate(data.startDate)}</strong>. Este documento fue generado automáticamente
            por la plataforma con fines exclusivamente pedagógicos.
          </p>

          {/* QR simulado (grilla visual) */}
          <QRSimulado code={data.certNumber} size={80} />
        </div>

        {/* Pie — disclaimer */}
        <div style={{
          background: '#FEF9C3',
          borderTop: '1px solid #FDE047',
          padding: '8px 36px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '14px' }}>⚠️</span>
          <p style={{ fontSize: '10px', color: '#713F12', margin: 0, lineHeight: 1.4 }}>
            <strong>DOCUMENTO EDUCATIVO — SIN VALIDEZ FISCAL NI LEGAL.</strong> Generado por TRIBUT.AR (Simul.Ar) con fines exclusivamente pedagógicos.
            No constituye constancia oficial ante AFIP ni ningún organismo público. Fecha de emisión: {fmtDate(new Date().toISOString().split('T')[0])}.
          </p>
        </div>
      </div>
    )
  }
)

/** Mini QR decorativo (grilla SVG, no funcional) */
function QRSimulado({ code, size }: { code: string; size: number }) {
  // Genera un patrón pseudo-aleatorio determinístico a partir del código
  const seed = code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const cells = 11
  const cell = size / cells
  const grid: boolean[][] = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      // Esquinas fijas (patrones de detección QR)
      if ((r < 3 && c < 3) || (r < 3 && c >= cells - 3) || (r >= cells - 3 && c < 3)) return true
      return ((seed * (r + 1) * (c + 3) + r * 7 + c * 13) % 3) !== 0
    })
  )

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <rect width={size} height={size} fill="white" rx="4" />
      {grid.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c * cell + 1}
              y={r * cell + 1}
              width={cell - 1}
              height={cell - 1}
              fill="#1E293B"
              rx="0.5"
            />
          ) : null
        )
      )}
    </svg>
  )
}
