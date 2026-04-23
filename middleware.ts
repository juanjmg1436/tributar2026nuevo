import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://tapxqpuhfzymocgdheab.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcHhxcHVoZnp5bW9jZ2RoZWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDUzNzUsImV4cCI6MjA5MTkyMTM3NX0.X3gRT7lavCkz9zAx0d70CEDc7Trj2ai2tJybZJhFwlQ'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas: pasan sin verificación de auth
  const publicPaths = ['/', '/login', '/register', '/diagnostico', '/terminos', '/privacidad']
  const isPublicPath =
    publicPaths.includes(pathname) ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/')

  if (isPublicPath) {
    return NextResponse.next({ request })
  }

  // Rutas privadas: verificar usuario con validación server-side real
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

  // getSession() lee la cookie local — NO hace llamada de red, nunca puede colgar.
  // Funciona correctamente porque el login es client-side (createBrowserClient),
  // así las cookies son accesibles tanto en browser como en request.cookies del middleware.
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  } catch {
    // Si getSession falla por cualquier razón, redirigir a login
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
