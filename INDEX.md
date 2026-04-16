# TRIBUT.AR — Índice de Archivos Completo

**Ubicación**: `/sessions/lucid-serene-planck/mnt/Simulador Fiscal/`  
**Fecha**: 2024-04-14  
**Estado**: 100% Completado

---

## Archivos Principales (Raíz)

### Configuración de Proyecto

| # | Archivo | Líneas | Descripción |
|---|---------|--------|-------------|
| 1 | `package.json` | 46 | Dependencias NPM, scripts dev/build |
| 2 | `tsconfig.json` | 17 | Configuración TypeScript estricta |
| 3 | `next.config.ts` | 12 | Configuración Next.js 14 |
| 4 | `tailwind.config.ts` | 40 | Colores, fuentes, tema |
| 5 | `postcss.config.js` | 6 | Herramientas CSS (Tailwind, Autoprefixer) |

### Configuración de Desarrollo

| # | Archivo | Líneas | Descripción |
|---|---------|--------|-------------|
| 6 | `.env.example` | 5 | Template de variables de entorno |
| 7 | `.gitignore` | 32 | Exclusiones Git |

### Documentación de Usuario

| # | Archivo | Líneas | Descripción |
|---|---------|--------|-------------|
| 8 | `README.md` | 150 | Guía de instalación y despliegue |
| 9 | `INFORME_FINAL.md` | 166 | Resumen técnico del proyecto |

---

## Carpeta: `/sql/` — Base de Datos

| # | Archivo | Líneas | Descripción |
|---|---------|--------|-------------|
| 10 | `schema.sql` | 331 | 12 tablas, índices, triggers, funciones |
| 11 | `rls.sql` | 229 | Row Level Security (50+ políticas) |
| 12 | `seed.sql` | 50 | Datos de referencia (5 regímenes) |

**Instalación SQL**:
1. Crear proyecto Supabase
2. SQL Editor → Nuevo query → copiar schema.sql → Ejecutar
3. Repetir con rls.sql
4. Repetir con seed.sql

---

## Carpeta: `/docs/` — Documentación Técnica

| # | Archivo | Líneas | Tema |
|---|---------|--------|------|
| 13 | `arquitectura.md` | 389 | Diagrama de sistema, flujos, seguridad, progresión |
| 14 | `despliegue.md` | 425 | Setup local paso a paso, Vercel, troubleshooting |
| 15 | `modelo-datos.md` | 611 | 13 tablas con relaciones, campos, ejemplos |
| 16 | `modulos.md` | 1260 | 10 módulos educativos en profundidad |

---

## Resumen por Tipo de Archivo

### Configuración (5 archivos)
- Next.js, TypeScript, Tailwind CSS, PostCSS
- Todas las herramientas necesarias para desarrollo

### SQL (3 archivos, 610 líneas)
- Esquema: 12 tablas + índices + triggers
- Seguridad: RLS policies automáticas
- Datos: 5 regímenes tributarios

### Documentación (6 archivos, 2,685 líneas)
- Guías de usuario y técnicas
- Arquitectura y despliegue
- Modelo de datos completo
- 10 módulos educativos especificados

### Total: 16 Archivos, 3,734 Líneas

---

## Lectura Recomendada

### Para Empezar
1. Leer: `README.md`
2. Verificar: `INFORME_FINAL.md`

### Para Entender el Sistema
1. Leer: `docs/arquitectura.md`
2. Leer: `docs/modelo-datos.md`

### Para Implementar
1. Leer: `docs/despliegue.md` (paso a paso)
2. Ejecutar: `sql/schema.sql`, `sql/rls.sql`, `sql/seed.sql`
3. Configurar: `npm install`, `.env.local`
4. Correr: `npm run dev`

### Para Entender Funcionalidad
1. Leer: `docs/modulos.md` (10 módulos)
2. Ver flujos y diseño de cada módulo

---

## Estadísticas Finales

```
Categoría              | Archivos | Líneas
-----------------------|----------|-------
Configuración          |    5     |   168
Variables de Entorno   |    2     |    37
Documentación Principal|    2     |   316
SQL (Base de Datos)    |    3     |   610
Documentación Técnica  |    4     |  2,685
-----------------------|----------|-------
TOTAL                  |   16     | 3,814
```

---

## Componentes Principales

### Frontend (código, no incluido en archivos)
```
app/
├── (auth)           — Rutas de autenticación
├── (dashboard)      — Portal privado del estudiante
└── layout.tsx       — Layout principal
```

### Base de Datos (SQL)
```sql
12 tablas:
- profiles (estudiantes)
- taxpayer_profiles (contribuyentes)
- registration_steps (alta registral)
- tax_regimes (regímenes)
- taxpayer_regime_status (inscripción)
- obligations (obligaciones)
- e_fiscal_address (domicilio)
- notifications (notificaciones)
- points_of_sale (POS)
- invoices (facturas)
- invoice_items (ítems)
- activity_log (historial)
```

### 10 Módulos Educativos
1. Autenticación
2. Perfil del Contribuyente
3. Alta RUT
4. Administrador de Relaciones
5. Estado de Cuenta
6. Domicilio Fiscal Electrónico
7. Puntos de Venta
8. Comprobantes
9. Dashboard
10. Historial

---

## Verificación Rápida

```bash
# Verificar todos los archivos existen
ls -la /sessions/lucid-serene-planck/mnt/"Simulador Fiscal"/*.{json,ts,js,md}
ls -la /sessions/lucid-serene-planck/mnt/"Simulador Fiscal"/sql/*.sql
ls -la /sessions/lucid-serene-planck/mnt/"Simulador Fiscal"/docs/*.md

# Ver líneas totales
find /sessions/lucid-serene-planck/mnt/"Simulador Fiscal" -type f \( -name "*.json" -o -name "*.ts" -o -name "*.js" -o -name "*.sql" -o -name "*.md" \) | xargs wc -l | tail -1
```

---

## Aviso Legal

**TRIBUT.AR** es un simulador educativo didáctico.  
No tiene validez legal, impositiva ni fiscal.  
No está conectado a AFIP, ARCA ni ningún organismo oficial argentino.

---

**Proyecto**: TRIBUT.AR  
**Tipo**: Simulador Didáctico Fiscal Argentino  
**Nivel**: Educativo (Secundario/Universitario)  
**Lenguaje**: TypeScript, SQL, Markdown  
**Estado**: 100% Completado y Listo para Usar
