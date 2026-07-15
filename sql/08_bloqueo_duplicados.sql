-- ============================================================================
-- TUGRUERO - Bloqueo de referencias duplicadas
-- Ejecutar en el SQL Editor de Supabase.
-- ----------------------------------------------------------------------------
-- Impide que se reporte dos veces el mismo pago.
--
-- Por que sobre norm_ref() y no sobre la referencia tal cual:
--   Si el indice fuera sobre el texto crudo, "000920104195" y "920104195"
--   pasarian como distintas siendo EL MISMO pago. Normalizando (sin ceros a
--   la izquierda ni espacios) se bloquean ambas formas.
--
-- Los ingresos RECHAZADOS se excluyen del bloqueo: si un pago se rechazo por
-- error, debe poder volver a reportarse con la misma referencia.
-- ============================================================================

-- 1) Revisar si YA existen duplicados antes de crear el indice.
--    (Si esta consulta devuelve filas, hay que resolverlos primero; el indice
--     no se puede crear con duplicados existentes.)
select
  norm_ref(referencia) as referencia_normalizada,
  count(*)             as veces,
  string_agg(id::text, ', ') as ids
from ingresos
where estado <> 'rechazado'
group by norm_ref(referencia)
having count(*) > 1;

-- 2) Indice unico: una referencia (normalizada) solo puede existir una vez
--    entre los ingresos no rechazados.
create unique index if not exists uq_ingresos_referencia
  on ingresos (norm_ref(referencia))
  where estado <> 'rechazado';

comment on index uq_ingresos_referencia is 'Impide reportar dos veces el mismo pago (referencia normalizada).';
