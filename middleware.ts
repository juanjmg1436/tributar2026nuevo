import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Si faltan las variables de entorno, no podemos verificar auth server-side.
  // Dejamos pasar la request y el cliente se encargará de la redirección.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[middleware] ⚠️ Variables de entorno de Supabase no configuradas.')
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() verifica el token contra Supabase (llamada de red).
  // En caso de error de red, no redirigimos — dejamos que el cliente maneje la auth.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rutas públicas que no requieren autenticación
  const publicPaths = ['/', '/login', '/register', '/diagnostico']
  const isPublicPath = publicPaths.some(
    path => pathname === path || pathname.startsWith('/auth') || pathname.startsWith('/api/')
  )

  // Si hay error de red/configuración en getUser, no redirigir
  // (evita loop infinito cuando las env vars no están seteadas en Vercel)
  if (authError) {
    console.error('[middleware] error al verificar usuario:', authError.message)
    return supabaseResponse
  }

  // Si no está autenticado y trata de acceder a ruta privada
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Si está autenticado y trata de acceder a login/register
  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
