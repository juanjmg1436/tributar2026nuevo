# Seguimiento y Evaluación GEST-AR

Módulo para recolectar y analizar la evidencia del programa piloto. Vive en el
esquema `evaluacion` de la base de TRIBUT.AR, **separado de `public`**.

Esa separación no es estética. En `public` están los datos **ficticios** de las
empresas simuladas: facturas, asientos, DDJJ. Acá están datos **educativos
reales sobre personas**. Mezclarlos haría imposible dar acceso a unos sin dar
acceso a los otros.

## Estado al 12 de octubre de 2026

| Indicador | Meta | Estado |
|---|---|---|
| PED-01 · participación | ≥60 % | **calculable** |
| PED-02 · desempeño según rúbrica | ≥70 % | criterio pendiente |
| SOC-01 · utilidad percibida | ≥80 % | sin datos |
| COM-01 · claridad | ≥80 % | sin datos |
| TEC-01 · autonomía | ≥85 % | sin datos |
| INS-01 · viabilidad institucional | ≥70 % | sin datos |

**Ninguna meta es publicable todavía.** Una es calculable; el resto espera
instrumentos que aún no existen.

## La regla que gobierna el motor

Ante la falta de datos o de un criterio, se devuelve un estado honesto —
`sin datos`, `cobertura insuficiente`, `criterio pendiente` — y **nunca un cero**.
Ausencia de evidencia no es incumplimiento. Esto está escrito en el código, no
sólo en la documentación: `evaluacion.calcular()` no puede devolver un
porcentaje para un indicador sin fuente.

## Tres criterios que el trabajo final NO define

Están en `evaluacion.criterios` con estado `pendiente`. Mientras lo estén, los
indicadores que dependen de ellos se informan como *criterio pendiente*:

1. `umbral_desempeno_satisfactorio` — qué resultado de rúbrica cuenta como satisfactorio.
2. `resultado_por_participante_multiples_actividades` — cómo se resuelve el resultado de alguien con varias actividades evaluadas.
3. `rango_parcialmente_cumplida` — el rango numérico de "parcialmente cumplida".

**No los inventé.** Los fija y valida el responsable antes de cualquier
clasificación oficial, y queda registrado quién y cuándo.

## El denominador

`evaluacion.cohorte_elegible()` devuelve los integrantes activos en el período
**con consentimiento otorgado**. No es "quienes ingresaron a la app": esa
confusión infla todos los indicadores. Alguien puede estar en la cohorte sin
haber creado cuenta — y eso es justamente lo que mide el indicador de
participación.

Sin consentimiento, la persona usa las aplicaciones igual; sus datos no entran
en los informes.

## Qué cuenta como actividad completada

`evaluacion.v_actividades_verificables` sólo incluye hitos comprobables: alta
registral completa, comprobante emitido, punto de venta habilitado, domicilio
fiscal constituido, DDJJ presentada, obligación pagada.

Abrir un enlace o descargar un documento **no figura ahí a propósito**.

## Cómo se usa

```sql
select * from evaluacion.calcular('<cohorte_id>', '<periodo_id>');
```

Cohortes y períodos marcados `es_demo = true` son de prueba y deben excluirse de
todo informe real. Para los informes, consumir `evaluacion.v_cohortes_reales`.

## Qué falta

Encuestas e instrumentos (tablas y formularios), rúbricas cargadas —la tabla
`public.student_assessments` ya existe con la forma correcta y está vacía—,
ficha de observación docente, entrevistas, panel, exportación y sección pública.

Las bases de PyMEZ 360 y Sueldos 360 todavía no están integradas: la captura de
actividad cubre sólo TRIBUT.AR.
