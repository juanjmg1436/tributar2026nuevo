'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TestResult {
  step: string
  status: 'ok' | 'error' | 'warn' | 'running'
  detail: string
}

export default function DiagnosticoPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [running, setRunning] = useState(false)

  function addResult(r: TestResult) {
    setResults(prev => [...prev, r])
  }

  async function runDiagnostico() {
    setResults([])
    setRunning(true)

    // --- PASO 1: Variables de entorno ---
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    addResult({
      step: '1. Variables de entorno',
      status: supabaseUrl && supabaseKey ? 'ok' : 'error',
      detail: supabaseUrl
        ? `URL: ${supabaseUrl.substring(0, 40)}... KEY: ${supabaseKey?.substring(0, 20)}...`
        : '❌ NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están definidas. ' +
          'Esto es el problema — necesitás configurarlas en Vercel Dashboard (Settings → Environment Variables).',
    })

    if (!supabaseUrl || !supabaseKey) {
      setRunning(false)
      return
    }

    // --- PASO 2: Crear cliente Supabase ---
    let supabase: ReturnType<typeof createClient>
    try {
      supabase = createClient()
      addResult({ step: '2. Crear cliente Supabase', status: 'ok', detail: 'Cliente creado correctamente' })
    } catch (e: unknown) {
      addResult({ step: '2. Crear cliente Supabase', status: 'error', detail: String(e) })
      setRunning(false)
      return
    }

    // --- PASO 3: Verificar sesión actual ---
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      addResult({
        step: '3. Sesión actual (getSession)',
        status: error ? 'error' : session ? 'ok' : 'warn',
        detail: error
          ? `Error: ${error.message}`
          : session
            ? `✅ Sesión activa — usuario: ${session.user.email} — expira: ${new Date(session.expires_at! * 1000).toLocaleString()}`
            : '⚠️ No hay sesión activa (normal si no iniciaste sesión todavía)',
      })
    } catch (e: unknown) {
      addResult({ step: '3. Sesión actual (getSession)', status: 'error', detail: String(e) })
    }

    // --- PASO 4: Verificar configuración del servidor ---
    try {
      const res = await fetch('/api/check-config')
      const json = await res.json()
      addResult({
        step: '4. Configuración del servidor',
        status: json.urlSet && json.keySet ? 'ok' : 'error',
        detail: json.urlSet && json.keySet
          ? `✅ Variables de entorno server-side: OK (URL: ${json.urlPreview}, KEY: ${json.keyPreview})`
          : `❌ En el SERVIDOR faltan: ${!json.urlSet ? 'NEXT_PUBLIC_SUPABASE_URL ' : ''}${!json.keySet ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : ''}`,
      })
    } catch (e: unknown) {
      addResult({ step: '4. Configuración del servidor', status: 'error', detail: `No se pudo verificar: ${e}` })
    }

    // --- PASO 5: Test de login (si se ingresaron credenciales) ---
    if (email && password) {
      addResult({ step: '5. Intentando login...', status: 'running', detail: `Email: ${email}` })
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          addResult({
            step: '5. Resultado login',
            status: 'error',
            detail: `❌ Error: "${error.message}" (código: ${error.status}) — ${
              error.message.includes('Invalid login credentials')
                ? 'Email o contraseña incorrectos'
                : error.message.includes('Email not confirmed')
                  ? '⚠️ EMAIL NO CONFIRMADO — el usuario existe pero no confirmó el email. Revisá tu casilla de correo.'
                  : error.message
            }`,
          })
        } else if (!data.session) {
          addResult({
            step: '5. Resultado login',
            status: 'warn',
            detail: '⚠️ signInWithPassword respondió sin error pero SIN sesión. Posible causa: email sin confirmar (Supabase antiguo).',
          })
        } else {
          addResult({
            step: '5. Resultado login',
            status: 'ok',
            detail: `✅ Login exitoso — usuario: ${data.user?.email} — sesión ID: ${data.session.access_token.substring(0, 20)}...`,
          })

          // Paso 6: verificar que el middleware verá la sesión
          addResult({ step: '6. Verificando middleware...', status: 'running', detail: 'Revisando cookies de sesión...' })
          const newSession = await supabase.auth.getSession()
          addResult({
            step: '6. Cookies/sesión post-login',
            status: newSession.data.session ? 'ok' : 'error',
            detail: newSession.data.session
              ? `✅ Sesión disponible en cookies — el middleware DEBERÍA dejar pasar a /dashboard`
              : `❌ La sesión no se persistió en cookies — el middleware no la verá y redirigirá a /login`,
          })
        }
      } catch (e: unknown) {
        addResult({ step: '5. Resultado login', status: 'error', detail: `Excepción inesperada: ${String(e)}` })
      }
    }

    setRunning(false)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setResults(prev => [...prev, { step: 'Sign out', status: 'ok', detail: 'Sesión cerrada' }])
  }

  const statusColors: Record<string, string> = {
    ok: 'bg-green-50 border-green-300 text-green-800',
    error: 'bg-red-50 border-red-300 text-red-800',
    warn: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    running: 'bg-blue-50 border-blue-300 text-blue-800',
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">🔍 Diagnóstico de Autenticación</h1>
          <p className="text-slate-500 text-sm mb-6">
            Esta página verifica paso a paso por qué el login puede estar fallando.
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email (opcional para test de login)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="tu contraseña"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 mb-8">
            <button
              onClick={runDiagnostico}
              disabled={running}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {running ? 'Ejecutando...' : '▶ Ejecutar diagnóstico'}
            </button>
            <button
              onClick={signOut}
              className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              Cerrar sesión actual
            </button>
          </div>

          {results.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Resultados</h2>
              {results.map((r, i) => (
                <div key={i} className={`border rounded-lg p-4 ${statusColors[r.status] ?? 'bg-gray-50 border-gray-200'}`}>
                  <div className="font-semibold text-sm mb-1">{r.step}</div>
                  <div className="text-xs font-mono break-all whitespace-pre-wrap">{r.detail}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-slate-400 text-xs mt-4">
          ⚠️ Esta página es solo para diagnóstico. Eliminarla antes de ir a producción.
        </p>
      </div>
    </div>
  )
}
