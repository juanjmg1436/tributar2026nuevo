import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware mínimo: no verifica sesión.
 * La protección de rutas privadas la maneja el DashboardLayout (client-side)
 * via useUser() + window.location.href, que puede leer la sesión de createBrowserClient.
 *
 * Motivo: createBrowserClient guarda la sesión en cookies del browser,
 * pero el middleware corre en el edge y no siempre puede leer esas cookies
 * correctamente durante la navegación client-side de Next.js App Router.
 * Los datos del dashboard están protegidos server-side por Supabase RLS.
 */
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
