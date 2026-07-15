-- ============================================================================
-- TUGRUERO - Conciliacion - Campo "facturado en TuuLapp"
-- Ejecutar en el SQL Editor de Supabase.
-- ----------------------------------------------------------------------------
-- Por que un campo SEPARADO y no un estado mas:
--   'estado'    responde: el dinero entro al banco? (pendiente/conciliado/...)
--   'facturado' responde: ya se emitio la factura en TuuLapp? (si/no)
-- Son dos dimensiones distintas. Un ingreso conciliado puede estar facturado
-- o no. Manteniendolos separados no se pierde informacion y permite filtrar
-- "conciliados que faltan por facturar".
--
-- Regla de negocio: solo se factura lo CONCILIADO (si no entro la plata, no
-- se factura). Se aplica con un CHECK a nivel de base, no solo en la app.
-- ============================================================================

alter table ingresos
  add column if not exists facturado boolean not null default false;

comment on column ingresos.facturado is 'Marcado por admin cuando ya se facturo en TuuLapp. Solo aplica a conciliados.';

-- Indice para el filtro "por facturar" (conciliados sin factura)
create index if not exists idx_ingresos_facturado
  on ingresos(facturado)
  where facturado = false;

-- Regla: no se puede marcar facturado si el ingreso no esta conciliado.
-- Se usa un trigger (en vez de CHECK) para dar un mensaje claro.
create or replace function validar_facturado()
returns trigger as $$
begin
  if new.facturado = true and new.estado <> 'conciliado' then
    raise exception 'Solo se puede marcar como facturado un ingreso conciliado (estado actual: %)', new.estado;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validar_facturado on ingresos;
create trigger trg_validar_facturado
  before insert or update on ingresos
  for each row execute function validar_facturado();
