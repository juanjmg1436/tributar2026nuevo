-- ============================================================================
-- Seguimiento y Evaluación GEST-AR · migración 02: motor de cálculo
--
-- Los cálculos son SQL puro y reproducibles sin IA, como exige el trabajo final.
-- La regla que gobierna todo este archivo: ante la falta de datos o de un
-- criterio, se devuelve un ESTADO HONESTO ("sin datos", "criterio pendiente")
-- y nunca un cero. Ausencia de evidencia no es incumplimiento.
-- ============================================================================

-- ── Qué cuenta como actividad completada ────────────────────────────────────
-- Sólo hitos comprobables. Abrir un enlace o descargar un documento NO figura
-- acá a propósito: no acredita finalización ni aprendizaje.
create or replace view evaluacion.v_actividades_verificables as
  select r.user_id, 'alta_registral'::text as hito, r.completed_at as ocurrido_en
    from public.registration_steps r
   where r.status = 'completed' and r.completed_at is not null
  union all
  select a.user_id, 'emitio_comprobante'::text, a.created_at
    from public.activity_log a where a.action_type = 'EMIT_INVOICE'
  union all
  select a.user_id, 'habilito_punto_venta'::text, a.created_at
    from public.activity_log a where a.action_type = 'CREATE_POS'
  union all
  select a.user_id, 'constituyo_domicilio'::text, a.created_at
    from public.activity_log a where a.action_type = 'CONSTITUTE_FISCAL_ADDRESS'
  union all
  select v.user_id, 'presento_ddjj_iva'::text, v.submitted_at
    from public.vat_returns v where v.status <> 'draft' and v.submitted_at is not null
  union all
  select s.user_id, 'pago_obligacion'::text, s.paid_at
    from public.simulated_veps s where s.status = 'paid' and s.paid_at is not null;

-- ── El denominador ──────────────────────────────────────────────────────────
-- Cohorte elegible = integrantes activos en el período CON consentimiento.
-- No es "quienes ingresaron": esa confusión infla todos los indicadores.
create or replace function evaluacion.cohorte_elegible(p_cohorte uuid, p_periodo uuid)
returns table (integrante_id uuid, user_id uuid, seudonimo text)
language sql stable as $$
  select i.id, i.user_id, i.seudonimo
  from evaluacion.integrantes i
  join evaluacion.periodos p on p.id = p_periodo
  left join lateral (
    select c.otorgado from evaluacion.consentimientos c
    where c.integrante_id = i.id order by c.fecha desc limit 1
  ) cons on true
  where i.cohorte_id = p_cohorte
    and i.rol = 'estudiante'
    and i.alta_en <= p.hasta
    and (i.baja_en is null or i.baja_en >= p.desde)
    and coalesce(cons.otorgado, false) = true;
$$;

-- ── Motor ───────────────────────────────────────────────────────────────────
-- Una fila por indicador. Hoy sólo PED-01 es calculable; el resto devuelve el
-- motivo exacto por el que no lo es.
create or replace function evaluacion.calcular(p_cohorte uuid, p_periodo uuid)
returns table (
  codigo text, dimension text, meta numeric,
  numerador integer, denominador integer, porcentaje numeric,
  estado text, detalle text
)
language plpgsql stable as $$
declare
  v_desde date; v_hasta date;
  v_elegibles integer;
  v_num integer;
  v_criterio_umbral jsonb;
begin
  select p.desde, p.hasta into v_desde, v_hasta from evaluacion.periodos p where p.id = p_periodo;
  if v_desde is null then
    raise exception 'periodo % no existe', p_periodo;
  end if;

  select count(*) into v_elegibles from evaluacion.cohorte_elegible(p_cohorte, p_periodo);

  -- PED-01 · participación
  select count(distinct e.user_id) into v_num
  from evaluacion.cohorte_elegible(p_cohorte, p_periodo) e
  join evaluacion.v_actividades_verificables a on a.user_id = e.user_id
  where a.ocurrido_en::date between v_desde and v_hasta;

  codigo := 'PED-01'; dimension := 'pedagogica'; meta := 60;
  numerador := v_num; denominador := v_elegibles;
  if v_elegibles = 0 then
    porcentaje := null; estado := 'sin datos';
    detalle := 'La cohorte elegible esta vacia: falta cargar integrantes y consentimientos.';
  else
    porcentaje := round(v_num::numeric * 100 / v_elegibles, 2);
    estado := 'calculado';
    detalle := 'Personas unicas con al menos un hito verificable dentro del periodo.';
  end if;
  return next;

  -- PED-02 · desempeño según rúbrica
  select c.valor into v_criterio_umbral from evaluacion.criterios c where c.clave = 'umbral_desempeno_satisfactorio';
  select count(*) into v_num from public.student_assessments;
  codigo := 'PED-02'; dimension := 'pedagogica'; meta := 70;
  numerador := null; denominador := null; porcentaje := null;
  if coalesce(v_criterio_umbral->>'estado','pendiente') = 'pendiente' then
    estado := 'criterio pendiente';
    detalle := 'Falta que el responsable fije y valide el umbral de desempeno satisfactorio. Rubricas cargadas: ' || v_num || '.';
  elsif v_num = 0 then
    estado := 'sin datos'; detalle := 'No hay rubricas cargadas todavia.';
  else
    estado := 'sin datos'; detalle := 'Calculo pendiente de implementar una vez validado el umbral.';
  end if;
  return next;

  -- Indicadores que dependen de instrumentos todavía no implementados
  codigo := 'SOC-01'; dimension := 'social'; meta := 80;
  numerador := null; denominador := null; porcentaje := null;
  estado := 'sin datos'; detalle := 'Requiere la encuesta final a estudiantes, que todavia no esta implementada.'; return next;

  codigo := 'COM-01'; dimension := 'comunicativa'; meta := 80;
  numerador := null; denominador := null; porcentaje := null;
  estado := 'sin datos'; detalle := 'Requiere la encuesta final. Ademas los items sobre criterios de aprobacion y devoluciones son ampliacion propuesta, pendiente de definir la regla conjunta.'; return next;

  codigo := 'TEC-01'; dimension := 'tecnologica'; meta := 85;
  numerador := null; denominador := null; porcentaje := null;
  estado := 'sin datos'; detalle := 'Requiere la ficha de observacion docente. La autonomia no se deduce de la ausencia de pedidos de ayuda.'; return next;

  codigo := 'INS-01'; dimension := 'institucional'; meta := 70;
  numerador := null; denominador := null; porcentaje := null;
  estado := 'sin datos'; detalle := 'Requiere la entrevista a docentes con el item cerrado de viabilidad (ampliacion propuesta).'; return next;
end;
$$;
