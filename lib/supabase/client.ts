import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

// Credenciales hardcodeadas como fallback para que la app no crashee
// si las env vars no están configuradas en Vercel.
// La anon key es pública por diseño — es seguro tenerla en código cliente.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://tapxqpuhfzymocgdheab.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcHhxcHVoZnp5bW9jZ2RoZWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDUzNzUsImV4cCI6MjA5MTkyMTM3NX0.X3gRT7lavCkz9zAx0d70CEDc7Trj2ai2tJybZJhFwlQ'

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}
