-- ============================================================================
-- TUGRUERO · Conciliación · Autenticación y Roles
-- Ejecutar DESPUÉS de 01, 02 y ANTES (o en reemplazo) de las políticas
-- abiertas del 03. Este script ata la seguridad a los roles reales.
-- ----------------------------------------------------------------------------
-- Roles:
--   'vendedor' : solo puede crear ingresos (formulario).
--   'admin'    : puede todo (conciliar, tasas, ver/editar ingresos).
-- El rol vive en la tabla 'perfiles', ligada 1:1 a auth.users.
-- ============================================================================

-- Tabla de perfiles (extiende auth.users con rol y nombre)
create table if not exists perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  rol        text not null default 'vendedor' check (rol in ('vendedor','admin')),
  creado_en  timestamptz not null default now()
);

comment on table perfiles is 'Rol y datos de cada usuario. Ligado a auth.users.';

-- Al crear un usuario en Auth, se crea su perfil automáticamente (rol vendedor
-- por defecto; luego un admin lo puede promover).
create or replace function crear_perfil()
returns trigger as $$
begin
  insert into perfiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', new.email),
    coalesce(new.raw_user_meta_data->>'rol', 'vendedor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_crear_perfil on auth.users;
create trigger trg_crear_perfil
  after insert on auth.users
  for each row execute function crear_perfil();

-- Helper: ¿el usuario actual es admin?
create or replace function es_admin()
returns boolean as $$
  select exists (
    select 1 from perfiles
    where id = auth.uid() and rol = 'admin'
  );
$$ language sql security definer stable;

-- ============================================================================
-- POLÍTICAS RLS POR ROL
-- Reemplazan las políticas abiertas del piloto (03_rls_storage.sql).
-- ============================================================================

-- Asegurar RLS habilitado
alter table ingresos           enable row level security;
alter table movimientos_banco  enable row level security;
alter table conciliaciones     enable row level security;
alter table tasas_cambio       enable row level security;
alter table perfiles           enable row level security;

do $$
begin
  -- Limpiar políticas abiertas anteriores si existen
  drop policy if exists p_ingresos_all on ingresos;
  drop policy if exists p_mov_all on movimientos_banco;
  drop policy if exists p_conc_all on conciliaciones;
  drop policy if exists p_tasas_all on tasas_cambio;

  -- PERFILES: cada quien ve su perfil; admin ve todos
  drop policy if exists p_perfiles_select on perfiles;
  create policy p_perfiles_select on perfiles for select
    using (id = auth.uid() or es_admin());
  drop policy if exists p_perfiles_admin on perfiles;
  create policy p_perfiles_admin on perfiles for all
    using (es_admin()) with check (es_admin());

  -- INGRESOS
  --  * vendedor y admin autenticados pueden CREAR ingresos
  drop policy if exists p_ingresos_insert on ingresos;
  create policy p_ingresos_insert on ingresos for insert
    with check (auth.uid() is not null);
  --  * ver: admin ve todo; vendedor ve solo lo que él cargó
  drop policy if exists p_ingresos_select on ingresos;
  create policy p_ingresos_select on ingresos for select
    using (es_admin() or vendedor = auth.uid()::text);
  --  * actualizar (conciliar, cambiar estado): solo admin
  drop policy if exists p_ingresos_update on ingresos;
  create policy p_ingresos_update on ingresos for update
    using (es_admin()) with check (es_admin());

  -- MOVIMIENTOS_BANCO: solo admin
  drop policy if exists p_mov_admin on movimientos_banco;
  create policy p_mov_admin on movimientos_banco for all
    using (es_admin()) with check (es_admin());

  -- CONCILIACIONES: solo admin
  drop policy if exists p_conc_admin on conciliaciones;
  create policy p_conc_admin on conciliaciones for all
    using (es_admin()) with check (es_admin());

  -- TASAS: leer cualquiera autenticado; escribir solo admin
  drop policy if exists p_tasas_select on tasas_cambio;
  create policy p_tasas_select on tasas_cambio for select
    using (auth.uid() is not null);
  drop policy if exists p_tasas_write on tasas_cambio;
  create policy p_tasas_write on tasas_cambio for all
    using (es_admin()) with check (es_admin());
end $$;

-- ============================================================================
-- NOTA sobre las rutas API (server):
-- Las rutas /api/* usan la SERVICE ROLE KEY, que SALTA RLS por diseño.
-- La protección de esas rutas se hace en el middleware + verificación de rol
-- en el servidor (ver src/lib/auth.ts). RLS es la segunda barrera para el
-- acceso directo desde el cliente.
-- ============================================================================
