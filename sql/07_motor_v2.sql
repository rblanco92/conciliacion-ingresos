-- ============================================================================
-- TUGRUERO - Motor de conciliacion v2
-- Ejecutar en el SQL Editor de Supabase.
-- ----------------------------------------------------------------------------
-- Mejoras sobre la version anterior:
--  1) NORMALIZA REFERENCIAS: ignora ceros a la izquierda al comparar.
--     El vendedor teclea "000920104195" y el banco trae "920104195" -> casan.
--  2) TOLERANCIA DE FECHA: el match por monto acepta +/- 3 dias, para cuando
--     el vendedor reporta hoy un pago que cayo ayer.
--  3) VALIDA EL MONTO al conciliar por referencia: si la referencia casa pero
--     el monto NO coincide con el banco, va a excepcion (antes se conciliaba
--     igual y el monto errado llegaba al libro contable).
--  4) MOTIVO DE EXCEPCION: guarda por que no concilio, para que la admin sepa
--     que revisar.
-- ============================================================================

-- Campo para explicar por que quedo en excepcion
alter table ingresos
  add column if not exists motivo_excepcion text;

comment on column ingresos.motivo_excepcion is 'Por que no concilio automaticamente (para la cola de revision).';

-- Normaliza una referencia para comparar: sin espacios y sin ceros a la izquierda
create or replace function norm_ref(t text)
returns text as $$
  select nullif(regexp_replace(ltrim(coalesce(t,''), '0 '), '\s', '', 'g'), '');
$$ language sql immutable;

comment on function norm_ref is 'Quita espacios y ceros a la izquierda para comparar referencias.';

-- ============================================================================
-- Motor principal
-- ============================================================================
create or replace function conciliar_lote(p_lote uuid)
returns table (
  conciliados int,
  excepciones int
) as $$
declare
  v_ingreso   record;
  v_mov       record;
  v_conc      int := 0;
  v_exc       int := 0;
  v_dias      int := 3;   -- ventana de tolerancia para el match por monto
begin
  for v_ingreso in
    select * from ingresos where estado in ('pendiente', 'excepcion')
  loop
    v_mov := null;

    -- ---------------------------------------------------------------
    -- 1) Match por REFERENCIA (normalizada: ignora ceros a la izquierda)
    -- ---------------------------------------------------------------
    select m.* into v_mov
    from movimientos_banco m
    where m.conciliado = false
      and m.referencia is not null
      and norm_ref(m.referencia) = norm_ref(v_ingreso.referencia)
    limit 1;

    if v_mov.id is not null then
      -- La referencia casa. Ahora VALIDAR EL MONTO contra el banco.
      if v_mov.ingreso is distinct from v_ingreso.monto_original then
        update ingresos
           set estado = 'excepcion',
               motivo_excepcion = format(
                 'Referencia coincide pero el monto no: reportado %s, banco %s',
                 to_char(v_ingreso.monto_original, 'FM999999999.00'),
                 to_char(v_mov.ingreso, 'FM999999999.00')
               )
         where id = v_ingreso.id;
        v_exc := v_exc + 1;
        continue;
      end if;

      -- Referencia y monto OK -> conciliar
      insert into conciliaciones (ingreso_id, movimiento_id, regla, confirmado_por)
      values (v_ingreso.id, v_mov.id, 'referencia_exacta', 'sistema')
      on conflict (ingreso_id) do update
        set movimiento_id = excluded.movimiento_id,
            regla = excluded.regla,
            confirmado_por = excluded.confirmado_por;
      update movimientos_banco set conciliado = true where id = v_mov.id;
      update ingresos
         set estado = 'conciliado', motivo_excepcion = null
       where id = v_ingreso.id;
      v_conc := v_conc + 1;
      continue;
    end if;

    -- ---------------------------------------------------------------
    -- 2) Match por MONTO + FECHA con tolerancia de +/- v_dias
    -- ---------------------------------------------------------------
    select m.* into v_mov
    from movimientos_banco m
    where m.conciliado = false
      and m.ingreso = v_ingreso.monto_original
      and m.fecha between (v_ingreso.fecha_pago - v_dias) and (v_ingreso.fecha_pago + v_dias)
    order by abs(m.fecha - v_ingreso.fecha_pago)   -- el mas cercano en fecha
    limit 1;

    if v_mov.id is not null then
      insert into conciliaciones (ingreso_id, movimiento_id, regla, confirmado_por)
      values (v_ingreso.id, v_mov.id, 'monto_fecha', 'sistema')
      on conflict (ingreso_id) do update
        set movimiento_id = excluded.movimiento_id,
            regla = excluded.regla,
            confirmado_por = excluded.confirmado_por;
      update movimientos_banco set conciliado = true where id = v_mov.id;
      update ingresos
         set estado = 'conciliado', motivo_excepcion = null
       where id = v_ingreso.id;
      v_conc := v_conc + 1;
      continue;
    end if;

    -- ---------------------------------------------------------------
    -- 3) No casó -> excepcion
    -- ---------------------------------------------------------------
    update ingresos
       set estado = 'excepcion',
           motivo_excepcion = 'No se encontro el pago en el banco (revisar referencia, o el movimiento aun no llega).'
     where id = v_ingreso.id;
    v_exc := v_exc + 1;
  end loop;

  return query select v_conc, v_exc;
end;
$$ language plpgsql;

comment on function conciliar_lote is 'Cruza ingresos contra el export. Ref normalizada, tolerancia de fecha, valida monto.';
