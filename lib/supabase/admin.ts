/**
 * Cliente de Supabase con rol de administrador (service_role).
 * ⚠️ SOLO USAR EN RUTAS DE SERVIDOR (app/api/...) — NUNCA en código cliente.
 * La service_role key bypasea Row Level Security.
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://tapxqpuhfzymocgdheab.supabase.co'

// Service role key — solo existe en el servidor (variable sin NEXT_PUBLIC_)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

export function createAdminClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada en las variables de entorno del servidor.')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
