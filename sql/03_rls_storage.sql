-- ============================================================================
-- TUGRUERO · Conciliación · RLS y Storage
-- Ejecutar DESPUÉS de 01_schema.sql y 02_conciliacion.sql
-- ----------------------------------------------------------------------------
-- NOTA sobre seguridad:
-- Este MVP usa políticas abiertas para arrancar rápido en el piloto. Antes de
-- exponerlo a producción con más usuarios, conviene atar las políticas a
-- auth.uid() y roles (ej. reutilizar el rol 'administracion' del CRM).
-- ============================================================================

-- Habilitar RLS
alter table ingresos           enable row level security;
alter table movimientos_banco  enable row level security;
alter table conciliaciones     enable row level security;
alter table tasas_cambio       enable row level security;

-- Políticas abiertas para el piloto (anon puede leer/escribir).
-- Reemplazar por políticas por rol antes de escalar.
do $$
begin
  -- ingresos
  drop policy if exists p_ingresos_all on ingresos;
  create policy p_ingresos_all on ingresos for all using (true) with check (true);
  -- movimientos_banco
  drop policy if exists p_mov_all on movimientos_banco;
  create policy p_mov_all on movimientos_banco for all using (true) with check (true);
  -- conciliaciones
  drop policy if exists p_conc_all on conciliaciones;
  create policy p_conc_all on conciliaciones for all using (true) with check (true);
  -- tasas_cambio
  drop policy if exists p_tasas_all on tasas_cambio;
  create policy p_tasas_all on tasas_cambio for all using (true) with check (true);
end $$;

-- ============================================================================
-- STORAGE: bucket para comprobantes
-- Ejecutar en el SQL editor de Supabase (crea el bucket público).
-- Si prefieres hacerlo por la UI: Storage > New bucket > "comprobantes" > public.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', true)
on conflict (id) do nothing;

-- Permitir subir y leer en el bucket (piloto).
do $$
begin
  drop policy if exists p_comprobantes_insert on storage.objects;
  create policy p_comprobantes_insert on storage.objects
    for insert with check (bucket_id = 'comprobantes');

  drop policy if exists p_comprobantes_select on storage.objects;
  create policy p_comprobantes_select on storage.objects
    for select using (bucket_id = 'comprobantes');
end $$;
