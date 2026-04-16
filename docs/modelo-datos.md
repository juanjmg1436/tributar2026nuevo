# Modelo de Datos — TRIBUT.AR

> Documentación del esquema de base de datos — Simulador Didáctico Fiscal Argentino

---

## 1. Descripción General

La base de datos de TRIBUT.AR contiene 12 tablas principales que modelan:

1. **Gestión de usuarios**: Estudiantes registrados
2. **Contribuyentes**: Entidades fiscales simuladas creadas por estudiantes
3. **Registro tributario**: Proceso de alta con múltiples pasos
4. **Regímenes**: Definiciones de regímenes tributarios disponibles
5. **Estado fiscal**: Obligaciones y notificaciones
6. **Comprobantes**: Facturas simuladas emitidas
7. **Auditoría**: Historial de acciones

---

## 2. Tabla: `profiles`

**Propósito**: Extiende los usuarios de Supabase Auth con información adicional del estudiante.

**Campos**:

| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | Identificador único (foreign key a auth.users) | Primary key, Referencias a auth.users |
| `full_name` | TEXT | Nombre completo del estudiante | No nulo, asignado al registrarse |
| `email` | TEXT | Email del estudiante | No nulo |
| `institution` | TEXT | Institución educativa (escuela/universidad) | Nullable, opcional |
| `role` | TEXT | Rol de usuario (siempre 'student' por ahora) | CHECK: solo 'student' |
| `created_at` | TIMESTAMPTZ | Fecha de creación | Automático |
| `updated_at` | TIMESTAMPTZ | Fecha última actualización | Automático, actualizado por trigger |

**Relaciones**:
- `1:1` con `auth.users` — Cuando usuario se registra, trigger crea automáticamente un profile
- `1:N` con `taxpayer_profiles` — Un estudiante puede tener un contribuyente
- `1:N` con `registration_steps` — Un estudiante tiene múltiples pasos de alta
- `1:N` con `obligations` — Obligaciones de los contribuyentes del estudiante
- `1:N` con `notifications` — Notificaciones del estudiante
- `1:N` con `activity_log` — Historial de acciones del estudiante

**Ejemplo de datos**:

```
id         | full_name          | email              | institution        | role
-----------|--------------------|--------------------|--------------------|---------
uuid-1234  | Juan García Pérez  | juan@example.com   | IES N°15 San Justo | student
uuid-5678  | María López Torres | maria@example.com  | UBA Económicas     | student
```

---

## 3. Tabla: `taxpayer_profiles`

**Propósito**: Representa el contribuyente ficticio que el estudiante crea y simula.

**Campos**:

| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | Identificador único del contribuyente | Primary key |
| `user_id` | UUID | Referencia al estudiante propietario | Foreign key a profiles, NO nulo, UNIQUE |
| `subject_type` | TEXT | Tipo: 'persona_humana' o 'persona_juridica' | CHECK: solo estos 2 valores |
| `entity_name` | TEXT | Razón social o nombre completo | No nulo |
| `trade_name` | TEXT | Nombre comercial (opcional para personas jurídicas) | Nullable |
| `cuit` | TEXT | Número CUIT ficticio | No nulo, usado para identificación |
| `main_activity_code` | TEXT | Código de actividad principal (IIBB) | Nullable, ej: "3623" |
| `main_activity_name` | TEXT | Descripción de actividad principal | Nullable, ej: "Servicios Contables" |
| `secondary_activity_code` | TEXT | Código de actividad secundaria | Nullable |
| `secondary_activity_name` | TEXT | Descripción de actividad secundaria | Nullable |
| `fiscal_address` | TEXT | Domicilio fiscal completo | Nullable |
| `street` | TEXT | Calle del domicilio | Nullable |
| `street_number` | TEXT | Número de calle | Nullable |
| `floor_apt` | TEXT | Piso/depto | Nullable |
| `province` | TEXT | Provincia (ej: 'Buenos Aires') | Nullable |
| `municipality` | TEXT | Municipio | Nullable |
| `postal_code` | TEXT | Código postal | Nullable |
| `activity_start_date` | DATE | Fecha de inicio de actividad | Nullable |
| `status` | TEXT | Estado: incomplete/active/suspended/cancelled | CHECK, default 'incomplete' |
| `created_at` | TIMESTAMPTZ | Fecha de creación | Automático |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización | Trigger automático |

**Relaciones**:
- `1:N` con `registration_steps` — El contribuyente tiene un proceso de alta con múltiples pasos
- `1:N` con `taxpayer_regime_status` — El contribuyente se registra en varios regímenes
- `1:N` con `invoices` — El contribuyente emite comprobantes
- `1:N` con `points_of_sale` — El contribuyente tiene múltiples puntos de venta

**Contexto pedagógico**:

Este es el núcleo del simulador. El estudiante:
1. Crea un contribuyente eligiendo tipo (persona humana o jurídica)
2. Completa sus datos básicos (nombre, CUIT, domicilio)
3. Define actividades económicas
4. El contribuyente entra en estado "incomplete"
5. Al terminar el alta, pasa a "active"

**Ejemplo de datos**:

```
id         | user_id    | subject_type    | entity_name           | cuit        | status
-----------|------------|-----------------|------------------------|-------------|----------
uuid-aaa   | uuid-1234  | persona_humana  | García, Juan          | 23-12345678 | active
uuid-bbb   | uuid-5678  | persona_juridica| Consultora XYZ S.R.L  | 30-98765432 | incomplete
```

---

## 4. Tabla: `registration_steps`

**Propósito**: Registra el progreso a través del proceso de alta registral (equivalente a completar formulario F-460).

**Campos**:

| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | Identificador único del paso | Primary key |
| `user_id` | UUID | Referencia al estudiante | Foreign key a profiles, NO nulo |
| `step_number` | INTEGER | Número de paso (1, 2, 3, 4, 5) | NO nulo, secuencia |
| `step_key` | TEXT | Identificador único del paso (ej: 'STEP_PERSONAL_DATA') | NO nulo, UNIQUE con user_id |
| `step_name` | TEXT | Nombre legible (ej: 'Datos Personales') | NO nulo |
| `status` | TEXT | Estado: pending/in_progress/completed/locked | CHECK, default 'pending' |
| `step_data` | JSONB | Datos completados en este paso | JSON, default '{}' |
| `completed_at` | TIMESTAMPTZ | Fecha/hora de finalización | Nullable, null si no está completo |
| `created_at` | TIMESTAMPTZ | Fecha de creación | Automático |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización | Trigger automático |

**Estados**:
- `pending` — No iniciado
- `in_progress` — El usuario está completando
- `completed` — Finalizado exitosamente
- `locked` — No puede accederse (requiere completar paso anterior)

**Pasos del Alta (Secuencia Pedagógica)**:

```
Paso 1: STEP_PERSONAL_DATA (Datos Personales)
  └─ Completa: Nombre, DNI, Fecha nacimiento
  └─ Al completar → Paso 2 se desbloquea

Paso 2: STEP_ADDRESS (Domicilio)
  └─ Completa: Calle, número, provincia, código postal
  └─ Al completar → Paso 3 se desbloquea

Paso 3: STEP_MAIN_ACTIVITY (Actividad Principal)
  └─ Completa: Código IIBB, descripción, fecha inicio
  └─ Al completar → Paso 4 se desbloquea

Paso 4: STEP_CONFIRMATION (Confirmación de Datos)
  └─ Revisa resumen de todo lo ingresado
  └─ Al completar → Paso 5 se desbloquea

Paso 5: STEP_TERMS_CONDITIONS (Términos y Condiciones)
  └─ Acepta términos de uso del simulador
  └─ Al completar → Alta completada, status → 'active'
```

**Ejemplo de datos**:

```
step_number | step_key            | status      | step_data                          | completed_at
------------|---------------------|-------------|-----------------------------------|-------------------
1           | STEP_PERSONAL_DATA  | completed   | {"dni":"12345678","apellido":"..."}| 2024-04-10 14:30:00
2           | STEP_ADDRESS        | completed   | {"calle":"Av. 9 de Julio",...}    | 2024-04-10 15:00:00
3           | STEP_MAIN_ACTIVITY  | in_progress | {"codigo_iibb":"3623"}            | null
4           | STEP_CONFIRMATION   | locked      | {}                                | null
5           | STEP_TERMS          | locked      | {}                                | null
```

---

## 5. Tabla: `tax_regimes`

**Propósito**: Catálogo de referencia con los regímenes tributarios disponibles en el simulador.

**Campos**:

| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | Identificador único | Primary key |
| `code` | TEXT | Código corto único (ej: 'MONOTRIBUTO') | UNIQUE, NO nulo |
| `name` | TEXT | Nombre del régimen (ej: 'Monotributo') | NO nulo |
| `short_description` | TEXT | Descripción corta (1 línea) | Nullable |
| `full_description` | TEXT | Descripción completa (párrafos) | Nullable |
| `applies_to` | TEXT | A quién aplica: 'persona_humana'/'persona_juridica'/'both' | CHECK, default 'both' |
| `is_active` | BOOLEAN | ¿Está disponible en el simulador? | default TRUE |
| `sort_order` | INTEGER | Orden de visualización | default 0 |
| `created_at` | TIMESTAMPTZ | Fecha de creación | Automático |

**Regímenes Incluidos**:

```
code                 | name                  | applies_to
---------------------|----------------------|-------------------
MONOTRIBUTO          | Monotributo           | persona_humana
REGIMEN_GENERAL      | Régimen General       | both
AUTONOMOS            | Autónomos             | persona_humana
RELACIONES_LABORALES | Relaciones Laborales  | both
CASAS_PARTICULARES   | Casas Particulares    | persona_humana
```

**Uso pedagógico**:

El estudiante ve estos regímenes en el módulo "Administrador de Relaciones" y puede:
- Activar uno o varios regímenes para su contribuyente
- Consultar descripción pedagógica de cada uno
- Entender el alcance (quién puede acceder)

**RLS**: Esta tabla es legible por todos los usuarios autenticados (no hay restricción por user_id).

---

## 6. Tabla: `taxpayer_regime_status`

**Propósito**: Registra en qué régimen tributario está inscrito cada contribuyente y su estado.

**Campos**:

| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | Identificador único | Primary key |
| `user_id` | UUID | Referencia al estudiante propietario | Foreign key a profiles |
| `regime_id` | UUID | Referencia al régimen | Foreign key a tax_regimes |
| `status` | TEXT | Estado: active/inactive/suspended/pending_activation | CHECK, default 'inactive' |
| `start_date` | DATE | Fecha de inicio en régimen | Nullable |
| `end_date` | DATE | Fecha de fin/baja en régimen | Nullable |
| `category` | TEXT | Categoría dentro del régimen (ej: "Categoría A") | Nullable |
| `notes` | TEXT | Notas adicionales | Nullable |
| `created_at` | TIMESTAMPTZ | Fecha de creación | Automático |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización | Trigger automático |

**UNIQUE Constraint**: (user_id, regime_id) — Un estudiante solo puede tener un estado por régimen.

**Flujo de Activación**:

```
Estudiante está en dashboard → Va a "Administrador de Relaciones"
                           ↓
        Selecciona "Activar Monotributo"
                           ↓
   Se crea registro en taxpayer_regime_status con:
   - user_id = estudiante actual
   - regime_id = ID de Monotributo
   - status = 'pending_activation'
   - start_date = hoy
                           ↓
   Sistema automáticamente:
   - Crea obligaciones mensuales para el régimen
   - Pasa status a 'active'
                           ↓
   Estudiante ve en Estado de Cuenta:
   - Obligación mensual de pago (simulada)
```

**Ejemplo de datos**:

```
user_id   | regime_id | status | start_date | category
----------|-----------|--------|------------|----------
uuid-1234 | uuid-m    | active | 2024-04-01 | Categoría B
uuid-1234 | uuid-rg   | inactive| null      | null
uuid-5678 | uuid-ap   | active | 2024-03-15 | null
```

---

## 7. Tabla: `obligations`

**Propósito**: Lista de obligaciones fiscales simuladas que el contribuyente debe cumplir.

**Campos**:

| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | Identificador único | Primary key |
| `user_id` | UUID | Referencia al estudiante | Foreign key a profiles |
| `regime_id` | UUID | Régimen que origina la obligación | Foreign key a tax_regimes, nullable |
| `concept` | TEXT | Concepto (ej: "Cuota Monotributo", "IVA Mensual") | NO nulo |
| `period` | TEXT | Período de la obligación (ej: "Abril 2024", "2024-04") | NO nulo |
| `due_date` | DATE | Fecha de vencimiento | NO nulo |
| `amount_demo` | DECIMAL(12,2) | Monto simulado (ficción pedagógica) | NO nulo, default 0 |
| `status` | TEXT | Estado: pending/submitted/paid/overdue | CHECK, default 'pending' |
| `description` | TEXT | Descripción larga | Nullable |
| `origin` | TEXT | Origen: 'system'/'manual' | default 'system' |
| `created_at` | TIMESTAMPTZ | Fecha de creación | Automático |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización | Trigger automático |

**Estados**:
- `pending` — No procesada
- `submitted` — Estudiante marcó como presentada
- `paid` — Estudiante marcó como pagada
- `overdue` — Pasó la fecha de vencimiento

**Generación Automática**:

Cuando el estudiante activa un régimen (ej: Monotributo), el sistema crea automáticamente:

- Monotributo → 1 obligación mensual de $5,000 (ficción)
- Régimen General → IVA mensual $3,000 + Ganancias anual $50,000
- Autónomos → Aportes mensuales $2,500

**Ejemplo de datos**:

```
concept           | period        | due_date   | amount_demo | status
------------------|---------------|------------|------------|--------
Cuota Monotributo | Abril 2024    | 2024-04-20 | 5000.00    | pending
Cuota Monotributo | Mayo 2024     | 2024-05-20 | 5000.00    | pending
IVA Mensual       | Marzo 2024    | 2024-03-28 | 3000.00    | paid
```

---

## 8. Tabla: `e_fiscal_address` (Domicilio Fiscal Electrónico)

**Propósito**: Simula la constitución del Domicilio Fiscal Electrónico (herramienta real de AFIP).

**Campos**:

| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | Identificador único | Primary key |
| `user_id` | UUID | Referencia al estudiante | Foreign key a profiles, UNIQUE |
| `status` | TEXT | Estado: pending/constituted/suspended | CHECK, default 'pending' |
| `notification_email` | TEXT | Email de notificaciones | Nullable |
| `phone` | TEXT | Teléfono de contacto | Nullable |
| `constitution_date` | TIMESTAMPTZ | Fecha/hora de constitución | Nullable |
| `created_at` | TIMESTAMPTZ | Fecha de creación | Automático |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización | Trigger automático |

**Propósito Pedagógico**:

En Argentina, el Domicilio Fiscal Electrónico es donde el fisco notifica al contribuyente. El estudiante aprende a:
1. Constituyerlo (asignar email y teléfono)
2. Recibir notificaciones simuladas
3. Entender por qué es importante

**Flujo**:

```
Estudiante va a "Domicilio Fiscal Electrónico"
                  ↓
  Ve estado: "No constituido"
                  ↓
  Ingresa email y teléfono
                  ↓
  Hace clic en "Constituir"
                  ↓
  Sistema crea registro con:
  - status = 'constituted'
  - constitution_date = ahora
  - notification_email = lo ingresado
                  ↓
  Ahora el domicilio está "activo"
  y recibe notificaciones automáticas
```

---

## 9. Tabla: `notifications`

**Propósito**: Notificaciones del sistema para el estudiante (análogo a notificaciones que recibiría en AFIP).

**Campos**:

| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | Identificador único | Primary key |
| `user_id` | UUID | Referencia al estudiante | Foreign key a profiles |
| `title` | TEXT | Título de la notificación | NO nulo |
| `message` | TEXT | Mensaje (puede ser HTML) | NO nulo |
| `notification_type` | TEXT | Tipo: info/warning/reminder/success/error | CHECK, default 'info' |
| `is_read` | BOOLEAN | ¿Fue leída por el usuario? | default FALSE |
| `link_to` | TEXT | URL a la que ir si hace clic | Nullable |
| `created_at` | TIMESTAMPTZ | Fecha de creación | Automático |

**Tipos**:
- `info` — Información general
- `warning` — Advertencia (ej: obligación próxima a vencer)
- `reminder` — Recordatorio
- `success` — Acción completada exitosamente
- `error` — Algo salió mal

**Ejemplos**:

```
title                        | notification_type | message
-----------------------------|-------------------|-------------------------------------
Obligación próxima a vencer  | warning           | Tu cuota de Monotributo vence en 5 días
Alta registral completada    | success           | ¡Bienvenido! Tu contribuyente está activo
Nuevo punto de venta creado  | info              | Habilitaste el POS #001
```

---

## 10. Tabla: `points_of_sale`

**Propósito**: Puntos de venta habilitados del contribuyente (locales donde emite comprobantes).

**Campos**:

| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | Identificador único | Primary key |
| `user_id` | UUID | Referencia al estudiante | Foreign key a profiles |
| `pos_number` | INTEGER | Número del POS (1, 2, 3...) | NO nulo |
| `name` | TEXT | Nombre descriptivo (ej: "Local Palermo") | NO nulo |
| `modality` | TEXT | Modalidad: electronica/manual/pos_fiscal/otro | CHECK, default 'electronica' |
| `status` | TEXT | Estado: active/inactive/pending | CHECK, default 'active' |
| `activation_date` | DATE | Fecha de habilitación | Nullable |
| `notes` | TEXT | Notas adicionales | Nullable |
| `created_at` | TIMESTAMPTZ | Fecha de creación | Automático |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización | Trigger automático |

**UNIQUE Constraint**: (user_id, pos_number) — No puede haber dos POS con el mismo número para un usuario.

**Modalidades**:
- `electronica` — Emisión electrónica de facturas (RCFE)
- `manual` — Facturas impresas
- `pos_fiscal` — Posnet con software fiscal
- `otro` — Otra modalidad

**Ejemplo de datos**:

```
pos_number | name              | modality     | status
-----------|-------------------|--------------|--------
1          | Local Centro      | electronica  | active
2          | Sucursal Flores   | pos_fiscal   | active
3          | Venta Online      | electronica  | pending
```

---

## 11. Tabla: `invoices`

**Propósito**: Comprobantes (facturas) simuladas emitidas por el contribuyente.

**Campos**:

| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | Identificador único | Primary key |
| `user_id` | UUID | Referencia al estudiante | Foreign key a profiles |
| `point_of_sale_id` | UUID | POS desde donde se emitió | Foreign key a points_of_sale, nullable |
| `pos_number` | INTEGER | Número de POS usado | default 1 |
| `invoice_type` | TEXT | Tipo: A/B/C/X/DEMO | CHECK |
| `invoice_number` | TEXT | Número de comprobante (ej: "001-00000001") | NO nulo |
| `issue_date` | DATE | Fecha de emisión | default CURRENT_DATE |
| `receiver_name` | TEXT | Nombre del receptor | NO nulo |
| `receiver_cuit` | TEXT | CUIT del receptor | Nullable |
| `receiver_condition` | TEXT | Condición IVA (Responsable/No Responsable/Monotributo) | Nullable |
| `concept` | TEXT | Concepto de venta | default 'Servicios' |
| `subtotal` | DECIMAL(12,2) | Subtotal sin impuestos | default 0 |
| `iva_amount` | DECIMAL(12,2) | Monto de IVA | default 0 |
| `total` | DECIMAL(12,2) | Total final | NO nulo |
| `notes` | TEXT | Notas del comprobante | Nullable |
| `status` | TEXT | Estado: issued/cancelled/draft | CHECK, default 'issued' |
| `created_at` | TIMESTAMPTZ | Fecha de creación | Automático |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización | Trigger automático |

**Tipos de Comprobantes**:
- `A` — Factura A (comprador es Responsable Inscripto con CUIT)
- `B` — Factura B (comprador es No Responsable o Monotributista)
- `C` — Nota de Crédito
- `X` — Comprobante de prueba
- `DEMO` — Comprobante educativo

**Ejemplo de datos**:

```
invoice_type | invoice_number | receiver_name      | subtotal | iva_amount | total
--------------|----------------|-------------------|----------|------------|--------
A             | 001-00000001   | Cliente XYZ S.A.   | 1000.00  | 210.00     | 1210.00
B             | 001-00000002   | Juan García        | 500.00   | 0.00       | 500.00
DEMO          | 001-00000003   | Demo Receiver      | 100.00   | 21.00      | 121.00
```

---

## 12. Tabla: `invoice_items`

**Propósito**: Ítems/líneas de cada comprobante.

**Campos**:

| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | Identificador único | Primary key |
| `invoice_id` | UUID | Referencia al comprobante | Foreign key a invoices, ON DELETE CASCADE |
| `description` | TEXT | Descripción del ítem | NO nulo |
| `quantity` | DECIMAL(10,2) | Cantidad | default 1 |
| `unit_price` | DECIMAL(12,2) | Precio unitario | default 0 |
| `total` | DECIMAL(12,2) | Subtotal de la línea | default 0 |
| `created_at` | TIMESTAMPTZ | Fecha de creación | Automático |

**Relación**:
- Cada comprobante puede tener múltiples ítems
- Si se elimina el comprobante, se eliminan todos los ítems automáticamente

**Ejemplo de datos**:

```
description                 | quantity | unit_price | total
-----------------------------|----------|------------|--------
Asesoramiento Contable       | 5.00     | 200.00     | 1000.00
Auditoría Anual              | 1.00     | 500.00     | 500.00
```

---

## 13. Tabla: `activity_log`

**Propósito**: Historial completo de todas las acciones del estudiante (auditoría educativa).

**Campos**:

| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | Identificador único | Primary key |
| `user_id` | UUID | Referencia al estudiante | Foreign key a profiles |
| `action_type` | TEXT | Tipo de acción (CREATE/UPDATE/DELETE/VIEW) | NO nulo |
| `description` | TEXT | Descripción legible (ej: "Creó comprobante A") | NO nulo |
| `module` | TEXT | Módulo donde ocurrió (ej: "INVOICES", "OBLIGATIONS") | NO nulo |
| `metadata` | JSONB | Datos adicionales de la acción | JSON, default '{}' |
| `created_at` | TIMESTAMPTZ | Fecha/hora de la acción | Automático |

**Propósito Pedagógico**:

El docente (en versión futura) podrá:
- Ver qué hizo cada estudiante
- Entender su proceso de aprendizaje
- Identificar dónde tuvo dificultades

**Ejemplo de datos**:

```
action_type | description                        | module        | created_at
------------|-----------------------------------|---------------|-------------------
CREATE      | Creó contribuyente "García, Juan" | TAXPAYER      | 2024-04-10 14:00:00
UPDATE      | Completó Paso 1 del Alta RUT     | REGISTRATION  | 2024-04-10 14:15:00
CREATE      | Activó régimen Monotributo       | TAX_REGIMES   | 2024-04-10 15:00:00
CREATE      | Emitió Factura A #001-00000001   | INVOICES      | 2024-04-10 16:30:00
```

---

## 14. Relaciones Entre Tablas

```
profiles (estudiante)
  ↓
  ├─→ taxpayer_profiles (contribuyente del estudiante)
  │     ├─→ registration_steps (pasos del alta)
  │     ├─→ taxpayer_regime_status (regímenes activos)
  │     │     └─→ tax_regimes (definición del régimen)
  │     └─→ points_of_sale (POS del contribuyente)
  │           └─→ invoices (comprobantes)
  │                 └─→ invoice_items (ítems de comprobante)
  │
  ├─→ obligations (obligaciones del estudiante)
  │
  ├─→ e_fiscal_address (domicilio fiscal)
  │
  ├─→ notifications (notificaciones)
  │
  └─→ activity_log (historial de acciones)
```

---

## 15. Índices para Performance

Se crearon índices en columnas frecuentemente filtradas:

```sql
CREATE INDEX idx_taxpayer_profiles_user_id ON taxpayer_profiles(user_id);
CREATE INDEX idx_obligations_user_id ON obligations(user_id);
CREATE INDEX idx_obligations_status ON obligations(status);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_module ON activity_log(module);
```

Esto acelera consultas típicas como:
- "Traeme todas las obligaciones de este usuario"
- "Traeme comprobantes con status = 'paid'"
- "Traeme el historial de acciones en el módulo X"

---

## 16. Restricciones y Validaciones

Algunas restricciones de negocio implementadas en BD:

| Tabla | Restricción | Razón |
|-------|-------------|-------|
| profiles | role = 'student' | Solo estudiantes por ahora |
| taxpayer_profiles | UNIQUE(user_id) | Un contrib por estudiante |
| registration_steps | UNIQUE(user_id, step_key) | No duplicar pasos |
| tax_regimes | UNIQUE(code) | Códigos únicos de regímenes |
| taxpayer_regime_status | UNIQUE(user_id, regime_id) | No duplicar inscripción |
| points_of_sale | UNIQUE(user_id, pos_number) | Números únicos por usuario |

---

*TRIBUT.AR — Modelo de Datos Completo — v1.0*
