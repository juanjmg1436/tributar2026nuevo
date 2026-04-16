# Arquitectura de TRIBUT.AR

> Documento técnico de arquitectura — Simulador Didáctico Fiscal Argentino

---

## 1. Descripción General del Sistema

TRIBUT.AR es una aplicación web educativa construida con una arquitectura moderna de tres capas:

1. **Frontend** — Next.js 14 con App Router (React 18)
2. **Backend** — API y Autenticación vía Supabase
3. **Base de datos** — PostgreSQL (Supabase)

La aplicación se despliega en **Vercel** (frontend) con la base de datos alojada en **Supabase Cloud**. La autenticación se maneja completamente en Supabase usando email/contraseña, con sesiones almacenadas en cookies HTTP-only para protección contra ataques XSS.

---

## 2. Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────┐
│                    NAVEGADOR USUARIO                    │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP(S)
┌────────────────────▼────────────────────────────────────┐
│                 VERCEL (Frontend)                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Next.js 14 App Router (TypeScript)       │   │
│  │  ┌─────────────────────────────────────────────┐ │   │
│  │  │  (auth)          (dashboard)                │ │   │
│  │  │  - Login         - Dashboard                │ │   │
│  │  │  - Register      - Perfil Contribuyente    │ │   │
│  │  │  - Logout        - Alta RUT                │ │   │
│  │  │                  - Relaciones              │ │   │
│  │  │                  - Estado Cuenta           │ │   │
│  │  │                  - Domicilio Fiscal        │ │   │
│  │  │                  - Puntos Venta            │ │   │
│  │  │                  - Comprobantes            │ │   │
│  │  │                  - Historial               │ │   │
│  │  └─────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────┐ │   │
│  │  │  Middleware (autenticación en servidor)     │ │   │
│  │  └─────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Supabase Client SSR (@supabase/ssr)           │   │
│  │  - Gestión de cookies de sesión                │   │
│  │  - Queries a base de datos                     │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────┐
│           SUPABASE (Backend + Base de datos)            │
│  ┌──────────────────────────────────────────────────┐   │
│  │        Supabase Auth (Email/Contraseña)         │   │
│  │  - Registro de usuarios                         │   │
│  │  - Login / Logout                               │   │
│  │  - Gestión de sesiones                          │   │
│  │  - Magic links (opcional)                       │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │      PostgreSQL Database + Row Level Security   │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │  Tablas de datos:                        │   │   │
│  │  │  - profiles (estudiantes)                │   │   │
│  │  │  - taxpayer_profiles (contribuyentes)    │   │   │
│  │  │  - registration_steps (alta RUT)         │   │   │
│  │  │  - tax_regimes (regímenes ref.)          │   │   │
│  │  │  - taxpayer_regime_status (estado)       │   │   │
│  │  │  - obligations (obligaciones)            │   │   │
│  │  │  - e_fiscal_address (domicilio)          │   │   │
│  │  │  - notifications (notificaciones)        │   │   │
│  │  │  - points_of_sale (puntos de venta)      │   │   │
│  │  │  - invoices (comprobantes)               │   │   │
│  │  │  - invoice_items (ítems)                 │   │   │
│  │  │  - activity_log (historial)              │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │  RLS Policies (1 por tabla)              │   │   │
│  │  │  - Cada usuario ve solo sus datos        │   │   │
│  │  │  - Aplicado automáticamente en queries   │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

## 3. Flujo de Datos

### 3.1 Flujo de Autenticación

```
1. Usuario ingresa email/contraseña
                    ↓
2. Frontend envía credenciales a Supabase Auth
                    ↓
3. Supabase valida y crea sesión (JWT + cookie)
                    ↓
4. Cookie se guarda en navegador (HTTP-only)
                    ↓
5. Middleware de Next.js valida cookie en cada request
                    ↓
6. Si válida → permite acceso a rutas (dashboard)
   Si no → redirige a login
```

### 3.2 Flujo de Lectura de Datos

```
1. Usuario accede a ruta del dashboard
                    ↓
2. Middleware valida sesión desde cookie
                    ↓
3. Si no autenticado → redirige a login
   Si autenticado → permite acceso
                    ↓
4. Componente React usa useAuth() hook
   para obtener ID del usuario actual
                    ↓
5. Query a Supabase:
   SELECT * FROM tablax WHERE user_id = auth.uid()
                    ↓
6. Supabase aplica RLS policies:
   - Verifica que user_id = sesión autenticada
   - Si no coincide → retorna error 403
   - Si coincide → retorna datos
                    ↓
7. Frontend recibe datos y renderiza componente
```

### 3.3 Flujo de Creación/Actualización de Datos

```
1. Usuario completa formulario y hace click en guardar
                    ↓
2. Validación en cliente (Zod schema)
                    ↓
3. Si falla validación → muestra errores
   Si pasa → envía datos a Supabase
                    ↓
4. Supabase recibe INSERT/UPDATE
                    ↓
5. Aplica RLS policies:
   - Valida que user_id en request = sesión
   - Si no coincide → retorna 403
   - Si coincide → permite operación
                    ↓
6. Ejecuta trigger updated_at (actualiza timestamp)
                    ↓
7. Retorna registro actualizado al frontend
                    ↓
8. Frontend actualiza estado local (React)
   y muestra confirmación
```

---

## 4. Modelo de Seguridad

### 4.1 Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Cada tabla tiene políticas que garantizan:

- **SELECT**: Usuario solo ve sus propios datos
- **INSERT**: Usuario solo puede insertar registros con su user_id
- **UPDATE**: Usuario solo puede actualizar registros que le pertenecen
- **DELETE**: Usuario solo puede eliminar registros que le pertenecen

Ejemplo de política para `taxpayer_profiles`:

```sql
CREATE POLICY "Users can view own taxpayer profile"
  ON public.taxpayer_profiles FOR SELECT
  USING (auth.uid() = user_id);
```

### 4.2 Autenticación

- Supabase Auth maneja toda la autenticación
- Las contraseñas se hashean con bcrypt en Supabase
- Las sesiones se almacenan como JWT firmados
- Las cookies son HTTP-only (no accesibles desde JavaScript)
- Se renuevan automáticamente cuando expiran

### 4.3 Middleware de Protección

El middleware de Next.js (`middleware.ts`) protege las rutas:

```typescript
// Pseudo-código
middleware:
  Si ruta es /dashboard/* → requiere autenticación
  Si usuario no autenticado → redirige a /login
  Si autenticado → permite acceso
```

---

## 5. Lógica de Progresión de Módulos

### 5.1 Estados del Contribuyente

El contribuyente pasa por estados progresivos:

```
1. NUEVO (sin registrar)
   └─ Solo puede acceder a: Autenticación
   
2. PERFIL INCOMPLETO
   └─ Puede acceder a: Perfil Contribuyente
   
3. EN ALTA REGISTRAL (completando pasos)
   └─ Pasos del 1 al 5:
     - Paso 1: Datos Personales
     - Paso 2: Domicilio
     - Paso 3: Actividad Principal
     - Paso 4: Confirmación
     - Paso 5: Términos y Condiciones
   └─ Mientras completa pasos: no puede acceder a otros módulos
   
4. ALTA COMPLETADA
   └─ Ahora puede acceder a:
     - Dashboard (resumen)
     - Administrador de Relaciones
     - Estado de Cuenta
     
5. CON RÉGIMEN ACTIVO
   └─ Habilitados: Domicilio Fiscal, Puntos Venta, Comprobantes
```

### 5.2 Implementación de Habilitación

En el cliente, cada ruta chequea:

```typescript
// Pseudo-código en cada módulo
const { taxpayer, registrationSteps } = useData();

// ¿Completó alta?
const isRegistrationComplete = registrationSteps
  .every(step => step.status === 'completed');

// ¿Tiene régimen?
const hasActiveRegime = taxpayer_regimes
  .some(r => r.status === 'active');

// Muestra/oculta módulos según estado
if (!isRegistrationComplete) {
  return <LockedModule reason="Complete first registration" />;
}
if (!hasActiveRegime) {
  return <LockedModule reason="Activate a tax regime first" />;
}
```

---

## 6. Generación de Datos Simulados

### 6.1 Obligaciones Fiscales Automáticas

Cuando un contribuyente activa un régimen, el sistema genera obligaciones automáticas:

- **Monotributo**: 1 cuota mensual (monto simulado: $5,000)
- **Régimen General**: 
  - IVA mensual (monto simulado: $3,000)
  - Ganancias anual (monto simulado: $50,000)
- **Autónomos**: 
  - Aportes mensuales (monto simulado: $2,500)

Estos datos son **completamente ficticios** y solo para propósitos educativos.

### 6.2 Trigger de Creación de Perfil

Cuando se registra un usuario en Supabase Auth, el trigger `on_auth_user_created` crea automáticamente un registro en `profiles` con los datos del usuario.

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 7. Índices de Base de Datos

Se crean índices en columnas frecuentemente consultadas para mejorar performance:

- `idx_taxpayer_profiles_user_id` — Búsquedas por usuario
- `idx_registration_steps_user_id` — Búsquedas de pasos
- `idx_obligations_user_id` — Búsquedas de obligaciones
- `idx_obligations_status` — Filtros por estado
- `idx_notifications_user_id` — Notificaciones del usuario
- `idx_invoices_user_id` — Comprobantes del usuario
- `idx_activity_log_user_id` — Historial del usuario
- `idx_activity_log_module` — Filtros por módulo

---

## 8. Stack Tecnológico Detallado

### Frontend
- **Next.js 14** — Framework React con SSR, SSG, API routes
- **React 18** — Librería de UI
- **TypeScript 5.4** — Tipado estático
- **Tailwind CSS 3.4** — Estilos utilitarios
- **React Hook Form 7.51** — Gestión de formularios
- **Zod 3.23** — Validación de esquemas
- **Lucide React 0.378** — Íconos SVG
- **date-fns 3.6** — Manipulación de fechas

### Backend/Auth
- **Supabase** — PostgreSQL + Auth + RLS
- **@supabase/ssr 0.3** — Cliente para Server Components
- **@supabase/supabase-js 2.43** — Cliente de JavaScript

### Infraestructura
- **Vercel** — Hosting de Next.js
- **Supabase Cloud** — Base de datos PostgreSQL

---

## 9. Flujo Completo de Ejemplo: Crear una Factura

```
1. Usuario hace clic en "Nuevo Comprobante"
                    ↓
2. Frontend navega a /dashboard/comprobantes/nuevo
                    ↓
3. Middleware valida sesión ✓
                    ↓
4. Página renderiza formulario para crear factura
                    ↓
5. Usuario completa datos:
   - Tipo de comprobante (A/B/C)
   - Receptor (nombre, CUIT)
   - Ítems (descripción, cantidad, precio)
                    ↓
6. Usuario clickea "Guardar"
                    ↓
7. Frontend valida datos con Zod schema
                    ↓
8. Si válido → envía INSERT a Supabase:
   INSERT INTO invoices (
     user_id, invoice_type, receiver_name, ..., total
   ) VALUES (
     auth.uid(), 'A', 'Cliente XYZ', ..., 1500.00
   )
                    ↓
9. Supabase valida RLS:
   - ¿user_id en INSERT = sesión autenticada?
   - ✓ Sí → continúa
                    ↓
10. Base de datos ejecuta INSERT
                    ↓
11. Trigger updated_at se dispara (auto)
                    ↓
12. Supabase retorna registro creado con ID
                    ↓
13. Frontend muestra confirmación:
    "Comprobante guardado exitosamente"
                    ↓
14. Frontend redirige a /dashboard/comprobantes
                    ↓
15. Página carga lista de comprobantes
    (automáticamente solo muestra del usuario actual)
```

---

## 10. Consideraciones de Escalabilidad

### Límites Actuales
- Supabase free tier: ~1 GB de almacenamiento
- 500,000 requests por mes (aprox.)
- Suficiente para grupos de estudiantes de hasta ~500 usuarios

### Mejoras Futuras
- Migrar a plan pagado de Supabase si necesario
- Agregar caché (Redis) para datos de referencia
- Implementar paginación en listas
- Agregar búsqueda full-text en PostgreSQL
- Implementar compresión de logs históricos

---

*TRIBUT.AR — Arquitectura de Sistema Educativo — v1.0*
