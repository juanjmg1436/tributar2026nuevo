/**
 * POST /api/auth/register
 *
 * Registra un nuevo usuario usando el admin de Supabase con email_confirm: true.
 * Esto evita el paso de confirmación por email — el usuario puede ingresar inmediatamente.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  institution: z.string().optional(),
})

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

    const adminClient = createAdminClient()

    // Crear usuario con email ya confirmado — sin necesidad de email de verificación
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,          // ← clave del flujo sin email
      user_metadata: {
        full_name: fullName,
        institution: institution ?? null,
      },
    })

    if (error) {
      // Usuario ya existe
      if (error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists') ||
          error.message.includes('duplicate')) {
        return NextResponse.json(
          { error: 'Este email ya está registrado. Iniciá sesión.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: data.user?.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('Register API error:', msg)

    // Si falta la service role key, dar instrucción clara
    if (msg.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json(
        { error: 'CONFIG_MISSING', detail: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
