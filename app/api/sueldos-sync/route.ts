import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createTributarClient } from '@/lib/supabase/server'

// ── Sueldos 360 DB — servicio server-side ÚNICAMENTE ──────────────────────────
// Credenciales SOLO para Sueldos 360 (qjyfdunhzwprusnlqxzr).
// NUNCA exponer al cliente/browser.
const S360_URL = 'https://qjyfdunhzwprusnlqxzr.supabase.co'
const S360_SERVICE_KEY = process.env.SUELDOS360_SERVICE_KEY!

function s360() {
  return createSupabaseClient(S360_URL, S360_SERVICE_KEY, {
    auth: { persistSession: false },
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  // Verificar usuario autenticado en TRIBUT.AR
  const tributar = await createTributarClient()
  const { data: { user } } = await tributar.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // ── action=companies: lista empresas del usuario en Sueldos 360 ─────────────
  if (action === 'companies') {
    const db = s360()
    // Buscar usuario en Sueldos 360 por email
    const { data: s360Users } = await db
      .from('profiles')
      .select('id, email')
      .eq('email', user.email!)
      .limit(1)

    if (!s360Users || s360Users.length === 0) {
      return NextResponse.json({ companies: [] })
    }

    const s360UserId = s360Users[0].id

    const { data: companies } = await db
      .from('companies')
      .select('id, razon_social, cuit, sync_token, actividad_principal, provincia, is_active')
      .eq('user_id', s360UserId)
      .eq('is_active', true)
      .order('created_at')

    return NextResponse.json({
      companies: (companies || []).map(c => ({
        id: c.id,
        razon_social: c.razon_social,
        cuit: c.cuit,
        actividad_principal: c.actividad_principal,
        provincia: c.provincia,
        has_token: !!c.sync_token,
      })),
    })
  }

  // ── action=sync: importa datos de la empresa verificando el token ───────────
  if (action === 'sync') {
    const companyId = searchParams.get('companyId')
    const token     = searchParams.get('token')

    if (!companyId || !token) {
      return NextResponse.json({ error: 'Faltan parámetros: companyId y token' }, { status: 400 })
    }

    const db = s360()

    // Verificar token
    const { data: companyRow } = await db
      .from('companies')
      .select('id, razon_social, cuit, actividad_principal, provincia')
      .eq('id', companyId)
      .eq('sync_token', token.toUpperCase())
      .single()

    if (!companyRow) {
      return NextResponse.json(
        { error: 'Código incorrecto. Verificá el código que aparece en Sueldos 360 → Empresas.' },
        { status: 403 },
      )
    }

    // Importar datos en paralelo
    const [empRes, payrollRes, f931Res] = await Promise.all([
      db.from('employees')
        .select('id, apellido, nombre, cuil, puesto, categoria, sueldo_basico, jornada, modalidad, status, fecha_ingreso')
        .eq('company_id', companyId)
        .neq('status', 'baja')
        .order('apellido'),
      db.from('payroll_runs')
        .select('id, periodo, tipo, status, total_bruto, total_neto, total_contribuciones_patronales, total_aportes_trabajador, total_costo_laboral, fecha_pago')
        .eq('company_id', companyId)
        .order('periodo', { ascending: false })
        .limit(6),
      db.from('f931_reports')
        .select('id, periodo, cantidad_empleados, total_remuneraciones, total_aportes_jubilatorios, total_obra_social, total_pami, total_contribuciones_patronales, total_general, status, presentado_at, pagado_at')
        .eq('company_id', companyId)
        .order('periodo', { ascending: false })
        .limit(6),
    ])

    const employees  = empRes.data || []
    const payrolls   = payrollRes.data || []
    const f931s      = f931Res.data || []
    const lastPayroll = payrolls[0]

    // Guardar en TRIBUT.AR
    await (tributar as any).from('sueldos360_imports').upsert({
      user_id:             user.id,
      s360_company_id:     companyId,
      company_name:        companyRow.razon_social,
      company_cuit:        companyRow.cuit,
      employee_count:      employees.length,
      employees_json:      employees,
      payroll_runs_json:   payrolls,
      f931_json:           f931s,
      last_period:         lastPayroll?.periodo ?? null,
      total_bruto:         lastPayroll?.total_bruto ?? 0,
      total_neto:          lastPayroll?.total_neto ?? 0,
      total_contribuciones: lastPayroll?.total_contribuciones_patronales ?? 0,
      synced_at:           new Date().toISOString(),
    }, { onConflict: 'user_id,s360_company_id' })

    return NextResponse.json({
      ok: true,
      company: companyRow,
      employee_count: employees.length,
      employees,
      payroll_runs: payrolls,
      f931_reports: f931s,
    })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
