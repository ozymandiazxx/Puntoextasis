-- Migración 04: fotos del sitio web administrables desde el panel.
-- Ejecutar DESPUÉS de migracion_03.

create table sitio_fotos (
  negocio_id uuid not null default mi_negocio_id() references negocios(id) on delete cascade,
  clave text not null,              -- hero, categoria-whisky, momento-reuniones, ...
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (negocio_id, clave)
);
create trigger trg_sitio_fotos_updated before update on sitio_fotos
  for each row execute function set_updated_at();

alter table sitio_fotos enable row level security;
create policy sitio_fotos_negocio on sitio_fotos for all
  using (negocio_id = mi_negocio_id()) with check (negocio_id = mi_negocio_id());

-- El sitio público lee las fotos únicamente con esta función
create or replace function sitio_fotos_publico(p_negocio uuid)
returns table (clave text, url text)
language sql stable security definer set search_path = public as $$
  select f.clave, f.url from sitio_fotos f where f.negocio_id = p_negocio
$$;
revoke all on function sitio_fotos_publico(uuid) from public;
grant execute on function sitio_fotos_publico(uuid) to anon, authenticated;

-- Bucket público de lectura; cada negocio sube solo a su carpeta
insert into storage.buckets (id, name, public) values ('sitio', 'sitio', true) on conflict do nothing;
create policy sitio_img_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'sitio' and (storage.foldername(name))[1] = mi_negocio_id()::text);
create policy sitio_img_cambiar on storage.objects for update to authenticated
  using (bucket_id = 'sitio' and (storage.foldername(name))[1] = mi_negocio_id()::text);
create policy sitio_img_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'sitio' and (storage.foldername(name))[1] = mi_negocio_id()::text);
