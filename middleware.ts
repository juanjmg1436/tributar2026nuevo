import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rutas que nunca necesitan verificación ──────────────────────────
  const publicPaths = ['/', '/login', '/register', '/diagnostico', '/terminos', '/privacidad']
  const isPublicPath =
    publicPaths.includes(pathname) ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/')

  if (isPublicPath) {
    return NextResponse.next({ request })
  }

  // ── Solo llegamos aquí para rutas privadas (/dashboard, etc.) ───────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // Sin variables de entorno no podemos verificar → login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // getSession() lee la sesión desde la cookie — SIN llamada de red.
  // Es instantáneo y no puede colgar aunque Supabase tenga latencia.
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    // No hay sesión → redirigir a login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
