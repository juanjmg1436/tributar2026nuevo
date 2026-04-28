/**
 * LogoIcon — Ícono SVG de TRIBUT.AR (sin texto embebido).
 * Reemplaza el PNG que tenía "tribu.ar" incorrecto.
 * Se puede usar en cualquier tamaño con la prop `size`.
 */

interface LogoIconProps {
  size?: number
  className?: string
}

export function LogoIcon({ size = 40, className = '' }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Fondo blanco redondeado */}
      <rect width="100" height="100" rx="22" fill="white" />

      {/* Círculo exterior azul claro */}
      <circle cx="50" cy="50" r="36" fill="#DBEAFE" />

      {/* Nodo central — persona principal */}
      <circle cx="50" cy="44" r="9" fill="#1D4ED8" />

      {/* Nodo superior izquierdo */}
      <circle cx="28" cy="32" r="6.5" fill="#3B82F6" />

      {/* Nodo superior derecho */}
      <circle cx="72" cy="32" r="6.5" fill="#3B82F6" />

      {/* Nodo inferior izquierdo */}
      <circle cx="30" cy="64" r="6" fill="#60A5FA" />

      {/* Nodo inferior derecho */}
      <circle cx="70" cy="64" r="6" fill="#60A5FA" />

      {/* Líneas de conexión */}
      <line x1="50" y1="44" x2="28" y2="32" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="44" x2="72" y2="32" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="44" x2="30" y2="64" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="44" x2="70" y2="64" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />

      {/* Línea horizontal inferior — base / "T" de TRIBUT */}
      <rect x="30" y="76" width="40" height="5" rx="2.5" fill="#1D4ED8" />
    </svg>
  )
}
