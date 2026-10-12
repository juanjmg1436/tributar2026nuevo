-- ============================================================================
-- Seguimiento y Evaluación GEST-AR · migración 01: esquema base
--
-- Va en un esquema propio, `evaluacion`, separado de `public`. Razón: en
-- `public` viven los datos FICTICIOS de las empresas simuladas (facturas,
-- asientos, DDJJ). Acá viven datos EDUCATIVOS REALES sobre personas. Mezclarlos
-- haría imposible dar acceso a uno sin dar acceso al otro.
--
-- Es aditiva y reversible: no toca ninguna tabla existente. Para revertir,
-- `drop schema evaluacion cascade`.
-- ============================================================================

create schema if not exists evaluacion;
comment on schema evaluacion is
  'Datos educativos reales del piloto de evaluación. Separado de public, donde viven los datos ficticios de las simulaciones.';

-- ── Cohortes y períodos ─────────────────────────────────────────────────────
-- El prompt es explícito: el denominador de los indicadores es la COHORTE
-- ELEGIBLE del período, no "quienes entraron". Sin esto no hay indicador
-- válido, sólo un techo optimista.

create table if not exists evaluacion.cohortes (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  institucion   text not null default 'Escuela Normal Superior N.º 9 y Anexo Comercial Juan XXIII',
  curso         text,
  anio_lectivo  integer not null,
  notas         text,
  creada_en     timestamptz not null default now(),
  unique (nombre, anio_lectivo)
);

create table if not exists evaluacion.periodos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  etapa       text not null check (etapa in ('diagnostico','integracion','implementacion','analisis')),
  desde       date not null,
  hasta       date not null,
  es_final    boolean not null default false,
  creado_en   timestamptz not null default now(),
  check (hasta >= desde)
);
comment on column evaluacion.periodos.es_final is
  'false = seguimiento provisional; true = evaluación final. El panel debe distinguirlos.';

-- Quién integra la cohorte. Una fila por persona y cohorte: este es el
-- denominador. `baja_en` permite retiros sin romper el histórico.
create table if not exists evaluacion.integrantes (
  id            uuid primary key default gen_random_uuid(),
  cohorte_id    uuid not null references evaluacion.cohortes(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  seudonimo     text not null,
  rol           text not null default 'estudiante' check (rol in ('estudiante','docente','responsable','direccion')),
  alta_en       date not null default current_date,
  baja_en       date,
  motivo_baja   text,
  unique (cohorte_id, user_id),
  unique (cohorte_id, seudonimo)
);
comment on table evaluacion.integrantes is
  'La cohorte elegible. user_id puede ser nulo: alguien puede estar en la cohorte y no haber creado cuenta todavía — eso es justamente lo que mide el indicador de participación.';
comment on column evaluacion.integrantes.seudonimo is
  'Identificador seudonimizado para informes. Seudonimizar no es anonimizar: la vinculación existe y es recuperable por quien tiene permiso.';

-- ── Consentimiento ──────────────────────────────────────────────────────────
-- Punto 7 del prompt: posibilidad de no participar o retirarse sin penalización.
-- Se separa el uso del servicio (usar las apps) del permiso para evaluar.

create table if not exists evaluacion.consentimientos (
  id              uuid primary key default gen_random_uuid(),
  integrante_id   uuid not null references evaluacion.integrantes(id) on delete cascade,
  otorgado        boolean not null,
  fecha           timestamptz not null default now(),
  version_texto   text not null,
  observaciones   text
);
comment on table evaluacion.consentimientos is
  'Sin consentimiento otorgado, la persona usa las apps igual pero sus datos no entran en los informes de evaluación.';

-- ── Fichas de indicador ─────────────────────────────────────────────────────
-- Una ficha por indicador, versionada. El prompt pide conservar la definición
-- usada en cada informe, así que la versión es parte de la clave.

create table if not exists evaluacion.indicadores (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null,
  version         integer not null default 1,
  dimension       text not null check (dimension in ('social','comunicativa','pedagogica','tecnologica','institucional')),
  definicion      text not null,
  poblacion       text not null,
  numerador       text not null,
  denominador     text not null,
  fuente          text not null,
  regla_calculo   text not null,
  meta_porcentaje numeric(5,2) not null,
  cobertura_minima numeric(5,2),
  responsable     text,
  vigente_desde   date not null default current_date,
  vigente_hasta   date,
  unique (codigo, version)
);
comment on column evaluacion.indicadores.cobertura_minima is
  'Por debajo de esta cobertura el resultado se informa como "Cobertura insuficiente", no como un porcentaje.';

-- ── Criterios configurables ─────────────────────────────────────────────────
-- El prompt lo dice sin rodeos: el umbral de "desempeño satisfactorio" y el
-- rango de "parcialmente cumplida" NO están en el trabajo final. Se configuran
-- y los valida el responsable; no se inventan.

create table if not exists evaluacion.criterios (
  clave        text primary key,
  valor        jsonb not null,
  descripcion  text not null,
  validado_por text,
  validado_en  timestamptz,
  actualizado_en timestamptz not null default now()
);
comment on table evaluacion.criterios is
  'Mientras validado_por sea nulo, el criterio está PENDIENTE y los indicadores que dependen de él se informan como "Criterio pendiente".';

-- ── Registro de cambios ─────────────────────────────────────────────────────
create table if not exists evaluacion.auditoria (
  id         bigserial primary key,
  tabla      text not null,
  registro   uuid,
  accion     text not null,
  autor      uuid,
  detalle    jsonb,
  ocurrido_en timestamptz not null default now()
);

create index if not exists idx_integrantes_cohorte on evaluacion.integrantes(cohorte_id);
create index if not exists idx_integrantes_user    on evaluacion.integrantes(user_id);
create index if not exists idx_consent_integrante  on evaluacion.consentimientos(integrante_id);
