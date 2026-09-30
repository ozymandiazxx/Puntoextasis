-- Migración 03: catálogo público en la página web.
-- Ejecutar DESPUÉS de migracion_02.

alter table productos
  add column publicado boolean not null default false,
  add column imagen_url text;

-- El sitio público (sin login) solo puede leer ESTA función: productos publicados,
-- sin costos ni cantidades exactas de stock.
create or replace function catalogo_publico(p_negocio uuid)
returns table (
  id uuid, nombre text, marca text, presentacion text, categoria text,
  precio numeric, imagen_url text, disponible boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.nombre, p.marca, p.presentacion, c.nombre, p.precio_venta, p.imagen_url,
         (p.es_servicio or p.stock > 0)
  from productos p
  left join categorias c on c.id = p.categoria_id
  where p.negocio_id = p_negocio and p.publicado and p.activo
  order by c.nombre nulls last, p.nombre
$$;

revoke all on function catalogo_publico(uuid) from public;
grant execute on function catalogo_publico(uuid) to anon, authenticated;

-- Fotos de productos (bucket público para lectura; cada negocio sube solo a su carpeta)
insert into storage.buckets (id, name, public) values ('productos', 'productos', true)
  on conflict do nothing;

create policy productos_img_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and (storage.foldername(name))[1] = mi_negocio_id()::text);
create policy productos_img_cambiar on storage.objects for update to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] = mi_negocio_id()::text);
create policy productos_img_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] = mi_negocio_id()::text);
