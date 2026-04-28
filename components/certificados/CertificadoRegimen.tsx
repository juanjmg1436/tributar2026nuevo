'use client'

import { forwardRef } from 'react'
import { LogoIcon } from '@/components/ui/LogoIcon'

export interface CertificadoData {
  entityName: string
  cuit: string
  subjectType: 'persona_humana' | 'persona_juridica'
  regimeCode: string
  regimeName: string
  startDate: string
  certNumber: string
}

interface Props {
  data: CertificadoData
}

function fmtDate(d: string) {
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

const REGIME_COLORS: Record<string, { bg: string; border: string; badge: string; accent: string }> = {
  MONOTRIBUTO:          { bg: '#FFFBEB', border: '#F59E0B', badge: '#D97706', accent: '#92400E' },
  REGIMEN_GENERAL:      { bg: '#F0FDF4', border: '#22C55E', badge: '#16A34A', accent: '#14532D' },
  AUTONOMOS:            { bg: '#EFF6FF', border: '#3B82F6', badge: '#2563EB', accent: '#1E3A8A' },
  RELACIONES_LABORALES: { bg: '#F5F3FF', border: '#8B5CF6', badge: '#7C3AED', accent: '#4C1D95' },
  CASAS_PARTICULARES:   { bg: '#FFF1F2', border: '#F43F5E', badge: '#E11D48', accent: '#881337' },
}
const DEFAULT_COLOR = { bg: '#F8FAFC', border: '#64748B', badge: '#475569', accent: '#1E293B' }

export const CertificadoRegimen = forwardRef<HTMLDivElement, Props>(
  function CertificadoRegimen({ data }, ref) {
    const col = REGIME_COLORS[data.regimeCode] ?? DEFAULT_COLOR

    // Estilos base reutilizables
    const labelStyle: React.CSSProperties = {
      fontSize: '10px',
      color: '#94A3B8',
      fontWeight: 700,
      letterSpacing: '1px',
      textTransform: 'uppercase',
      margin: 0,
      paddingBottom: '4px',
      fontFamily: 'Arial, sans-serif',
    }
    const valueStyle: React.CSSProperties = {
      fontSize: '16px',
      color: '#1E293B',
      fontWeight: 700,
      margin: 0,
      fontFamily: 'Arial, sans-serif',
    }

    const fields = [
      { label: 'Razón Social / Nombre', value: data.entityName.toUpperCase() },
      { label: 'CUIT', value: data.cuit },
      { label: 'Condición', value: data.subjectType === 'persona_humana' ? 'Persona Humana' : 'Persona Jurídica' },
      { label: 'Régimen Tributario', value: data.regimeName },
      { label: 'Fecha de Inscripción', value: fmtDate(data.startDate) },
      { label: 'Estado', value: 'ACTIVO' },
    ]

    return (
      /* Contenedor principal — sin grid, sin gap */
      <div
        ref={ref}
        style={{
          width: '794px',
          background: col.bg,
          border: `3px solid ${col.border}`,
          borderRadius: '16px',
          fontFamily: 'Arial, sans-serif',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* ── Banda superior azul ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)',
          padding: '22px 32px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo + nombre */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <div style={{ marginRight: '14px', flexShrink: 0 }}>
              <LogoIcon size={54} />
            </div>
            <div>
              <p style={{ color: 'white', fontWeight: 800, fontSize: '22px', margin: 0 }}>
                TRIBUT.AR
              </p>
              <p style={{ color: '#93C5FD', fontSize: '10px', margin: '2px 0 0', fontWeight: 600 }}>
                SIMULADOR FISCAL EDUCATIVO · SIMUL.AR
              </p>
            </div>
          </div>
          {/* Número de certificado */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#BFDBFE', fontSize: '10px', margin: '0 0 3px', fontWeight: 600 }}>
              NRO. CERTIFICADO
            </p>
            <p style={{ color: 'white', fontSize: '14px', fontWeight: 800, margin: 0, fontFamily: 'monospace' }}>
              {data.certNumber}
            </p>
          </div>
        </div>

        {/* ── Título centrado ── */}
        <div style={{ textAlign: 'center', padding: '26px 36px 0' }}>
          <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 8px', fontWeight: 600 }}>
            REPÚBLICA ARGENTINA — A.F.I.P.
          </p>
          <p style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: '0 0 12px' }}>
            CERTIFICADO DE INSCRIPCIÓN
          </p>
          {/* Badge régimen */}
          <div style={{ display: 'inline-block' }}>
            <span style={{
              background: col.badge,
              color: 'white',
              padding: '5px 20px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 700,
            }}>
              {data.regimeName}
            </span>
          </div>
        </div>

        {/* ── Tabla de datos — layout de tabla para máxima compatibilidad con html2canvas ── */}
        <div style={{ padding: '28px 40px 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <tbody>
              {/* Fila 1 */}
              <tr>
                <td style={{ width: '50%', padding: '10px 16px 10px 0', borderBottom: '1px solid #E2E8F0', verticalAlign: 'top' }}>
                  <p style={labelStyle}>{fields[0].label}</p>
                  <p style={valueStyle}>{fields[0].value}</p>
                </td>
                <td style={{ width: '50%', padding: '10px 0 10px 16px', borderBottom: '1px solid #E2E8F0', verticalAlign: 'top' }}>
                  <p style={labelStyle}>{fields[1].label}</p>
                  <p style={valueStyle}>{fields[1].value}</p>
                </td>
              </tr>
              {/* Fila 2 */}
              <tr>
                <td style={{ padding: '10px 16px 10px 0', borderBottom: '1px solid #E2E8F0', verticalAlign: 'top' }}>
                  <p style={labelStyle}>{fields[2].label}</p>
                  <p style={valueStyle}>{fields[2].value}</p>
                </td>
                <td style={{ padding: '10px 0 10px 16px', borderBottom: '1px solid #E2E8F0', verticalAlign: 'top' }}>
                  <p style={labelStyle}>{fields[3].label}</p>
                  <p style={valueStyle}>{fields[3].value}</p>
                </td>
              </tr>
              {/* Fila 3 */}
              <tr>
                <td style={{ padding: '10px 16px 10px 0', verticalAlign: 'top' }}>
                  <p style={labelStyle}>{fields[4].label}</p>
                  <p style={valueStyle}>{fields[4].value}</p>
                </td>
                <td style={{ padding: '10px 0 10px 16px', verticalAlign: 'top' }}>
                  <p style={labelStyle}>{fields[5].label}</p>
                  <p style={{ ...valueStyle, color: '#16A34A' }}>✅ {fields[5].value}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Sello + texto legal + QR — flex row sin gap ── */}
        <div style={{
          padding: '16px 40px 20px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          {/* Sello circular */}
          <div style={{ flexShrink: 0, marginRight: '24px' }}>
            <SelloCircular color={col.badge} size={88} />
          </div>

          {/* Texto legal */}
          <div style={{ flex: 1, marginRight: '24px' }}>
            <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.7, margin: 0, fontFamily: 'Arial, sans-serif' }}>
              Se certifica que el contribuyente identificado precedentemente se encuentra inscripto en el
              régimen indicado en el sistema de simulación educativa <strong>TRIBUT.AR</strong>, con fecha
              de alta <strong>{fmtDate(data.startDate)}</strong>. Este documento fue generado automáticamente
              por la plataforma con fines exclusivamente pedagógicos.
            </p>
          </div>

          {/* QR simulado */}
          <div style={{ flexShrink: 0 }}>
            <QRSimulado code={data.certNumber} size={82} />
          </div>
        </div>

        {/* ── Pie disclaimer ── */}
        <div style={{
          background: '#FEF9C3',
          borderTop: '1px solid #FDE047',
          padding: '9px 32px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '14px', marginRight: '8px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
          <p style={{ fontSize: '10px', color: '#713F12', margin: 0, lineHeight: 1.5, fontFamily: 'Arial, sans-serif' }}>
            <strong>DOCUMENTO EDUCATIVO — SIN VALIDEZ FISCAL NI LEGAL.</strong>{' '}
            Generado por TRIBUT.AR (Simul.Ar) con fines exclusivamente pedagógicos.
            No constituye constancia oficial ante AFIP ni ningún organismo público.
            Fecha de emisión: {fmtDate(new Date().toISOString().split('T')[0])}.
          </p>
        </div>
      </div>
    )
  }
)

/* ── Sello circular SVG ── */
function SelloCircular({ color, size }: { color: string; size: number }) {
  const r = size / 2
  const stroke = 3
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={r - stroke} fill="none" stroke={color} strokeWidth={stroke} />
      <circle cx={r} cy={r} r={r - stroke - 6} fill="none" stroke={color} strokeWidth={1} strokeDasharray="3 3" />
      <text x={r} y={r - 14} textAnchor="middle" fontSize="8" fontWeight="700" fill={color} fontFamily="Arial">TRIBUT.AR</text>
      <text x={r} y={r + 4} textAnchor="middle" fontSize="18" fill={color} fontFamily="Arial">✦</text>
      <text x={r} y={r + 17} textAnchor="middle" fontSize="7" fontWeight="700" fill={color} fontFamily="Arial">SIMULADOR</text>
      <text x={r} y={r + 27} textAnchor="middle" fontSize="7" fontWeight="700" fill={color} fontFamily="Arial">EDUCATIVO</text>
    </svg>
  )
}

/* ── QR decorativo (SVG nativo, sin letterSpacing) ── */
function QRSimulado({ code, size }: { code: string; size: number }) {
  const seed = code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const cells = 11
  const cell = Math.floor(size / cells)

  const grid: boolean[][] = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      // Esquinas de detección QR
      if ((r < 3 && c < 3) || (r < 3 && c >= cells - 3) || (r >= cells - 3 && c < 3)) return true
      return ((seed * (r + 1) * (c + 3) + r * 7 + c * 13) % 3) !== 0
    })
  )

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" rx="4" />
      <rect width={size} height={size} fill="none" stroke="#E2E8F0" strokeWidth="1" rx="4" />
      {grid.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c * cell + 1}
              y={r * cell + 1}
              width={cell - 2}
              height={cell - 2}
              fill="#1E293B"
              rx="0.5"
            />
          ) : null
        )
      )}
    </svg>
  )
}
