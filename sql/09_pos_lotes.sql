-- ============================================================================
-- TUGRUERO - Conciliacion de pagos por PUNTO DE VENTA (POS) por lotes
-- Ejecutar en el SQL Editor de Supabase.
-- ----------------------------------------------------------------------------
-- EL CASO:
--   El vendedor reporta cada transaccion POS por separado (una por cotizacion),
--   pero el BANCO no muestra las transacciones individuales: solo muestra el
--   deposito CONSOLIDADO del lote. Ej: 3 ventas de 200+200+100 aparecen en el
--   banco como UN movimiento de 500.
--   Ademas los POS caen en el banco DIAS DESPUES, no el mismo dia.
--
-- DECISIONES:
--   1) La referencia de un POS es el NUMERO DE LOTE, que se repite entre
--      varias transacciones -> los POS quedan EXENTOS del bloqueo de duplicados.
--   2) El motor automatico IGNORA los POS: su monto individual nunca va a
--      coincidir con el movimiento consolidado del banco, y dejarlo intentar
--      podria casarlos MAL con otro movimiento del mismo monto (riesgo real
--      por la ventana de +/- 3 dias). Solo Maria los concilia a mano.
--   3) Maria selecciona VARIOS ingresos POS contra UN movimiento del banco.
--      La suma debe cuadrar EXACTO con el monto del movimiento.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Rehacer el bloqueo de duplicados EXIMIENDO a los POS
-- ----------------------------------------------------------------------------
drop index if exists uq_ingresos_referencia;

create unique index if not exists uq_ingresos_referencia
  on ingresos (norm_ref(referencia))
  where estado <> 'rechazado' and banco <> 'pos';

comment on index uq_ingresos_referencia is 'Impide reportar dos veces el mismo pago. Los POS se eximen: comparten el numero de lote.';

-- ----------------------------------------------------------------------------
-- 2) Permitir varios ingresos por movimiento (conciliacion de lotes)
--    La tabla conciliaciones tenia unique(ingreso_id), que esta BIEN: cada
--    ingreso concilia una sola vez. Lo que hay que permitir es que varios
--    ingresos apunten al MISMO movimiento_id (relacion muchos-a-uno).
--    Eso ya lo permite el esquema; no hay unique sobre movimiento_id.
-- ----------------------------------------------------------------------------

-- Nueva regla de match para trazabilidad
do $$ begin
  alter type regla_match_t add value if not exists 'lote_pos';
exception when others then null; end $$;

-- ----------------------------------------------------------------------------
-- 3) Motor: IGNORAR los ingresos POS en la conciliacion automatica
-- ----------------------------------------------------------------------------
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
  v_dias      int := 3;
begin
  for v_ingreso in
    select * from ingresos
     where estado in ('pendiente', 'excepcion')
       and banco <> 'pos'          -- <<< los POS los concilia Maria a mano
  loop
    v_mov := null;

    -- 1) Match por REFERENCIA normalizada
    select m.* into v_mov
    from movimientos_banco m
    where m.conciliado = false
      and m.referencia is not null
      and norm_ref(m.referencia) = norm_ref(v_ingreso.referencia)
    limit 1;

    if v_mov.id is not null then
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

      insert into conciliaciones (ingreso_id, movimiento_id, regla, confirmado_por)
      values (v_ingreso.id, v_mov.id, 'referencia_exacta', 'sistema')
      on conflict (ingreso_id) do update
        set movimiento_id = excluded.movimiento_id,
            regla = excluded.regla,
            confirmado_por = excluded.confirmado_por;
      update movimientos_banco set conciliado = true where id = v_mov.id;
      update ingresos set estado = 'conciliado', motivo_excepcion = null
       where id = v_ingreso.id;
      v_conc := v_conc + 1;
      continue;
    end if;

    -- 2) Match por MONTO + FECHA con tolerancia
    select m.* into v_mov
    from movimientos_banco m
    where m.conciliado = false
      and m.ingreso = v_ingreso.monto_original
      and m.fecha between (v_ingreso.fecha_pago - v_dias) and (v_ingreso.fecha_pago + v_dias)
    order by abs(m.fecha - v_ingreso.fecha_pago)
    limit 1;

    if v_mov.id is not null then
      insert into conciliaciones (ingreso_id, movimiento_id, regla, confirmado_por)
      values (v_ingreso.id, v_mov.id, 'monto_fecha', 'sistema')
      on conflict (ingreso_id) do update
        set movimiento_id = excluded.movimiento_id,
            regla = excluded.regla,
            confirmado_por = excluded.confirmado_por;
      update movimientos_banco set conciliado = true where id = v_mov.id;
      update ingresos set estado = 'conciliado', motivo_excepcion = null
       where id = v_ingreso.id;
      v_conc := v_conc + 1;
      continue;
    end if;

    update ingresos
       set estado = 'excepcion',
           motivo_excepcion = 'No se encontro el pago en el banco (revisar referencia, o el movimiento aun no llega).'
     where id = v_ingreso.id;
    v_exc := v_exc + 1;
  end loop;

  -- Marcar los POS pendientes con su motivo (esperan a Maria)
  update ingresos
     set estado = 'excepcion',
         motivo_excepcion = 'Pago por punto de venta: asociar al lote del banco manualmente.'
   where banco = 'pos'
     and estado = 'pendiente';

  return query select v_conc, v_exc;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- 4) Conciliar un LOTE POS: varios ingresos contra UN movimiento del banco.
--    Valida que la suma cuadre EXACTO con el monto del movimiento.
-- ----------------------------------------------------------------------------
-- Limpiar versiones previas de la funcion (evita ambiguedad si se corrio antes
-- con los parametros en otro orden).
drop function if exists conciliar_lote_pos(uuid[], uuid, text);
drop function if exists conciliar_lote_pos(uuid, uuid[], text);
drop function if exists conciliar_pos_lote(uuid[], uuid, text);

create or replace function conciliar_lote_pos(
  p_ingreso_ids  uuid[],
  p_movimiento_id uuid,
  p_usuario      text
) returns table (
  ok        boolean,
  mensaje   text,
  suma      numeric,
  monto_mov numeric
) as $$
declare
  v_suma  numeric;
  v_mov   record;
  v_id    uuid;
begin
  select * into v_mov from movimientos_banco where id = p_movimiento_id;
  if v_mov.id is null then
    return query select false, 'El movimiento del banco no existe.', 0::numeric, 0::numeric;
    return;
  end if;

  if v_mov.conciliado then
    return query select false, 'Ese movimiento del banco ya fue conciliado.', 0::numeric, v_mov.ingreso;
    return;
  end if;

  select coalesce(sum(monto_original), 0) into v_suma
  from ingresos where id = any(p_ingreso_ids);

  -- La suma debe cuadrar EXACTO con el lote del banco
  if v_suma is distinct from v_mov.ingreso then
    return query select
      false,
      format('La suma de los ingresos (%s) no cuadra con el lote del banco (%s).',
             to_char(v_suma, 'FM999999999.00'),
             to_char(v_mov.ingreso, 'FM999999999.00')),
      v_suma,
      v_mov.ingreso;
    return;
  end if;

  -- Conciliar todos contra el mismo movimiento
  foreach v_id in array p_ingreso_ids loop
    insert into conciliaciones (ingreso_id, movimiento_id, regla, confirmado_por)
    values (v_id, p_movimiento_id, 'lote_pos', coalesce(p_usuario, 'admin'))
    on conflict (ingreso_id) do update
      set movimiento_id = excluded.movimiento_id,
          regla = 'lote_pos',
          confirmado_por = excluded.confirmado_por;
    update ingresos
       set estado = 'conciliado', motivo_excepcion = null
     where id = v_id;
  end loop;

  update movimientos_banco set conciliado = true where id = p_movimiento_id;

  return query select true, 'Lote conciliado correctamente.', v_suma, v_mov.ingreso;
end;
$$ language plpgsql;

comment on function conciliar_lote_pos is 'Asocia varios ingresos POS a un movimiento de lote del banco. Exige suma exacta.';
