# Módulos del Simulador — TRIBUT.AR

> Documentación de los 10 módulos educativos — Simulador Didáctico Fiscal Argentino

---

## Módulo 1: Autenticación

**Ruta**: `/login`, `/register`, `/auth/callback`  
**Acceso**: Público (sin requerir autenticación)

### Propósito

El módulo de autenticación es la puerta de entrada a TRIBUT.AR. Permite que estudiantes se registren con una cuenta personal y accedan de forma segura al simulador. Cada estudiante tiene su propio usuario y contraseña, aislando completamente sus datos de otros estudiantes.

### Funcionalidades Principales

1. **Registro de Nuevos Usuarios**
   - Campo: Email (debe ser válido y único)
   - Campo: Contraseña (mínimo 6 caracteres)
   - Campo: Confirmación de contraseña
   - Validación de contraseña segura
   - Al registrarse, se crea automáticamente un perfil de estudiante

2. **Login (Iniciar Sesión)**
   - Ingreso con email y contraseña
   - Validación contra Supabase Auth
   - Generación de sesión (JWT + cookie HTTP-only)
   - Redirección automática al dashboard

3. **Logout (Cerrar Sesión)**
   - Destrucción de sesión
   - Limpeza de cookies
   - Redirección a página de inicio

4. **Protección de Rutas**
   - Middleware valida autenticación en cada request
   - Rutas privadas (/dashboard/*) redirigen a login si no autentico
   - Rutas públicas (/login, /) accesibles sin autenticación

### Seguridad

- **Contraseñas**: Hasheadas con bcrypt en Supabase (nunca se almacenan en texto plano)
- **Sesiones**: JWT firmados digitalmente
- **Cookies**: HTTP-only (no accesibles desde JavaScript)
- **HTTPS**: Obligatorio en producción
- **RLS**: Cada usuario solo ve sus propios datos

### Flujo de Registro

```
1. Usuario nuevo → URL /register
2. Completa email y contraseña
3. Hace clic en "Registrarse"
4. Validación de datos (cliente)
5. Envío a Supabase Auth
6. Supabase crea auth.users y trigger crea profiles
7. Sesión automática (usuario autenticado)
8. Redirección a /dashboard
9. Estado: "Nuevo Contribuyente"
```

### Objetivos Pedagógicos

- Entender que el acceso a sistemas fiscales requiere autenticación
- Comprender concepto de cuenta personal vs datos compartidos
- Apreciar importancia de contraseñas seguras

---

## Módulo 2: Perfil del Contribuyente

**Ruta**: `/dashboard/perfil-contribuyente`  
**Requisito**: Usuario autenticado  
**Requisito**: Ninguno (es el primero que ven)

### Propósito

Este módulo permite al estudiante crear su primer "contribuyente" — la entidad ficticia que simulará en la plataforma. Es como crear un personaje en un videojuego educativo. El estudiante decide si quiere simular una persona humana (monotributista, profesional) o una persona jurídica (empresa, sociedad).

### Funcionalidades Principales

1. **Tipo de Contribuyente**
   - **Persona Humana**: Para simulación individual
     - Representa a: Trabajador autónomo, profesional, comerciante
     - Ejemplos reales: Contador, abogado, vendedor
   - **Persona Jurídica**: Para simulación de empresa
     - Representa a: Sociedad anónima, SRL, cooperativa
     - Ejemplos reales: Consultora, agencia, fábrica

2. **Datos Básicos**
   - Nombre/Razón Social (NO editable después de crear)
   - Nombre Comercial (opcional, para persona jurídica)
   - CUIT (Código Único de Identificación del Contribuyente)
     - Ficticio, generado por el estudiante
     - Formato: 20/27/30-########-# (números ficticios)

3. **Domicilio**
   - Calle
   - Número
   - Piso/Departamento
   - Código Postal
   - Provincia (dropdown con provincias argentinas)
   - Municipio

4. **Actividades Económicas**
   - Actividad Principal
     - Código IIBB (Ingresos Brutos)
     - Descripción (ej: "Asesoramiento Contable")
     - Ejemplos: 1712, 3623, 5219
   - Actividad Secundaria (opcional)
     - Algunos contribuyentes tienen múltiples actividades

5. **Información Adicional**
   - Fecha de inicio de actividad
   - Estado actual (Incomplete, Active, Suspended, Cancelled)

### Esquema de Formulario Zod

```typescript
{
  subjectType: 'persona_humana' | 'persona_juridica',
  entityName: string (30-150 caracteres),
  tradeName: string (opcional),
  cuit: string (formato: XX-XXXXXXXX-X),
  mainActivityCode: string (4 dígitos),
  mainActivityName: string,
  secondaryActivityCode: string (opcional),
  secondaryActivityName: string (opcional),
  street: string,
  streetNumber: string,
  floorApt: string (opcional),
  province: string (lista),
  municipality: string,
  postalCode: string,
  activityStartDate: Date
}
```

### Estados del Contribuyente

```
INCOMPLETE → Usuario completó datos básicos pero falta alta registral
  ↓
Pasa a Módulo 3 (Alta RUT)
```

### Datos Simulados (Ejemplos)

```
Persona Humana:
- Nombre: "García, Juan María"
- CUIT: "23-12345678-9"
- Actividad: "3623" Asesoramiento e Intermediación
- Provincia: Buenos Aires

Persona Jurídica:
- Razón Social: "Consultora XYZ S.R.L"
- Nombre Comercial: "Grupo Asesor XYZ"
- CUIT: "30-98765432-1"
- Actividad: "6920" Actividades Jurídicas y Contables
- Provincia: CABA
```

### Validaciones

- Email del estudiante único en tabla profiles
- Contribuyente único por estudiante (UNIQUE(user_id) en taxpayer_profiles)
- CUIT debe tener formato válido argentino
- Código IIBB debe existir en listado de actividades

### Objetivos Pedagógicos

- Entender diferencia entre persona humana y jurídica
- Aprender estructura de CUIT argentino
- Comprender importancia de datos básicos en registración
- Valorar el domicilio fiscal como punto de contacto con fisco
- Identificar actividad económica como base de obligaciones tributarias

---

## Módulo 3: Alta RUT (Registración Tributaria)

**Ruta**: `/dashboard/alta-rut`  
**Requisito**: Contribuyente creado (Módulo 2)  
**Requisito**: Estado = "incomplete"

### Propósito

El Alta RUT es el proceso de registración del contribuyente ante el fisco. En Argentina, el organismo es la AFIP (Administración Federal de Ingresos Públicos). El formulario principal es el "F-460 — Solicitud de Inscripción en el Registro Único Tributario".

Este módulo simula los pasos de ese formulario, permitiendo que el estudiante comprenda qué información solicita el fisco y por qué.

### Pasos Progresivos (5 Pasos)

```
PASO 1: DATOS PERSONALES
├─ DNI/Pasaporte (si es persona humana)
├─ Nombre y Apellido
├─ Fecha de nacimiento
├─ Nacionalidad
├─ Estado Civil
└─ Género
↓
PASO 2: DOMICILIO FISCAL
├─ Calle y número
├─ Piso/Departamento
├─ Localidad
├─ Provincia
├─ Código postal
├─ Teléfono (opcional)
└─ Email (para notificaciones)
↓
PASO 3: ACTIVIDAD PRINCIPAL
├─ Código de actividad (IIBB)
├─ Descripción detallada
├─ Fecha de inicio
├─ Tipo de gestión (directa/arrendamiento)
└─ Ubicación del establecimiento
↓
PASO 4: CONFIRMACIÓN DE DATOS
├─ Resumen de todo lo ingresado
├─ Posibilidad de editar (volver a pasos anteriores)
└─ Mensaje: "Revisa cuidadosamente antes de confirmar"
↓
PASO 5: TÉRMINOS Y CONDICIONES
├─ Lectura de obligaciones del simulador
├─ Aceptación mediante checkbox
├─ Declaración jurada simulada (afirmo que los datos son verdaderos)
└─ Clic en "Finalizar Alta"
```

### Estados de Pasos

```
pending → Usuario no inició el paso
in_progress → Usuario está completando
completed → Usuario finalizó (datos guardados)
locked → Usuario no puede acceder (falta completar paso anterior)
```

### Flujo Habilitación

```
Inicialmente:
- Paso 1: pending (puede hacer clic)
- Paso 2: locked (botón deshabilitado)
- Paso 3: locked
- Paso 4: locked
- Paso 5: locked

Usuario completa Paso 1:
- Paso 1: completed ✓
- Paso 2: pending (ahora puede hacer clic)
- Paso 3: locked
- Paso 4: locked
- Paso 5: locked

Usuario completa Paso 2 y 3:
- Pasos 1-3: completed ✓
- Paso 4: pending
- Paso 5: locked

Usuario completa Paso 4 y 5:
- Todos los pasos: completed ✓
- Estado de contribuyente → "active"
- taxpayer_profiles.status = 'active'
- Sistema crea obligaciones automáticamente
```

### Almacenamiento de Datos

Cada paso se guarda en `registration_steps.step_data` como JSON:

```json
{
  "step_number": 1,
  "step_key": "STEP_PERSONAL_DATA",
  "status": "completed",
  "step_data": {
    "dni": "12345678",
    "nombre": "Juan",
    "apellido": "García",
    "fechaNacimiento": "1980-05-15",
    "nacionalidad": "Argentino",
    "estadoCivil": "Casado",
    "genero": "Masculino"
  }
}
```

### Validaciones

- Campos requeridos: NO pueden estar vacíos
- DNI: Formato 8-9 dígitos sin guión
- Fecha de nacimiento: No puede ser futura, no menor de 18 años
- Código de actividad: Debe existir en catálogo
- Email: Formato válido
- Teléfono: Formato argentino (ej: +54 911 1234-5678)

### Diseño Pedagógico

**¿Por qué estos datos?**

- DNI: Es la identificación oficial argentina
- Domicilio: Dónde el fisco puede contactar y hacer inspecciones
- Actividad: Determina qué impuestos tributa
- Términos: Enseña que hay obligaciones legales

**¿Qué aprende el estudiante?**

- Los contribuyentes deben registrarse legalmente
- La información solicitada tiene propósitos fiscales específicos
- Hay consecuencias de proporcionar información falsa (educativo, no punitivo)
- El proceso es formal pero ordenado (paso a paso)

### Objetivos Pedagógicos

- Comprender el proceso de registración tributaria
- Identificar qué información requiere el fisco y por qué
- Apreciar la importancia de la precisión en datos
- Entender que es un acto formal con obligaciones
- Valorar la transparencia en la información económica

---

## Módulo 4: Administrador de Relaciones (Regímenes Tributarios)

**Ruta**: `/dashboard/administrador-relaciones`  
**Requisito**: Contribuyente activo (Alta RUT completada)  
**Requisito**: Módulo 3 completado

### Propósito

En Argentina, un contribuyente puede estar inscrito en múltiples "relaciones" o regímenes tributarios simultáneamente. Este módulo permite que el estudiante:

1. **Explore** los 5 regímenes principales disponibles
2. **Entienda** quién puede acceder a cada uno
3. **Active** regímenes para su contribuyente
4. **Vea** cómo cambia su obligaciones al cambiar de régimen

### Regímenes Disponibles

```
1. MONOTRIBUTO
   ├─ Aplica a: Personas humanas
   ├─ Condición: Hasta ciertos ingresos/patrimonio
   ├─ Obligación: 1 cuota mensual
   ├─ Monto simulado: $5,000/mes
   ├─ Impuestos agrupados: IVA + Ganancias + Jubilación
   └─ Uso: Autónomos, pequeños comerciantes

2. RÉGIMEN GENERAL
   ├─ Aplica a: Todos (pero especialmente personas jurídicas)
   ├─ Condición: Sin límites de ingresos
   ├─ Obligaciones: IVA mensual + Ganancias anual
   ├─ Montos simulados: $3,000 IVA, $50,000 Ganancias
   ├─ Impuestos separados (tributa cada uno por aparte)
   └─ Uso: Empresas, negocios medianos/grandes

3. AUTÓNOMOS
   ├─ Aplica a: Personas humanas sin relación laboral
   ├─ Condición: Trabajador independiente
   ├─ Obligación: Aportes mensuales + Ganancias
   ├─ Monto simulado: $2,500/mes (aportes)
   ├─ Cobertura: Sistema jubilatorio + obra social
   └─ Uso: Profesionales, consultores

4. RELACIONES LABORALES
   ├─ Aplica a: Todo contribuyente que tiene empleados
   ├─ Obligación: Liquidación de sueldos, aportes
   ├─ Campos: DNI empleado, sueldo, aportes
   ├─ Monto simulado: Según sueldo ingresado
   ├─ Impuestos: Aportes patronales + descuentos al empleado
   └─ Uso: Cualquiera que tenga personal a cargo

5. CASAS PARTICULARES
   ├─ Aplica a: Personas humanas (empleadores domésticos)
   ├─ Requisito: Personal en el hogar (mucama, cuidador, etc.)
   ├─ Obligación: Aportes especiales (Ley 26.844)
   ├─ Monto simulado: Según convenio
   ├─ Impuestos: Aportes simplificados
   └─ Uso: Hogares particulares con empleadas domésticas
```

### Interfaz del Módulo

```
┌─────────────────────────────────────────────────────┐
│ Administrador de Relaciones Tributarias             │
│ Contribuyente: García, Juan (23-12345678-9)         │
└─────────────────────────────────────────────────────┘

┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ MONOTRIBUTO │   │RÉG.GENERAL  │   │ AUTÓNOMOS   │
│             │   │             │   │             │
│ Estado:     │   │ Estado:     │   │ Estado:     │
│ INACTIVO    │   │ INACTIVO    │   │ INACTIVO    │
│             │   │             │   │             │
│ [Activar]   │   │ [Activar]   │   │ [Activar]   │
└─────────────┘   └─────────────┘   └─────────────┘

┌──────────────────────┐   ┌──────────────────────┐
│ REL. LABORALES       │   │ CASAS PARTICULARES   │
│                      │   │                      │
│ Estado: INACTIVO     │   │ Estado: INACTIVO     │
│                      │   │                      │
│ [Activar]            │   │ [Activar]            │
└──────────────────────┘   └──────────────────────┘
```

### Flujo al Activar un Régimen

```
1. Usuario clickea "Activar Monotributo"
                    ↓
2. Sistema verifica que contribuyente es persona_humana
   ✗ Si no → muestra error: "Este régimen no aplica a tu tipo de contribuyente"
   ✓ Si sí → continúa
                    ↓
3. Crea registro en taxpayer_regime_status:
   - user_id = usuario actual
   - regime_id = ID de Monotributo
   - status = 'pending_activation'
   - start_date = hoy
                    ↓
4. Sistema automáticamente:
   - Crea obligaciones mensuales (próximos 12 meses)
   - Cada obligación: $5,000
   - Status de obligaciones: 'pending'
                    ↓
5. Cambia status a 'active'
   - taxpayer_regime_status.status = 'active'
                    ↓
6. UI actualiza:
   - Botón "Activar" → "Desactivar"
   - Color: Verde (active)
   - Muestra fecha de inicio
                    ↓
7. Usuario ve en "Estado de Cuenta":
   - Nuevas obligaciones mensuales del Monotributo
```

### Panel de Información

Para cada régimen, muestra:

- **Nombre completo** y descripción corta
- **A quién aplica**: Persona humana / Jurídica / Ambos
- **Descripción detallada**: Párrafo pedagógico explicando qué es
- **Estado actual**: Inactivo / Activo / Suspendido
- **Si está activo**:
  - Fecha de inicio
  - Categoría (si aplica)
  - Botón "Ver obligaciones"
  - Botón "Desactivar"

### Validaciones y Restricciones

- Persona humana no puede activar Régimen General (solo Monotributo/Autónomos)
- Empresa (persona jurídica) no puede activar Monotributo
- No se puede desactivar un régimen si hay obligaciones pendientes (opcional, según pedagogía)
- Un contribuyente puede tener múltiples regímenes activos simultáneamente

### Almacenamiento

```sql
INSERT INTO taxpayer_regime_status (
  user_id, regime_id, status, start_date, category
)
VALUES (
  'uuid-estudiante',
  'uuid-monotributo',
  'active',
  '2024-04-10',
  'Categoría B'
)
```

### Objetivos Pedagógicos

- Comprender que existen diferentes opciones tributarias
- Aprender criterios para elegir un régimen
- Entender implicancias de cada régimen (obligaciones distintas)
- Valorar la importancia de estar correctamente inscrito
- Apreciar que las elecciones tributarias afectan la carga impositiva

---

## Módulo 5: Estado de Cuenta

**Ruta**: `/dashboard/estado-cuenta`  
**Requisito**: Al menos un régimen activo (Módulo 4)

### Propósito

El "Estado de Cuenta" es la representación visual de todas las obligaciones fiscales pendientes del contribuyente. Análogo a lo que ve un contribuyente en el sitio de AFIP — un listado de lo que tiene que pagar y cuándo.

Este módulo enseña al estudiante:
- Qué obligaciones genera cada régimen
- Cómo cambian según cambios en los regímenes
- La importancia del cumplimiento fiscal

### Funcionalidades

1. **Listado de Obligaciones**
   - Tabla con columnas:
     - Concepto (ej: "Cuota Monotributo", "IVA Mensual")
     - Período (ej: "Abril 2024")
     - Vencimiento (fecha)
     - Monto simulado ($)
     - Estado (Pending / Submitted / Paid / Overdue)

2. **Filtros**
   - Por período (últimos 3 meses, últimos 6 meses, todo)
   - Por régimen (Monotributo, General, Autónomos)
   - Por estado (Pendientes, Pagadas, Vencidas)
   - Por concepto (buscar texto)

3. **Acciones**
   - Marcar como "Presentada" (submitted)
   - Marcar como "Pagada" (paid)
   - Ver detalle (desglose de la obligación)
   - Descargar comprobante simulado (PDF, en versión futura)

4. **Resumen Visual**
   - Total obligaciones pendientes
   - Total vencidas (overdue)
   - Total pagadas este mes
   - Próximo vencimiento

### Generación Automática de Obligaciones

Cuando se activa un régimen, el sistema crea automáticamente:

```
Monotributo:
- Mes 1: Cuota Monotributo → $5,000
- Mes 2: Cuota Monotributo → $5,000
- ... (próximos 12 meses)

Régimen General:
- Mes 1: IVA Mensual → $3,000
- Mes 2: IVA Mensual → $3,000
- ... (todos los meses)
- Año 1: Ganancias Anual → $50,000
- Año 2: Ganancias Anual → $50,000
- ... (anual)

Autónomos:
- Mes 1: Aportes Mensuales → $2,500
- Mes 2: Aportes Mensuales → $2,500
- ... (próximos 12 meses)
```

### Estados de Obligación

```
pending → No procesada aún
submitted → Estudiante marcó como presentada (formato: enviada a AFIP)
paid → Estudiante marcó como pagada
overdue → Pasó la fecha de vencimiento sin pagar
```

### Esquema de Filtro

```typescript
{
  periodFilter: 'last_3m' | 'last_6m' | 'all',
  regimeFilter: string (regex), // opcional
  statusFilter: 'all' | 'pending' | 'paid' | 'overdue',
  conceptFilter: string // búsqueda de texto
}
```

### Ejemplo de Datos

```
concepto           | periodo      | vencimiento | monto    | status
-------------------|--------------|------------|----------|----------
Cuota Monotributo  | Abril 2024   | 2024-04-20 | $5,000   | pending
Cuota Monotributo  | Mayo 2024    | 2024-05-20 | $5,000   | pending
IVA Mensual        | Marzo 2024   | 2024-03-28 | $3,000   | paid
Ganancias Anual    | Año 2024     | 2024-12-31 | $50,000  | pending
```

### Validaciones

- No puede marcar como pagada una obligación con fecha futura
- Si marca como pagada, se registra automáticamente la fecha
- Cambio de estado se audita en activity_log

### Objetivos Pedagógicos

- Entender que los impuestos no son únicos ni fijos
- Apreciar la variedad de obligaciones según régimen
- Comprender importancia de cumplimiento y plazos
- Valorar la "deuda fiscal" como concepto
- Aprender a planificar el flujo de caja (sé cuánto debo pagar y cuándo)

---

## Módulo 6: Domicilio Fiscal Electrónico

**Ruta**: `/dashboard/domicilio-fiscal`  
**Requisito**: Contribuyente activo

### Propósito

En Argentina, el "Domicilio Fiscal Electrónico" (DFE) es una herramienta oficial de AFIP. Todo contribuyente debe constituir un DFE para recibir notificaciones formales del fisco (multas, deudas, intimaciones, etc.).

Este módulo enseña al estudiante:
- Qué es y para qué sirve el DFE
- Cómo constituirlo
- Cómo funciona la recepción de notificaciones

### Funcionalidades

1. **Estado del Domicilio**
   - Si no constituido: "No constituido — Debes hacerlo para recibir notificaciones"
   - Si constituido: "Constituido desde XX/XX/XXXX — Activo"

2. **Formulario de Constitución**
   - Email de notificaciones (requerido)
   - Teléfono de contacto (opcional)
   - Botón "Constituir"
   - Al constituir:
     - Se guarda en tabla e_fiscal_address
     - status = 'constituted'
     - constitution_date = ahora
     - Se muestra confirmación

3. **Bandeja de Notificaciones**
   - Tabla de notificaciones recibidas
   - Cada notificación muestra:
     - Asunto (title)
     - Tipo (info/warning/reminder/success/error)
     - Fecha de recepción
     - ¿Leída? (checkbox para marcar como leída)
     - Contenido (expandible)

4. **Notificaciones Automáticas**
   - Cuando se crea una obligación: notificación info
   - Cuando vence una obligación: notificación warning
   - Cuando se completa alta: notificación success
   - Cuando hay error: notificación error

### Ejemplo de Notificaciones

```
Asunto: "Obligación próxima a vencer"
Tipo: warning
Fecha: 2024-04-15
Contenido: "Tu Cuota de Monotributo vence el 20/04/2024. 
          Monto: $5,000. No demores su pago."

Asunto: "Alta registral completada exitosamente"
Tipo: success
Fecha: 2024-04-10
Contenido: "¡Bienvenido! Tu contribuyente 'García, Juan' 
          ha sido registrado correctamente. Puedes ahora 
          acceder a todos los módulos del simulador."

Asunto: "Nuevo punto de venta creado"
Tipo: info
Fecha: 2024-04-12
Contenido: "Habilitaste un nuevo punto de venta: 
          'Local Centro' (POS #1, modalidad electrónica)."
```

### Almacenamiento

```sql
-- Constitución
INSERT INTO e_fiscal_address (user_id, status, notification_email, phone, constitution_date)
VALUES ('uuid-user', 'constituted', 'email@example.com', '+54 911 1234-5678', NOW());

-- Notificación
INSERT INTO notifications (user_id, title, message, notification_type, is_read)
VALUES ('uuid-user', 'Obligación próxima a vencer', '...', 'warning', FALSE);
```

### UI/UX

```
┌────────────────────────────────────────┐
│ Domicilio Fiscal Electrónico (DFE)     │
└────────────────────────────────────────┘

Estado: ✓ Constituido desde 10/04/2024
Email registrado: garcia@example.com
Teléfono: +54 911 1234-5678

[Editar] [Suspender]

┌────────────────────────────────────────┐
│ Bandeja de Notificaciones (5 nuevas)   │
└────────────────────────────────────────┘

☐ [warning] Obligación próxima a vencer
   Cuota Monotributo - 20/04/2024
   → "Tu Cuota de Monotributo..."

☑ [success] Alta completada
   10/04/2024
   → "¡Bienvenido! Tu contribuyente..."

☐ [info] Nuevo POS creado
   12/04/2024
   → "Habilitaste un nuevo punto..."
```

### Validaciones

- Email debe ser válido (RFC 5322)
- Teléfono debe ser formato argentino
- No puede constituir si contribuyente no está activo
- Al cambiar email, se pide confirmación

### Objetivos Pedagógicos

- Aprender que fisco se comunica formalmente vía DFE
- Entender importancia de estar "localizable" fiscalmente
- Apreciar notificaciones como herramienta de cumplimiento
- Valorar alertas anticipadas (ej: vencimientos próximos)
- Comprender que el estado fiscaliza vía múltiples canales

---

## Módulo 7: Puntos de Venta

**Ruta**: `/dashboard/puntos-venta`  
**Requisito**: Contribuyente activo  
**Requisito**: Régimen activo que permita emitir facturas

### Propósito

En Argentina, un contribuyente debe "habilitar" los puntos de venta desde los cuales emitirá comprobantes. Un punto de venta es un local, sucursal o canal de venta (ej: local físico, tienda online).

Este módulo enseña:
- Que no puedes emitir facturas sin habilitar POS
- Las diferentes modalidades de emisión de comprobantes
- La importancia de registrar todos tus puntos de venta

### Funcionalidades

1. **Crear Nuevo POS**
   - Número de POS (1, 2, 3... secuencial, NO editable)
   - Nombre descriptivo (ej: "Local Centro", "Sucursal Flores")
   - Modalidad:
     - **Electrónica**: Emisión por software (facturación web)
     - **Manual**: Facturas impresas
     - **POS Fiscal**: Posnet conectado con software fiscal
     - **Otra**: Modalidad alternativa
   - Status: Active / Inactive / Pending
   - Fecha de activación
   - Notas (opcional)

2. **Listado de POS**
   - Tabla con todos los POS creados
   - Columns: Número, Nombre, Modalidad, Status, Acciones
   - Acciones:
     - [Ver] → Detalles
     - [Editar] → Cambiar nombre, notas, status
     - [Eliminar] → Si no tiene comprobantes

3. **Asociación con Facturas**
   - Cuando crea una factura, elige qué POS usa
   - El sistema valida que el POS sea del usuario
   - Las facturas se numeran por POS (ej: "POS 1 → Facturas 001-00000001, 001-00000002...")

### Numeración de Comprobantes

En Argentina, el número de comprobante tiene formato:

```
POS-NUMBER (tercera cifra es el POS, luego correlativo)

Ejemplo:
001-00000001  → POS 1, comprobante #1
001-00000005  → POS 1, comprobante #5
002-00000001  → POS 2, comprobante #1
```

### Modalidades Explicadas

```
MODALIDAD ELECTRÓNICA:
├─ Requisito: Estar en "RCFE" (Régimen de Comprobante Fiscal Electrónico)
├─ Cómo: Se emite por software, se autoriza online
├─ Validez: Inmediata, sin necesidad de imprimir
├─ Mejora: Reducción de papel, trazabilidad completa
└─ Uso moderno: E-commerce, servicios

MODALIDAD MANUAL:
├─ Requisito: Ser pequeño contribuyente (Monotributo, etc.)
├─ Cómo: Comprobante impreso con datos completos
├─ Validez: Una vez numerado
├─ Limitación: Riesgo de pérdida/robo
└─ Uso tradicional: Almacenes, negocios pequeños

MODALIDAD POS FISCAL:
├─ Requisito: Ser comerciante con máquina registradora
├─ Cómo: Posnet/terminal conecta con software fiscal
├─ Validez: Al imprimirse (registrador asegura legalidad)
├─ Ventaja: Automático, menor margen de error
└─ Uso: Supermercados, farmacias

MODALIDAD OTRA:
├─ Para propósitos educativos
├─ Permite experimentar con diferentes escenarios
└─ No corresponde a realidad argentina
```

### Ejemplo de Datos

```
numero | nombre              | modalidad     | status
-------|---------------------|--------------|--------
1      | Local Centro        | electronica  | active
2      | Sucursal Flores     | pos_fiscal   | active
3      | Venta Online        | electronica  | pending
4      | Tienda Hurlingham  | manual       | inactive
```

### Validaciones

- Número de POS es secuencial (no editable)
- UNIQUE(user_id, pos_number) — No duplicar números
- No puede eliminar POS si tiene comprobantes (integridad de datos)
- Nombre no puede estar vacío
- Status por defecto es "pending", debe activarse explícitamente

### Almacenamiento

```sql
INSERT INTO points_of_sale (
  user_id, pos_number, name, modality, status, activation_date
)
VALUES (
  'uuid-user',
  1,
  'Local Centro',
  'electronica',
  'active',
  '2024-04-10'
);
```

### Objetivos Pedagógicos

- Comprender que puntos de venta se deben registrar
- Aprender diferentes canales de ventas legales
- Entender que numeración de comprobantes es controlada
- Valorar trazabilidad e integridad de facturas
- Apreciar obligación de registrar infraestructura comercial

---

## Módulo 8: Comprobantes (Facturas)

**Ruta**: `/dashboard/comprobantes`  
**Requisito**: Al menos un POS activo (Módulo 7)

### Propósito

Los comprobantes son la prueba de venta. El simulador permite al estudiante emitir facturas ficticias, aprendiendo:
- Qué información debe contener una factura
- Tipos de comprobantes (A, B, C, X)
- Cálculo de IVA
- Importancia de la facturación

### Funcionalidades

1. **Crear Comprobante**
   - Seleccionar POS (lista de POS activos)
   - Tipo de comprobante:
     - **A**: Factura "Tipo A" (comprador es Responsable Inscripto)
     - **B**: Factura "Tipo B" (comprador es No Responsable o Monotributista)
     - **C**: Nota de Crédito
     - **X**: Comprobante de Prueba (educativo)
     - **DEMO**: Comprobante didáctico
   - Datos del receptor:
     - Nombre (requerido)
     - CUIT (opcional)
     - Condición IVA (Responsable/No Responsable/Monotributo)
   - Concepto (ej: "Servicios Contables")
   - Ítems (múltiples líneas):
     - Descripción
     - Cantidad
     - Precio unitario
     - Subtotal (auto-calcula)
   - Notas/Observaciones

2. **Cálculo Automático**
   - Subtotal = SUM(cantidad × precio_unitario)
   - IVA = Subtotal × 21% (si aplica)
   - Total = Subtotal + IVA
   - Mostrar cálculo en tiempo real (mientras escribe)

3. **Listado de Comprobantes**
   - Tabla filtrable:
     - Número de comprobante
     - Fecha
     - Receptor
     - Monto total
     - Tipo
     - Status (issued/cancelled/draft)
   - Acciones:
     - [Ver] → Detalle completo
     - [Editar] → Si status = 'draft'
     - [Cancelar] → Si status = 'issued'
     - [Descargar PDF] → Versión para imprimir (futuro)

4. **Estados de Comprobante**
   - **draft**: Guardado pero no emitido, puede editarse
   - **issued**: Emitido y numerado (no editable)
   - **cancelled**: Anulado (no genera impuestos)

### Tipos de Comprobantes Explicados

```
FACTURA A:
├─ Uso: Venta a Responsable Inscripto (otro empresa con CUIT)
├─ IVA: Discriminado (separado del total)
├─ Datos: Requiere CUIT exacto del receptor
├─ Valor: Alta confiabilidad fiscal
└─ Ejemplo: B2B (empresa a empresa)

FACTURA B:
├─ Uso: Venta a No Responsable o Monotributista
├─ IVA: Incluido en el total (no discriminado)
├─ Datos: Nombre y DNI (CUIT opcional)
├─ Valor: Menor trazabilidad
└─ Ejemplo: B2C (empresa a consumidor final)

NOTA DE CRÉDITO:
├─ Uso: Anular/reducir venta previa
├─ IVA: Opuesto a la factura original
├─ Casos: Devolución de producto, bonificación
└─ Formato: Debe referenciar comprobante original

COMPROBANTE DEMO/PRUEBA:
├─ Uso: Educativo, no tiene validez fiscal
├─ IVA: Se calcula pero no es real
├─ Casos: Aprendizaje, ejercitación
└─ Formato: Muestra banner indicando que es demo
```

### Esquema de Formulario

```typescript
{
  pointOfSaleId: UUID,
  invoiceType: 'A' | 'B' | 'C' | 'X' | 'DEMO',
  receiverName: string,
  receiverCuit: string (opcional),
  receiverCondition: 'Responsable' | 'NoResponsable' | 'Monotributo' (si aplica),
  concept: string,
  items: [
    {
      description: string,
      quantity: number,
      unitPrice: number,
      total: number (auto)
    }
  ],
  notes: string (opcional),
  status: 'draft' | 'issued'
}
```

### Validaciones

- Tipo A requiere CUIT del receptor
- Cantidad y precio no negativos
- Al menos 1 ítem
- Total > 0
- Nombre receptor no vacío
- POS debe ser del usuario actual

### Generación de Número de Comprobante

```
Formato: POS-NÚMERO

Ejemplo:
- Usuario crea factura en POS 1 → número auto = "001-00000001"
- Usuario crea otra en POS 1 → número auto = "001-00000002"
- Usuario crea factura en POS 2 → número auto = "002-00000001"

Lógica:
numero = ( pos_number × 100000000 ) + secuencial_por_pos
```

### Almacenamiento

```sql
-- Comprobante
INSERT INTO invoices (
  user_id, pos_number, invoice_type, invoice_number, 
  receiver_name, subtotal, iva_amount, total
)
VALUES (
  'uuid-user',
  1,
  'A',
  '001-00000001',
  'Cliente XYZ S.A.',
  1000.00,
  210.00,
  1210.00
);

-- Ítems
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
VALUES 
  ('uuid-factura', 'Asesoramiento Contable', 5, 200, 1000);
```

### UI/UX Ejemplo

```
┌────────────────────────────────┐
│ Crear Nuevo Comprobante        │
└────────────────────────────────┘

POS: [Local Centro ▼]
Tipo: [Factura A ▼]

Receptor:
  Nombre: [ ]
  CUIT: [ ]
  Condición IVA: [Responsable ▼]

Concepto: [Servicios Contables]

┌────────────────────────────────┐
│ Ítems                          │
├────────────────────────────────┤
│ Descripción  | Cant | Precio    │
├────────────────────────────────┤
│ [Auditoría...] 1    1000.00 ✓  │
│ [Asesor...]   5    200.00  ✓  │
│ [+ Agregar Ítem]                │
└────────────────────────────────┘

Subtotal: $5,000.00
IVA (21%): $1,050.00
─────────────────────
TOTAL:    $6,050.00

[Guardar como borrador] [Emitir]
```

### Objetivos Pedagógicos

- Aprender estructura obligatoria de una factura
- Entender que el IVA es impuesto incluido/discriminado
- Comprender cálculo de impuestos
- Valorar la factura como prueba de venta
- Apreciar que documentación fiscal es auditable

---

## Módulo 9: Dashboard (Resumen General)

**Ruta**: `/dashboard`  
**Requisito**: Usuario autenticado

### Propósito

El Dashboard es la "ventana principal" del simulador. Muestra al estudiante:
- Resumen de su estado actual
- Progreso en alta registral
- Obligaciones próximas a vencer
- Accesos rápidos a módulos principales
- Notificaciones recientes

### Componentes

1. **Card de Bienvenida**
   ```
   ¡Hola, Juan!
   Contribuyente: García, Juan (23-12345678-9)
   Estado: Activo desde 10/04/2024
   ```

2. **Progreso de Alta RUT**
   ```
   Registro Tributario: 100% Completado ✓
   
   ✓ Paso 1: Datos Personales
   ✓ Paso 2: Domicilio
   ✓ Paso 3: Actividad
   ✓ Paso 4: Confirmación
   ✓ Paso 5: Términos
   ```

3. **Resumen de Obligaciones**
   ```
   Total pendiente: $55,000
   Vencidas: $0
   Próximo vencimiento: 20/04/2024 ($5,000)
   
   [Ver todas las obligaciones →]
   ```

4. **Regímenes Activos**
   ```
   Monotributo        ✓ Activo
   Régimen General    ✗ Inactivo
   Autónomos          ✗ Inactivo
   ```

5. **Comprobantes Emitidos**
   ```
   Total emitido este mes: $6,050
   Comprobantes: 3 (Tipo A: 1, Tipo B: 2)
   
   [Ver comprobantes →]
   ```

6. **Notificaciones Recientes**
   ```
   • Obligación próxima a vencer (warning)
   • Alta registral completada (success)
   • POS habilitado (info)
   
   [Ver todas las notificaciones →]
   ```

7. **Accesos Rápidos** (grid de botones)
   ```
   [Crear Comprobante]    [Pagar Obligación]
   [Activar Régimen]      [Crear POS]
   [Ver Estado Cuenta]    [Ver Notificaciones]
   ```

### Datos Calculados

```typescript
interface DashboardData {
  taxpayer: TaxpayerProfile,
  registrationProgress: number, // 0-100%
  totalObligations: number, // monto
  pendingObligations: number,
  overdueObligations: number,
  nextDueDate: Date,
  activeRegimes: TaxRegime[],
  recentNotifications: Notification[],
  invoicesThisMonth: Invoice[],
  totalIssuedThisMonth: number
}
```

### Objetivo Pedagógico

- Dar visión integral del estado fiscal
- Motivar al estudiante a completar todas las etapas
- Alertar sobre obligaciones próximas
- Mostrar progreso realizado

---

## Módulo 10: Historial de Acciones

**Ruta**: `/dashboard/historial`  
**Requisito**: Usuario autenticado

### Propósito

El historial registra TODAS las acciones del estudiante en el simulador. Sirve para:
- **Auditoría**: Ver quién hizo qué y cuándo
- **Aprendizaje**: Revisar el proceso completo
- **Evaluación docente** (versión futura): Entender trayectoria del estudiante

### Funcionalidades

1. **Listado Completo de Acciones**
   - Tabla cronológica inversa (más reciente primero)
   - Columns: Fecha/Hora, Acción, Módulo, Detalles

2. **Filtros**
   - Por módulo (Taxpayer, Registration, Invoices, etc.)
   - Por tipo de acción (CREATE, UPDATE, DELETE)
   - Por rango de fechas

3. **Detalle Expandible**
   - Datos exactos antes y después del cambio
   - Metadata adicional (IP, navegador, etc. en futuro)

### Tipos de Acciones Registradas

```
TAXPAYER (Perfil del Contribuyente):
- CREATE: Creó nuevo contribuyente
- UPDATE: Modificó datos (nombre, domicilio, etc.)

REGISTRATION (Alta RUT):
- UPDATE: Completó paso X del alta

TAX_REGIMES (Relaciones Tributarias):
- CREATE: Activó régimen
- UPDATE: Cambió estado de régimen
- DELETE: Desactivó régimen

OBLIGATIONS (Obligaciones):
- CREATE: Sistema generó automáticamente
- UPDATE: Cambió estado (pending → paid)

INVOICES (Comprobantes):
- CREATE: Emitió nuevo comprobante
- UPDATE: Editó borrador
- DELETE: Anuló comprobante

NOTIFICATIONS:
- CREATE: Sistema envió notificación
- UPDATE: Usuario marcó como leída
```

### Ejemplo de Datos

```
fecha_hora            | accion | modulo        | descripcion
---------------------|--------|---------------|------------------------------
2024-04-15 10:30:00  | CREATE | INVOICES      | Emitió Factura 001-00000003
2024-04-15 10:15:00  | UPDATE | OBLIGATIONS   | Marcó obligación como pagada
2024-04-15 09:45:00  | CREATE | TAX_REGIMES   | Activó Monotributo
2024-04-10 14:00:00  | CREATE | TAXPAYER      | Creó contribuyente
2024-04-10 14:05:00  | UPDATE | REGISTRATION  | Completó Paso 1 del Alta
```

### Almacenamiento

```sql
INSERT INTO activity_log (user_id, action_type, description, module, metadata)
VALUES (
  'uuid-user',
  'CREATE',
  'Emitió Factura 001-00000003',
  'INVOICES',
  '{"invoice_id":"uuid","total":6050.00}'
);
```

### Objetivo Pedagógico

- Fomentar responsabilidad y consciencia de acciones
- Permitir revisión y reflexión sobre proceso
- Preparar para docentes/evaluadores (versión futura)
- Recordar al estudiante que hay registro de todo

---

## Conclusión

Estos 10 módulos forman un simulador educativo completo que enseña el recorrido fiscal de un contribuyente argentino. Cada módulo es independiente pero progresivo, permitiendo que el estudiante aprenda paso a paso, de lo más básico (autenticación) a lo más complejo (emisión de facturas y gestión de obligaciones).

*TRIBUT.AR — Documentación de Módulos — v1.0*
