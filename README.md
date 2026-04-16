# TRIBUT.AR — Simulador Didáctico Fiscal Argentino

> **SIMULADOR DIDÁCTICO — NO OFICIAL — SIN VALIDEZ FISCAL/LEGAL — DATOS DEMO**
> Esta aplicación es exclusivamente educativa y no tiene ninguna validez legal, fiscal ni impositiva.

## ¿Qué es TRIBUT.AR?

TRIBUT.AR es una aplicación web educativa que simula, con fines pedagógicos, parte del recorrido registral y fiscal argentino de un contribuyente. Está inspirada en la lógica de los organismos recaudadores argentinos (AFIP/ARCA), pero es un simulador didáctico completamente independiente, sin ninguna conexión con sistemas oficiales.

Está diseñada para estudiantes de nivel secundario o superior inicial que quieran comprender:
- El proceso de registración tributaria
- Los principales regímenes impositivos
- La lógica del domicilio fiscal electrónico
- La emisión de comprobantes
- El concepto de estado de cuenta fiscal
- La habilitación de puntos de venta

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Despliegue | Vercel |
| Formularios | React Hook Form + Zod |
| Íconos | Lucide React |

## Requisitos previos

- Node.js 18.17 o superior
- npm, yarn o pnpm
- Cuenta en [Supabase](https://supabase.com) (gratuita)
- Cuenta en [Vercel](https://vercel.com) (gratuita)

## Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/tribut-ar.git
cd tribut-ar
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editar `.env.local` con las credenciales de Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Configurar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. En el panel de Supabase, ir a **SQL Editor**
3. Ejecutar en orden:
   - `sql/schema.sql` — Crea todas las tablas
   - `sql/rls.sql` — Configura Row Level Security
   - `sql/seed.sql` — Carga datos de referencia

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## Despliegue en Vercel

### 1. Importar el proyecto

1. Ir a [vercel.com/new](https://vercel.com/new)
2. Importar desde GitHub
3. Seleccionar el repositorio `tribut-ar`

### 2. Configurar variables de entorno en Vercel

En el panel de Vercel, configurar:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (URL de producción, ej: https://tribut-ar.vercel.app)

### 3. Configurar Supabase para producción

En Supabase → Authentication → URL Configuration:
- **Site URL**: `https://tu-app.vercel.app`
- **Redirect URLs**: `https://tu-app.vercel.app/**`

### 4. Desplegar

Hacer clic en **Deploy**. Vercel detecta automáticamente que es un proyecto Next.js.

## Estructura del proyecto

```
tribut-ar/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rutas de autenticación
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/       # Portal privado del estudiante
│   │   ├── dashboard/
│   │   ├── perfil-contribuyente/
│   │   ├── alta-rut/
│   │   ├── administrador-relaciones/
│   │   ├── estado-cuenta/
│   │   ├── domicilio-fiscal/
│   │   ├── puntos-venta/
│   │   ├── comprobantes/
│   │   └── historial/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx            # Landing pública
├── components/
│   ├── ui/                # Componentes base reutilizables
│   ├── layout/            # Layout y navegación
│   ├── forms/             # Componentes de formulario
│   └── dashboard/         # Componentes del dashboard
├── hooks/                 # Custom hooks
├── lib/
│   ├── supabase/         # Clientes Supabase
│   ├── constants/        # Datos de referencia
│   └── utils.ts
├── types/                 # Tipos TypeScript
├── sql/                   # Scripts SQL
├── docs/                  # Documentación adicional
├── public/               # Archivos estáticos
├── middleware.ts          # Middleware de autenticación
└── README.md
```

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase | ✅ |
| `NEXT_PUBLIC_APP_URL` | URL base de la aplicación | ✅ |

## Aviso legal

Esta aplicación es un **simulador educativo**. No tiene ningún vínculo con AFIP, ARCA, ni ningún organismo oficial argentino. Los datos mostrados son ficticios y no tienen validez legal, impositiva ni fiscal. No utilizar esta aplicación como fuente de información oficial.

## Licencia

MIT
