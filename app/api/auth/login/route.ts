/**
 * POST /api/auth/login
 *
 * Login server-side: setea las cookies de sesión en el servidor
 * para que el middleware las pueda leer en la siguiente request.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://tapxqpuhfzymocgdheab.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcHhxcHVoZnp5bW9jZ2RoZWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDUzNzUsImV4cCI6MjA5MTkyMTM3NX0.X3gRT7lavCkz9zAx0d70CEDc7Trj2ai2tJybZJhFwlQ'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
    }

    // Respuesta que acumulará las cookies de sesión
    const response = NextResponse.json({ success: true })

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Escribir cookies directamente en la response
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              sameSite: 'lax',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
            })
          })
        },
      },
    })

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      const msg = error.message
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        return NextResponse.json({ error: 'Email o contraseña incorrectos.' }, { status: 401 })
      }
      if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
        return NextResponse.json({ error: 'EMAIL_NOT_CONFIRMED' }, { status: 403 })
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    if (!data.session) {
      return NextResponse.json({ error: 'No se pudo crear la sesión.' }, { status: 400 })
    }

    return response
  } catch (err) {
    console.error('Login API error:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
