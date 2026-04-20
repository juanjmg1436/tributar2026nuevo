import Link from 'next/link'
import { BookOpen, ChevronLeft, Scale } from 'lucide-react'

export const metadata = {
  title: 'Términos y Condiciones — TRIBUT.AR',
  description: 'Términos y condiciones de uso del simulador educativo TRIBUT.AR',
}

export default function TerminosPage() {
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

      {/* Contenido */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <Scale className="w-5 h-5 text-primary-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Términos y Condiciones</h1>
            <p className="text-sm text-slate-500">Última actualización: {updatedAt}</p>
          </div>
        </div>

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
          <p className="text-sm text-amber-800 font-medium">
            ⚠️ <strong>Importante:</strong> TRIBUT.AR es una herramienta estrictamente educativa. No reemplaza
            el asesoramiento profesional contable, impositivo ni legal. El uso de esta plataforma
            no tiene validez fiscal, jurídica ni administrativa ante ningún organismo oficial.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">

          {[
            {
              n: '1', title: 'Definición y naturaleza del servicio',
              body: `TRIBUT.AR (en adelante "el Simulador" o "la Plataforma") es una aplicación web de carácter educativo y didáctico, desarrollada y mantenida por Juan Manuel Gómez (en adelante "el Autor"). Su propósito es facilitar el aprendizaje del sistema fiscal argentino mediante la simulación de trámites tributarios en un entorno virtual controlado, sin consecuencias reales.

El Simulador no es un servicio oficial de AFIP (Administración Federal de Ingresos Públicos), ni de ningún otro organismo gubernamental de la República Argentina. Los procesos, formularios y flujos de trabajo presentes en la plataforma son representaciones didácticas y pueden no reflejar con exactitud los procedimientos oficiales vigentes.`,
            },
            {
              n: '2', title: 'Aceptación de los términos',
              body: `Al registrarse y utilizar TRIBUT.AR, el usuario declara:

a) Haber leído, comprendido y aceptado en su totalidad estos Términos y Condiciones.
b) Ser mayor de 13 años o contar con autorización de un adulto responsable.
c) Utilizar la plataforma exclusivamente con fines educativos y/o de práctica.
d) Comprender que los datos y simulaciones realizadas no tienen validez legal, fiscal ni administrativa.

El uso continuado de la plataforma implica la aceptación de cualquier modificación futura de estos términos.`,
            },
            {
              n: '3', title: 'Registro y responsabilidad del usuario',
              body: `3.1. Para acceder al Simulador, el usuario debe registrarse proporcionando un nombre, dirección de correo electrónico y contraseña. No se requiere CUIT, DNI ni ningún dato fiscal real.

3.2. El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades realizadas desde su cuenta.

3.3. El usuario se compromete a no utilizar la plataforma para actividades ilícitas, fraudulentas o que vulneren derechos de terceros.

3.4. El Autor se reserva el derecho de suspender o eliminar cuentas que violen estos términos, sin previo aviso.`,
            },
            {
              n: '4', title: 'Propiedad intelectual',
              body: `4.1. Todos los contenidos de TRIBUT.AR — incluyendo el código fuente, diseño visual, textos, gráficos, logotipos, estructuras de datos y flujos de trabajo — son propiedad exclusiva de Juan Manuel Gómez, salvo que se indique expresamente lo contrario.

4.2. Queda expresamente prohibida la reproducción, copia, distribución, modificación o uso comercial de cualquier elemento de la plataforma sin autorización escrita previa del Autor.

4.3. El nombre "TRIBUT.AR" y su identidad visual están protegidos como obra intelectual en los términos de la Ley 11.723 de Propiedad Intelectual de la República Argentina.

4.4. Las bibliotecas de código abierto utilizadas en el desarrollo conservan sus respectivas licencias originales.`,
            },
            {
              n: '5', title: 'Limitación de responsabilidad',
              body: `5.1. El Simulador se provee "tal cual es" (as is) sin garantías de ningún tipo, expresas o implícitas.

5.2. El Autor no se responsabiliza por decisiones fiscales, legales o administrativas tomadas con base en la información o experiencias obtenidas a través de TRIBUT.AR.

5.3. El Autor no garantiza la exactitud, completitud, actualidad ni adecuación de los contenidos para ningún propósito específico más allá del uso educativo declarado.

5.4. Bajo ninguna circunstancia el Autor será responsable por daños directos, indirectos, incidentales o consecuentes derivados del uso o imposibilidad de uso de la plataforma.

5.5. Para consultas fiscales, legales o contables reales, el usuario debe acudir a un profesional matriculado (contador público, abogado impositivo, etc.).`,
            },
            {
              n: '6', title: 'Datos del usuario y privacidad',
              body: `El tratamiento de los datos personales del usuario se rige por la Política de Privacidad de TRIBUT.AR, disponible en /privacidad. Al utilizar la plataforma, el usuario acepta dicha política.

Los datos ingresados en el Simulador (perfiles tributarios, operaciones, etc.) son ficticios y exclusivamente para fines educativos. No son transmitidos a organismos oficiales.`,
            },
            {
              n: '7', title: 'Modificaciones del servicio',
              body: `El Autor se reserva el derecho de modificar, suspender o discontinuar el servicio, total o parcialmente, en cualquier momento y sin previo aviso. También podrá actualizar estos Términos y Condiciones cuando lo considere necesario, notificando los cambios en la propia plataforma.`,
            },
            {
              n: '8', title: 'Jurisdicción y legislación aplicable',
              body: `Estos Términos y Condiciones se rigen por las leyes de la República Argentina. Ante cualquier controversia derivada del uso de la plataforma, las partes se someten a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires, con renuncia expresa a cualquier otro fuero que pudiera corresponder.`,
            },
            {
              n: '9', title: 'Contacto',
              body: `Para consultas, reportes de errores o comunicaciones relacionadas con estos Términos, puede contactar al Autor a través de:

Email: gomezjuanmanuel.1436@gmail.com
Plataforma: tribut.ar`,
            },
          ].map(({ n, title, body }) => (
            <div key={n} className="p-6 sm:p-8">
              <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-md flex items-center justify-center text-xs font-bold">{n}</span>
                {title}
              </h2>
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line pl-8">
                {body}
              </div>
            </div>
          ))}

        </div>

        {/* Footer de la página */}
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
