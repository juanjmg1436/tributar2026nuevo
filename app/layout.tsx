import type { Metadata } from 'next'
import './globals.css'

const siteUrl = 'https://tributar2026nuevo.vercel.app'
const siteName = 'TRIBUT.AR'
const siteDescription =
  'Simulador educativo gratuito del sistema fiscal argentino. Aprendé tributación sin consecuencias reales. NO OFICIAL — SIN VALIDEZ LEGAL.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'TRIBUT.AR — Simulador Didáctico Fiscal Argentino',
    template: '%s — TRIBUT.AR',
  },
  description: siteDescription,
  keywords: [
    'simulador fiscal', 'tributación argentina', 'AFIP simulador',
    'educación tributaria', 'impuestos argentina', 'monotributo',
    'responsable inscripto', 'herramienta educativa', 'fiscal didáctico',
  ],
  authors: [{ name: 'Juan Manuel Gómez' }],
  creator: 'Juan Manuel Gómez',
  publisher: 'Juan Manuel Gómez',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: siteUrl,
    siteName,
    title: 'TRIBUT.AR — Simulador Didáctico Fiscal Argentino',
    description: siteDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TRIBUT.AR — Simulador Fiscal Educativo',
    description: siteDescription,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 antialiased">
        {children}
      </body>
    </html>
  )
}
