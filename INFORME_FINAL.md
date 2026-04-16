# INFORME FINAL — TRIBUT.AR

> Simulador Didáctico Fiscal Argentino — Documento técnico de entrega

---

## 1. ¿Qué se construyó?

TRIBUT.AR es una aplicación web educativa completa construida con Next.js 14, TypeScript, Tailwind CSS y Supabase. Simula, con fines pedagógicos, el recorrido registral y fiscal de un contribuyente en Argentina.

La aplicación incluye autenticación real, base de datos relacional, lógica de progresión por etapas, 10 módulos funcionales y documentación de despliegue completa.

---

## 2. Estructura del sistema

### Frontend
- **Framework**: Next.js 14 con App Router
- **Lenguaje**: TypeScript estricto
- **Estilos**: Tailwind CSS con paleta personalizada
- **Formularios**: React Hook Form con validación Zod
- **Íconos**: Lucide React

### Backend / Base de datos
- **Plataforma**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth (email + contraseña)
- **Seguridad**: Row Level Security (RLS) en todas las tablas
- **Triggers**: Auto-creación de perfil, auto-actualización de timestamps

### Despliegue
- **Hosting**: Vercel (Next.js nativo)
- **Base de datos**: Supabase Cloud (gratuito hasta ciertos límites)

---

## 3. Módulos implementados

| # | Módulo | Descripción |
|---|--------|-------------|
| 1 | Autenticación | Registro, login, logout, protección de rutas |
| 2 | Perfil del Contribuyente | Creación del contribuyente simulado (persona humana o jurídica) |
| 3 | Alta RUT | Proceso de alta registral por pasos (equivalente a F-460) |
| 4 | Administrador de Relaciones | Gestión de regímenes: Monotributo, Régimen General, Autónomos, Rel. Laborales, Casas Particulares |
| 5 | Estado de Cuenta | Obligaciones fiscales simuladas con filtros y estados |
| 6 | Domicilio Fiscal Electrónico | Constitución y bandeja de notificaciones |
| 7 | Puntos de Venta | Alta y gestión de puntos de venta simulados |
| 8 | Comprobantes Simulados | Emisión de facturas A, B, C, X con ítems y PDF |
| 9 | Dashboard del Estudiante | Panel principal con progreso y resumen |
| 10 | Historial de Acciones | Registro de todas las acciones del estudiante |

---

## 4. Tablas creadas en Supabase

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfil del estudiante (extiende auth.users) |
| `taxpayer_profiles` | Contribuyente simulado |
| `registration_steps` | Pasos del proceso de alta |
| `tax_regimes` | Regímenes tributarios de referencia |
| `taxpayer_regime_status` | Estado del contribuyente en cada régimen |
| `obligations` | Obligaciones fiscales simuladas |
| `e_fiscal_address` | Domicilio Fiscal Electrónico |
| `notifications` | Notificaciones del sistema |
| `points_of_sale` | Puntos de venta |
| `invoices` | Comprobantes emitidos |
| `invoice_items` | Ítems de comprobantes |
| `activity_log` | Historial de acciones |

---

## 5. Decisiones técnicas

### App Router de Next.js 14
Se utilizó el App Router (en lugar del Pages Router) por ser el estándar actual de Next.js y ofrecer mejor soporte para Server Components, layouts anidados y Route Handlers.

### Supabase SSR
Se usó `@supabase/ssr` en lugar del cliente básico para manejar correctamente las cookies de sesión en Server Components y middleware, garantizando que las rutas privadas estén protegidas en el servidor.

### Grupos de rutas
Se usaron grupos de rutas de Next.js (`(auth)` y `(dashboard)`) para separar los layouts sin afectar las URLs.

### Row Level Security
Cada tabla tiene políticas RLS que garantizan que cada estudiante solo puede ver y modificar sus propios datos. Esto se aplica automáticamente en todas las consultas, independientemente de quién haga la solicitud.

### Progresión por etapas
La lógica de habilitación de módulos se maneja en el cliente consultando el estado del `taxpayer_profile` y los `registration_steps`. Los módulos avanzados (puntos de venta, comprobantes) solo se habilitan cuando se completan las etapas previas.

### Zod + React Hook Form
Todos los formularios usan Zod para definir esquemas de validación y React Hook Form para el manejo del estado del formulario. Esto garantiza validaciones consistentes tanto en cliente como en servidor.

---

## 6. Pasos para ejecutar localmente

```bash
# 1. Clonar
git clone https://github.com/tu-usuario/tribut-ar
cd tribut-ar

# 2. Instalar
npm install

# 3. Variables de entorno
cp .env.example .env.local
# Editar .env.local con credenciales de Supabase

# 4. Configurar Supabase (ejecutar en SQL Editor)
# sql/schema.sql → sql/rls.sql → sql/seed.sql

# 5. Iniciar
npm run dev
# → http://localhost:3000
```

---

## 7. Pasos para desplegar en Vercel

```bash
# 1. Push a GitHub
git add .
git commit -m "Initial commit - TRIBUT.AR"
git push origin main

# 2. Importar en Vercel
# → vercel.com/new → Import GitHub repo

# 3. Variables de entorno en Vercel:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# NEXT_PUBLIC_APP_URL

# 4. Configurar Supabase Auth URLs
# Authentication → URL Configuration → agregar URL de Vercel

# 5. Deploy ✓
```

---

## 8. Pendientes y mejoras futuras

- [ ] Exportación de comprobantes a PDF (con librería como `react-pdf`)
- [ ] Módulo de simulación de declaraciones juradas
- [ ] Dashboard docente (rol separado, nueva versión)
- [ ] Modo de práctica guiada con tutoriales interactivos
- [ ] Internacionalización (otros países latinoamericanos)
- [ ] Tests automatizados (Jest + Testing Library)
- [ ] Notificaciones push (Web Push API)
- [ ] Dark mode
- [ ] Exportación de historial en CSV/Excel
- [ ] Módulo de consulta de CUIT simulado
- [ ] Integración con sistema de notas/evaluación (versión educativa avanzada)

---

*TRIBUT.AR — Simulador Didáctico — No Oficial — Sin Validez Fiscal/Legal*
