import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas que no requieren autenticación — se dejan pasar siempre
  const publicPaths = ['/', '/login', '/register', '/diagnostico', '/terminos', '/privacidad']
  const isPublicPath =
    publicPaths.includes(pathname) ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/')

  // Si la ruta es pública, la dejamos pasar sin verificar auth
  // (evita la llamada de red a Supabase en cada visita a la landing/login)
  if (isPublicPath) {
    return NextResponse.next({ request })
  }

  // A partir de aquí solo llegan rutas privadas (/dashboard, /perfil-contribuyente, etc.)
  // Verificamos si las variables de entorno están disponibles
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // Sin env vars no podemos verificar — redirigimos a login para que el cliente maneje
    console.error('[middleware] Variables de entorno de Supabase no configuradas.')
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

  // getUser() hace llamada de red — solo para rutas privadas
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // Si hay error de red en la verificación, dejamos pasar (el cliente manejará)
  if (authError) {
    console.error('[middleware] error al verificar usuario:', authError.message)
    return supabaseResponse
  }

  // Ruta privada sin sesión → login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Excluye archivos estáticos y assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
