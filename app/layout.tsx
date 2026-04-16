import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TRIBUT.AR — Simulador Didáctico Fiscal Argentino',
  description: 'Simulador educativo del recorrido registral y fiscal argentino. NO OFICIAL. SIN VALIDEZ LEGAL.',
  keywords: ['simulador', 'fiscal', 'educativo', 'argentina', 'impuestos', 'tributario'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50">
        {children}
      </body>
    </html>
  )
}
