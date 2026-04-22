'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://tapxqpuhfzymocgdheab.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcHhxcHVoZnp5bW9jZ2RoZWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDUzNzUsImV4cCI6MjA5MTkyMTM3NX0.X3gRT7lavCkz9zAx0d70CEDc7Trj2ai2tJybZJhFwlQ'

export async function signInAction(email: string, password: string) {
  const cookieStore = await cookies()

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const msg = error.message
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
      return { error: 'Email o contraseña incorrectos.' }
    }
    if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
      return { error: 'EMAIL_NOT_CONFIRMED' }
    }
    return { error: msg }
  }

  if (!data.session) {
    return { error: 'No se pudo crear la sesión. Intentá nuevamente.' }
  }

  // Redirigir al dashboard — la cookie ya está seteada server-side
  redirect('/dashboard')
}
