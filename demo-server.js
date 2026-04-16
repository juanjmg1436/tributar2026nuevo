/**
 * TRIBUT.AR — Demo Server
 * Servidor de demostración que corre sin necesidad de compilación webpack.
 * Usa React y Tailwind desde CDN para mostrar la UI completa en puerto 3001.
 *
 * Uso: node demo-server.js
 */

const http = require('http')
const PORT = 3001

const COMMON_HEAD = `
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>TRIBUT.AR — Simulador Didáctico Fiscal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' }
          }
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  <style>body { font-family: 'Inter', sans-serif; }</style>
`

const BANNER = `
  <div class="bg-amber-50 border-b-2 border-amber-400 px-4 py-2 text-center text-sm font-semibold text-amber-800">
    ⚠️ SIMULADOR DIDÁCTICO — NO OFICIAL — SIN VALIDEZ FISCAL NI LEGAL — DATOS DE DEMOSTRACIÓN
  </div>
`

function page_home() {
  return `<!DOCTYPE html><html lang="es"><head>${COMMON_HEAD}</head><body class="min-h-screen bg-slate-50">
  ${BANNER}
  <!-- NAV -->
  <nav class="bg-white border-b border-slate-200 px-6 py-4">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">T</div>
        <span class="text-xl font-bold text-slate-900">TRIBUT<span class="text-blue-600">.AR</span></span>
      </div>
      <div class="flex gap-3">
        <a href="/login" class="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">Iniciar sesión</a>
        <a href="/register" class="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Registrarse</a>
      </div>
    </div>
  </nav>

  <!-- HERO -->
  <main class="max-w-6xl mx-auto px-6 py-20">
    <div class="text-center mb-16">
      <div class="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-2 rounded-full mb-6">
        <span>🎓</span> Herramienta educativa sin fines fiscales reales
      </div>
      <h1 class="text-5xl font-bold text-slate-900 mb-6 leading-tight">
        Simulador Didáctico<br/>
        <span class="text-blue-600">Fiscal Argentino</span>
      </h1>
      <p class="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
        Aprendé el proceso registral y fiscal argentino de manera interactiva.
        Desde el alta como contribuyente hasta la facturación electrónica.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="/register" class="px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-lg shadow-lg shadow-blue-200">
          Comenzar simulación →
        </a>
        <a href="/login" class="px-8 py-4 bg-white text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-lg border border-slate-200">
          Ya tengo cuenta
        </a>
      </div>
    </div>

    <!-- MODULES -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
      ${[
        {icon:'🪪', num:'01', title:'Alta como Contribuyente', desc:'Obtené tu CUIT simulado e iniciá tu inscripción ante la AFIP en el entorno de práctica.', done:true},
        {icon:'📋', num:'02', title:'Alta Registral', desc:'Completá el formulario F.420/J y registrá tu actividad económica según el nomenclador.', done:true},
        {icon:'💰', num:'03', title:'Régimen Tributario', desc:'Elegí entre Monotributo y Responsable Inscripto. Calculá categorías y cuotas.', done:false},
        {icon:'📬', num:'04', title:'Domicilio Fiscal Electrónico', desc:'Configurá tu buzón de notificaciones y vinculá tu email a la clave fiscal.', done:false},
        {icon:'🧾', num:'05', title:'Punto de Venta', desc:'Habilitá un punto de venta, asociá comprobantes y configurá la facturación electrónica.', done:false},
        {icon:'📊', num:'06', title:'Primera Declaración Jurada', desc:'Completá tu primer DDJJ y simulá el pago de impuestos con datos de práctica.', done:false},
      ].map(m => `
        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow ${m.done ? '' : 'opacity-60'}">
          <div class="flex items-start justify-between mb-3">
            <span class="text-2xl">${m.icon}</span>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono text-slate-400">MÓDULO ${m.num}</span>
              ${m.done ? '<span class="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Activo</span>' : '<span class="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">🔒 Bloqueado</span>'}
            </div>
          </div>
          <h3 class="font-semibold text-slate-900 mb-2">${m.title}</h3>
          <p class="text-sm text-slate-500">${m.desc}</p>
        </div>
      `).join('')}
    </div>

    <!-- FEATURES -->
    <div class="bg-blue-600 rounded-2xl p-10 text-white text-center">
      <h2 class="text-2xl font-bold mb-3">¿Por qué TRIBUT.AR?</h2>
      <p class="text-blue-100 mb-8 max-w-xl mx-auto">Una herramienta pedagógica para estudiantes, docentes y profesionales que quieran entender el sistema fiscal argentino sin riesgo.</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        ${['100% gratuito y educativo', 'Datos demo, sin consecuencias reales', 'Basado en normativa AFIP vigente'].map(f => `
          <div class="bg-blue-500 bg-opacity-50 rounded-xl p-4">
            <p class="font-medium text-sm">${f}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </main>

  <footer class="text-center py-8 text-sm text-slate-400 border-t border-slate-200 mt-10">
    TRIBUT.AR &copy; ${new Date().getFullYear()} — Herramienta educativa sin fines legales ni fiscales reales.
  </footer>
</body></html>`
}

function page_login() {
  return `<!DOCTYPE html><html lang="es"><head>${COMMON_HEAD}</head><body class="min-h-screen bg-slate-50 flex flex-col">
  ${BANNER}
  <div class="flex-1 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">T</div>
        <h1 class="text-2xl font-bold text-slate-900">Bienvenido/a</h1>
        <p class="text-slate-500 text-sm mt-1">Ingresá a tu cuenta del simulador</p>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <form action="/dashboard" method="GET" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" placeholder="tu@email.com" value="demo@tribut.ar"
              class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
            <input type="password" placeholder="••••••••" value="demo1234"
              class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
          </div>
          <div class="flex items-center justify-between text-sm">
            <label class="flex items-center gap-2 text-slate-600 cursor-pointer">
              <input type="checkbox" checked class="rounded border-slate-300 text-blue-600"/> Recordarme
            </label>
            <a href="#" class="text-blue-600 hover:underline">¿Olvidaste tu contraseña?</a>
          </div>
          <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Iniciar sesión
          </button>
        </form>
        <div class="mt-6 text-center">
          <p class="text-sm text-slate-500">¿No tenés cuenta? <a href="/register" class="text-blue-600 font-medium hover:underline">Registrarse</a></p>
        </div>
      </div>
      <p class="text-center text-xs text-amber-600 mt-4 font-medium">
        ⚠️ Cuenta de demostración — Sin datos reales
      </p>
    </div>
  </div>
</body></html>`
}

function page_register() {
  return `<!DOCTYPE html><html lang="es"><head>${COMMON_HEAD}</head><body class="min-h-screen bg-slate-50 flex flex-col">
  ${BANNER}
  <div class="flex-1 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">T</div>
        <h1 class="text-2xl font-bold text-slate-900">Crear cuenta</h1>
        <p class="text-slate-500 text-sm mt-1">Comenzá tu simulación fiscal hoy</p>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <form action="/dashboard" method="GET" class="space-y-5">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Nombre</label>
              <input type="text" placeholder="Juan" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Apellido</label>
              <input type="text" placeholder="García" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" placeholder="tu@email.com" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
            <input type="password" placeholder="Mínimo 8 caracteres" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Perfil</label>
            <select class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option>Estudiante</option>
              <option>Docente</option>
              <option>Profesional independiente</option>
              <option>Comerciante</option>
            </select>
          </div>
          <div class="flex items-start gap-2">
            <input type="checkbox" class="mt-0.5 rounded border-slate-300 text-blue-600"/>
            <p class="text-xs text-slate-500">Entiendo que esto es un simulador educativo sin validez legal ni fiscal</p>
          </div>
          <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Crear cuenta de práctica
          </button>
        </form>
        <div class="mt-6 text-center">
          <p class="text-sm text-slate-500">¿Ya tenés cuenta? <a href="/login" class="text-blue-600 font-medium hover:underline">Iniciar sesión</a></p>
        </div>
      </div>
    </div>
  </div>
</body></html>`
}

function page_dashboard() {
  const modules = [
    { icon:'🪪', num:'01', title:'Alta como Contribuyente', status:'completed', href:'/dashboard/modulo-1', badge:'Completado', badgeClass:'bg-emerald-100 text-emerald-700' },
    { icon:'📋', num:'02', title:'Alta Registral', status:'active', href:'/dashboard/modulo-2', badge:'En progreso', badgeClass:'bg-blue-100 text-blue-700' },
    { icon:'💰', num:'03', title:'Régimen Tributario', status:'locked', href:'#', badge:'Bloqueado', badgeClass:'bg-slate-100 text-slate-500' },
    { icon:'📬', num:'04', title:'Domicilio Fiscal Electrónico', status:'locked', href:'#', badge:'Bloqueado', badgeClass:'bg-slate-100 text-slate-500' },
    { icon:'🧾', num:'05', title:'Punto de Venta', status:'locked', href:'#', badge:'Bloqueado', badgeClass:'bg-slate-100 text-slate-500' },
    { icon:'📊', num:'06', title:'Primera Declaración Jurada', status:'locked', href:'#', badge:'Bloqueado', badgeClass:'bg-slate-100 text-slate-500' },
  ]

  return `<!DOCTYPE html><html lang="es"><head>${COMMON_HEAD}</head><body class="min-h-screen bg-slate-50">
  ${BANNER}
  <div class="flex h-[calc(100vh-40px)]">
    <!-- SIDEBAR -->
    <aside class="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div class="p-4 border-b border-slate-200">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">T</div>
          <span class="text-lg font-bold text-slate-900">TRIBUT<span class="text-blue-600">.AR</span></span>
        </div>
      </div>
      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        <a href="/dashboard" class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold">
          <span>🏠</span> Dashboard
        </a>
        ${modules.map(m => `
          <a href="${m.href}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${m.status === 'locked' ? 'text-slate-400 cursor-not-allowed opacity-50' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}">
            <span>${m.icon}</span>
            <span class="truncate">${m.title}</span>
            ${m.status === 'locked' ? '<span class="ml-auto text-xs">🔒</span>' : ''}
            ${m.status === 'completed' ? '<span class="ml-auto text-emerald-500">✓</span>' : ''}
          </a>
        `).join('')}
        <div class="pt-3 mt-3 border-t border-slate-200">
          <a href="/login" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-700">
            <span>🚪</span> Cerrar sesión
          </a>
        </div>
      </nav>
      <div class="p-4 border-t border-slate-200">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">D</div>
          <div>
            <p class="text-xs font-semibold text-slate-700">Demo Usuario</p>
            <p class="text-xs text-slate-400">demo@tribut.ar</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- MAIN -->
    <main class="flex-1 overflow-y-auto p-8">
      <div class="max-w-4xl mx-auto">
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-slate-900">¡Bienvenido/a, Demo!</h1>
          <p class="text-slate-500 text-sm mt-1">Tu progreso en el simulador fiscal</p>
        </div>

        <!-- PROGRESS CARD -->
        <div class="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-slate-800">Progreso del simulador</h2>
            <span class="text-2xl font-bold text-blue-700">33%</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-3 mb-4">
            <div class="bg-blue-600 h-3 rounded-full" style="width: 33%"></div>
          </div>
          <p class="text-sm text-slate-500 mb-4">En progreso</p>
          <div class="space-y-2">
            ${[
              {label:'Perfil del contribuyente', done:true},
              {label:'Alta registral completa', done:false},
              {label:'Régimen activo', done:false},
              {label:'Domicilio fiscal electrónico', done:false},
              {label:'Punto de venta habilitado', done:false},
            ].map(item => `
              <div class="flex items-center gap-2.5">
                ${item.done ? '<span class="text-emerald-500 text-sm">✓</span>' : '<span class="text-slate-300 text-sm">○</span>'}
                <span class="text-sm ${item.done ? 'text-slate-400 line-through' : 'text-slate-600'}">${item.label}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- ALERT -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div class="flex gap-3">
            <span class="text-blue-500 text-lg mt-0.5">ℹ️</span>
            <div>
              <p class="text-sm font-semibold text-blue-800 mb-1">Próximo paso: Alta Registral</p>
              <p class="text-sm text-blue-700">Ya completaste el alta como contribuyente. El siguiente módulo te guiará en el proceso de alta registral ante la AFIP.</p>
            </div>
          </div>
        </div>

        <!-- MODULES GRID -->
        <h2 class="text-lg font-semibold text-slate-900 mb-4">Módulos del simulador</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${modules.map(m => `
            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm ${m.status === 'locked' ? 'opacity-60' : 'hover:shadow-md transition-shadow'}">
              <div class="flex items-start justify-between mb-3">
                <span class="text-xl">${m.icon}</span>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium ${m.badgeClass}">${m.badge}</span>
              </div>
              <p class="text-xs font-mono text-slate-400 mb-1">MÓDULO ${m.num}</p>
              <h3 class="font-semibold text-slate-900 text-sm mb-3">${m.title}</h3>
              ${m.status !== 'locked' ? `<a href="${m.href}" class="text-sm text-blue-600 font-medium hover:underline">Ir al módulo →</a>` : '<span class="text-xs text-slate-400">Completá los módulos anteriores para desbloquear</span>'}
            </div>
          `).join('')}
        </div>

        <div class="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p class="text-sm text-amber-800 font-medium">
            ⚠️ Recordá: Todo el contenido de este simulador es educativo. Los CUITs, datos fiscales y operaciones generados son ficticios y no tienen validez legal.
          </p>
        </div>
      </div>
    </main>
  </div>
</body></html>`
}

function page_modulo1() {
  return `<!DOCTYPE html><html lang="es"><head>${COMMON_HEAD}</head><body class="min-h-screen bg-slate-50">
  ${BANNER}
  <div class="max-w-3xl mx-auto px-6 py-10">
    <a href="/dashboard" class="text-sm text-blue-600 hover:underline mb-6 inline-block">← Volver al dashboard</a>
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
      <div class="flex items-center gap-3 mb-6">
        <span class="text-3xl">🪪</span>
        <div>
          <p class="text-xs font-mono text-slate-400">MÓDULO 01</p>
          <h1 class="text-xl font-bold text-slate-900">Alta como Contribuyente</h1>
        </div>
        <span class="ml-auto text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">✓ Completado</span>
      </div>
      <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
        <p class="text-sm font-semibold text-emerald-800 mb-1">✅ Alta registrada exitosamente</p>
        <p class="text-sm text-emerald-700">Tu CUIT simulado fue generado y tu cuenta está activa en el sistema de práctica.</p>
      </div>
      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <span class="text-sm text-slate-600 font-medium">CUIT asignado</span>
          <span class="text-sm font-bold text-slate-900 font-mono">20-34567890-1</span>
        </div>
        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <span class="text-sm text-slate-600 font-medium">Tipo de sujeto</span>
          <span class="text-sm font-semibold text-slate-900">Persona Humana</span>
        </div>
        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <span class="text-sm text-slate-600 font-medium">Estado</span>
          <span class="text-sm font-semibold text-emerald-700">✓ Activo</span>
        </div>
      </div>
      <div class="mt-8 pt-6 border-t border-slate-200">
        <a href="/dashboard" class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Continuar con Alta Registral →
        </a>
      </div>
    </div>
  </div>
</body></html>`
}

function page_404(url) {
  return `<!DOCTYPE html><html lang="es"><head>${COMMON_HEAD}</head><body class="min-h-screen bg-slate-50 flex items-center justify-center">
  <div class="text-center">
    <div class="text-6xl mb-4">📄</div>
    <h1 class="text-2xl font-bold text-slate-900 mb-2">Página no encontrada</h1>
    <p class="text-slate-500 text-sm mb-6">La ruta <code class="bg-slate-100 px-2 py-0.5 rounded text-xs">${url}</code> no existe en el demo.</p>
    <a href="/" class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm">← Volver al inicio</a>
  </div>
</body></html>`
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0]
  console.log(`${new Date().toISOString()} ${req.method} ${url}`)

  const routes = {
    '/':           page_home,
    '/login':      page_login,
    '/register':   page_register,
    '/dashboard':  page_dashboard,
    '/dashboard/modulo-1': page_modulo1,
    '/dashboard/modulo-2': page_dashboard,
  }

  const handler = routes[url]
  if (handler) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(handler())
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(page_404(url))
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '─'.repeat(50))
  console.log(`  ▲ TRIBUT.AR — Servidor de demostración`)
  console.log(`  - Local:   http://localhost:${PORT}`)
  console.log(`  - Estado:  Corriendo sin compilación webpack`)
  console.log('─'.repeat(50))
  console.log(`  Rutas disponibles:`)
  console.log(`    /           → Landing page`)
  console.log(`    /login      → Iniciar sesión`)
  console.log(`    /register   → Registrarse`)
  console.log(`    /dashboard  → Panel de control`)
  console.log('─'.repeat(50) + '\n')
})

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Error: Puerto ${PORT} ya está en uso. Cerrá el proceso que lo usa.`)
  } else {
    console.error('Error del servidor:', e)
  }
  process.exit(1)
})
