import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Valores ficticios: los tests no tocan la base, pero el módulo del
    // endpoint crea el cliente de Supabase al importarse y exige que existan.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://proyecto-de-prueba.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'clave-de-prueba',
      SUPABASE_SERVICE_ROLE_KEY: 'clave-de-prueba',
    },
  },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, '.') } },
})
