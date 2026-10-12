-- ============================================================================
-- Seguimiento y Evaluación GEST-AR · migración 03: separación de demostración
--
-- El trabajo final exige datos de demostración "claramente rotulados y
-- excluidos de los informes reales". Sin una marca explícita, una cohorte de
-- prueba terminaría contando como resultado del piloto.
-- ============================================================================

alter table evaluacion.cohortes add column if not exists es_demo boolean not null default false;
comment on column evaluacion.cohortes.es_demo is
  'Cohorte de demostracion. Debe quedar EXCLUIDA de todo informe real y de la vista publica.';

alter table evaluacion.periodos add column if not exists es_demo boolean not null default false;

-- Única vista que deberían consumir los informes y la futura API pública.
create or replace view evaluacion.v_cohortes_reales as
  select id, nombre, institucion, curso, anio_lectivo, notas, creada_en, es_demo
  from evaluacion.cohortes
  where es_demo = false;
