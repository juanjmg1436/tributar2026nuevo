'use client'

import { forwardRef } from 'react'
import { LogoIcon } from '@/components/ui/LogoIcon'

export interface CertificadoAprobacionData {
  nombre: string
  score: number
  completedAt: string  // ISO date
  certNumber: string
}

interface Props {
  data: CertificadoAprobacionData
}

function fmtDate(d: string) {
  const date = new Date(d)
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export const CertificadoAprobacion = forwardRef<HTMLDivElement, Props>(
  function CertificadoAprobacion({ data }, ref) {
    const label: React.CSSProperties = {
      fontSize: '9px',
      color: '#94A3B8',
      fontWeight: 700,
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      margin: 0,
      paddingBottom: '3px',
      fontFamily: 'Arial, sans-serif',
    }
    const value: React.CSSProperties = {
      fontSize: '15px',
      color: '#0F172A',
      fontWeight: 700,
      margin: 0,
      fontFamily: 'Arial, sans-serif',
    }

    return (
      <div
        ref={ref}
        style={{
          width: '794px',
          background: 'white',
          border: '3px solid #1E3A8A',
          borderRadius: '16px',
          fontFamily: 'Arial, sans-serif',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* ── Banda superior — navy oscuro ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #1D4ED8 100%)',
          padding: '26px 32px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <div style={{ marginRight: '14px', flexShrink: 0 }}>
              <LogoIcon size={54} />
            </div>
            <div>
              <p style={{ color: 'white', fontWeight: 900, fontSize: '22px', margin: 0 }}>TRIBUT.AR</p>
              <p style={{ color: '#93C5FD', fontSize: '10px', margin: '2px 0 0', fontWeight: 600 }}>
                SIMULADOR FISCAL EDUCATIVO · SIMUL.AR
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#BFDBFE', fontSize: '10px', margin: '0 0 3px', fontWeight: 600 }}>
              NRO. CERTIFICADO
            </p>
            <p style={{ color: 'white', fontSize: '14px', fontWeight: 800, margin: 0, fontFamily: 'monospace' }}>
              {data.certNumber}
            </p>
          </div>
        </div>

        {/* ── Franja dorada decorativa ── */}
        <div style={{
          background: 'linear-gradient(90deg, #F59E0B, #FBBF24, #F59E0B)',
          height: '4px',
        }} />

        {/* ── Título central ── */}
        <div style={{ textAlign: 'center', padding: '26px 36px 0' }}>
          <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 8px', fontWeight: 600, letterSpacing: '2px' }}>
            DIPLOMATURA SUPERIOR EN CIENCIAS ECONÓMICAS
          </p>
          <p style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            CERTIFICADO DE FINALIZACIÓN
          </p>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 14px', fontWeight: 500 }}>
            Ecosistema Digital para la Enseñanza del Sistema Impositivo
          </p>
          <div style={{ display: 'inline-block' }}>
            <span style={{
              background: '#1E3A8A',
              color: 'white',
              padding: '5px 22px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
            }}>
              Simulador Fiscal TRIBUT.AR
            </span>
          </div>
        </div>

        {/* ── Se certifica que ── */}
        <div style={{ textAlign: 'center', padding: '22px 60px 16px' }}>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 6px', fontStyle: 'italic' }}>
            Se certifica que
          </p>
          <p style={{
            fontSize: '24px',
            fontWeight: 900,
            color: '#0F172A',
            margin: '0 0 10px',
            borderBottom: '2px solid #F59E0B',
            paddingBottom: '8px',
            display: 'inline-block',
            minWidth: '300px',
          }}>
            {data.nombre.toUpperCase()}
          </p>
          <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.75, margin: '10px 0 0', fontFamily: 'Arial, sans-serif' }}>
            ha completado satisfactoriamente el recorrido de aprendizaje del{' '}
            <strong>Simulador Fiscal TRIBUT.AR</strong>, incluyendo los módulos de inscripción ante ARCA/AFIP,
            facturación electrónica, declaraciones juradas, relaciones laborales e impuestos provinciales.
          </p>
        </div>

        {/* ── Datos del certificado ── */}
        <div style={{ padding: '10px 48px 18px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <tbody>
              <tr>
                <td style={{ width: '34%', padding: '8px 16px 8px 0', borderTop: '1px solid #E2E8F0', verticalAlign: 'top' }}>
                  <p style={label}>Puntuación obtenida</p>
                  <p style={{ ...value, color: data.score >= 70 ? '#16A34A' : '#D97706', fontSize: '20px' }}>
                    {data.score}%
                  </p>
                </td>
                <td style={{ width: '33%', padding: '8px 16px', borderTop: '1px solid #E2E8F0', verticalAlign: 'top' }}>
                  <p style={label}>Fecha de aprobación</p>
                  <p style={value}>{fmtDate(data.completedAt)}</p>
                </td>
                <td style={{ width: '33%', padding: '8px 0 8px 16px', borderTop: '1px solid #E2E8F0', verticalAlign: 'top' }}>
                  <p style={label}>Estado</p>
                  <p style={{ ...value, color: '#16A34A' }}>✅ APROBADO</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Sello + texto legal + QR ── */}
        <div style={{
          padding: '10px 40px 18px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <div style={{ flexShrink: 0, marginRight: '24px' }}>
            <SelloCircular size={88} />
          </div>
          <div style={{ flex: 1, marginRight: '24px' }}>
            <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.7, margin: 0 }}>
              El presente certificado acredita la finalización del recorrido pedagógico completo de{' '}
              <strong>TRIBUT.AR</strong>, plataforma de simulación fiscal educativa desarrollada en el marco
              de la Diplomatura Superior en Ciencias Económicas. Generado automáticamente
              el <strong>{fmtDate(new Date().toISOString())}</strong>.
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <QRSimulado code={data.certNumber} size={82} />
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <div style={{
          background: '#FEF9C3',
          borderTop: '1px solid #FDE047',
          padding: '9px 32px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '14px', marginRight: '8px', flexShrink: 0 }}>⚠️</span>
          <p style={{ fontSize: '10px', color: '#713F12', margin: 0, lineHeight: 1.5 }}>
            <strong>DOCUMENTO EDUCATIVO — SIN VALIDEZ OFICIAL.</strong>{' '}
            Generado por TRIBUT.AR (Simul.Ar) con fines exclusivamente pedagógicos.
            No constituye constancia oficial ante AFIP, organismos académicos ni ningún ente público.
            Emisión: {fmtDate(new Date().toISOString().split('T')[0])}.
          </p>
        </div>
      </div>
    )
  }
)

function SelloCircular({ size }: { size: number }) {
  const r = size / 2
  const stroke = 3
  const gold = '#D97706'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={r - stroke} fill="none" stroke={gold} strokeWidth={stroke} />
      <circle cx={r} cy={r} r={r - stroke - 6} fill="none" stroke={gold} strokeWidth={1} strokeDasharray="3 3" />
      <text x={r} y={r - 14} textAnchor="middle" fontSize="8" fontWeight="700" fill={gold} fontFamily="Arial">TRIBUT.AR</text>
      <text x={r} y={r + 4} textAnchor="middle" fontSize="18" fill={gold} fontFamily="Arial">★</text>
      <text x={r} y={r + 17} textAnchor="middle" fontSize="6.5" fontWeight="700" fill={gold} fontFamily="Arial">FINALIZACIÓN</text>
      <text x={r} y={r + 27} textAnchor="middle" fontSize="6.5" fontWeight="700" fill={gold} fontFamily="Arial">DEL RECORRIDO</text>
    </svg>
  )
}

function QRSimulado({ code, size }: { code: string; size: number }) {
  const seed = code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const cells = 11
  const cell = Math.floor(size / cells)
  const grid: boolean[][] = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
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
            <rect key={`${r}-${c}`} x={c * cell + 1} y={r * cell + 1}
              width={cell - 2} height={cell - 2} fill="#0F172A" rx="0.5" />
          ) : null
        )
      )}
    </svg>
  )
}
