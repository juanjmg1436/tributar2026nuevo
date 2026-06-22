import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// ── Sueldos 360 DB — servicio server-side ÚNICAMENTE ──────────────────────────
const S360_URL = 'https://qjyfdunhzwprusnlqxzr.supabase.co'
const S360_SERVICE_KEY = process.env.SUELDOS360_SERVICE_KEY!

// ── TRIBUT.AR — cliente anon para verificar usuario, service role para escribir ─
const TRIBUTAR_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const TRIBUTAR_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const TRIBUTAR_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function s360() {
  return createSupabaseClient(S360_URL, S360_SERVICE_KEY, { auth: { persistSession: false } })
}

function tributarAnon() {
  return createSupabaseClient(TRIBUTAR_URL, TRIBUTAR_ANON_KEY, { auth: { persistSession: false } })
}

function tributarAdmin() {
  return createSupabaseClient(TRIBUTAR_URL, TRIBUTAR_SERVICE_KEY, { auth: { persistSession: false } })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  // Verificar usuario vía Bearer token (más fiable que cookies en Route Handlers)
  const authHeader = request.headers.get('authorization') ?? ''
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!accessToken) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: { user } } = await tributarAnon().auth.getUser(accessToken)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // ── action=sync: busca empresa por token e importa datos ──────────────────────
  // El token de 8 chars identifica unívocamente la empresa — no se requiere companyId.
  if (action === 'sync') {
    const token = searchParams.get('token')

    if (!token || token.trim().length < 4) {
      return NextResponse.json({ error: 'Ingresá el código de sincronización.' }, { status: 400 })
    }

    const db = s360()

    // Buscar empresa por token (sin filtro de usuario — el token es la credencial)
    const { data: companyRow, error: companyErr } = await db
      .from('companies')
      .select('id, razon_social, cuit, actividad_principal, provincia')
      .eq('sync_token', token.trim().toUpperCase())
      .maybeSingle()

    if (companyErr || !companyRow) {
      return NextResponse.json(
        { error: 'Código incorrecto. Verificá el código que aparece en Sueldos 360 → Empresas.' },
        { status: 403 },
      )
    }

    const companyId = companyRow.id

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

    // Guardar en TRIBUT.AR (service role bypassa RLS — se puede porque user_id ya verificado)
    await (tributarAdmin() as any).from('sueldos360_imports').upsert({
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
