# Guía de Despliegue — TRIBUT.AR

> Guía paso a paso para instalar, configurar y desplegar TRIBUT.AR en producción

---

## 1. Requisitos Previos

Antes de comenzar, asegúrate de tener:

- Node.js 18.17 o superior (verificar con `node --version`)
- npm, yarn o pnpm instalado
- Acceso a una terminal/línea de comandos
- Cuenta de GitHub (para versionado)
- Cuenta de Supabase (gratuita en https://supabase.com)
- Cuenta de Vercel (gratuita en https://vercel.com)

---

## 2. Instalación Local

### Paso 2.1: Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/tribut-ar.git
cd tribut-ar
```

Si es la primera vez, es posible que debas configurar Git:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### Paso 2.2: Instalar dependencias

```bash
npm install
```

Esto descargará todos los paquetes listados en `package.json`. Tardará 2-5 minutos dependiendo de tu conexión.

Verifica que la instalación fue exitosa:

```bash
npm list react next
```

Deberías ver las versiones correctas (React 18.3.1 y Next.js 14.2.3).

### Paso 2.3: Crear archivo de variables de entorno

```bash
cp .env.example .env.local
```

Esto crea un archivo `.env.local` basado en el ejemplo. Este archivo NO debe commitirse a Git (ya está en `.gitignore`).

### Paso 2.4: Obtener credenciales de Supabase

1. Ve a https://supabase.com y crea una cuenta
2. Crea un nuevo proyecto:
   - Nombre: `tribut-ar` (o lo que prefieras)
   - Región: Elige la más cercana a tu ubicación
   - Contraseña: Anota en un lugar seguro
3. Espera a que el proyecto se cree (1-2 minutos)
4. Una vez creado, ve a **Settings** → **API**
5. Copia estos valores:
   - `Project URL` → corresponde a `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` (en la sección Anon key) → corresponde a `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Paso 2.5: Completar .env.local

Edita el archivo `.env.local` con tus credenciales:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...tu-clave-aqui
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Importante**: 
- `NEXT_PUBLIC_SUPABASE_URL` — URL completa con `https://`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Clave larga de API (comienza con `eyJ...`)
- `NEXT_PUBLIC_APP_URL` — Para desarrollo local siempre es `http://localhost:3000`

### Paso 2.6: Ejecutar scripts SQL en Supabase

Ahora configuraré la base de datos. En el panel de Supabase:

1. Ve a **SQL Editor** (en el menú izquierdo)
2. Haz clic en **"New query"**
3. Copia el contenido de `sql/schema.sql` (el archivo de definición de tablas)
4. Pega en el editor
5. Haz clic en **"Run"** (botón azul)
6. Espera a que se complete (deberías ver "Success" en verde)

```
Ahora repite con los otros scripts:
1. `sql/rls.sql` — Define políticas de seguridad
2. `sql/seed.sql` — Carga datos de referencia (regímenes tributarios)
```

**Orden importante**: Schema → RLS → Seed (en ese orden).

Después de completar, en la sección **Table Editor** de Supabase deberías ver 12 tablas:
- profiles
- taxpayer_profiles
- registration_steps
- tax_regimes
- taxpayer_regime_status
- obligations
- e_fiscal_address
- notifications
- points_of_sale
- invoices
- invoice_items
- activity_log

### Paso 2.7: Verificar instalación local

```bash
npm run dev
```

Esto inicia el servidor de desarrollo. Deberías ver:

```
> tribut-ar@1.0.0 dev
> next dev

  ▲ Next.js 14.2.3
  - Local:        http://localhost:3000
  - Environments: .env.local
```

Abre el navegador y ve a http://localhost:3000. Deberías ver la página de inicio de TRIBUT.AR.

Para probar la autenticación:
1. Haz clic en "Registrarse"
2. Usa email y contraseña de prueba
3. Deberías ser redirigido al dashboard

---

## 3. Configuración de Supabase en Detalle

### 3.1 Habilitar autenticación por email

En el panel de Supabase:

1. Ve a **Authentication** → **Providers**
2. Verifica que "Email" esté habilitado (en verde)
3. Si está deshabilitado, haz clic y actívalo

### 3.2 Configurar URLs de redirección para desarrollo local

En **Authentication** → **URL Configuration**:

1. **Site URL**: `http://localhost:3000` (para desarrollo local)
2. **Redirect URLs**: Agrega:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/dashboard`

### 3.3 Verificar que RLS está habilitado

En **SQL Editor**, ejecuta:

```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'invoices', 'obligations');
```

Deberías ver las 3 tablas. Si no ves algunas, significa que el script schema.sql no se ejecutó correctamente.

---

## 4. Despliegue en Vercel

### Paso 4.1: Preparar el código para Git

```bash
git add .
git commit -m "Initial commit - TRIBUT.AR application"
git branch -M main
```

### Paso 4.2: Crear repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre: `tribut-ar`
3. Descripción: "Argentine Tax Simulator - Educational Application"
4. Privado o público (a tu elección)
5. Haz clic en **"Create repository"**

### Paso 4.3: Pushear código a GitHub

```bash
git remote add origin https://github.com/tu-usuario/tribut-ar.git
git push -u origin main
```

Se te pedirá que autentiques. Si usas HTTPS, proporciona tu token personal (crear en GitHub Settings → Developer Settings → Personal access tokens).

### Paso 4.4: Conectar Vercel

1. Ve a https://vercel.com/new
2. Haz clic en **"Import Git Repository"**
3. Selecciona tu repositorio `tribut-ar`
4. Vercel detectará automáticamente que es un proyecto Next.js

### Paso 4.5: Configurar variables de entorno en Vercel

En la pantalla de importación, antes de hacer clic en **Deploy**:

1. Haz clic en **"Environment Variables"**
2. Agrega estas tres variables (los mismos valores que en `.env.local`):

| Nombre | Valor |
|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tu-proyecto.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` (tu clave) |
| `NEXT_PUBLIC_APP_URL` | (dejaremos para después) |

No necesitas `NEXT_PUBLIC_APP_URL` para el primer deploy, pero después de que Vercel genere tu URL, actualiza esta variable.

### Paso 4.6: Hacer deploy

1. Haz clic en **"Deploy"**
2. Vercel compilará tu proyecto (tarda ~3-5 minutos)
3. Verás un mensaje: **"Congratulations! Your deployment is ready"**
4. Haz clic en **"Visit"** para abrir tu aplicación en vivo

La URL será algo como: `https://tribut-ar.vercel.app`

### Paso 4.7: Actualizar Supabase para URLs de producción

Ahora que tienes tu URL de Vercel, actualiza Supabase:

En el panel de Supabase → **Authentication** → **URL Configuration**:

1. **Site URL**: `https://tu-app.vercel.app` (reemplaza con tu URL real)
2. **Redirect URLs**: Agrega:
   - `https://tu-app.vercel.app/auth/callback`
   - `https://tu-app.vercel.app/dashboard`

### Paso 4.8: Actualizar variable de entorno en Vercel

En el panel de Vercel:

1. Ve a tu proyecto
2. **Settings** → **Environment Variables**
3. Edita `NEXT_PUBLIC_APP_URL` y cambia a tu URL de Vercel:
   ```
   https://tu-app.vercel.app
   ```
4. Redeploy automático se dispara

---

## 5. Verificación Post-Deploy

Después de desplegar, verifica que todo funciona:

### 5.1 Prueba de acceso público

- Abre https://tu-app.vercel.app en el navegador
- Deberías ver la página de inicio

### 5.2 Prueba de registro

1. Haz clic en "Registrarse"
2. Usa un email de prueba
3. Establece una contraseña (mínimo 6 caracteres)
4. Haz clic en **"Registrarse"**
5. Deberías ser redirigido al dashboard
6. Verifica que ves: "¡Bienvenido a TRIBUT.AR"

### 5.3 Prueba de base de datos

En el dashboard:
1. Haz clic en "Perfil del Contribuyente"
2. Completa los datos (nombre, CUIT, etc.)
3. Haz clic en "Guardar"
4. Deberías ver un mensaje de éxito

En Supabase SQL Editor, verifica que los datos se guardaron:

```sql
SELECT id, full_name, email 
FROM profiles 
LIMIT 5;
```

### 5.4 Monitoreo de errores

En Vercel:
- Ve a tu proyecto → **Deployments**
- Haz clic en el último deployment
- Ve a **Logs** → **Function Logs** para ver errores

En Supabase:
- Ve a **Logs** → **Postgres Logs** para errores de base de datos

---

## 6. Configuración de CI/CD

Vercel ya proporciona CI/CD automático:

- Cada push a `main` en GitHub dispara un nuevo deploy en Vercel
- Puedes ver el estado en: Vercel → Deployments → (cada commit)

Para mejorar:

1. Ve a Vercel → **Settings** → **Git**
2. Habilita **"Protected Branch"** para requerer revisión antes de mergear a main

---

## 7. Solución de Problemas

### Problema: "NEXT_PUBLIC_SUPABASE_URL is not defined"

**Causa**: Variable de entorno no configurada  
**Solución**: 
1. Verifica que `.env.local` existe y tiene la variable
2. Reinicia el servidor de desarrollo: `npm run dev`
3. Si en Vercel, verifica en Settings → Environment Variables

### Problema: "Row Level Security violation"

**Causa**: Política RLS no permite la operación  
**Solución**:
1. Verifica que el usuario está autenticado (no es sesión anónima)
2. Ejecuta `sql/rls.sql` nuevamente en Supabase SQL Editor
3. Verifica que la tabla tiene la política correcta:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'invoices';
   ```

### Problema: "Email already exists"

**Causa**: Intentas registrar con un email ya usado  
**Solución**: 
1. Usa un email diferente
2. O en Supabase → Authentication → Users, elimina el usuario y reintentar

### Problema: Deploy en Vercel falla

**Causa**: Errores de compilación  
**Solución**:
1. Ve a Vercel → Deployments → (último) → Logs
2. Lee el error de compilación
3. Corrige en tu código local
4. Haz `git push` para retrigger el deploy

---

## 8. Checklist de Despliegue Completo

- [ ] Node.js 18+ instalado
- [ ] Proyecto clonado localmente
- [ ] `npm install` completado
- [ ] `.env.local` configurado con credenciales Supabase
- [ ] `sql/schema.sql` ejecutado en Supabase
- [ ] `sql/rls.sql` ejecutado en Supabase
- [ ] `sql/seed.sql` ejecutado en Supabase
- [ ] `npm run dev` funciona localmente
- [ ] Autenticación funciona (puedo registrarme)
- [ ] Puedo crear un contribuyente y guardar en BD
- [ ] Código pusheado a GitHub
- [ ] Vercel importa el repositorio
- [ ] Variables de entorno configuradas en Vercel
- [ ] Deploy en Vercel completado
- [ ] URLs de autenticación Supabase actualizadas
- [ ] Registro y login funcionan en producción
- [ ] Base de datos en producción almacena datos correctamente

---

## 9. Mantenimiento

### Backups

Supabase Cloud proporciona backups automáticos diarios en el plan Free. Para backup manual:

1. Ve a Supabase → **Database** → **Backups**
2. Haz clic en **"New backup"**

### Monitoreo

Verifica regularmente:
- Vercel Deployments para errores
- Supabase Logs para errores de BD
- Usage en ambas plataformas

### Actualizaciones

Para actualizar dependencias:

```bash
npm outdated    # Ver qué está desactualizado
npm update      # Actualizar todo
npm audit fix   # Corregir vulnerabilidades
```

---

## 10. Acceso a Bases de Datos desde Herramientas Externas

Si quieres conectar herramientas como DBeaver o Tableau:

1. En Supabase → **Settings** → **Database**
2. Copia la **Connection string** (formato PostgreSQL)
3. Usa en tu herramienta de BI

**Advertencia**: Esto expone tu base de datos; usa solo en desarrollo.

---

*TRIBUT.AR — Guía de Despliegue Completa — v1.0*
