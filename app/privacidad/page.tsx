import Link from 'next/link'
import { BookOpen, ChevronLeft, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'Política de Privacidad — TRIBUT.AR',
  description: 'Política de privacidad y tratamiento de datos del simulador educativo TRIBUT.AR',
}

export default function PrivacidadPage() {
  const updatedAt = '15 de abril de 2026'

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">

      {/* Banner */}
      <div className="simulator-banner">
        ⚠️ SIMULADOR DIDÁCTICO — NO OFICIAL — SIN VALIDEZ FISCAL NI LEGAL — DATOS DEMO
      </div>

      {/* Navbar mínima */}
      <nav className="sticky top-[42px] z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-700 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <Link href="/" className="text-base font-bold text-primary-900">TRIBUT.AR</Link>
          </div>
          <Link href="/" className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary-700 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Política de Privacidad</h1>
            <p className="text-sm text-slate-500">Última actualización: {updatedAt}</p>
          </div>
        </div>

        <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-8">
          <p className="text-sm text-emerald-800 font-medium">
            🔒 <strong>Compromiso:</strong> TRIBUT.AR recopila únicamente los datos mínimos necesarios
            para el funcionamiento educativo de la plataforma. No vendemos ni cedemos datos a terceros.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">

          {[
            {
              n: '1', title: 'Responsable del tratamiento',
              body: `Responsable: Juan Manuel Gómez
Email de contacto: gomezjuanmanuel.1436@gmail.com
Nombre de la plataforma: TRIBUT.AR

El responsable del tratamiento de datos es el Autor de la plataforma, conforme a lo establecido por la Ley 25.326 de Protección de los Datos Personales de la República Argentina y normativas complementarias.`,
            },
            {
              n: '2', title: 'Datos que recopilamos',
              body: `2.1. Datos de registro:
• Nombre completo (provisto libremente por el usuario)
• Dirección de correo electrónico
• Institución o curso (campo opcional)
• Contraseña (almacenada de forma cifrada mediante bcrypt — nunca en texto plano)

2.2. Datos de uso del simulador:
• Progreso en los módulos del simulador
• Datos de perfil tributario ficticio creados por el usuario
• Acciones realizadas dentro del simulador (historial de actividad)
• Preferencias de configuración

2.3. Datos técnicos (recopilados automáticamente):
• Dirección IP (para seguridad y prevención de fraude)
• Tipo de dispositivo y navegador
• Fecha y hora de acceso
• Páginas visitadas dentro de la plataforma

No recopilamos CUIT, DNI, datos bancarios ni ningún dato fiscal real.`,
            },
            {
              n: '3', title: 'Finalidad del tratamiento',
              body: `Los datos recopilados se utilizan exclusivamente para:

a) Permitir el acceso y uso del Simulador (autenticación).
b) Guardar el progreso educativo del usuario entre sesiones.
c) Mejorar la experiencia y funcionalidades de la plataforma.
d) Garantizar la seguridad e integridad del servicio.
e) Comunicar actualizaciones relevantes sobre la plataforma (solo si el usuario lo consintió).

No se utilizan los datos para publicidad, perfilado comercial ni fines distintos a los educativos descritos.`,
            },
            {
              n: '4', title: 'Base legal del tratamiento',
              body: `El tratamiento de datos se basa en:

• El consentimiento del usuario, otorgado al momento del registro.
• El interés legítimo del Autor en mantener la seguridad y correcto funcionamiento de la plataforma.
• El cumplimiento de la Ley 25.326 de la República Argentina.`,
            },
            {
              n: '5', title: 'Almacenamiento y seguridad',
              body: `5.1. Los datos se almacenan en Supabase (supabase.com), una plataforma de base de datos PostgreSQL con infraestructura en AWS. Los servidores se encuentran en la región us-east-1 (Virginia, Estados Unidos).

5.2. Todas las comunicaciones entre el usuario y la plataforma se realizan mediante protocolo HTTPS con cifrado TLS.

5.3. Las contraseñas se almacenan cifradas con algoritmos estándar de la industria (bcrypt). Nunca se almacenan en texto plano.

5.4. El acceso a los datos está restringido mediante Row Level Security (RLS) en la base de datos, garantizando que cada usuario solo acceda a sus propios datos.`,
            },
            {
              n: '6', title: 'Compartición de datos con terceros',
              body: `TRIBUT.AR no vende, alquila ni cede los datos personales de los usuarios a terceros con fines comerciales.

Los únicos terceros que pueden acceder a los datos son:
• Supabase Inc. — proveedor de base de datos (rol de encargado del tratamiento)
• Vercel Inc. — proveedor de hosting y despliegue de la aplicación

Ambos actúan como encargados del tratamiento bajo contratos que garantizan la protección de los datos.

Si fuera requerido por ley, autoridad competente u orden judicial, el Autor podría verse obligado a compartir datos con organismos gubernamentales.`,
            },
            {
              n: '7', title: 'Derechos del usuario',
              body: `El usuario tiene derecho a:

• Acceso: solicitar información sobre los datos que la plataforma tiene registrados sobre él.
• Rectificación: corregir datos incorrectos o desactualizados.
• Supresión: solicitar la eliminación de su cuenta y todos los datos asociados.
• Portabilidad: solicitar una copia de sus datos en formato legible por máquina.
• Oposición: oponerse al tratamiento de sus datos en determinadas circunstancias.

Para ejercer estos derechos, el usuario debe enviar una solicitud a: gomezjuanmanuel.1436@gmail.com
El Autor responderá en un plazo máximo de 30 días corridos.`,
            },
            {
              n: '8', title: 'Retención de datos',
              body: `Los datos del usuario se conservan mientras la cuenta esté activa. Si el usuario solicita la eliminación de su cuenta, los datos se borrarán en un plazo máximo de 30 días, salvo que exista obligación legal de conservarlos por un período mayor.

Los datos de uso anonimizados (sin identificación del usuario) pueden conservarse con fines estadísticos y de mejora de la plataforma.`,
            },
            {
              n: '9', title: 'Cookies y tecnologías similares',
              body: `TRIBUT.AR utiliza cookies esenciales para el funcionamiento del sistema de autenticación (sesión de usuario). No se utilizan cookies de seguimiento, publicidad ni analítica de terceros.

Al usar la plataforma, el usuario acepta el uso de estas cookies esenciales. No existe opción de desactivarlas ya que son necesarias para el funcionamiento básico del servicio.`,
            },
            {
              n: '10', title: 'Menores de edad',
              body: `TRIBUT.AR está dirigido principalmente a estudiantes universitarios y adultos. Si bien no se prohíbe el uso por menores de 18 años, el Autor recomienda que los menores de 13 años cuenten con supervisión de un adulto responsable.

Si el Autor tuviese conocimiento de que se han recopilado datos de un menor sin el consentimiento correspondiente, eliminará dichos datos de forma inmediata.`,
            },
            {
              n: '11', title: 'Modificaciones a esta política',
              body: `El Autor puede actualizar esta Política de Privacidad periódicamente. Los cambios serán notificados mediante un aviso visible en la plataforma, con indicación de la nueva fecha de actualización. El uso continuado de la plataforma tras la notificación implica la aceptación de los cambios.`,
            },
            {
              n: '12', title: 'Contacto y consultas',
              body: `Para cualquier consulta, solicitud o reclamo relacionado con el tratamiento de datos personales:

Email: gomezjuanmanuel.1436@gmail.com
Plataforma: TRIBUT.AR (tribut.ar)
Responsable: Juan Manuel Gómez`,
            },
          ].map(({ n, title, body }) => (
            <div key={n} className="p-6 sm:p-8">
              <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-md flex items-center justify-center text-xs font-bold">{n}</span>
                {title}
              </h2>
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line pl-8">
                {body}
              </div>
            </div>
          ))}

        </div>

        <div className="mt-10 text-center text-xs text-slate-400">
          <p>© 2026 Juan Manuel Gómez — TRIBUT.AR. Todos los derechos reservados.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Link href="/terminos" className="hover:text-slate-600 transition-colors">Términos</Link>
            <span>·</span>
            <Link href="/privacidad" className="hover:text-slate-600 transition-colors">Privacidad</Link>
            <span>·</span>
            <Link href="/" className="hover:text-slate-600 transition-colors">Inicio</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
