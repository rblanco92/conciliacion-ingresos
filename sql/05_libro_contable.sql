-- ============================================================================
-- TUGRUERO - Conciliacion - Vista del Libro Contable (formato hoja admin)
-- Ejecutar en el SQL Editor de Supabase (reemplaza la vista anterior).
-- ----------------------------------------------------------------------------
-- Genera las filas listas para copiar y pegar en la hoja "BNC TALLER (PROV)".
-- Orden de columnas EXACTO al de la hoja:
--   Fecha | Referencia | Descripcion Banco | Ingreso | Egreso | Saldo |
--   Tasa | Valor USD | Tipo de tx | Partida | Subpartida | Codigo |
--   Descripcion | Pago movil
--
-- Decisiones aplicadas:
--   * Saldo: VACIO (la hoja lo calcula con su formula).
--   * Pago movil (ultima col): VACIO.
--   * Solo trae ingresos CONCILIADOS.
--   * "Ingreso" = monto ORIGINAL (Bs si VES, $ si USD). "Valor USD" = equivalente.
-- ============================================================================

drop view if exists libro_contable;
create view libro_contable as
select
  i.fecha_pago                                   as fecha,
  i.referencia                                   as referencia,
  i.detalle                                      as descripcion_banco,
  i.monto_original                               as ingreso,
  0::numeric                                     as egreso,
  null::numeric                                  as saldo,
  i.tasa_aplicada                                as tasa_de_cambio,
  i.monto_usd                                    as valor_usd,
  'INGRESO'::text                                as tipo_de_tx,
  coalesce(i.partida, 'TALLER')                  as partida,
  coalesce(i.subpartida, 'INGRESO REPUESTOS')    as subpartida,
  coalesce(i.codigo_contable, '10.1.3')          as codigo,
  i.cotizacion || ' ' || i.cliente_nombre        as descripcion,
  null::text                                     as pago_movil,
  i.id                                           as ingreso_id
from ingresos i
where i.estado = 'conciliado'
order by i.fecha_pago, i.referencia;

comment on view libro_contable is 'Filas de ingresos conciliados en el formato de la hoja BNC TALLER.';

grant select on libro_contable to authenticated, service_role;
