/**
 * TRIBUT.AR - Fix Login
 * Ejecutar con: node fix-login.js
 *
 * Confirma el email de todos los usuarios no confirmados
 * y muestra el estado de la cuenta.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://tapxqpuhfzymocgdheab.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcHhxcHVoZnp5bW9jZ2RoZWFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM0NTM3NSwiZXhwIjoyMDkxOTIxMzc1fQ.93amDGa5l7pmhI-yQUb9zpxz2fvWGbISZ0R_rTQLHdk',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  console.log('\n=== TRIBUT.AR - Diagnóstico y fix de usuarios ===\n')

  // 1. Listar todos los usuarios
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('ERROR al listar usuarios:', error.message)
    process.exit(1)
  }

  console.log(`Total de usuarios registrados: ${data.users.length}\n`)

  for (const user of data.users) {
    const confirmed = !!user.email_confirmed_at
    console.log(`Email: ${user.email}`)
    console.log(`Estado: ${confirmed ? '✓ Confirmado' : '✗ NO confirmado — arreglando...'}`)
    console.log(`Creado: ${new Date(user.created_at).toLocaleString('es-AR')}`)

    if (!confirmed) {
      // Confirmar el email usando el admin API
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      })

      if (updateError) {
        console.log(`→ ERROR al confirmar: ${updateError.message}`)
      } else {
        console.log(`→ ✓ EMAIL CONFIRMADO EXITOSAMENTE`)
      }
    }
    console.log('')
  }

  console.log('=== Listo. Ahora podés ingresar en el sitio. ===\n')
}

main().catch(console.error)
