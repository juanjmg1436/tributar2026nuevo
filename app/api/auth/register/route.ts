/**
 * POST /api/auth/register
 *
 * Registra un nuevo usuario sin requerir confirmación de email.
 * Estrategia con fallback:
 *   1. Si existe SUPABASE_SERVICE_ROLE_KEY → admin.createUser con email_confirm:true
 *   2. Si no existe la key → signUp estándar (requiere que el proyecto tenga
 *      "Confirm email" desactivado en Supabase Auth settings)
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { z } from 'zod'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://tapxqpuhfzymocgdheab.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcHhxcHVoZnp5bW9jZ2RoZWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDUzNzUsImV4cCI6MjA5MTkyMTM3NX0.X3gRT7lavCkz9zAx0d70CEDc7Trj2ai2tJybZJhFwlQ'

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  institution: z.string().optional(),
})

function isAlreadyRegisteredError(msg: string) {
  const m = msg.toLowerCase()
  return m.includes('already registered') || m.includes('already exists') ||
    m.includes('duplicate') || m.includes('unique') || m.includes('user_already_exists')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos: ' + parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { fullName, email, password, institution } = parsed.data
    const userMeta = { full_name: fullName, institution: institution ?? null }

    // ── Estrategia 1: Admin API (sin email confirmation) ────────────────────
    if (SERVICE_ROLE_KEY) {
      const adminClient = createAnonClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMeta,
      })

      if (error) {
        if (isAlreadyRegisteredError(error.message)) {
          return NextResponse.json(
            { error: 'Este email ya está registrado. Iniciá sesión.' },
            { status: 409 }
          )
        }
        // Si el admin falla por otro motivo, caer al fallback
        console.warn('Admin createUser failed, falling back to signUp:', error.message)
      } else {
        // Admin OK — el cliente puede hacer signIn inmediatamente
        return NextResponse.json({ success: true, method: 'admin' })
      }
    }

    // ── Estrategia 2: signUp estándar (funciona si email confirm está OFF) ──
    const anonClient = createAnonClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error: signUpError } = await anonClient.auth.signUp({
      email,
      password,
      options: { data: userMeta },
    })

    if (signUpError) {
      if (isAlreadyRegisteredError(signUpError.message)) {
        return NextResponse.json(
          { error: 'Este email ya está registrado. Iniciá sesión.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    // Si devuelve sesión → email confirmation estaba OFF → puede loguearse ya
    const hasSession = !!data?.session
    return NextResponse.json({
      success: true,
      method: 'signup',
      needsConfirmation: !hasSession,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('Register API error:', msg)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
