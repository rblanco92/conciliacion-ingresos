-- ============================================================================
-- TUGRUERO · Motor de conciliación automática
-- ----------------------------------------------------------------------------
-- Se llama después de cargar un lote de movimientos del export bancario.
-- Estrategia (de más fuerte a más débil):
--   1) referencia_exacta : la referencia del ingreso == referencia del banco
--   2) monto_fecha        : mismo monto (en moneda original del banco) y misma
--                           fecha, cuando la referencia no casó
-- Los que casan -> estado 'conciliado' + fila en conciliaciones.
-- Los que NO casan -> estado 'excepcion' (para revisión de la admin).
-- Solo procesa ingresos en estado 'pendiente' (ya tienen monto_usd; los
-- 'pendiente_tasa' quedan fuera hasta que se cargue su tasa).
-- ============================================================================

create or replace function conciliar_lote(p_lote uuid)
returns table (
  conciliados int,
  excepciones int
) as $$
declare
  v_ingreso   record;
  v_mov_id    uuid;
  v_conc      int := 0;
  v_exc       int := 0;
begin
  -- Recorremos los ingresos pendientes
  for v_ingreso in
    select * from ingresos where estado = 'pendiente'
  loop
    v_mov_id := null;

    -- 1) Match por REFERENCIA EXACTA contra movimientos aún no conciliados
    select m.id into v_mov_id
    from movimientos_banco m
    where m.conciliado = false
      and m.referencia is not null
      and m.referencia = v_ingreso.referencia
    limit 1;

    if v_mov_id is not null then
      insert into conciliaciones (ingreso_id, movimiento_id, regla, confirmado_por)
      values (v_ingreso.id, v_mov_id, 'referencia_exacta', 'sistema');
      update movimientos_banco set conciliado = true where id = v_mov_id;
      update ingresos set estado = 'conciliado' where id = v_ingreso.id;
      v_conc := v_conc + 1;
      continue;
    end if;

    -- 2) Match por MONTO + FECHA (referencia falló)
    --    Comparamos el monto ORIGINAL del ingreso contra el ingreso del banco,
    --    en la misma fecha del pago. Tolerancia exacta en monto.
    select m.id into v_mov_id
    from movimientos_banco m
    where m.conciliado = false
      and m.fecha = v_ingreso.fecha_pago
      and m.ingreso = v_ingreso.monto_original
    limit 1;

    if v_mov_id is not null then
      insert into conciliaciones (ingreso_id, movimiento_id, regla, confirmado_por)
      values (v_ingreso.id, v_mov_id, 'monto_fecha', 'sistema');
      update movimientos_banco set conciliado = true where id = v_mov_id;
      update ingresos set estado = 'conciliado' where id = v_ingreso.id;
      v_conc := v_conc + 1;
      continue;
    end if;

    -- 3) No casó -> excepción
    update ingresos set estado = 'excepcion' where id = v_ingreso.id;
    v_exc := v_exc + 1;
  end loop;

  return query select v_conc, v_exc;
end;
$$ language plpgsql;

comment on function conciliar_lote is 'Cruza ingresos pendientes contra el export cargado. Devuelve conteos.';

-- ============================================================================
-- FUNCIÓN: conciliar_manual
-- La admin resuelve una excepción a mano: liga un ingreso a un movimiento
-- (o lo aprueba sin movimiento, o lo rechaza).
-- ============================================================================
create or replace function conciliar_manual(
  p_ingreso_id  uuid,
  p_movimiento_id uuid,
  p_usuario     text
) returns void as $$
begin
  insert into conciliaciones (ingreso_id, movimiento_id, regla, confirmado_por)
  values (p_ingreso_id, p_movimiento_id, 'manual', coalesce(p_usuario,'admin'))
  on conflict (ingreso_id) do update
    set movimiento_id = excluded.movimiento_id,
        regla = 'manual',
        confirmado_por = excluded.confirmado_por;

  if p_movimiento_id is not null then
    update movimientos_banco set conciliado = true where id = p_movimiento_id;
  end if;

  update ingresos set estado = 'conciliado' where id = p_ingreso_id;
end;
$$ language plpgsql;

comment on function conciliar_manual is 'Resuelve una excepción ligando ingreso a movimiento manualmente.';
