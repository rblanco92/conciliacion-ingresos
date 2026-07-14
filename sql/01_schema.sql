-- ============================================================================
-- TUGRUERO · Sistema de Conciliación de Ingresos (Taller)
-- Esquema completo · Supabase / PostgreSQL
-- ----------------------------------------------------------------------------
-- Decisiones de negocio aplicadas:
--  * Multimoneda: ingresos en USD o VES (bolívares).
--  * Conversión VES->USD con tasa OFICIAL BCV, fijada por la FECHA DEL PAGO.
--  * La tasa la teclea la admin una vez al día (tabla tasas_cambio).
--  * Si un pago en VES no tiene tasa cargada para su fecha => estado
--    'pendiente_tasa' (BLOQUEADO). Solo pasa a 'pendiente' cuando hay tasa.
--  * Conciliación contra export bancario por: referencia > monto+fecha.
--  * La referencia la TECLEA el vendedor (no OCR).
-- ============================================================================

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

do $$ begin
  create type moneda_t as enum ('USD', 'VES');
exception when duplicate_object then null; end $$;

do $$ begin
  -- pendiente_tasa : ingreso en VES sin tasa BCV del día del pago (BLOQUEADO)
  -- pendiente      : listo para conciliar (ya tiene monto_usd calculado)
  -- conciliado     : casó contra un movimiento bancario
  -- excepcion      : no casó automáticamente, requiere revisión de la admin
  -- rechazado      : la admin lo descartó (pago no válido / no cayó)
  create type estado_ingreso_t as enum
    ('pendiente_tasa', 'pendiente', 'conciliado', 'excepcion', 'rechazado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_tx_t as enum ('INGRESO', 'EGRESO');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Regla con la que se logró la conciliación (para trazabilidad)
  create type regla_match_t as enum
    ('referencia_exacta', 'monto_fecha', 'manual');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- TABLA: tasas_cambio
-- Una fila por día. Fuente única de verdad para convertir VES->USD.
-- La admin la teclea (tasa oficial BCV).
-- ============================================================================
create table if not exists tasas_cambio (
  fecha        date primary key,
  tasa_bcv     numeric(18,4) not null check (tasa_bcv > 0),
  creado_por   text,
  creado_en    timestamptz not null default now()
);

comment on table tasas_cambio is 'Tasa oficial BCV Bs/USD por día. La teclea la admin.';
comment on column tasas_cambio.tasa_bcv is 'Bolívares por 1 USD (ej. 554.4300).';

-- ============================================================================
-- TABLA: ingresos
-- Lo que reporta el vendedor por el formulario.
-- ============================================================================
create table if not exists ingresos (
  id                uuid primary key default gen_random_uuid(),

  -- Captura del vendedor
  fecha_pago        date not null,                 -- día en que cayó el pago
  referencia        text not null,                 -- tecleada por el vendedor
  monto_original    numeric(18,2) not null check (monto_original > 0),
  moneda            moneda_t not null,
  detalle           text not null,                 -- qué compró el cliente
  cliente_nombre    text not null,
  cliente_cedula    text not null,
  cotizacion        text not null,                 -- N° de cotización (COT-xxxx)
  canal             text not null,                 -- tienda, masivos, mercadolibre, taller
  banco             text not null,                 -- banesco, mercantil, zelle, pago_movil...
  comprobante_url   text,                          -- respaldo visual (Storage)
  vendedor          text,                          -- quién reportó

  -- Conversión (se llena por trigger según fecha_pago)
  tasa_aplicada     numeric(18,4),                 -- tasa BCV usada (null si USD o sin tasa)
  monto_usd         numeric(18,2),                 -- congelado; null si pendiente_tasa

  -- Estado del flujo
  estado            estado_ingreso_t not null default 'pendiente',

  -- Clasificación contable (para generar el libro; puede pre-llenarse por canal)
  partida           text,                          -- ej. TALLER
  subpartida        text,                          -- ej. INGRESO REPUESTOS
  codigo_contable   text,                          -- ej. 10.1.3

  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

comment on table ingresos is 'Ingresos reportados por vendedores. La referencia es el eje del cruce.';
comment on column ingresos.monto_usd is 'USD congelado al conciliar. Null mientras esté pendiente_tasa.';

-- Índices para búsqueda y conciliación
create index if not exists idx_ingresos_estado      on ingresos(estado);
create index if not exists idx_ingresos_referencia  on ingresos(referencia);
create index if not exists idx_ingresos_fecha_pago  on ingresos(fecha_pago);
create index if not exists idx_ingresos_cotizacion  on ingresos(cotizacion);

-- ============================================================================
-- TABLA: movimientos_banco
-- El export crudo que sube la admin. Cada fila del Excel entra aquí.
-- ============================================================================
create table if not exists movimientos_banco (
  id                uuid primary key default gen_random_uuid(),
  banco             text not null,
  fecha             date not null,
  referencia        text,
  descripcion       text,
  ingreso           numeric(18,2) default 0,       -- monto entrante (moneda del banco)
  egreso            numeric(18,2) default 0,
  saldo             numeric(18,2),
  tipo_tx           tipo_tx_t,
  conciliado        boolean not null default false,-- ya casó con un ingreso
  lote_carga        uuid,                          -- agrupa una subida de export
  creado_en         timestamptz not null default now()
);

create index if not exists idx_mov_referencia on movimientos_banco(referencia);
create index if not exists idx_mov_fecha      on movimientos_banco(fecha);
create index if not exists idx_mov_conciliado on movimientos_banco(conciliado);

comment on table movimientos_banco is 'Movimientos del estado de cuenta subido por la admin (verdad bancaria).';

-- ============================================================================
-- TABLA: conciliaciones
-- Vínculo ingreso <-> movimiento. Trazabilidad total.
-- ============================================================================
create table if not exists conciliaciones (
  id             uuid primary key default gen_random_uuid(),
  ingreso_id     uuid not null references ingresos(id) on delete cascade,
  movimiento_id  uuid references movimientos_banco(id) on delete set null,
  regla          regla_match_t not null,
  confirmado_por text,                             -- 'sistema' o nombre de la admin
  creado_en      timestamptz not null default now(),
  unique (ingreso_id)                              -- un ingreso concilia una sola vez
);

comment on table conciliaciones is 'Une cada ingreso con su movimiento bancario real.';

-- ============================================================================
-- FUNCIÓN + TRIGGER: aplicar conversión de moneda al insertar/actualizar
-- Regla:
--   * Si moneda = USD  -> monto_usd = monto_original, estado = 'pendiente'
--   * Si moneda = VES:
--       - busca tasa de fecha_pago en tasas_cambio
--       - si existe -> tasa_aplicada, monto_usd, estado 'pendiente'
--       - si NO existe -> estado 'pendiente_tasa' (BLOQUEADO), monto_usd null
-- Solo recalcula si el ingreso aún no fue conciliado/rechazado.
-- ============================================================================
create or replace function aplicar_conversion()
returns trigger as $$
declare
  v_tasa numeric(18,4);
begin
  -- No tocar ingresos ya resueltos
  if new.estado in ('conciliado', 'rechazado') then
    return new;
  end if;

  if new.moneda = 'USD' then
    new.tasa_aplicada := null;
    new.monto_usd     := new.monto_original;
    if new.estado = 'pendiente_tasa' then
      new.estado := 'pendiente';
    end if;
  else
    -- VES: buscar tasa del día del pago
    select tasa_bcv into v_tasa
    from tasas_cambio
    where fecha = new.fecha_pago;

    if v_tasa is null then
      new.tasa_aplicada := null;
      new.monto_usd     := null;
      new.estado        := 'pendiente_tasa';   -- BLOQUEADO
    else
      new.tasa_aplicada := v_tasa;
      new.monto_usd     := round(new.monto_original / v_tasa, 2);
      if new.estado = 'pendiente_tasa' then
        new.estado := 'pendiente';
      end if;
    end if;
  end if;

  new.actualizado_en := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_conversion on ingresos;
create trigger trg_conversion
  before insert or update on ingresos
  for each row execute function aplicar_conversion();

-- ============================================================================
-- FUNCIÓN: desbloquear ingresos al cargar una tasa nueva
-- Cuando la admin teclea la tasa de un día, todos los ingresos en VES de esa
-- fecha que estaban 'pendiente_tasa' se recalculan y pasan a 'pendiente'.
-- ============================================================================
create or replace function desbloquear_por_tasa()
returns trigger as $$
begin
  update ingresos
     set fecha_pago = fecha_pago   -- fuerza el trigger de conversión
   where moneda = 'VES'
     and fecha_pago = new.fecha
     and estado = 'pendiente_tasa';
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_desbloquear on tasas_cambio;
create trigger trg_desbloquear
  after insert or update on tasas_cambio
  for each row execute function desbloquear_por_tasa();

-- ============================================================================
-- VISTA: libro_contable
-- La SALIDA que la herramienta genera (formato del archivo de la admin).
-- Une ingresos conciliados con su clasificación. Ella lo descarga, no lo teclea.
-- ============================================================================
create or replace view libro_contable as
select
  i.fecha_pago                                   as fecha,
  i.referencia,
  i.banco || ' - ' || i.detalle                  as descripcion_banco,
  case when i.moneda = 'VES' then i.monto_original else i.monto_original end as ingreso_bs_o_usd,
  0::numeric                                      as egreso,
  i.tasa_aplicada                                as tasa,
  i.monto_usd                                    as valor_usd,
  'INGRESO'::text                                as tipo_tx,
  coalesce(i.partida, 'TALLER')                  as partida,
  coalesce(i.subpartida, 'INGRESO REPUESTOS')    as subpartida,
  coalesce(i.codigo_contable, '10.1.3')          as codigo,
  i.cotizacion || ' ' || i.cliente_nombre        as descripcion
from ingresos i
where i.estado = 'conciliado'
order by i.fecha_pago, i.referencia;

comment on view libro_contable is 'Salida lista para copiar/descargar en el formato del libro de la admin.';
